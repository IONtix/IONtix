"use client";

import React, { useState } from "react";
import {
  CalendarDays,
  MapPin,
  Activity,
  Ticket,
  ImageIcon,
  PhoneCall,
  ClipboardList,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

export interface CustomField {
  id: string | number;
  label: string;
  type: "text" | "number" | "select" | "file" | "checkbox";
  required: boolean;
  options?: string[];
}

export interface TicketData {
  id: string | number;
  name: string;
  price: string | number;
  quota: string | number;
  description?: string;
}

export interface PreviewData {
  name: string;
  category: string;
  startDate: string;
  endDate: string;
  location: string;
  mapsUrl: string;
  description: string;
  rules: string;
  rundown: string;
  contactName: string;
  contactPhone: string;
  posterPreview: string | null;
  logoPreview?: string | null;
  tickets: TicketData[];
  customFields: CustomField[];
}

export default function EventPreviewMockup({ data }: { data: PreviewData }) {
  const [activeTab, setActiveTab] = useState<"detail" | "tiket" | "form">(
    "detail",
  );

  return (
    <div className="sticky top-8 space-y-4 animate-in fade-in zoom-in-95 duration-700">
      <div className="text-center mb-4">
        <h3 className="text-xl font-black bg-clip-text text-transparent bg-linear-to-r from-[#1D4ED8] to-blue-400">
          Pratinjau Mobile Live
        </h3>
        <p className="text-xs font-medium text-slate-500 mt-1">
          Tampilan langsung di smartphone peserta
        </p>
      </div>

      {/* Frame Device Handphone */}
      <div className="max-w-85 mx-auto p-3 bg-slate-900 rounded-[2.8rem] shadow-[0_25px_60px_-15px_rgba(29,78,216,0.3)] border-4 border-slate-800 relative">
        {/* Dynamic Island / Notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-30 flex justify-center items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-slate-800"></div>
          <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-800"></div>
        </div>

        {/* Layar HP Inner */}
        <div className="bg-slate-50 rounded-[2.2rem] overflow-hidden relative border border-slate-800 h-155 overflow-y-auto no-scrollbar pt-2">
          {/* Header Poster */}
          <div className="h-48 bg-slate-200 flex items-center justify-center relative overflow-hidden">
            {data.posterPreview ? (
              <img
                src={data.posterPreview}
                alt="Cover Event"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center text-slate-400">
                <ImageIcon size={40} />
                <span className="text-[10px] font-bold mt-1">Poster Event</span>
              </div>
            )}
            <div className="absolute inset-0 bg-linear-to-t from-slate-900/90 via-slate-900/30 to-transparent"></div>

            {data.category && (
              <span className="absolute top-4 left-4 bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md">
                {data.category}
              </span>
            )}
          </div>

          {/* Navigasi Tab dalam HP */}
          <div className="bg-white border-b border-slate-100 flex justify-around text-[10px] font-bold text-slate-500 sticky top-0 z-20 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab("detail")}
              className={`py-2.5 flex-1 text-center transition-all border-b-2 ${
                activeTab === "detail"
                  ? "border-[#1D4ED8] text-[#1D4ED8] font-black"
                  : "border-transparent"
              }`}
            >
              Info
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tiket")}
              className={`py-2.5 flex-1 text-center transition-all border-b-2 ${
                activeTab === "tiket"
                  ? "border-[#1D4ED8] text-[#1D4ED8] font-black"
                  : "border-transparent"
              }`}
            >
              Tiket ({data.tickets.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("form")}
              className={`py-2.5 flex-1 text-center transition-all border-b-2 ${
                activeTab === "form"
                  ? "border-[#1D4ED8] text-[#1D4ED8] font-black"
                  : "border-transparent"
              }`}
            >
              Form ({data.customFields.length})
            </button>
          </div>

          {/* KONTEN TAB: DETAIL */}
          {activeTab === "detail" && (
            <div className="p-4 space-y-5">
              <div>
                <h1 className="text-lg font-black text-slate-900 leading-snug">
                  {data.name || "Nama Event Belum Diisi"}
                </h1>

                <div className="space-y-2 mt-3 text-[10px] font-bold text-slate-600">
                  <div className="flex items-start gap-2 bg-blue-50 p-2.5 rounded-xl text-[#1D4ED8]">
                    <CalendarDays size={14} className="shrink-0 mt-0.5" />
                    <div>
                      <p>
                        {data.startDate
                          ? new Date(data.startDate).toLocaleString("id-ID", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "Waktu Mulai: -"}
                      </p>
                      {data.endDate && (
                        <p className="text-slate-500 font-medium mt-0.5">
                          s.d.{" "}
                          {new Date(data.endDate).toLocaleString("id-ID", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-orange-50 p-2.5 rounded-xl text-orange-700">
                    <div className="flex items-center gap-2 truncate">
                      <MapPin size={14} className="shrink-0" />
                      <span className="truncate">
                        {data.location || "Lokasi Belum Ditentukan"}
                      </span>
                    </div>
                    {data.mapsUrl && (
                      <a
                        href={data.mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[9px] underline font-black shrink-0"
                      >
                        Maps
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Deskripsi */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-black text-slate-900 uppercase flex items-center gap-1">
                  <Activity size={12} className="text-[#1D4ED8]" /> Deskripsi
                  Event
                </h4>
                <p className="text-[10px] text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-100 whitespace-pre-line">
                  {data.description || "Belum ada deskripsi."}
                </p>
              </div>

              {/* Aturan / Rundown */}
              {data.rules && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-black text-slate-900 uppercase flex items-center gap-1">
                    <ShieldAlert size={12} className="text-red-500" /> Peraturan
                    & Ketentuan
                  </h4>
                  <p className="text-[10px] text-slate-600 bg-white p-3 rounded-xl border border-slate-100 whitespace-pre-line">
                    {data.rules}
                  </p>
                </div>
              )}

              {/* Kontak Person */}
              {(data.contactName || data.contactPhone) && (
                <div className="p-3 bg-white rounded-xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PhoneCall size={14} className="text-[#1D4ED8]" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-900">
                        {data.contactName || "Panitia"}
                      </p>
                      <p className="text-[9px] text-slate-500">
                        {data.contactPhone}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* IDENTITAS PENYELENGGARA (EO) DIPINDAH KE BAWAH */}
              {data.logoPreview && (
                <div className="pt-4 mt-4 border-t border-slate-200 flex flex-col items-center justify-center space-y-2 pb-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Diselenggarakan Oleh
                  </p>
                  <img
                    src={data.logoPreview}
                    alt="Logo Penyelenggara"
                    className="w-14 h-14 rounded-full border-2 border-slate-100 shadow-sm object-cover bg-white"
                  />
                </div>
              )}
            </div>
          )}

          {/* KONTEN TAB: TIKET */}
          {activeTab === "tiket" && (
            <div className="p-4 space-y-3">
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-1">
                <Ticket size={12} className="text-[#1D4ED8]" /> Kategori Tiket
              </h4>
              {data.tickets.length > 0 ? (
                data.tickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 bg-white border border-slate-200 rounded-xl space-y-1"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-black text-slate-900">
                          {t.name || "Nama Tiket"}
                        </p>
                        <p className="text-[9px] text-slate-500 font-medium">
                          Kuota: {t.quota || "0"}
                        </p>
                      </div>
                      <span className="text-xs font-black text-[#1D4ED8]">
                        Rp {Number(t.price || 0).toLocaleString("id-ID")}
                      </span>
                    </div>
                    {t.description && (
                      <p className="text-[9px] text-slate-500 pt-1 border-t border-slate-50">
                        {t.description}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center p-4 text-[10px] text-slate-400 bg-white rounded-xl">
                  Belum ada tiket ditambahkan.
                </div>
              )}
            </div>
          )}

          {/* KONTEN TAB: CUSTOM FORM BUILDER */}
          {activeTab === "form" && (
            <div className="p-4 space-y-3">
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-1">
                <ClipboardList size={12} className="text-[#1D4ED8]" /> Form
                Isian Peserta
              </h4>
              <p className="text-[9px] text-slate-500">
                Formulir yang wajib diisi peserta saat mendaftar:
              </p>

              {data.customFields.length > 0 ? (
                <div className="space-y-2.5">
                  {data.customFields.map((field) => (
                    <div
                      key={field.id}
                      className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1"
                    >
                      <label className="text-[10px] font-bold text-slate-700 flex justify-between">
                        <span>
                          {field.label || "Pertanyaan Tanpa Judul"}
                          {field.required && (
                            <span className="text-red-500 ml-0.5">*</span>
                          )}
                        </span>
                        <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">
                          {field.type}
                        </span>
                      </label>

                      {/* Mock Input View */}
                      {field.type === "select" ? (
                        <div className="w-full text-[9px] bg-slate-50 p-2 rounded border border-slate-200 text-slate-400 flex justify-between">
                          <span>-- Pilih Pilihan --</span>
                          <ChevronRight size={10} />
                        </div>
                      ) : field.type === "checkbox" ? (
                        <div className="flex items-center gap-1.5 pt-1">
                          <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50"></div>
                          <span className="text-[9px] text-slate-500">
                            Saya menyetujui
                          </span>
                        </div>
                      ) : field.type === "file" ? (
                        <div className="w-full text-[9px] bg-slate-50 p-2 rounded border border-dashed border-slate-300 text-slate-400 text-center">
                          Upload file/dokumen
                        </div>
                      ) : (
                        <input
                          disabled
                          placeholder={`Isi ${field.label ? field.label.toLowerCase() : "jawaban"}...`}
                          className="w-full text-[9px] bg-slate-50 p-2 rounded border border-slate-200 text-slate-400 pointer-events-none"
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4 text-[10px] text-slate-400 bg-white rounded-xl">
                  Tidak ada data pendaftaran tambahan.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `,
        }}
      />
    </div>
  );
}
