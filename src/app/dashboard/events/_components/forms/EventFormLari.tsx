"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  Plus,
  Trash2,
  Save,
  Send,
  Activity,
  Image as ImageIcon,
  Loader2,
  UserCheck,
  CheckCircle2,
  ListPlus,
  X,
  Footprints,
  Zap,
  Info,
  Camera,
  ShieldAlert,
  ShoppingCart,
  UtensilsCrossed,
  Bus,
  Building,
} from "lucide-react";
import { createEvent, updateEvent } from "../../../../actions/event";
import type {
  EventFormInitialData,
  FormFieldValue,
  JsonObject,
} from "@/lib/platform-types";
import Image from "next/image";

export interface TicketData {
  id: number | string;
  name: string;
  price: string;
  quota: string;
  elevation?: string;
  cot?: string;
  description?: string;
  requireApproval?: boolean;
}

export interface CustomField {
  id: number | string;
  label: string;
  helpText?: string;
  type: "text" | "number" | "select" | "file" | "textarea" | "date";
  required: boolean;
  targetCategoryIds: string[];
  options?: string[];
}

export interface AddonModule {
  id: string;
  type: "MERCHANDISE" | "CARBO_LOADING" | "SHUTTLE" | "HOTEL";
  name: string;
  price: string;
  quota: string;
  description: string;
  imageUrl?: string | null;
  details?: JsonObject; // Untuk data spesifik seperti ukuran baju, rute, dll
}

const formatDateTimeLocalJakarta = (
  value: string | Date | null | undefined,
): string => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [
      part.type,
      part.value,
    ]),
  );

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

interface EventFormProps {
  initialData?: EventFormInitialData;
  eventId?: string | null;
}

