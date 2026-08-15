"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();

  // State untuk menyimpan ketikan form (sudah termasuk phone)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push("/login?registered=true");
      } else {
        const data = await response.json();
        setErrorMsg(data.message || "Gagal mendaftar. Silakan coba lagi.");
      }
    } catch (error) {
      setErrorMsg("Terjadi kesalahan pada server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row selection:bg-[#F57C00] selection:text-white">
      {/* BAGIAN KIRI */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-24 xl:px-32 relative py-12 md:py-0">
        <div className="absolute top-6 left-6 sm:top-8 sm:left-12 lg:left-24 xl:left-32">
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-[#0B1B3D] transition-colors flex items-center gap-2"
          >
            ← Kembali
          </Link>
        </div>

        <div className="max-w-md w-full mx-auto space-y-8 mt-12 md:mt-0">
          <div className="space-y-6">
            <img
              src="/logo.png"
              alt="IONtix Logo"
              className="h-10 sm:h-12 w-auto object-contain"
            />
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#0B1B3D]">
                Kemitraan EO
              </h1>
              <p className="text-muted-foreground mt-2 text-sm sm:text-base leading-relaxed">
                Bergabunglah dengan 100+ penyelenggara lainnya. Skalakan event
                lari Anda bersama IONtix.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-sm font-medium">
                {errorMsg}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">
                Nama Event Organizer (EO)
              </label>
              <input
                type="text"
                placeholder="Contoh: Nusantara Run Official"
                className="w-full px-4 py-3 rounded-xl border border-border/80 bg-muted/30 focus:bg-background focus:ring-2 focus:ring-[#F57C00]/20 focus:border-[#F57C00] outline-none transition-all text-sm"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">
                Email Perusahaan
              </label>
              <input
                type="email"
                placeholder="eo@perusahaan.com"
                className="w-full px-4 py-3 rounded-xl border border-border/80 bg-muted/30 focus:bg-background focus:ring-2 focus:ring-[#F57C00]/20 focus:border-[#F57C00] outline-none transition-all text-sm"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            {/* KEMBALIKAN INPUT NOMOR TELEPON */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">
                Nomor Telepon / WhatsApp
              </label>
              <input
                type="tel"
                placeholder="081234567890"
                className="w-full px-4 py-3 rounded-xl border border-border/80 bg-muted/30 focus:bg-background focus:ring-2 focus:ring-[#F57C00]/20 focus:border-[#F57C00] outline-none transition-all text-sm"
                required
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">
                Kata Sandi
              </label>
              <input
                type="password"
                placeholder="Buat kata sandi yang kuat"
                className="w-full px-4 py-3 rounded-xl border border-border/80 bg-muted/30 focus:bg-background focus:ring-2 focus:ring-[#F57C00]/20 focus:border-[#F57C00] outline-none transition-all text-sm"
                required
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-6 rounded-xl font-bold text-base bg-[#F57C00] hover:bg-[#E65100] text-white shadow-xl shadow-[#F57C00]/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? "Mendaftarkan..." : "Daftarkan EO Sekarang 🚀"}
              </Button>
            </div>
          </form>

          <p className="text-center text-sm text-muted-foreground pt-4 border-t border-border/50">
            Sudah memiliki akun mitra?{" "}
            <Link
              href="/login"
              className="font-black text-[#0B1B3D] hover:text-[#F57C00] transition-colors"
            >
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>

      {/* BAGIAN KANAN */}
      <div className="hidden md:flex flex-1 relative bg-[#0B1B3D] items-center justify-center p-12 lg:p-20 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#F57C00]/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="relative z-10 max-w-lg text-white space-y-8">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-[#F57C00]">
            Fasilitas Eksklusif
          </div>
          <h2 className="text-3xl lg:text-4xl font-black leading-[1.2] tracking-tight">
            Tingkatkan skala event lari Anda dengan infrastruktur kelas dunia.
          </h2>
          <ul className="space-y-4 pt-4">
            <li className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-[#F57C00]/20 text-[#F57C00] flex items-center justify-center font-bold">
                ✓
              </span>
              <span className="font-medium text-zinc-300">
                Dashboard Analitik Real-time
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-[#F57C00]/20 text-[#F57C00] flex items-center justify-center font-bold">
                ✓
              </span>
              <span className="font-medium text-zinc-300">
                Pencairan Dana Otomatis & Cepat
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-[#F57C00]/20 text-[#F57C00] flex items-center justify-center font-bold">
                ✓
              </span>
              <span className="font-medium text-zinc-300">
                Sistem QR Code Check-in Anti-Antre
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
