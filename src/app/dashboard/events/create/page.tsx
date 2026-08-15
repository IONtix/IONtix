"use client";

import React from "react";
import Link from "next/link";
import {
  Footprints,
  Waves,
  GraduationCap,
  Sparkles,
  ArrowRight,
  LayoutGrid,
  Zap,
} from "lucide-react";

const CATEGORIES = [
  {
    slug: "lari",
    title: "Lari / Maraton",
    description:
      "Preset khusus dengan form otomatis untuk Ukuran Jersey, Nama BIB, dan Pilihan Jarak Lari (5K, 10K, dll).",
    icon: Footprints,
    color: "from-blue-500 to-indigo-600",
    glow: "group-hover:shadow-blue-500/20",
    badge: "Paling Diminati",
  },
  {
    slug: "renang",
    title: "Renang & Aquathlon",
    description:
      "Formulir yang disesuaikan untuk input Gaya Renang, Panjang Lintasan, dan Kategori Usia Atlet.",
    icon: Waves,
    color: "from-cyan-500 to-blue-600",
    glow: "group-hover:shadow-cyan-500/20",
  },
  {
    slug: "pelatihan",
    title: "Pelatihan & Workshop",
    description:
      "Sistem registrasi untuk seminar, sertifikasi, atau kelas dengan opsi input institusi dan materi.",
    icon: GraduationCap,
    color: "from-amber-500 to-orange-500",
    glow: "group-hover:shadow-amber-500/20",
  },
  {
    slug: "lainnya",
    title: "Event Kustom / Umum",
    description:
      "Formulir fleksibel (blank canvas) yang dapat Anda sesuaikan sebebas mungkin untuk kebutuhan khusus.",
    icon: LayoutGrid,
    color: "from-slate-500 to-slate-700",
    glow: "group-hover:shadow-slate-500/20",
  },
];

export default function SelectEventCategoryPage() {
  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-4 sm:p-8 w-full">
      {/* --- HEADER SECTION --- */}
      <div className="text-center max-w-2xl mx-auto mb-14 space-y-5">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-full text-blue-400 text-[11px] font-bold tracking-widest uppercase backdrop-blur-md">
          <Zap size={14} className="text-blue-400 fill-blue-400/20" />
          Enterprise Event Builder
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-linear-to-r from-white via-slate-200 to-slate-400 tracking-tight">
          Pilih Arsitektur Event
        </h1>
        <p className="text-slate-400 text-sm md:text-base font-medium leading-relaxed px-4">
          Pilih arsitektur formulir yang paling sesuai dengan kegiatan Anda.
          Sistem kecerdasan kami akan menyiapkan preset data peserta untuk
          mempercepat alur kerja Anda.
        </p>
      </div>

      {/* --- GRID CATEGORIES --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <Link
              key={cat.slug}
              href={`/dashboard/events/create/${cat.slug}`}
              className={`group relative p-px rounded-[2rem] bg-linear-to-b from-slate-700/50 to-slate-800/30 border border-transparent hover:border-slate-600 transition-all duration-500 overflow-hidden ${cat.glow} hover:-translate-y-1.5 hover:shadow-2xl`}
            >
              {/* Outer Glow Background */}
              <div className="absolute inset-0 bg-slate-900 z-0 rounded-[2rem]"></div>

              {/* Card Content */}
              <div className="relative z-10 bg-slate-900/80 backdrop-blur-2xl h-full rounded-[calc(2rem-1px)] p-6 sm:p-8 flex flex-col justify-between">
                <div className="space-y-6">
                  {/* Icon & Badge */}
                  <div className="flex items-start justify-between">
                    <div
                      className={`p-4 rounded-2xl bg-linear-to-br ${cat.color} text-white shadow-lg flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}
                    >
                      <Icon size={28} strokeWidth={2.5} />
                    </div>
                    {cat.badge && (
                      <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-wider rounded-full flex items-center gap-1.5 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                        <Sparkles size={12} className="text-blue-400" />{" "}
                        {cat.badge}
                      </span>
                    )}
                  </div>

                  {/* Texts */}
                  <div className="space-y-2.5">
                    <h3 className="text-2xl font-bold text-slate-100 group-hover:text-white transition-colors">
                      {cat.title}
                    </h3>
                    <p className="text-slate-400/90 text-sm leading-relaxed font-medium">
                      {cat.description}
                    </p>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-8 mt-6 border-t border-slate-800/80 flex items-center justify-between text-sm font-bold text-slate-500 group-hover:text-blue-400 transition-colors">
                  <span className="tracking-wide">Gunakan Arsitektur Ini</span>
                  <div className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all duration-300">
                    <ArrowRight
                      size={18}
                      className="transform group-hover:translate-x-1 transition-transform duration-300"
                    />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
