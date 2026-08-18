"use server";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";

import prisma from "@/lib/prisma";
import {
  ApprovalStatus,
  JerseySize,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from "@/generated/prisma/client";

import type { CheckoutOrderResponse } from "@/lib/platform-types";

import { paymentService } from "@/lib/payment";
import { registerPaymentProviders } from "@/lib/payment/providers";

interface CheckoutPayload {
  eventId: string;
  totalAmount: number;
  paymentMethod: string;
  participants: Array<{
    ticketId: string;
    fullName: string;
    email: string;
    phone: string;
    jerseySize: string;
    bloodType?: string;
    emergencyContact?: string;
    customAnswers: Record<string, string>;
  }>;
  addons: Array<{
    addonId: string;
    quantity: number;
  }>;
}

const PAYMENT_PROVIDER = "IONTIX_TEST" as const;

const ALLOWED_PAYMENT_METHODS = new Map<string, PaymentMethod>([
  ["qris", PaymentMethod.QRIS],
]);

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const normalizeRequiredString = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${fieldName} wajib diisi.`);
  }

  return value.trim();
};

const normalizeNonNegativeInteger = (
  value: unknown,
  fieldName: string,
): number => {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    throw new Error(`${fieldName} tidak valid.`);
  }

  return parsed;
};

const normalizeCustomAnswers = (value: unknown): Record<string, string> => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const result: Record<string, string> = {};

  for (const [key, rawValue] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (typeof rawValue === "string") {
      result[key] = rawValue.trim();
    } else if (rawValue !== null && rawValue !== undefined) {
      result[key] = String(rawValue);
    }
  }

  return result;
};

const createExternalId = (orderNumber: string): string =>
  `IONTIX-${orderNumber}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

const getPaymentMethod = (value: string): PaymentMethod => {
  const normalized = value.trim().toLowerCase();

  const method = ALLOWED_PAYMENT_METHODS.get(normalized);

  if (!method) {
    throw new Error("Metode pembayaran tidak valid.");
  }

  return method;
};

interface PreparedOrder {
  orderId: string;
  userId: string;
  email: string;
  amount: number;
  externalId: string;
  transactionId: string;
}

export async function processCheckout(
  payload: CheckoutPayload,
): Promise<CheckoutOrderResponse> {
  try {
    if (!payload || typeof payload.eventId !== "string") {
      throw new Error("Event tidak valid.");
    }

    const eventId = payload.eventId.trim();

    if (!eventId) {
      throw new Error("Event tidak valid.");
    }

    if (
      !Array.isArray(payload.participants) ||
      payload.participants.length === 0
    ) {
      throw new Error("Minimal satu peserta harus didaftarkan.");
    }

    if (!Array.isArray(payload.addons)) {
      throw new Error("Data add-on tidak valid.");
    }

    /*
     * Register provider before the first payment session is requested.
     * Registration is idempotent.
     */
    registerPaymentProviders();

    const paymentMethod = getPaymentMethod(payload.paymentMethod);

    const now = new Date();

    /*
     * Phase C:
     * 1. Buat Order dengan status PENDING_PAYMENT.
     * 2. Buat Payment PENDING.
     * 3. Buat Transaction PENDING sebagai ledger internal.
     * 4. Belum menerbitkan Ticket.
     *
     * Provider session dibuat setelah database transaction selesai,
     * sehingga external provider call tidak menahan database transaction.
     */
    const prepared = await prisma.$transaction(
      async (tx) => {
        const event = await tx.event.findUnique({
          where: {
            id: eventId,
          },
          select: {
            id: true,
            title: true,
            status: true,
            isPublished: true,
          },
        });

        if (!event) {
          throw new Error("Event tidak ditemukan.");
        }

        if (!event.isPublished || event.status !== "PUBLISHED") {
          throw new Error("Event belum tersedia untuk pendaftaran.");
        }

        const ticketIds = Array.from(
          new Set(
            payload.participants.map((participant) =>
              normalizeRequiredString(participant.ticketId, "Kategori tiket"),
            ),
          ),
        );

        const categories = await tx.ticketCategory.findMany({
          where: {
            id: {
              in: ticketIds,
            },
            eventId,
            isActive: true,
            AND: [
              {
                OR: [
                  {
                    saleStartsAt: null,
                  },
                  {
                    saleStartsAt: {
                      lte: now,
                    },
                  },
                ],
              },
              {
                OR: [
                  {
                    saleEndsAt: null,
                  },
                  {
                    saleEndsAt: {
                      gte: now,
                    },
                  },
                ],
              },
            ],
          },
          select: {
            id: true,
            name: true,
            price: true,
            capacity: true,
            eventId: true,
            requireApproval: true,
          },
        });

        if (categories.length !== ticketIds.length) {
          throw new Error(
            "Terdapat kategori tiket yang tidak valid, tidak aktif, atau bukan milik event ini.",
          );
        }

        const categoryMap = new Map(
          categories.map((category) => [category.id, category]),
        );

        const requestedByCategory = new Map<string, number>();

        for (const participant of payload.participants) {
          const ticketId = participant.ticketId.trim();

          requestedByCategory.set(
            ticketId,
            (requestedByCategory.get(ticketId) ?? 0) + 1,
          );
        }

        for (const [categoryId, requestedCount] of requestedByCategory) {
          const category = categoryMap.get(categoryId);

          if (!category) {
            throw new Error("Kategori tiket tidak ditemukan.");
          }

          const soldCount = await tx.order.count({
            where: {
              ticketCategoryId: categoryId,
              status: {
                notIn: [
                  OrderStatus.EXPIRED,
                  OrderStatus.CANCELLED,
                  OrderStatus.FAILED,
                ],
              },
            },
          });

          if (soldCount + requestedCount > category.capacity) {
            throw new Error(
              `Maaf, kuota untuk tiket ${category.name} tidak mencukupi.`,
            );
          }
        }

        const normalizedAddons = payload.addons
          .map((addon) => ({
            addonId: normalizeRequiredString(addon.addonId, "Add-on"),
            quantity: normalizeNonNegativeInteger(
              addon.quantity,
              "Jumlah add-on",
            ),
          }))
          .filter((addon) => addon.quantity > 0);

        const addonIds = Array.from(
          new Set(normalizedAddons.map((addon) => addon.addonId)),
        );

        const addons =
          addonIds.length > 0
            ? await tx.addon.findMany({
                where: {
                  id: {
                    in: addonIds,
                  },
                  eventId,
                  isActive: true,
                },
                select: {
                  id: true,
                  name: true,
                  price: true,
                  capacity: true,
                  eventId: true,
                },
              })
            : [];

        if (addons.length !== addonIds.length) {
          throw new Error(
            "Terdapat add-on yang tidak valid, tidak aktif, atau bukan milik event ini.",
          );
        }

        const addonMap = new Map(addons.map((addon) => [addon.id, addon]));

        for (const addon of normalizedAddons) {
          const addonRecord = addonMap.get(addon.addonId);

          if (!addonRecord) {
            throw new Error("Add-on tidak ditemukan.");
          }

          if (addonRecord.capacity !== null) {
            const claimed = await tx.addonOrder.aggregate({
              where: {
                addonId: addon.addonId,
              },
              _sum: {
                quantity: true,
              },
            });

            const alreadySold = claimed._sum.quantity ?? 0;

            if (alreadySold + addon.quantity > addonRecord.capacity) {
              throw new Error(
                `Stok add-on ${addonRecord.name} tidak mencukupi.`,
              );
            }
          }
        }

        const addonTotal = normalizedAddons.reduce((sum, item) => {
          const addon = addonMap.get(item.addonId);

          return sum + (addon?.price ?? 0) * item.quantity;
        }, 0);

        const createdOrders: PreparedOrder[] = [];

        const participantUserIds = new Map<string, string>();

        for (let index = 0; index < payload.participants.length; index += 1) {
          const participant = payload.participants[index];

          const fullName = normalizeRequiredString(
            participant.fullName,
            "Nama lengkap",
          );

          const email = normalizeEmail(
            normalizeRequiredString(participant.email, "Email"),
          );

          const phone = normalizeRequiredString(
            participant.phone,
            "Nomor telepon",
          );

          const category = categoryMap.get(participant.ticketId);

          if (!category) {
            throw new Error("Kategori tiket peserta tidak ditemukan.");
          }

          const jerseySize = Object.values(JerseySize).includes(
            participant.jerseySize as JerseySize,
          )
            ? (participant.jerseySize as JerseySize)
            : null;

          if (!jerseySize) {
            throw new Error(`Ukuran jersey untuk ${fullName} tidak valid.`);
          }

          const customAnswers = normalizeCustomAnswers(
            participant.customAnswers,
          );

          let user = participantUserIds.has(email)
            ? await tx.user.findUnique({
                where: {
                  email,
                },
              })
            : await tx.user.findUnique({
                where: {
                  email,
                },
              });

          if (!user) {
            const passwordHash = await bcrypt.hash(
              crypto.randomBytes(32).toString("hex"),
              12,
            );

            const pesertaRole = await tx.role.findUnique({
              where: {
                name: "PESERTA",
              },
              select: {
                id: true,
              },
            });

            if (!pesertaRole) {
              throw new Error("Role PESERTA belum tersedia di database.");
            }

            user = await tx.user.create({
              data: {
                name: fullName,
                email,
                phone,
                password: passwordHash,
                role: {
                  connect: {
                    id: pesertaRole.id,
                  },
                },
              },
            });
          }

          if (user.isDeleted || user.status !== "ACTIVE") {
            throw new Error(`Akun peserta ${email} tidak aktif.`);
          }

          participantUserIds.set(email, user.id);

          const statusApproval = category.requireApproval
            ? ApprovalStatus.PENDING
            : ApprovalStatus.NONE;

          /*
           * Add-on hanya ditempatkan pada order pertama,
           * mengikuti perilaku checkout lama.
           */
          const isPrimaryOrder = index === 0;

          const orderAddonTotal = isPrimaryOrder ? addonTotal : 0;

          const orderTotal = category.price + orderAddonTotal;

          const newOrder = await tx.order.create({
            data: {
              eventId,
              buyerUserId: user.id,
              fullName,
              email,
              phone,
              jerseySize,
              bloodType: participant.bloodType?.trim() || null,
              emergencyContact: participant.emergencyContact?.trim() || null,
              customAnswers,
              ticketCategoryId: category.id,
              subtotal: category.price,
              addonTotal: orderAddonTotal,
              totalPrice: orderTotal,
              currency: "IDR",
              status: OrderStatus.PENDING_PAYMENT,
              approvalStatus: statusApproval,
            },
            select: {
              id: true,
              orderNumber: true,
              totalPrice: true,
              currency: true,
            },
          });

          if (isPrimaryOrder && normalizedAddons.length > 0) {
            await tx.addonOrder.createMany({
              data: normalizedAddons.map((addon) => ({
                orderId: newOrder.id,
                addonId: addon.addonId,
                quantity: addon.quantity,
              })),
              skipDuplicates: true,
            });
          }

          const externalId = createExternalId(newOrder.orderNumber);

          const payment = await tx.payment.create({
            data: {
              orderId: newOrder.id,
              userId: user.id,
              externalId,
              provider: PAYMENT_PROVIDER,
              method: paymentMethod,
              status: PaymentStatus.PENDING,
              amount: newOrder.totalPrice,
              currency: newOrder.currency,
              expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
            },
            select: {
              id: true,
            },
          });

          const transaction = await tx.transaction.create({
            data: {
              orderId: newOrder.id,
              paymentId: payment.id,
              runnerId: user.id,
              amount: newOrder.totalPrice,
              status: PaymentStatus.PENDING,
              paymentMethod: paymentMethod,
              externalId,
            },
            select: {
              id: true,
            },
          });

          createdOrders.push({
            orderId: newOrder.id,
            userId: user.id,
            email,
            amount: newOrder.totalPrice,
            externalId,
            transactionId: transaction.id,
          });
        }

        return createdOrders;
      },
      {
        maxWait: 10_000,
        timeout: 30_000,
      },
    );

    /*
     * Request provider sessions after the DB transaction has committed.
     * This prevents external provider calls from holding a DB transaction.
     */
    const paymentSessions = await Promise.all(
      prepared.map(async (item) => {
        const user = await prisma.user.findUnique({
          where: {
            id: item.userId,
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        });

        const session = await paymentService.createPayment(PAYMENT_PROVIDER, {
          orderId: item.orderId,
          externalId: item.externalId,
          amount: item.amount,
          currency: "IDR",
          method: paymentMethod,
          customer: {
            userId: user?.id ?? item.userId,
            name: user?.name ?? null,
            email: user?.email ?? item.email,
            phone: user?.phone ?? null,
          },
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          metadata: {
            mode: "development",
          },
        });

        await prisma.payment.update({
          where: {
            externalId: item.externalId,
          },
          data: {
            status: session.status,
            providerTransactionId: session.providerTransactionId ?? null,
            providerResponse: session.providerResponse ?? Prisma.JsonNull,
            expiresAt: session.expiresAt ?? null,
          },
        });

        await prisma.transaction.update({
          where: {
            id: item.transactionId,
          },
          data: {
            status: session.status,
          },
        });

        return {
          orderId: item.orderId,
          externalId: item.externalId,
          checkoutUrl: session.checkoutUrl ?? null,
          token: session.token ?? null,
          status: session.status,
        };
      }),
    );

    /*
     * Jangan terbitkan Ticket di sini.
     * Ticket hanya boleh dibuat setelah Payment = SUCCESS
     * pada tahap payment confirmation/webhook berikutnya.
     */

    /*
     * totalAmount dari browser hanya digunakan sebagai diagnostik.
     * Harga final tetap berasal dari database.
     */
    if (Number.isFinite(payload.totalAmount)) {
      const serverTotal = prepared.reduce((sum, item) => sum + item.amount, 0);

      if (serverTotal !== payload.totalAmount) {
        console.warn("Checkout total mismatch:", {
          client: payload.totalAmount,
          server: serverTotal,
          eventId,
        });
      }
    }

    return {
      success: true,
      message: "Pesanan berhasil dibuat dan menunggu pembayaran.",
      orderIds: prepared.map((item) => item.orderId),
      paymentSessions,
    };
  } catch (error: unknown) {
    console.error("=== ERROR CHECKOUT ===", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat memproses pesanan.",
    };
  }
}
