"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import EventPreviewMockup from "../EventPreviewMockup";
import type { FormFieldValue } from "@/lib/platform-types";
import {
  UploadCloud,
  Plus,
  Trash2,
  Save,
  Waves,
  ShieldAlert,
  ClipboardList,
  Image as ImageIcon,
  Loader2,
  X,
  Droplets,
} from "lucide-react";
import { createEvent } from "../../../../actions/event"; // Pastikan path ini sesuai dengan struktur Anda

export interface TicketData {
  id: number | string;
  name: string;
  price: string;
  quota: string;
  description?: string;
}

export interface CustomField {
  id: number | string;
  label: string;
  type: "text" | "number" | "select" | "file";
  required: boolean;
  targetCategoryIds: string[];
  options?: string[];
}

export default function EventFormRenang() {
  const router = useRouter();

  // STATE EVENT (PRESET KHUSUS RENANG / AQUATICS)
  const [eventDetails, setEventDetails] = useState({
    name: "",
    category: "Renang / Aquatics",
    poolType: "50m Long Course (Olympic Size)", // Fitur khusus Renang
    timingSystem: "Electronic Touchpad (AOD)", // Sistem pencatatan waktu
    startDate: "",
    endDate: "",
    location: "",
    mapsUrl: "",
    description: "",
    rules:
      "1. Perlombaan menggunakan regulasi FINA/World Aquatics terbaru.\n2. Pakaian renang harus sesuai standar yang diizinkan.\n3. Keputusan wasit (Referee) adalah mutlak.",
    contactName: "",
    contactPhone: "",
    requireBookerInfo: true,
    allowCopyBookerData: true,
  });

  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // STATE TIKET DEFAULT (KATEGORI GAYA & JARAK)
  const [tickets, setTickets] = useState<TicketData[]>([
    {
      id: "ticket-1",
      name: "50m Gaya Bebas (Freestyle) - Putra",
      price: "100000",
      quota: "100",
      description: "Kategori Usia Terbuka (Open)",
    },
    {
      id: "ticket-2",
      name: "100m Gaya Dada (Breaststroke) - Putri",
      price: "100000",
      quota: "80",
      description: "Kategori Usia Terbuka (Open)",
    },
  ]);

  // STATE CUSTOM FIELD PRESET (STANDAR LOMBA RENANG INTERNASIONAL)
  const [customFields, setCustomFields] = useState<CustomField[]>([
    {
      id: 201,
      label: "Asal Klub / Afiliasi (Club Name)",
      type: "text",
      required: true,
      targetCategoryIds: ["ALL"],
    },
    {
      id: 202,
      label: "Seed Time / Waktu Terbaik (Format MM:SS.ms)",
      type: "text",
      required: true,
      targetCategoryIds: ["ALL"],
    },
    {
      id: 203,
      label: "Nomor Registrasi Federasi / FINA ID",
      type: "text",
      required: false,
      targetCategoryIds: ["ALL"],
    },
  ]);

  const [newOptTexts, setNewOptTexts] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // HANDLERS
  const handleDetailChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setEventDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handlePosterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024)
        return alert("Ukuran poster maksimal 2MB!");
      const reader = new FileReader();
      reader.onloadend = () => setPosterPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024)
        return alert("Ukuran logo maksimal 1MB!");
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const addTicket = () => {
    setTickets([
      ...tickets,
      {
        id: `ticket-${Date.now()}`,
        name: "",
        price: "",
        quota: "",
        description: "",
      },
    ]);
  };

  const removeTicket = (id: number | string) => {
    if (tickets.length > 1) {
      setTickets(tickets.filter((t) => t.id !== id));
    }
  };

  const updateTicket = (
    id: number | string,
    field: keyof TicketData,
    value: string,
  ) => {
    setTickets(
      tickets.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    );
  };

  const addCustomField = () => {
    setCustomFields([
      ...customFields,
      {
        id: Date.now(),
        label: "",
        type: "text",
        required: false,
        targetCategoryIds: ["ALL"],
        options: [],
      },
    ]);
  };

  const removeCustomField = (id: number | string) => {
    setCustomFields(customFields.filter((f) => f.id !== id));
  };

  const updateCustomField = (
    id: number | string,
    field: keyof CustomField,
    value: FormFieldValue,
  ) => {
    setCustomFields(
      customFields.map((f) => (f.id === id ? { ...f, [field]: value } : f)),
    );
  };

  const addDropdownOption = (fieldId: number | string, optionText: string) => {
    if (!optionText.trim()) return;
    setCustomFields(
      customFields.map((f) =>
        f.id === fieldId
          ? { ...f, options: [...(f.options || []), optionText.trim()] }
          : f,
      ),
    );
  };

  const removeDropdownOption = (fieldId: number | string, optIdx: number) => {
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Menggabungkan detail teknis renang ke dalam deskripsi/metadata
      const finalDescription = `[Tipe Kolam: ${eventDetails.poolType} | Sistem Waktu: ${eventDetails.timingSystem}]\n\n${eventDetails.description}`;

      const payload = {
        title: eventDetails.name,
        category: eventDetails.category,
        date: eventDetails.startDate,
        endDate: eventDetails.endDate,
        locationName: eventDetails.location,
        location: eventDetails.location,
        mapsUrl: eventDetails.mapsUrl,
        description: finalDescription,
        rules: eventDetails.rules,
        contactName: eventDetails.contactName,
        contactPhone: eventDetails.contactPhone,
        imageUrl: posterPreview,
        logoUrl: logoPreview,
        categories: tickets.map((t) => ({
          name: t.name,
          price: t.price,
          capacity: t.quota,
          description: t.description,
        })),
        customFields: customFields,
      };

      const result = await createEvent(payload, "SUBMIT_REVIEW");
      if (!result.success)
        throw new Error(result.error || "Gagal membuat event renang");

      router.push("/dashboard/events");
      router.refresh();
    } catch (error: unknown) {
      alert(`Terjadi kesalahan: ${error instanceof Error ? error.message : "Gagal menyimpan event"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = (val: string) =>
    `w-full rounded-xl px-4 py-3 outline-none transition-all duration-200 font-medium placeholder:text-slate-400 placeholder:font-normal ${
      val
        ? "bg-white border-2 border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.1)] text-slate-900"
        : "bg-slate-50 border-2 border-slate-200 text-slate-900 focus:bg-white focus:border-cyan-500"
    }`;

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(e) =>
        (e.target as HTMLElement).tagName !== "TEXTAREA" &&
        e.key === "Enter" &&
        e.preventDefault()
      }
      className="grid grid-cols-1 lg:grid-cols-12 gap-10"
    >
      <div className="lg:col-span-8 space-y-10">
        {/* INFORMASI UTAMA RENANG */}
        <section className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-slate-200/80 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl">
              <Waves size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">
                1. Informasi Kejuaraan Renang
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Judul, Tipe Kolam, Waktu, dan Lokasi
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">
                Nama Kejuaraan / Event <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                value={eventDetails.name}
                onChange={handleDetailChange}
                placeholder="Misal: Indonesia Open Aquatic Championship 2026"
                required
                className={inputStyle(eventDetails.name)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">
                  Spesifikasi Kolam (Pool Type)
                </label>
                <select
                  name="poolType"
                  value={eventDetails.poolType}
                  onChange={handleDetailChange}
                  className={inputStyle(eventDetails.poolType)}
                >
                  <option value="50m Long Course (Olympic Size)">
                    50m Long Course (Olympic Size)
                  </option>
                  <option value="25m Short Course">25m Short Course</option>
                  <option value="Open Water (Laut/Danau)">
                    Open Water (Laut / Danau)
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">
                  Sistem Pencatatan Waktu
                </label>
                <select
                  name="timingSystem"
                  value={eventDetails.timingSystem}
                  onChange={handleDetailChange}
                  className={inputStyle(eventDetails.timingSystem)}
                >
                  <option value="Electronic Touchpad (AOD)">
                    Electronic Touchpad (AOD)
                  </option>
                  <option value="Semi-Automatic / Stopwatch">
                    Semi-Automatic / Manual Stopwatch
                  </option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl flex flex-col justify-between">
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase mb-2 text-center">
                    Poster Event
                  </label>
                  <input
                    type="file"
                    ref={posterInputRef}
                    accept="image/jpeg, image/png"
                    onChange={handlePosterUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => posterInputRef.current?.click()}
                    className="w-full py-4 px-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 font-bold hover:border-cyan-500 hover:bg-cyan-50/50 flex flex-col items-center justify-center gap-2 transition-all text-sm"
                  >
                    <UploadCloud
                      size={24}
                      className={
                        posterPreview ? "text-cyan-500" : "text-slate-400"
                      }
                    />
                    {posterPreview ? "Ganti Poster" : "Upload Poster"}
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl flex flex-col justify-between">
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase mb-2 text-center">
                    Logo Penyelenggara / Klub
                  </label>
                  <input
                    type="file"
                    ref={logoInputRef}
                    accept="image/jpeg, image/png"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="w-full py-4 px-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 font-bold hover:border-cyan-500 hover:bg-cyan-50/50 flex flex-col items-center justify-center gap-2 transition-all text-sm"
                  >
                    <ImageIcon
                      size={24}
                      className={
                        logoPreview ? "text-cyan-500" : "text-slate-400"
                      }
                    />
                    {logoPreview ? "Ganti Logo" : "Upload Logo"}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">
                  Waktu Mulai <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="startDate"
                  value={eventDetails.startDate}
                  onChange={handleDetailChange}
                  required
                  className={inputStyle(eventDetails.startDate)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">
                  Waktu Selesai
                </label>
                <input
                  type="datetime-local"
                  name="endDate"
                  value={eventDetails.endDate}
                  onChange={handleDetailChange}
                  className={inputStyle(eventDetails.endDate)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">
                  Nama Kolam Renang / Venue{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  name="location"
                  value={eventDetails.location}
                  onChange={handleDetailChange}
                  placeholder="Misal: Gelora Bung Karno Aquatic Center"
                  required
                  className={inputStyle(eventDetails.location)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">
                  Link Google Maps
                </label>
                <input
                  name="mapsUrl"
                  value={eventDetails.mapsUrl}
                  onChange={handleDetailChange}
                  placeholder="https://maps.app.goo.gl/..."
                  className={inputStyle(eventDetails.mapsUrl)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">
                Deskripsi Event
              </label>
              <textarea
                name="description"
                rows={4}
                value={eventDetails.description}
                onChange={handleDetailChange}
                placeholder="Jelaskan detail kompetisi, hadiah, atau informasi penting lainnya..."
                className={inputStyle(eventDetails.description)}
              />
            </div>
          </div>
        </section>

        {/* TIKET NOMOR PERLOMBAAN */}
        <section className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-slate-200/80 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl">
              <Droplets size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">
                2. Nomor Perlombaan (Heat/Events)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Atur Gaya, Jarak, Harga Pendaftaran, dan Kuota Per Nomor
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {tickets.map((ticket, idx) => (
              <div
                key={ticket.id}
                className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 relative"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-cyan-600 uppercase bg-cyan-100 px-3 py-1 rounded-lg">
                    Nomor Lomba #{idx + 1}
                  </span>
                  {tickets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTicket(ticket.id)}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Gaya & Jarak *
                    </label>
                    <input
                      type="text"
                      required
                      value={ticket.name}
                      onChange={(e) =>
                        updateTicket(ticket.id, "name", e.target.value)
                      }
                      placeholder="Misal: 50m Gaya Bebas"
                      className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm font-medium focus:border-cyan-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Biaya Pendaftaran *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={ticket.price}
                      onChange={(e) =>
                        updateTicket(ticket.id, "price", e.target.value)
                      }
                      placeholder="50000"
                      className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm font-medium focus:border-cyan-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Kuota (Jumlah Seri) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={ticket.quota}
                      onChange={(e) =>
                        updateTicket(ticket.id, "quota", e.target.value)
                      }
                      placeholder="100"
                      className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm font-medium focus:border-cyan-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">
                    Kategori Usia / Keterangan
                  </label>
                  <input
                    type="text"
                    value={ticket.description}
                    onChange={(e) =>
                      updateTicket(ticket.id, "description", e.target.value)
                    }
                    placeholder="Misal: KU-1 (16-18 Tahun) / Open"
                    className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm font-medium focus:border-cyan-500 outline-none"
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addTicket}
              className="w-full py-3.5 border-2 border-dashed border-slate-300 text-slate-600 rounded-2xl hover:border-cyan-500 hover:text-cyan-600 flex items-center justify-center gap-2 font-bold text-sm transition-colors"
            >
              <Plus size={18} /> Tambah Nomor Lomba
            </button>
          </div>
        </section>

        {/* CUSTOM FIELDS (DATA ATLET RENANG) */}
        <section className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-slate-200/80 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl">
              <ClipboardList size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">
                3. Formulir Data Atlet (Swimmer Data)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Seed Time (Untuk Seeding Heat) dan Info Klub
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {customFields.map((field) => (
              <div
                key={field.id}
                className="p-5 bg-slate-50 border border-slate-200 rounded-3xl space-y-4"
              >
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex-1 w-full space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={field.label}
                        onChange={(e) =>
                          updateCustomField(field.id, "label", e.target.value)
                        }
                        placeholder="Pertanyaan..."
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm font-medium focus:border-cyan-500 outline-none"
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
                        className="px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-xs font-bold cursor-pointer focus:border-cyan-500 outline-none"
                      >
                        <option value="text">Teks Singkat</option>
                        <option value="number">Angka</option>
                        <option value="select">Dropdown</option>
                        <option value="file">Unggah File</option>
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
                        className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500"
                      />
                      Wajib
                    </label>
                    <button
                      type="button"
                      onClick={() => removeCustomField(field.id)}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {field.type === "select" && (
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {(field.options || []).map((opt, optIdx) => (
                        <span
                          key={optIdx}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold"
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
                        placeholder="Tambah Opsi Pilihan"
                        className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:border-cyan-500 outline-none"
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
                        className="px-4 py-1.5 bg-cyan-600 text-white text-xs font-bold rounded-xl"
                      >
                        Tambah
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addCustomField}
              className="w-full py-3.5 border-2 border-dashed border-slate-300 text-slate-600 rounded-2xl hover:border-cyan-500 hover:text-cyan-600 flex items-center justify-center gap-2 font-bold text-sm transition-colors"
            >
              <Plus size={18} /> Tambah Data Atlet
            </button>
          </div>
        </section>

        {/* ATURAN & SUBMIT */}
        <section className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-slate-200/80 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">
                4. Peraturan & Regulasi Pertandingan
              </h2>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">
                Technical Handbook / Peraturan
              </label>
              <textarea
                name="rules"
                rows={4}
                value={eventDetails.rules}
                onChange={handleDetailChange}
                className={inputStyle(eventDetails.rules)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">
                  Nama Technical Delegate / Panitia
                </label>
                <input
                  name="contactName"
                  value={eventDetails.contactName}
                  onChange={handleDetailChange}
                  placeholder="Admin Aquatic"
                  className={inputStyle(eventDetails.contactName)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">
                  No WhatsApp
                </label>
                <input
                  type="number"
                  name="contactPhone"
                  value={eventDetails.contactPhone}
                  onChange={handleDetailChange}
                  placeholder="081234567890"
                  className={inputStyle(eventDetails.contactPhone)}
                />
              </div>
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-5 bg-linear-to-r from-cyan-600 to-blue-600 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl transition-all cursor-pointer"
        >
          {isSubmitting ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Save size={20} />
          )}{" "}
          Simpan Event Renang
        </button>
      </div>

      <div className="lg:col-span-4 hidden lg:block">
        <EventPreviewMockup
          data={{
            ...eventDetails,
            posterPreview,
            logoPreview,
            tickets,
            customFields,
            rundown: "",
          }}
        />
      </div>
    </form>
  );
}
