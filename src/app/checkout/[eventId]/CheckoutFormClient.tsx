"use client";

import { processCheckout } from "@/app/actions/checkout";
import Image from "next/image";
import type {
  CheckoutAddonData,
  CheckoutEventData,
  CheckoutPaymentSession,
  CheckoutTicketData,
  CustomFieldDefinition,
} from "@/lib/platform-types";
import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Ticket,
  Info,
  CreditCard,
  MapPin,
  Calendar,
  Receipt,
  ImageIcon,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  QrCode,
  Package, // <-- Icon baru untuk Addons
} from "lucide-react";

interface CheckoutFormClientProps {
  event: CheckoutEventData;
  tickets: CheckoutTicketData[];
  addons?: CheckoutAddonData[];
  customFields: CustomFieldDefinition[];
}

// Tipe Data Peserta
interface ParticipantData {
  id: string; // ID unik internal untuk looping form
  ticketId: string;
  ticketName: string;
  fullName: string;
  email: string;
  phone: string;
  jerseySize: string;
  bloodType: string;
  emergencyContact: string;
  customAnswers: Record<string, string>;
}

export default function CheckoutFormClient({
  event,
  tickets,
  addons = [], // Default ke array kosong
  customFields,
}: CheckoutFormClientProps) {
  const router = useRouter();

  // STEPPER STATE: 1 (Tiket), 2 (Data), 3 (Pembayaran), 4 (Instruksi Bayar)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // STATE: Jumlah Tiket & Addons yang Dipilih
  const [ticketCounts, setTicketCounts] = useState<Record<string, number>>({});
  const [addonCounts, setAddonCounts] = useState<Record<string, number>>({}); // <-- BARU: State Addons

  // STATE: Data Peserta (Otomatis digenerate berdasarkan jumlah tiket)
  const [participants, setParticipants] = useState<ParticipantData[]>([]);

  // STATE: Pembayaran
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [paymentSessions, setPaymentSessions] = useState<
    CheckoutPaymentSession[]
  >([]);
  const [retryingPaymentOrderId, setRetryingPaymentOrderId] =
    useState<string | null>(null);
  const [paymentUxMessage, setPaymentUxMessage] =
    useState<string | null>(null);

  // =========================================================================
  // LOGIKA: KALKULASI HARGA & JUMLAH
  // =========================================================================
  const totalQuantity = useMemo(() => {
    return Object.values(ticketCounts).reduce((sum, count) => sum + count, 0);
  }, [ticketCounts]);

  // Kalkulasi Total Harga (Tiket + Addons)
  const totalPrice = useMemo(() => {
    const ticketsTotal = tickets.reduce((sum, ticket) => {
      const count = ticketCounts[ticket.id] || 0;
      return sum + ticket.price * count;
    }, 0);

    const addonsTotal = addons.reduce((sum, addon) => {
      const count = addonCounts[addon.id] || 0;
      return sum + addon.price * count;
    }, 0);

    return ticketsTotal + addonsTotal;
  }, [ticketCounts, addonCounts, tickets, addons]);

  const handleQuantityChange = (
    ticketId: string,
    delta: number,
    capacity: number,
  ) => {
    setTicketCounts((prev) => {
      const current = prev[ticketId] || 0;
      const next = current + delta;
      if (next < 0) return prev;
      if (next > capacity) {
        alert("Kapasitas tiket tidak mencukupi!");
        return prev;
      }
      return { ...prev, [ticketId]: next };
    });
  };

  // <-- BARU: Handler untuk Addons
  const handleAddonQuantityChange = (
    addonId: string,
    delta: number,
    capacity: number | null, // Bisa null jika unlimited
  ) => {
    setAddonCounts((prev) => {
      const current = prev[addonId] || 0;
      const next = current + delta;
      if (next < 0) return prev;
      if (capacity !== null && next > capacity) {
        alert("Stok/Kapasitas Add-on tidak mencukupi!");
        return prev;
      }
      return { ...prev, [addonId]: next };
    });
  };

  // =========================================================================
  // LOGIKA: GENERATE FORM PESERTA SAAT LANJUT KE STEP 2
  // =========================================================================
  const handleProceedToStep2 = () => {
    if (totalQuantity === 0) {
      alert("Pilih minimal 1 tiket untuk melanjutkan.");
      return;
    }

    // Buat slot form peserta sesuai jumlah dan jenis tiket yang dibeli
    const newParticipants: ParticipantData[] = [];
    let counter = 1;

    tickets.forEach((ticket) => {
      const count = ticketCounts[ticket.id] || 0;
      for (let i = 0; i < count; i++) {
        const existing = participants.find((p) => p.id === `${ticket.id}-${i}`);
        newParticipants.push(
          existing || {
            id: `${ticket.id}-${i}`,
            ticketId: ticket.id,
            ticketName: `${ticket.name} (Peserta ${counter})`,
            fullName: "",
            email: "",
            phone: "",
            jerseySize: "",
            bloodType: "",
            emergencyContact: "",
            customAnswers: {},
          },
        );
        counter++;
      }
    });

    setParticipants(newParticipants);
    setCurrentStep(2);
  };

  const handleParticipantChange = (
    index: number,
    field: string,
    value: string,
  ) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], [field]: value };
    setParticipants(updated);
  };

  const handleParticipantCustomChange = (
    index: number,
    label: string,
    value: string,
  ) => {
    const updated = [...participants];
    updated[index].customAnswers = {
      ...updated[index].customAnswers,
      [label]: value,
    };
    setParticipants(updated);
  };

  // =========================================================================
  // LOGIKA: VALIDASI & SUBMIT PESANAN
  // =========================================================================
  const handleRetryPayment = async (
    orderId: string,
  ) => {
    if (!orderId) {
      return;
    }

    setRetryingPaymentOrderId(orderId);
    setPaymentUxMessage(null);

    try {
      const response = await fetch(
        `/api/orders/${orderId}/payment/retry`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
        data?: {
          orderId: string;
          externalId: string;
          provider: string;
          status: string;
          checkoutUrl: string | null;
          token: string | null;
          expiresAt: string | null;
        };
      };

      if (
        !response.ok ||
        !data.success ||
        !data.data
      ) {
        throw new Error(
          data.error ??
            "Sesi pembayaran belum dapat dibuat ulang.",
        );
      }

      setPaymentSessions((current) =>
        current.map((session) =>
          session.orderId ===
          data.data!.orderId
            ? {
                ...session,
                externalId:
                  data.data!.externalId,
                checkoutUrl:
                  data.data!.checkoutUrl,
                status:
                  data.data!.status,
                expiresAt:
                  data.data!.expiresAt,
              }
            : session,
        ),
      );

      setPaymentUxMessage(
        "Sesi pembayaran berhasil dibuat ulang.",
      );
    } catch (error) {
      setPaymentUxMessage(
        error instanceof Error
          ? error.message
          : "Gagal membuat ulang sesi pembayaran.",
      );
    } finally {
      setRetryingPaymentOrderId(null);
    }
  };

  const handleSubmitOrder = async () => {
    if (!paymentMethod) {
      alert("Silakan pilih metode pembayaran terlebih dahulu!");
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedAddons = Object.entries(addonCounts)
        .filter((entry) => entry[1] > 0)
        .map(([addonId, quantity]) => ({ addonId, quantity }));

      const payload = {
        eventId: event.id,
        totalAmount: totalPrice,
        paymentMethod: paymentMethod,
        participants: participants,
        addons: formattedAddons,
      };

      // Panggil Server Action yang baru dibuat
      const response = await processCheckout(payload);

      if (response.success) {
        setPaymentSessions(
          response.paymentSessions,
        );
        setPaymentUxMessage(null);

        const primaryOrderId =
          response.paymentSessions[0]?.orderId ??
          response.orderIds[0];

        if (primaryOrderId) {
          router.replace(
            `/checkout/success?orderId=${encodeURIComponent(
              primaryOrderId,
            )}&event=${encodeURIComponent(
              event.title,
            )}`,
          );
          return;
        }

        setCurrentStep(4);
      } else {
        alert(response.error);
      }
    } catch {
      alert("Terjadi kesalahan sistem. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // KOMPONEN UI: GAYA STANDAR
  // =========================================================================
  const inputBaseStyle =
    "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-700 font-medium placeholder:text-slate-400 text-sm";
  const customInputBaseStyle =
    "w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 pt-8">
      {/* HEADER EVENT */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        {event.imageUrl ? (
          <div className="w-full h-40 sm:h-64 relative bg-slate-100">
            <Image
              src={event.imageUrl}
              width={1600}
              height={500}
              alt="Poster"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
          </div>
        ) : (
          <div className="w-full h-32 bg-linear-to-r from-blue-600 to-indigo-700 flex items-center justify-center">
            <ImageIcon size={40} className="text-white/30" />
          </div>
        )}
        <div className="p-6 relative flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 leading-tight">
              {event.title}
            </h1>
            <div className="flex flex-wrap gap-3 text-xs sm:text-sm font-bold text-slate-600">
              <span className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                <Calendar size={16} className="text-blue-600" />
                {event.date
                  ? new Date(event.date).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "TBA"}
              </span>
              <span className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                <MapPin size={16} className="text-rose-500" />
                {event.location || "Online"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* STEPPER WIZARD UI */}
      <div className="mb-10 max-w-3xl mx-auto hidden sm:block">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 rounded-full z-0"></div>
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 rounded-full z-0 transition-all duration-500"
            style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
          ></div>
          {[
            { step: 1, label: "Pilih Tiket" },
            { step: 2, label: "Data Peserta" },
            { step: 3, label: "Pembayaran" },
            { step: 4, label: "Selesai" },
          ].map((item) => (
            <div
              key={item.step}
              className="relative z-10 flex flex-col items-center gap-2 bg-slate-50 px-2"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${currentStep >= item.step ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-slate-200 text-slate-400"}`}
              >
                {currentStep > item.step ? (
                  <CheckCircle2 size={20} />
                ) : (
                  item.step
                )}
              </div>
              <span
                className={`text-xs font-bold ${currentStep >= item.step ? "text-slate-800" : "text-slate-400"}`}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT SPLIT LAYOUT */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* ============================================================== */}
        {/* BAGIAN KIRI: KONTEN DINAMIS BERDASARKAN STEP */}
        {/* ============================================================== */}
        <div className="w-full lg:w-2/3 space-y-6">
          {/* STEP 1: PILIH TIKET & ADDONS */}
          {currentStep === 1 && (
            <div className="space-y-8">
              {/* BAGIAN TIKET */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <Ticket size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Pilih Kategori Tiket
                    </h2>
                  </div>
                </div>
                {tickets.map((ticket) => {
                  const count = ticketCounts[ticket.id] || 0;
                  return (
                    <div
                      key={ticket.id}
                      className={`p-5 sm:p-6 rounded-2xl border-2 transition-all duration-200 ${count > 0 ? "border-blue-600 bg-blue-50/20 shadow-md" : "border-slate-200 bg-white hover:border-slate-300"}`}
                    >
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <div className="flex-1">
                          {ticket.requireApproval && (
                            <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded mb-2">
                              WAJIB KUALIFIKASI
                            </span>
                          )}
                          <h3 className="font-black text-slate-900 text-lg sm:text-xl">
                            {ticket.name}
                          </h3>
                          <div className="mt-3 flex items-center gap-3">
                            <span className="text-blue-700 font-black text-xl">
                              Rp {Number(ticket.price).toLocaleString("id-ID")}
                            </span>
                            <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-500 rounded-md">
                              Sisa Kuota: {ticket.capacity}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 bg-slate-100 p-2 rounded-xl border border-slate-200 shrink-0 w-fit">
                          <button
                            type="button"
                            onClick={() =>
                              handleQuantityChange(
                                ticket.id,
                                -1,
                                ticket.capacity,
                              )
                            }
                            disabled={count === 0}
                            className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-600 shadow-sm disabled:opacity-50 hover:bg-slate-50"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-6 text-center font-black text-slate-800 text-lg">
                            {count}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleQuantityChange(
                                ticket.id,
                                1,
                                ticket.capacity,
                              )
                            }
                            disabled={count >= ticket.capacity}
                            className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-600 shadow-sm disabled:opacity-50 hover:bg-slate-50"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* BAGIAN ADDONS (Hanya tampil jika ada data addons di DB) */}
              {addons.length > 0 && (
                <div className="space-y-4 pt-6 border-t border-slate-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                      <Package size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        Tambah Fasilitas (Add-ons)
                      </h2>
                      <p className="text-sm text-slate-500">
                        Pilih merchandise, akomodasi, atau fasilitas ekstra
                        lainnya.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {addons.map((addon) => {
                      const count = addonCounts[addon.id] || 0;
                      return (
                        <div
                          key={addon.id}
                          className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${count > 0 ? "border-emerald-500 bg-emerald-50/20" : "border-slate-200 bg-white"}`}
                        >
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded">
                              {addon.type}
                            </span>
                            <h3 className="font-bold text-slate-900 text-lg mt-2">
                              {addon.name}
                            </h3>
                            <p className="text-emerald-600 font-bold mt-1">
                              Rp {Number(addon.price).toLocaleString("id-ID")}
                            </p>
                          </div>
                          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                              {addon.capacity
                                ? `Sisa: ${addon.capacity}`
                                : "Tersedia"}
                            </span>
                            <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
                              <button
                                type="button"
                                onClick={() =>
                                  handleAddonQuantityChange(
                                    addon.id,
                                    -1,
                                    addon.capacity,
                                  )
                                }
                                disabled={count === 0}
                                className="w-6 h-6 rounded bg-white flex items-center justify-center text-slate-600 disabled:opacity-50 shadow-sm"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-4 text-center font-bold text-sm">
                                {count}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleAddonQuantityChange(
                                    addon.id,
                                    1,
                                    addon.capacity,
                                  )
                                }
                                disabled={
                                  addon.capacity !== null &&
                                  count >= addon.capacity
                                }
                                className="w-6 h-6 rounded bg-white flex items-center justify-center text-slate-600 disabled:opacity-50 shadow-sm"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: PENGISIAN DATA PESERTA */}
          {currentStep === 2 && (
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  <ArrowLeft size={20} className="text-slate-600" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Lengkapi Data Peserta
                  </h2>
                </div>
              </div>
              <form
                id="participant-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  setCurrentStep(3);
                }}
                className="space-y-6"
              >
                {participants.map((participant, index) => {
                  // Cek apakah tiket ini mewajibkan kualifikasi
                  const ticketInfo = tickets.find(
                    (t) => t.id === participant.ticketId,
                  );
                  const isRequireApproval =
                    ticketInfo?.requireApproval || false;

                  return (
                    <div
                      key={participant.id}
                      className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm"
                    >
                      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                          {index + 1}
                        </div>
                        <h3 className="font-bold text-slate-800">
                          {participant.ticketName}
                        </h3>
                      </div>
                      <div className="p-6 space-y-6">
                        {/* Jika Tiket Wajib Approval, Munculkan Peringatan */}
                        {isRequireApproval && (
                          <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex gap-3 items-start">
                            <Info
                              size={20}
                              className="text-red-600 shrink-0 mt-0.5"
                            />
                            <p className="text-sm text-red-800 font-medium">
                              Kategori tiket ini mewajibkan kualifikasi. Silakan
                              isi form wajib di bagian informasi tambahan di
                              bawah.
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                              Nama Lengkap{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={participant.fullName}
                              onChange={(e) =>
                                handleParticipantChange(
                                  index,
                                  "fullName",
                                  e.target.value,
                                )
                              }
                              className={inputBaseStyle}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                              Email Aktif{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="email"
                              required
                              value={participant.email}
                              onChange={(e) =>
                                handleParticipantChange(
                                  index,
                                  "email",
                                  e.target.value,
                                )
                              }
                              className={inputBaseStyle}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                              No. WhatsApp{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="tel"
                              required
                              value={participant.phone}
                              onChange={(e) =>
                                handleParticipantChange(
                                  index,
                                  "phone",
                                  e.target.value,
                                )
                              }
                              className={inputBaseStyle}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                              Ukuran Jersey{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <select
                              required
                              value={participant.jerseySize}
                              onChange={(e) =>
                                handleParticipantChange(
                                  index,
                                  "jerseySize",
                                  e.target.value,
                                )
                              }
                              className={inputBaseStyle}
                            >
                              <option value="">-- Pilih --</option>
                              <option value="XS">XS</option>
                              <option value="S">S</option>
                              <option value="M">M</option>
                              <option value="L">L</option>
                              <option value="XL">XL</option>
                              <option value="XXL">XXL</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                              Gol. Darah (Opsional)
                            </label>
                            <select
                              value={participant.bloodType}
                              onChange={(e) =>
                                handleParticipantChange(
                                  index,
                                  "bloodType",
                                  e.target.value,
                                )
                              }
                              className={inputBaseStyle}
                            >
                              <option value="">-- Pilih --</option>
                              <option value="A">A</option>
                              <option value="B">B</option>
                              <option value="AB">AB</option>
                              <option value="O">O</option>
                            </select>
                          </div>
                        </div>
                        {/* Form Tambahan Dinamis dari EO */}
                        {customFields && customFields.length > 0 && (
                          <div className="mt-6 pt-6 border-t border-slate-200">
                            <div className="flex items-center gap-2 mb-4">
                              <Info size={16} className="text-blue-600" />
                              <h4 className="font-bold text-slate-700 text-sm">
                                Informasi Tambahan (Wajib)
                              </h4>
                            </div>
                            <div className="bg-slate-900 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {customFields.map((field, fIdx) => (
                                <div
                                  key={fIdx}
                                  className={
                                    field.type === "textarea"
                                      ? "sm:col-span-2"
                                      : ""
                                  }
                                >
                                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                                    {field.label}
                                  </label>
                                  {field.type === "select" ? (
                                    <select
                                      required={field.required}
                                      onChange={(e) =>
                                        handleParticipantCustomChange(
                                          index,
                                          field.label,
                                          e.target.value,
                                        )
                                      }
                                      className={customInputBaseStyle}
                                    >
                                      <option value="">-- Pilih --</option>
                                      {field.options?.map(
                                        (opt: string, i: number) => (
                                          <option key={i} value={opt}>
                                            {opt}
                                          </option>
                                        ),
                                      )}
                                    </select>
                                  ) : field.type === "textarea" ? (
                                    <textarea
                                      required={field.required}
                                      onChange={(e) =>
                                        handleParticipantCustomChange(
                                          index,
                                          field.label,
                                          e.target.value,
                                        )
                                      }
                                      rows={2}
                                      className={`${customInputBaseStyle} resize-none`}
                                    />
                                  ) : (
                                    <input
                                      type={field.type}
                                      required={field.required}
                                      onChange={(e) =>
                                        handleParticipantCustomChange(
                                          index,
                                          field.label,
                                          e.target.value,
                                        )
                                      }
                                      className={customInputBaseStyle}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </form>
            </div>
          )}

          {/* STEP 3 & STEP 4 (Metode Pembayaran & Instruksi, Logikanya sama persis) */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  <ArrowLeft size={20} className="text-slate-600" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Metode Pembayaran
                  </h2>
                </div>
              </div>
              <label
                className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === "qris" ? "border-blue-600 bg-blue-50/30" : "border-slate-200 bg-white"}`}
              >
                <input
                  type="radio"
                  name="payment"
                  className="mt-1 hidden"
                  checked={paymentMethod === "qris"}
                  onChange={() => setPaymentMethod("qris")}
                />
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${paymentMethod === "qris" ? "border-blue-600" : "border-slate-300"}`}
                >
                  {paymentMethod === "qris" && (
                    <div className="w-3 h-3 rounded-full bg-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                    QRIS <QrCode size={18} className="text-pink-500" />
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Bayar instan menggunakan m-Banking atau e-Wallet.
                  </p>
                </div>
              </label>
            </div>
          )}
          {currentStep === 4 && (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={34} />
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Pesanan Berhasil Dibuat
                </h2>
                <p className="text-slate-500">Pesanan sudah tercatat. Pembayaran belum selesai sampai transaksi Anda berhasil dikonfirmasi.</p>
              </div>

              {paymentUxMessage && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-left">
                  <p className="text-sm font-semibold text-blue-900">
                    {paymentUxMessage}
                  </p>
                </div>
              )}

              {paymentSessions.length > 0 ? (
                <div className="space-y-3 text-left">
                  {paymentSessions.map((session) => (
                    <div
                      key={session.externalId}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Status Pembayaran
                          </p>
                          <p className="mt-1 font-bold text-slate-900">
                            {session.status}
                          </p>
                          <p className="mt-1 break-all font-mono text-[11px] text-slate-400">
                            {session.externalId}
                          </p>
                        </div>

                        {session.checkoutUrl ? (
                        <a
                          href={session.checkoutUrl}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700"
                        >
                          Lanjutkan Pembayaran
                          <ArrowRight size={18} />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            handleRetryPayment(
                              session.orderId,
                            )
                          }
                          disabled={
                            retryingPaymentOrderId ===
                            session.orderId
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {retryingPaymentOrderId ===
                          session.orderId
                            ? "Menyiapkan Pembayaran..."
                            : "Coba Lagi"}
                          <ArrowRight size={18} />
                        </button>
                      )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left">
                  <p className="font-bold text-amber-900">
                    Sesi pembayaran belum tersedia
                  </p>
                  <p className="mt-1 text-sm leading-6 text-amber-700">
                    Pesanan sudah berhasil dibuat, tetapi sesi pembayaran
                    belum tersedia. Silakan cek status pesanan Anda atau
                    coba kembali beberapa saat lagi.
                  </p>
                </div>
              )}

              <button
                onClick={() => router.push("/dashboard")}
                className="px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
              >
                Cek Status Pesanan Saya
              </button>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* BAGIAN KANAN: RINGKASAN PESANAN (STICKY) */}
        {/* ============================================================== */}
        <div className="w-full lg:w-1/3 lg:sticky lg:top-8">
          <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-200">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                <Receipt size={20} />
              </div>
              <h2 className="font-bold text-slate-800 text-lg">
                Ringkasan Pesanan
              </h2>
            </div>
            {totalQuantity > 0 ? (
              <div className="space-y-4 mb-6">
                {/* List Tiket */}
                {tickets.map((ticket) => {
                  const count = ticketCounts[ticket.id] || 0;
                  if (count === 0) return null;
                  return (
                    <div
                      key={ticket.id}
                      className="flex justify-between items-start text-sm"
                    >
                      <div className="pr-4">
                        <p className="font-bold text-slate-900">
                          {ticket.name}
                        </p>
                        <p className="text-slate-500 mt-0.5">{count}x Tiket</p>
                      </div>
                      <p className="font-bold text-slate-900 whitespace-nowrap">
                        Rp {(ticket.price * count).toLocaleString("id-ID")}
                      </p>
                    </div>
                  );
                })}

                {/* List Addons (Jika ada yang dipilih) */}
                {addons.some((a) => (addonCounts[a.id] || 0) > 0) && (
                  <div className="pt-2">
                    <p className="text-xs font-bold text-slate-400 mb-2 uppercase">
                      Ekstra Fasilitas
                    </p>
                    {addons.map((addon) => {
                      const count = addonCounts[addon.id] || 0;
                      if (count === 0) return null;
                      return (
                        <div
                          key={addon.id}
                          className="flex justify-between items-start text-sm mb-2"
                        >
                          <div className="pr-4">
                            <p className="font-medium text-slate-700">
                              {addon.name}
                            </p>
                            <p className="text-slate-500 text-xs">{count}x</p>
                          </div>
                          <p className="font-medium text-slate-700 whitespace-nowrap">
                            Rp {(addon.price * count).toLocaleString("id-ID")}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="pt-4 border-t border-dashed border-slate-200 mt-4">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-bold text-slate-500">
                      Jumlah Peserta
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {totalQuantity} Orang
                    </p>
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <p className="text-sm font-bold text-slate-500">
                      Total Tagihan
                    </p>
                    <p className="text-2xl font-black text-blue-700">
                      Rp {totalPrice.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 mb-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Ticket className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-sm text-slate-500 font-medium">
                  Pilih tiket terlebih dahulu
                  <br />
                  untuk melihat total harga.
                </p>
              </div>
            )}

            {/* TOMBOL AKSI BERDASARKAN STEP */}
            {currentStep === 1 && (
              <button
                onClick={handleProceedToStep2}
                disabled={totalQuantity === 0}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all disabled:bg-slate-200 flex items-center justify-center gap-2"
              >
                Lanjut Isi Data Peserta <ArrowRight size={18} />
              </button>
            )}
            {currentStep === 2 && (
              <button
                type="submit"
                form="participant-form"
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                Simpan & Lanjut Bayar <ArrowRight size={18} />
              </button>
            )}
            {currentStep === 3 && (
              <button
                onClick={handleSubmitOrder}
                disabled={isSubmitting || !paymentMethod}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2"
              >
                {isSubmitting ? "Memproses Transaksi..." : "Bayar Sekarang"}{" "}
                <CreditCard size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
