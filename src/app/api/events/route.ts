import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { eventDetails, posterPreview, logoPreview, tickets } = body;

    // 1. Ambil secara otomatis user pertama yang memiliki role EO dari database
    const eoUser = await prisma.user.findFirst({
      where: {
        role: "EO",
      },
    });

    // Validasi: Jika akun EO belum ada di database, tampilkan pesan peringatan
    if (!eoUser) {
      return NextResponse.json(
        {
          success: false,
          message:
            "User dengan role EO tidak ditemukan di database. Silakan daftarkan akun EO terlebih dahulu.",
        },
        { status: 400 },
      );
    }

    // 2. Simpan Event ke database menggunakan ID dari akun EO yang ditemukan
    const newEvent = await prisma.event.create({
      data: {
        title: eventDetails.name,
        category: eventDetails.category,
        description: eventDetails.description,
        date: new Date(eventDetails.startDate),
        endDate: eventDetails.endDate ? new Date(eventDetails.endDate) : null,
        location: eventDetails.location,
        mapsUrl: eventDetails.mapsUrl,
        imageUrl: posterPreview,
        logoUrl: logoPreview,
        rules: eventDetails.rules,
        contactName: eventDetails.contactName,
        contactPhone: eventDetails.contactPhone,
        isPublished: true,
        eoId: eoUser.id, // <-- Menggunakan ID EO yang didapat otomatis dari DB
        categories: {
          create: tickets.map((ticket: any) => ({
            name: ticket.name,
            price: parseFloat(ticket.price || 0),
            capacity: parseInt(ticket.quota || 0),
          })),
        },
      },
    });

    // Reset cache halaman agar event langsung muncul
    revalidatePath("/");
    revalidatePath("/dashboard/events");

    return NextResponse.json(
      { success: true, message: "Event berhasil disimpan!", data: newEvent },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error API Create Event:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat menyimpan data." },
      { status: 500 },
    );
  }
}