export default function EventFormLari({
  initialData,
  eventId,
}: EventFormProps) {
  const router = useRouter();

  // --------------------------------------------------------------------------
  // 1. STATE EVENT
  // --------------------------------------------------------------------------
  const initialStartDate = initialData?.startDate ?? initialData?.date;

  const [eventDetails, setEventDetails] = useState({
    name: initialData?.title || initialData?.name || "",
    category: initialData?.category || "Lari / Maraton",
    startDate: formatDateTimeLocalJakarta(initialStartDate),
    endDate: formatDateTimeLocalJakarta(initialData?.endDate),
    location: initialData?.location || initialData?.locationName || "",
    mapsUrl: initialData?.mapsUrl || "",
    description: initialData?.description || "",
    rules: initialData?.rules || "",
    contactName: initialData?.contactName || "",
    contactPhone: initialData?.contactPhone || "",
  });

  const [posterPreview, setPosterPreview] = useState<string | null>(
    initialData?.posterUrl || null,
  );
  const posterInputRef = useRef<HTMLInputElement>(null);

  const [logoPreview, setLogoPreview] = useState<string | null>(
    initialData?.logoUrl || null,
  );
  const logoInputRef = useRef<HTMLInputElement>(null);

  // --------------------------------------------------------------------------
  // 2. STATE TIKET & KATEGORI
  // --------------------------------------------------------------------------
  const initialCategories = Array.isArray(initialData?.categories)
    ? (initialData?.categories as unknown as TicketData[])
    : [];
  const initialCustomFields = Array.isArray(initialData?.customFields)
    ? (initialData?.customFields as unknown as CustomField[])
    : [];
  const initialAddons = Array.isArray(initialData?.addons)
    ? (initialData?.addons as unknown as AddonModule[])
    : [];

  const [tickets, setTickets] = useState<TicketData[]>(
    initialCategories.length > 0
      ? initialCategories
      : [
          {
            id: "ticket-1",
            name: "",
            price: "",
            quota: "",
            elevation: "",
            cot: "",
            description: "",
            requireApproval: false,
          },
        ],
  );

  // --------------------------------------------------------------------------
  // 3. STATE CUSTOM FIELDS
  // --------------------------------------------------------------------------
  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialCustomFields.length > 0
      ? initialCustomFields
      : [
          {
            id: "cf-1",
            label: "Nama di BIB (Nomor Dada)",
            helpText:
              "Maksimal 10 Huruf. Nama ini akan dicetak di nomor dada Anda.",
            type: "text",
            required: true,
            targetCategoryIds: ["ALL"],
          },
          {
            id: "cf-2",
            label: "Tanggal Lahir (Date of Birth)",
            helpText: "",
            type: "date",
            required: true,
            targetCategoryIds: ["ALL"],
          },
        ],
  );
  const [newOptTexts, setNewOptTexts] = useState<Record<string, string>>({});

  // --------------------------------------------------------------------------
  // 4. STATE ADDON MODULES
  // --------------------------------------------------------------------------
  const [addons, setAddons] = useState<AddonModule[]>(initialAddons);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // --------------------------------------------------------------------------
  // HANDLERS UMUM & MEDIA
  // --------------------------------------------------------------------------
  const handleDetailChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setEventDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleMediaUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setPreview: React.Dispatch<React.SetStateAction<string | null>>,
    maxSizeMb: number,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > maxSizeMb * 1024 * 1024) {
        alert(
          `Ukuran maksimal file adalah ${maxSizeMb}MB! Silakan kompres gambar Anda.`,
        );
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAddonImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    addonId: string,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAddons(
          addons.map((a) =>
            a.id === addonId ? { ...a, imageUrl: reader.result as string } : a,
          ),
        );
      };
      reader.readAsDataURL(file);
    }
  };

  // --------------------------------------------------------------------------
  // HANDLERS TIKET
  // --------------------------------------------------------------------------
  const updateTicket = (
    id: number | string,
    field: keyof TicketData,
    value: FormFieldValue,
  ) => {
    setTickets(
      tickets.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    );
  };
  const addTicket = () =>
    setTickets([
      ...tickets,
      {
        id: `ticket-${Date.now()}`,
        name: "",
        price: "",
        quota: "",
        elevation: "",
        cot: "",
        description: "",
        requireApproval: false,
      },
    ]);
  const removeTicket = (id: number | string) => {
    if (tickets.length > 1) setTickets(tickets.filter((t) => t.id !== id));
  };

  // --------------------------------------------------------------------------
  // HANDLERS CUSTOM FIELDS
  // --------------------------------------------------------------------------
  const addCustomField = () =>
    setCustomFields([
      ...customFields,
      {
        id: Date.now(),
        label: "",
        helpText: "",
        type: "text",
        required: false,
        targetCategoryIds: ["ALL"],
        options: [],
      },
    ]);

  const addPresetField = (presetType: string) => {
    const baseId = Date.now();
    let newFields: CustomField[] = [];
    switch (presetType) {
      case "bib":
        newFields = [
          {
            id: baseId,
            label: "Nama di BIB (Nomor Dada)",
            helpText: "Maksimal 10 Huruf.",
            type: "text",
            required: true,
            targetCategoryIds: ["ALL"],
          },
        ];
        break;
      case "qualification":
        newFields = [
          {
            id: baseId,
            label: "Link Kualifikasi (Strava/Result)",
            helpText: "Lampirkan link result lomba lari atau strava record.",
            type: "text",
            required: true,
            targetCategoryIds: ["ALL"],
          },
        ];
        break;
      case "medical":
        newFields = [
          {
            id: baseId,
            label: "Kondisi Medis Khusus",
            helpText: "Tulis riwayat penyakit. Jika tidak ada, isi strip (-).",
            type: "text",
            required: true,
            targetCategoryIds: ["ALL"],
          },
        ];
        break;
      case "identity":
        newFields = [
          {
            id: baseId,
            label: "Tipe Identitas",
            type: "select",
            required: true,
            targetCategoryIds: ["ALL"],
            options: ["KTP", "Paspor", "SIM"],
          },
          {
            id: baseId + 1,
            label: "Nomor Identitas (NIK)",
            type: "number",
            required: true,
            targetCategoryIds: ["ALL"],
          },
        ];
        break;
      case "dob":
        newFields = [
          {
            id: baseId,
            label: "Tanggal Lahir (Date of Birth)",
            type: "date",
            required: true,
            targetCategoryIds: ["ALL"],
          },
        ];
        break;
      case "emergency":
        newFields = [
          {
            id: baseId,
            label: "Nama Kontak Darurat",
            type: "text",
            required: true,
            targetCategoryIds: ["ALL"],
          },
          {
            id: baseId + 1,
            label: "No. HP Kontak Darurat",
            type: "number",
            required: true,
            targetCategoryIds: ["ALL"],
          },
        ];
        break;
    }
    setCustomFields([...customFields, ...newFields]);
  };

  const updateCustomField = (
    id: number | string,
    field: keyof CustomField,
    value: FormFieldValue,
  ) =>
    setCustomFields(
      customFields.map((f) => (f.id === id ? { ...f, [field]: value } : f)),
    );
  const removeCustomField = (id: number | string) =>
    setCustomFields(customFields.filter((f) => f.id !== id));
  const addDropdownOption = (fieldId: number | string, optionText: string) => {
    if (optionText.trim())
      setCustomFields(
        customFields.map((f) =>
          f.id === fieldId
            ? { ...f, options: [...(f.options || []), optionText.trim()] }
            : f,
        ),
      );
  };
  const removeDropdownOption = (fieldId: number | string, optIdx: number) =>
    setCustomFields(
      customFields.map((f) =>
        f.id === fieldId
          ? {
              ...f,
              options: (f.options || []).filter((_, idx) => idx !== optIdx),
            }
          : f,
      ),
    );
  const toggleCategoryForField = (
    fieldId: number | string,
    categoryId: string,
  ) => {
    setCustomFields(
      customFields.map((f) => {
        if (f.id === fieldId) {
          let updatedTargets =
            categoryId === "ALL"
              ? ["ALL"]
              : f.targetCategoryIds.filter((c) => c !== "ALL");
          if (categoryId !== "ALL") {
            updatedTargets = updatedTargets.includes(categoryId)
              ? updatedTargets.filter((c) => c !== categoryId)
              : [...updatedTargets, categoryId];
            if (updatedTargets.length === 0) updatedTargets = ["ALL"];
          }
          return { ...f, targetCategoryIds: updatedTargets };
        }
        return f;
      }),
    );
  };

  // --------------------------------------------------------------------------
  // HANDLERS ADDON MODULES
  // --------------------------------------------------------------------------
  const addAddonModule = (type: AddonModule["type"]) => {
    setAddons([
      ...addons,
      {
        id: `addon-${Date.now()}`,
        type,
        name: "",
        price: "",
        quota: "",
        description: "",
        details: {},
      },
    ]);
  };
  const updateAddon = (
    id: string,
    field: keyof AddonModule,
    value: FormFieldValue,
  ) => {
    setAddons(addons.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  };
  const removeAddon = (id: string) =>
    setAddons(addons.filter((a) => a.id !== id));

  // --------------------------------------------------------------------------
  // SUBMIT HANDLER
  // --------------------------------------------------------------------------
  const handleSubmit = async (
    e: React.FormEvent,
    submissionMode: "DRAFT" | "SUBMIT_REVIEW",
  ) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        title: eventDetails.name,
        category: eventDetails.category,
        date: eventDetails.startDate,
        endDate: eventDetails.endDate,
        locationName: eventDetails.location,
        location: eventDetails.location,
        mapsUrl: eventDetails.mapsUrl,
        description: eventDetails.description,
        rules: eventDetails.rules,
        contactName: eventDetails.contactName,
        contactPhone: eventDetails.contactPhone,
        imageUrl: posterPreview,
        logoUrl: logoPreview,
        categories: tickets, // includes elevation, cot, requireApproval
        customFields: customFields,
        addons: addons,
      };
      const result = eventId
        ? await updateEvent(eventId, payload, submissionMode)
        : await createEvent(payload, submissionMode);
      if (!result.success)
        throw new Error(result.error || "Gagal memproses event");
      router.push(
        eventId ? `/dashboard/events/${eventId}` : "/dashboard/events",
      );
      router.refresh();
    } catch (error: unknown) {
      alert(
        `Terjadi kesalahan: ${error instanceof Error ? error.message : "Terjadi kesalahan"}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDynamicInputStyle = (val: string | number) => {
    const isFilled = val !== "" && val !== undefined && val !== null;
    return `w-full rounded-xl px-4 py-3 outline-none transition-all duration-200 placeholder:text-slate-400 placeholder:font-normal ${
      isFilled
        ? "bg-white border-2 border-slate-600 shadow-sm text-slate-950 font-black" // <-- Warna teks diubah ke hitam pekat (slate-950) dan lebih tebal
        : "bg-slate-50 border-2 border-slate-200 text-slate-800 font-medium focus:bg-white focus:border-blue-600 focus:text-slate-950 focus:font-bold"
    }`;
  };

  return (
    <form
      onKeyDown={(e) => {
        if (
          e.key === "Enter" &&
          (e.target as HTMLElement).tagName !== "TEXTAREA"
        )
          e.preventDefault();
      }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-10 max-w-6xl mx-auto"
    >
      <div className="lg:col-span-12 space-y-10">
        {/* ========================================== */}
        {/* HEADER PREVIEW: POSTER & LOGO DI ATAS      */}
        {/* ========================================== */}
        <section className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <ImageIcon size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Visual Event (Banner & Logo)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Tampilan ini akan menjadi wajah event Anda di halaman
                pendaftaran.
              </p>
            </div>
          </div>

          <div className="relative w-full bg-slate-100 rounded-3xl border-2 border-dashed border-slate-300 overflow-hidden group">
            <input
              type="file"
              ref={posterInputRef}
              accept="image/jpeg, image/png"
              onChange={(e) => handleMediaUpload(e, setPosterPreview, 5)}
              className="hidden"
            />
            <input
              type="file"
              ref={logoInputRef}
              accept="image/jpeg, image/png"
              onChange={(e) => handleMediaUpload(e, setLogoPreview, 5)}
              className="hidden"
            />

            {posterPreview ? (
              <div className="relative w-full h-48 sm:h-72 md:h-96">
                <Image
                  src={posterPreview}
                  width={1200}
                  height={700}
                  alt="Poster Event"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => posterInputRef.current?.click()}
                    className="px-5 py-2.5 bg-white text-slate-900 font-bold rounded-xl shadow-lg flex items-center gap-2 hover:bg-slate-100 transition-colors"
                  >
                    <Camera size={18} /> Ganti Poster Event
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="w-full h-48 sm:h-72 md:h-96 flex flex-col items-center justify-center text-center p-6 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                onClick={() => posterInputRef.current?.click()}
              >
                <UploadCloud size={36} className="text-slate-400 mb-3" />
                <h3 className="text-sm font-bold text-slate-700">
                  Upload Poster / Banner Event
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Rekomendasi 1080x1350px (Rasio 4:5). Maksimal 5MB.
                </p>
              </div>
            )}

            <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 md:bottom-8 md:left-8 z-10 group/logo">
              {logoPreview ? (
                <div className="relative">
                  <Image
                    src={logoPreview}
                    width={120}
                    height={120}
                    alt="Logo Penyelenggara"
                    className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full border-4 border-white shadow-xl object-cover bg-white"
                  />
                  <div
                    className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Camera size={24} className="text-white" />
                  </div>
                </div>
              ) : (
                <div
                  className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full border-4 border-white border-dashed bg-slate-200/90 shadow-xl flex flex-col items-center justify-center text-center p-2 cursor-pointer hover:bg-slate-300 transition-colors backdrop-blur-sm"
                  onClick={() => logoInputRef.current?.click()}
                >
                  <ImageIcon size={20} className="text-slate-500 mb-1" />
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-600 leading-tight">
                    Upload Logo
                    <br />
                    (Maks 5MB)
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ========================================== */}
        {/* SEKSI 1: INFORMASI UTAMA EVENT             */}
        {/* ========================================== */}
        <section className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-slate-200/80 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Activity size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">
                1. Informasi Detail Event Lari
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Lengkapi identitas dasar dan lokasi perlombaan Anda.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">
                Nama Event <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                value={eventDetails.name}
                onChange={handleDetailChange}
                placeholder="Contoh: Merbabu Trail Run 2026"
                required
                className={getDynamicInputStyle(eventDetails.name)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">
                  Waktu Flag-Off (Mulai) <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="startDate"
                  value={eventDetails.startDate}
                  onChange={handleDetailChange}
                  required
                  className={getDynamicInputStyle(eventDetails.startDate)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">
                  Waktu Cut-Off (Selesai)
                </label>
                <input
                  type="datetime-local"
                  name="endDate"
                  value={eventDetails.endDate}
                  onChange={handleDetailChange}
                  className={getDynamicInputStyle(eventDetails.endDate)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">
                  Lokasi Race Central <span className="text-red-500">*</span>
                </label>
                <input
                  name="location"
                  value={eventDetails.location}
                  onChange={handleDetailChange}
                  placeholder="Contoh: Lapangan Rampal, Malang"
                  required
                  className={getDynamicInputStyle(eventDetails.location)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">
                  Link G-Maps (Opsional)
                </label>
                <input
                  name="mapsUrl"
                  value={eventDetails.mapsUrl}
                  onChange={handleDetailChange}
                  placeholder="Tempelkan tautan (link) Google Maps lokasi event di sini"
                  className={getDynamicInputStyle(eventDetails.mapsUrl)}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ========================================== */}
        {/* SEKSI 2: KATEGORI TIKET / JARAK LARI       */}
        {/* ========================================== */}
        <section className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-slate-200/80 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Footprints size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">
                2. Kategori Jarak & Tiket
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Buat pilihan jarak lari (misal 5K, 10K, HM) beserta detail
                elevasi, COT, dan harga.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {tickets.map((ticket, idx) => (
              <div
                key={ticket.id}
                className={`p-5 md:p-6 border-2 rounded-2xl space-y-5 relative transition-all ${ticket.name || ticket.price ? "border-blue-300 bg-blue-50/20" : "border-slate-200 bg-slate-50"}`}
              >
                <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                  <span className="text-sm font-black text-blue-700 uppercase bg-blue-100 px-3 py-1 rounded-lg">
                    Kategori #{idx + 1}
                  </span>
                  {tickets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTicket(ticket.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Nama Jarak/Kategori
                    </label>
                    <input
                      type="text"
                      required
                      value={ticket.name}
                      onChange={(e) =>
                        updateTicket(ticket.id, "name", e.target.value)
                      }
                      placeholder="Contoh: 7K LOCAL"
                      className={`w-full mt-1 px-4 py-3 rounded-xl text-sm outline-none transition-all ${ticket.name ? "border-2 border-blue-600 text-blue-950 font-bold bg-white" : "border-2 border-slate-200 bg-white focus:border-blue-600"}`}
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Harga (Rp)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={ticket.price}
                      onChange={(e) =>
                        updateTicket(ticket.id, "price", e.target.value)
                      }
                      placeholder="Contoh: 400000"
                      className={`w-full mt-1 px-4 py-3 rounded-xl text-sm outline-none transition-all ${ticket.price ? "border-2 border-blue-600 text-blue-950 font-bold bg-white" : "border-2 border-slate-200 bg-white focus:border-blue-600"}`}
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Kuota/Slot
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={ticket.quota}
                      onChange={(e) =>
                        updateTicket(ticket.id, "quota", e.target.value)
                      }
                      placeholder="Contoh: 500"
                      className={`w-full mt-1 px-4 py-3 rounded-xl text-sm outline-none transition-all ${ticket.quota ? "border-2 border-blue-600 text-blue-950 font-bold bg-white" : "border-2 border-slate-200 bg-white focus:border-blue-600"}`}
                    />
                  </div>

                  {/* Additional Specs */}
                  <div className="md:col-span-6">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Elevasi (Elevation Gain)
                    </label>
                    <input
                      type="text"
                      value={ticket.elevation || ""}
                      onChange={(e) =>
                        updateTicket(ticket.id, "elevation", e.target.value)
                      }
                      placeholder="Contoh: 300m"
                      className={`w-full mt-1 px-4 py-3 rounded-xl text-sm outline-none transition-all border-2 border-slate-200 bg-white focus:border-blue-600`}
                    />
                  </div>
                  <div className="md:col-span-6">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      COT (Cut-Off Time)
                    </label>
                    <input
                      type="text"
                      value={ticket.cot || ""}
                      onChange={(e) =>
                        updateTicket(ticket.id, "cot", e.target.value)
                      }
                      placeholder="Contoh: 3 Hours"
                      className={`w-full mt-1 px-4 py-3 rounded-xl text-sm outline-none transition-all border-2 border-slate-200 bg-white focus:border-blue-600`}
                    />
                  </div>

                  <div className="md:col-span-12">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Deskripsi Tambahan
                    </label>
                    <textarea
                      value={ticket.description || ""}
                      onChange={(e) =>
                        updateTicket(ticket.id, "description", e.target.value)
                      }
                      placeholder="Contoh: Link Qualification Required! We ask for your honesty..."
                      rows={2}
                      className={`w-full mt-1 px-4 py-3 rounded-xl text-sm outline-none transition-all border-2 border-slate-200 bg-white focus:border-blue-600 resize-none`}
                    />
                  </div>
                </div>

                {/* Togle Approval */}
                <div className="pt-2">
                  <label
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${ticket.requireApproval ? "border-red-400 bg-red-50 text-red-900" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                  >
                    <input
                      type="checkbox"
                      checked={ticket.requireApproval || false}
                      onChange={(e) =>
                        updateTicket(
                          ticket.id,
                          "requireApproval",
                          e.target.checked,
                        )
                      }
                      className="w-5 h-5 rounded text-red-600 focus:ring-red-600 border-slate-300 cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold flex items-center gap-2">
                        <ShieldAlert size={16} /> Wajib Verifikasi Kualifikasi
                        (Manual Approval)
                      </span>
                      <span className="text-[11px] font-medium opacity-80 mt-0.5">
                        Jika aktif, pendaftar akan berstatus PENDING di
                        dashboard. EO berhak mengecek kualifikasi dan menekan
                        tombol APPROVE/CANCEL. Keputusan otomatis dikirim via
                        email/WA ke peserta.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addTicket}
              className="w-full py-4 border-2 border-dashed border-slate-300 text-slate-600 rounded-2xl hover:border-blue-600 hover:bg-blue-50/50 hover:text-blue-600 flex items-center justify-center gap-2 font-bold text-sm transition-all"
            >
              <Plus size={18} /> Tambah Kategori Jarak Baru
            </button>
          </div>
        </section>

        {/* ========================================== */}
        {/* SEKSI 3: FORMULIR PELARI                   */}
        {/* ========================================== */}
        <section className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-slate-200/80 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <UserCheck size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">
                3. Formulir Data Peserta (Pendaftaran)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Tentukan data tambahan spesifik yang wajib diisi peserta untuk
                event Anda.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-5 bg-blue-50/40 border border-blue-100 rounded-2xl space-y-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-blue-600" /> Basic
                Information (Tercatat Otomatis)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sistem kami otomatis meminta Nama, Email, No. WA, Ukuran Jersey,
                Gol. Darah, Jenis Kelamin, Provinsi, & Kota.
              </p>
            </div>

            <div className="p-4 border border-amber-200 bg-amber-50 rounded-2xl">
              <h4 className="text-xs font-black text-amber-800 uppercase flex items-center gap-2 mb-3">
                <Zap size={14} className="fill-amber-500 text-amber-500" />{" "}
                Tambah Pertanyaan Standar (Instan)
              </h4>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => addPresetField("bib")}
                  className="px-3 py-2 bg-white border border-amber-200 hover:border-amber-400 text-amber-700 text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  + Nama di BIB
                </button>
                <button
                  type="button"
                  onClick={() => addPresetField("dob")}
                  className="px-3 py-2 bg-white border border-amber-200 hover:border-amber-400 text-amber-700 text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  + Tanggal Lahir
                </button>
                <button
                  type="button"
                  onClick={() => addPresetField("qualification")}
                  className="px-3 py-2 bg-white border border-amber-200 hover:border-amber-400 text-amber-700 text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  + Link Kualifikasi
                </button>
                <button
                  type="button"
                  onClick={() => addPresetField("medical")}
                  className="px-3 py-2 bg-white border border-amber-200 hover:border-amber-400 text-amber-700 text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  + Riwayat Medis
                </button>
                <button
                  type="button"
                  onClick={() => addPresetField("identity")}
                  className="px-3 py-2 bg-white border border-amber-200 hover:border-amber-400 text-amber-700 text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  + Data NIK/KTP
                </button>
                <button
                  type="button"
                  onClick={() => addPresetField("emergency")}
                  className="px-3 py-2 bg-white border border-amber-200 hover:border-amber-400 text-amber-700 text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  + Kontak Darurat
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-3 px-1">
                Pertanyaan Tambahan (Custom Fields)
              </h3>
              <div className="space-y-4">
                {customFields.map((field) => (
                  <div
                    key={field.id}
                    className={`p-5 border-2 rounded-3xl space-y-4 transition-all ${field.label ? "border-blue-300 bg-blue-50/10" : "border-slate-200 bg-slate-50"}`}
                  >
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                      <div className="flex-1 w-full space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            required
                            value={field.label}
                            onChange={(e) =>
                              updateCustomField(
                                field.id,
                                "label",
                                e.target.value,
                              )
                            }
                            placeholder="Tuliskan pertanyaan di sini..."
                            className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-all border-2 ${field.label ? "border-blue-600 text-blue-950 font-bold bg-white" : "border-slate-200 text-slate-800 bg-white focus:border-blue-600"}`}
                          />
                          <select
                            value={field.type}
                            onChange={(e) =>
                              updateCustomField(
                                field.id,
                                "type",
                                e.target.value as string,
                              )
                            }
                            className="px-4 py-3 border-2 border-slate-200 rounded-xl bg-white text-xs text-slate-800 outline-none focus:border-blue-600 font-bold cursor-pointer"
                          >
                            <option value="text">Teks Singkat</option>
                            <option value="textarea">Teks Panjang</option>
                            <option value="number">Angka Saja</option>
                            <option value="date">Format Tanggal</option>
                            <option value="select">Dropdown</option>
                            <option value="file">Upload File</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) =>
                              updateCustomField(
                                field.id,
                                "required",
                                e.target.checked,
                              )
                            }
                            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-600 border-slate-300 cursor-pointer"
                          />{" "}
                          Wajib
                        </label>
                        <button
                          type="button"
                          onClick={() => removeCustomField(field.id)}
                          className="text-slate-400 hover:text-red-500 p-2 transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 items-start bg-white p-3 rounded-xl border-2 border-slate-200 focus-within:border-blue-400 transition-colors">
                      <Info
                        size={18}
                        className="text-slate-400 mt-0.5 shrink-0"
                      />
                      <input
                        type="text"
                        value={field.helpText || ""}
                        onChange={(e) =>
                          updateCustomField(
                            field.id,
                            "helpText",
                            e.target.value,
                          )
                        }
                        placeholder="Instruksi tambahan (Opsional)..."
                        className={`w-full text-xs outline-none bg-transparent placeholder:text-slate-400 ${field.helpText ? "text-blue-900 font-semibold" : "text-slate-600"}`}
                      />
                    </div>

                    <div className="pt-2 border-t border-slate-200/60">
                      <span className="text-[10px] font-black uppercase text-slate-500 block mb-2">
                        Terapkan Pada Kategori:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            toggleCategoryForField(field.id, "ALL")
                          }
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${field.targetCategoryIds.includes("ALL") ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"}`}
                        >
                          Semua Jarak
                        </button>
                        {tickets.map((t) => {
                          const isSelected =
                            !field.targetCategoryIds.includes("ALL") &&
                            field.targetCategoryIds.includes(t.id.toString());
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() =>
                                toggleCategoryForField(
                                  field.id,
                                  t.id.toString(),
                                )
                              }
                              className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${isSelected ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"}`}
                            >
                              {t.name || "Belum Diberi Nama"}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {field.type === "select" && (
                      <div className="p-4 bg-white border-2 border-slate-200 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                          <ListPlus size={16} className="text-blue-600" />
                          <span>Opsi Dropdown:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(field.options || []).map((opt, optIdx) => (
                            <span
                              key={optIdx}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                            >
                              {opt}
                              <button
                                type="button"
                                onClick={() =>
                                  removeDropdownOption(field.id, optIdx)
                                }
                                className="text-slate-400 hover:text-red-500"
                              >
                                <X size={14} />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newOptTexts[field.id] || ""}
                            onChange={(e) =>
                              setNewOptTexts((prev) => ({
                                ...prev,
                                [field.id]: e.target.value,
                              }))
                            }
                            placeholder="Ketik pilihan..."
                            className="flex-1 px-4 py-2 border-2 border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-600"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              addDropdownOption(
                                field.id,
                                newOptTexts[field.id] || "",
                              );
                              setNewOptTexts((prev) => ({
                                ...prev,
                                [field.id]: "",
                              }));
                            }}
                            className="px-5 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900 transition-colors"
                          >
                            Tambah
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={addCustomField}
              className="w-full py-4 border-2 border-dashed border-slate-300 text-slate-600 rounded-2xl hover:border-blue-600 hover:bg-blue-50/50 hover:text-blue-600 flex items-center justify-center gap-2 font-bold text-sm transition-all"
            >
              <Plus size={18} /> Buat Pertanyaan Kustom (Kosong)
            </button>
          </div>
        </section>

        {/* ========================================== */}
        {/* SEKSI 4: MODUL EKSTRA / ADD-ONS (BARU)     */}
        {/* ========================================== */}
        <section className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-slate-200/80 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <ShoppingCart size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  4. Modul Ekstra / Add-ons
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Tambahkan penjualan Merchandise, Carbo Loading, Shuttle, atau
                  Hotel.
                </p>
              </div>
            </div>
          </div>

          {/* Tombol Pilihan Modul */}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => addAddonModule("MERCHANDISE")}
              className="flex-1 min-w-37.5 flex items-center justify-center gap-2 py-3 px-4 bg-white border border-indigo-200 hover:border-indigo-500 text-indigo-700 text-sm font-bold rounded-xl shadow-sm transition-all hover:bg-indigo-50"
            >
              <ShoppingCart size={16} /> Merchandise
            </button>
            <button
              type="button"
              onClick={() => addAddonModule("CARBO_LOADING")}
              className="flex-1 min-w-37.5 flex items-center justify-center gap-2 py-3 px-4 bg-white border border-indigo-200 hover:border-indigo-500 text-indigo-700 text-sm font-bold rounded-xl shadow-sm transition-all hover:bg-indigo-50"
            >
              <UtensilsCrossed size={16} /> Carbo Loading
            </button>
            <button
              type="button"
              onClick={() => addAddonModule("SHUTTLE")}
              className="flex-1 min-w-37.5 flex items-center justify-center gap-2 py-3 px-4 bg-white border border-indigo-200 hover:border-indigo-500 text-indigo-700 text-sm font-bold rounded-xl shadow-sm transition-all hover:bg-indigo-50"
            >
              <Bus size={16} /> Shuttle Bus
            </button>
            <button
              type="button"
              onClick={() => addAddonModule("HOTEL")}
              className="flex-1 min-w-37.5 flex items-center justify-center gap-2 py-3 px-4 bg-white border border-indigo-200 hover:border-indigo-500 text-indigo-700 text-sm font-bold rounded-xl shadow-sm transition-all hover:bg-indigo-50"
            >
              <Building size={16} /> Hotel Partner
            </button>
          </div>

          <div className="space-y-6 pt-4">
            {addons.map((addon) => (
              <div
                key={addon.id}
                className="p-5 md:p-6 border-2 border-indigo-100 bg-indigo-50/20 rounded-3xl space-y-5 relative"
              >
                <div className="flex justify-between items-center border-b border-indigo-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-indigo-700 uppercase bg-indigo-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                      {addon.type === "MERCHANDISE" && (
                        <>
                          <ShoppingCart size={14} /> Merchandise
                        </>
                      )}
                      {addon.type === "CARBO_LOADING" && (
                        <>
                          <UtensilsCrossed size={14} /> Carbo Loading
                        </>
                      )}
                      {addon.type === "SHUTTLE" && (
                        <>
                          <Bus size={14} /> Shuttle Bus
                        </>
                      )}
                      {addon.type === "HOTEL" && (
                        <>
                          <Building size={14} /> Hotel Partner
                        </>
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAddon(addon.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  {/* Gambar (Jika Merchandise atau Carbo Loading) */}
                  {(addon.type === "MERCHANDISE" ||
                    addon.type === "CARBO_LOADING") && (
                    <div className="md:col-span-12">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">
                        Upload Poster/Katalog{" "}
                        {addon.type === "MERCHANDISE" ? "Merch" : "Menu"}
                      </label>
                      <div className="flex items-center gap-4">
                        {addon.imageUrl ? (
                          <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-indigo-200 relative group">
                            <Image
                              src={addon.imageUrl}
                              alt="Preview gambar addon"
                              fill
                              sizes="96px"
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                              <label className="cursor-pointer text-white">
                                <Camera size={18} />
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) =>
                                    handleAddonImageUpload(e, addon.id)
                                  }
                                />
                              </label>
                            </div>
                          </div>
                        ) : (
                          <label className="w-24 h-24 rounded-xl border-2 border-dashed border-indigo-300 bg-white flex flex-col items-center justify-center text-indigo-400 cursor-pointer hover:bg-indigo-50 transition-colors">
                            <ImageIcon size={24} className="mb-1" />
                            <span className="text-[9px] font-bold">Upload</span>
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) =>
                                handleAddonImageUpload(e, addon.id)
                              }
                            />
                          </label>
                        )}
                        <span className="text-xs text-slate-500 flex-1">
                          Format JPG/PNG. Maks 2MB. Gambar ini akan muncul di
                          halaman pemesanan *add-on*.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Inputs Umum */}
                  <div className="md:col-span-6">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Nama Item/Paket
                    </label>
                    <input
                      type="text"
                      required
                      value={addon.name}
                      onChange={(e) =>
                        updateAddon(addon.id, "name", e.target.value)
                      }
                      placeholder={
                        addon.type === "HOTEL"
                          ? "Nama Hotel & Tipe Kamar"
                          : addon.type === "SHUTTLE"
                            ? "Rute (Misal: Stasiun - Race Central)"
                            : "Nama Produk / Paket"
                      }
                      className="w-full mt-1 px-4 py-3 rounded-xl text-sm outline-none border-2 border-slate-200 bg-white focus:border-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Harga (Rp)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={addon.price}
                      onChange={(e) =>
                        updateAddon(addon.id, "price", e.target.value)
                      }
                      placeholder="0"
                      className="w-full mt-1 px-4 py-3 rounded-xl text-sm outline-none border-2 border-slate-200 bg-white focus:border-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Stok/Kuota (Opsional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={addon.quota}
                      onChange={(e) =>
                        updateAddon(addon.id, "quota", e.target.value)
                      }
                      placeholder="Tak terbatas"
                      className="w-full mt-1 px-4 py-3 rounded-xl text-sm outline-none border-2 border-slate-200 bg-white focus:border-indigo-500"
                    />
                  </div>

                  <div className="md:col-span-12">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Deskripsi Detail
                    </label>
                    <textarea
                      value={addon.description}
                      onChange={(e) =>
                        updateAddon(addon.id, "description", e.target.value)
                      }
                      placeholder={
                        addon.type === "HOTEL"
                          ? "Fasilitas (Misal: Termasuk Breakfast, Maks 2 Pax)..."
                          : "Keterangan lengkap..."
                      }
                      rows={2}
                      className="w-full mt-1 px-4 py-3 rounded-xl text-sm outline-none border-2 border-slate-200 bg-white focus:border-indigo-500 resize-none"
                    />
                  </div>
                </div>
              </div>
            ))}
            {addons.length === 0 && (
              <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                <p className="text-sm font-medium text-slate-500">
                  Belum ada modul ekstra yang ditambahkan. Klik tombol di atas
                  untuk menambah.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ========================================== */}
        {/* ACTION WORKFLOW                            */}
        {/* ========================================== */}
        <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={(event) => void handleSubmit(event, "DRAFT")}
            className="w-full py-4 rounded-2xl border-2 border-slate-200 bg-white text-slate-700 font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={22} />
            Simpan Draft
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={(event) => void handleSubmit(event, "SUBMIT_REVIEW")}
            className={`w-full py-4 rounded-2xl text-white font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl transition-all ${
              isSubmitting
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-linear-to-r from-blue-700 to-blue-500 hover:shadow-2xl hover:-translate-y-1 cursor-pointer"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={22} className="animate-spin" />
                Menyimpan Event...
              </>
            ) : (
              <>
                <Send size={22} />
                Kirim untuk Review
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
