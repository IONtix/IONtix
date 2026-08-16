"use server";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { ApprovalStatus, JerseySize } from "@/generated/prisma/client";
import type { CheckoutOrderResponse } from "@/lib/platform-types";

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

const ALLOWED_PAYMENT_METHODS = new Set(["qris"]);

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const normalizeRequiredString = (value: unknown, fieldName: string) => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${fieldName} wajib diisi.`);
  }

  return value.trim();
};

const normalizeNonNegativeInteger = (value: unknown, fieldName: string) => {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    throw new Error(`${fieldName} tidak valid.`);
  }

  return parsed;
};

const normalizeCustomAnswers = (value: unknown) => {
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

const createQrCode = () => `ION-${crypto.randomUUID()}`;

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

    const paymentMethod =
      typeof payload.paymentMethod === "string"
        ? payload.paymentMethod.trim().toLowerCase()
        : "";

    if (!ALLOWED_PAYMENT_METHODS.has(paymentMethod)) {
      throw new Error("Metode pembayaran tidak valid.");
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
     * totalAmount dari browser TIDAK dipercaya.
     * Nilai final dihitung ulang dari harga database.
     */
    const result = await prisma.$transaction(async (tx) => {
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

      /*
       * Ambil seluruh kategori yang dipilih sekaligus.
       */
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
          "Terdapat kategori tiket yang tidak valid atau bukan milik event ini.",
        );
      }

      const categoryMap = new Map(
        categories.map((category) => [category.id, category]),
      );

      /*
       * Validasi jumlah peserta per kategori
       * terhadap kuota database.
       */
      const requestedByCategory = new Map<string, number>();

      for (const participant of payload.participants) {
        const ticketId = participant.ticketId.trim();

        requestedByCategory.set(
          ticketId,
          (requestedByCategory.get(ticketId) || 0) + 1,
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
          },
        });

        if (soldCount + requestedCount > category.capacity) {
          throw new Error(
            `Maaf, kuota untuk tiket ${category.name} tidak mencukupi.`,
          );
        }
      }

      /*
       * Validasi add-on wajib berasal dari event yang sama.
       * Kuota add-on juga dihitung berdasarkan order yang sudah ada.
       */
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
          "Terdapat add-on yang tidak valid atau bukan milik event ini.",
        );
      }

      const addonMap = new Map(addons.map((addon) => [addon.id, addon]));

      for (const addon of normalizedAddons) {
        const addonRecord = addonMap.get(addon.addonId);

        if (!addonRecord) {
          throw new Error("Add-on tidak ditemukan.");
        }

        if (addonRecord.capacity !== null) {
          const claimedQuantity = await tx.addonOrder.aggregate({
            where: {
              addonId: addon.addonId,
            },
            _sum: {
              quantity: true,
            },
          });

          const alreadySold = claimedQuantity._sum.quantity ?? 0;

          if (alreadySold + addon.quantity > addonRecord.capacity) {
            throw new Error(`Stok add-on ${addonRecord.name} tidak mencukupi.`);
          }
        }
      }

      const addonTotal = normalizedAddons.reduce((sum, item) => {
        const addon = addonMap.get(item.addonId);

        return sum + (addon?.price ?? 0) * item.quantity;
      }, 0);

      const createdOrders: Array<{
        id: string;
      }> = [];

      let authoritativeTotal = addonTotal;

      for (const participant of payload.participants) {
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

        const customAnswers = normalizeCustomAnswers(participant.customAnswers);

        authoritativeTotal += category.price;

        let user = await tx.user.findUnique({
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

        /*
         * Jika akun sudah ada tetapi sedang tidak aktif,
         * jangan membuat order menggunakan akun tersebut.
         */
        if (user.isDeleted || user.status !== "ACTIVE") {
          throw new Error(`Akun peserta ${email} tidak aktif.`);
        }

        const statusApproval = category.requireApproval
          ? ApprovalStatus.PENDING
          : ApprovalStatus.NONE;

        const newOrder = await tx.order.create({
          data: {
            fullName,
            email,
            phone,
            jerseySize,
            bloodType: participant.bloodType?.trim() || null,
            emergencyContact: participant.emergencyContact?.trim() || null,
            customAnswers,
            totalPrice: category.price,
            ticketCategoryId: category.id,
            approvalStatus: statusApproval,
            eventId,
          },
          select: {
            id: true,
          },
        });

        createdOrders.push(newOrder);

        /*
         * Untuk menjaga kompatibilitas dengan flow
         * IONtix saat ini, transaksi non-kualifikasi
         * tetap dibuat SUCCESS. Nilai amount selalu berasal
         * dari database, bukan dari client.
         *
         * Payment gateway nyata belum dipasang pada flow ini.
         */
        if (statusApproval === ApprovalStatus.NONE) {
          const transaction = await tx.transaction.create({
            data: {
              amount: category.price,
              status: "SUCCESS",
              paymentMethod,
              runnerId: user.id,
            },
            select: {
              id: true,
            },
          });

          await tx.ticket.create({
            data: {
              qrCode: createQrCode(),
              isScanned: false,
              categoryId: category.id,
              transactionId: transaction.id,
              eventId,
              userId: user.id,
            },
          });
        }
      }

      /*
       * Add-on dipasang ke order pertama sebagai
       * representasi cart / buyer saat ini.
       */
      const primaryOrderId = createdOrders[0]?.id;

      if (primaryOrderId && normalizedAddons.length > 0) {
        for (const addon of normalizedAddons) {
          await tx.addonOrder.create({
            data: {
              orderId: primaryOrderId,
              addonId: addon.addonId,
              quantity: addon.quantity,
            },
          });
        }
      }

      /*
       * totalAmount dari client sengaja tidak dipakai.
       * Namun tetap kita validasi sebagai sanity check
       * agar client yang salah tidak diam-diam berbeda jauh
       * dari nilai server.
       */
      if (
        Number.isFinite(payload.totalAmount) &&
        payload.totalAmount !== authoritativeTotal
      ) {
        console.warn("Checkout total mismatch:", {
          client: payload.totalAmount,
          server: authoritativeTotal,
          eventId,
        });
      }

      return {
        orderIds: createdOrders.map((order) => order.id),
      };
    });

    return {
      success: true,
      message: "Pesanan berhasil diproses!",
      orderIds: result.orderIds,
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
