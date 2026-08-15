"use server";

import prisma from "@/lib/prisma";
import { JerseySize, ApprovalStatus } from "@prisma/client";

// Interface Payload Sesuai yang dikirim dari CheckoutFormClient.tsx
interface CheckoutPayload {
  eventId: string;
  totalAmount: number;
  paymentMethod: string;
  participants: Array<{
    ticketId: string;
    fullName: string;
    email: string;
    phone: string;
    jerseySize: JerseySize;
    bloodType?: string;
    emergencyContact?: string;
    customAnswers: Record<string, string>;
  }>;
  addons: Array<{
    addonId: string;
    quantity: number;
  }>;
}

export async function processCheckout(payload: CheckoutPayload) {
  try {
    // Menggunakan transaksi agar jika 1 gagal, semua di-rollback
    return await prisma.$transaction(async (tx) => {
      const createdOrders = [];

      // 1. Looping seluruh array peserta untuk membuat Order masing-masing
      for (let i = 0; i < payload.participants.length; i++) {
        const p = payload.participants[i];

        // Tarik data Kategori Tiket
        const category = await tx.ticketCategory.findUnique({
          where: { id: p.ticketId },
        });

        if (!category) {
          throw new Error(
            `Kategori tiket untuk ${p.fullName} tidak ditemukan.`,
          );
        }

        // Cek Kuota (Opsional, tapi sangat disarankan)
        const soldTicketsCount = await tx.order.count({
          where: { ticketCategoryId: category.id },
        });

        if (soldTicketsCount >= category.capacity) {
          throw new Error(
            `Maaf, kuota untuk tiket ${category.name} sudah habis.`,
          );
        }

        // Registrasi User (Cari berdasarkan email, jika tidak ada, buat baru)
        let user = await tx.user.findUnique({
          where: { email: p.email },
        });

        if (!user) {
          user = await tx.user.create({
            data: {
              name: p.fullName,
              email: p.email,
              phone: p.phone,
              password: "defaultpassword123", // Password default
              role: "PESERTA", // <-- Diperbaiki dari RUNNER
            },
          });
        }

        // Tentukan Approval Status berdasarkan kebutuhan Kualifikasi Kategori
        const statusApproval = category.requireApproval
          ? ApprovalStatus.PENDING
          : ApprovalStatus.NONE;

        // Simpan Data Order Peserta
        const newOrder = await tx.order.create({
          data: {
            fullName: p.fullName,
            email: p.email,
            phone: p.phone,
            jerseySize: p.jerseySize,
            bloodType: p.bloodType || null,
            emergencyContact: p.emergencyContact || null,
            customAnswers: p.customAnswers, // <-- Otomatis disimpan sbg JSON
            totalPrice: category.price,
            ticketCategoryId: category.id,
            approvalStatus: statusApproval,
          },
        });

        createdOrders.push(newOrder);

        // BYPASS PEMBAYARAN: Hanya cetak tiket jika tiket TIDAK butuh kualifikasi (NONE)
        if (statusApproval === ApprovalStatus.NONE) {
          const transaction = await tx.transaction.create({
            data: {
              amount: category.price,
              status: "SUCCESS",
              paymentMethod: payload.paymentMethod,
              runnerId: user.id,
            },
          });

          const uniqueQrString = `ION-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

          await tx.ticket.create({
            data: {
              qrCode: uniqueQrString,
              isScanned: false,
              categoryId: category.id,
              transactionId: transaction.id,
              runnerId: user.id,
            },
          });
        }
      }

      // 2. Hubungkan Add-ons yang dibeli ke Order Pertama (Perwakilan Pembeli)
      if (payload.addons.length > 0 && createdOrders.length > 0) {
        const primaryOrderId = createdOrders[0].id; // Ambil ID Order orang pertama

        for (const addon of payload.addons) {
          await tx.addonOrder.create({
            data: {
              orderId: primaryOrderId,
              addonId: addon.addonId,
              quantity: addon.quantity,
            },
          });
        }
      }

      return {
        success: true,
        message: "Pesanan berhasil diproses!",
        orderIds: createdOrders.map((order) => order.id), // Kembalikan Array ID Order
      };
    });
  } catch (error: any) {
    console.error("=== ERROR CHECKOUT ===", error);
    return {
      success: false,
      error: error?.message || "Terjadi kesalahan saat memproses pesanan.",
    };
  }
}
