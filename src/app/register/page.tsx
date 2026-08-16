"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface RegisterFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
}

interface RegisterApiResponse {
  message?: string;
}

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState<RegisterFormData>({
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push("/login?registered=true");
        return;
      }

      const data: RegisterApiResponse = await response.json().catch(() => ({}));

      setErrorMsg(data.message ?? "Gagal mendaftar. Silakan coba lagi.");
    } catch {
      setErrorMsg("Terjadi kesalahan pada server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-[#F57C00] selection:text-white md:flex-row">
      {/* BAGIAN KIRI */}
      <div className="relative flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:px-24 xl:px-32 md:py-0">
        <div className="absolute left-6 top-6 sm:left-12 sm:top-8 lg:left-24 xl:left-32">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-[#0B1B3D]"
          >
            ← Kembali
          </Link>
        </div>

        <div className="mx-auto mt-12 w-full max-w-md space-y-8 md:mt-0">
          <div className="space-y-6">
            <Image
              src="/logo.png"
              alt="IONtix Logo"
              width={160}
              height={48}
              priority
              className="h-10 w-auto object-contain sm:h-12"
            />

            <div>
              <h1 className="text-3xl font-black tracking-tight text-[#0B1B3D] sm:text-4xl">
                Kemitraan EO
              </h1>

              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Bergabunglah dengan 100+ penyelenggara lainnya. Skalakan event
                lari Anda bersama IONtix.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-medium text-red-600">
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
                className="w-full rounded-xl border border-border/80 bg-muted/30 px-4 py-3 text-sm outline-none transition-all focus:border-[#F57C00] focus:bg-background focus:ring-2 focus:ring-[#F57C00]/20"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData((current) => ({
                    ...current,
                    name: e.target.value,
                  }))
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
                className="w-full rounded-xl border border-border/80 bg-muted/30 px-4 py-3 text-sm outline-none transition-all focus:border-[#F57C00] focus:bg-background focus:ring-2 focus:ring-[#F57C00]/20"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData((current) => ({
                    ...current,
                    email: e.target.value,
                  }))
                }
              />
            </div>

            {/* NOMOR TELEPON */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">
                Nomor Telepon / WhatsApp
              </label>

              <input
                type="tel"
                placeholder="081234567890"
                className="w-full rounded-xl border border-border/80 bg-muted/30 px-4 py-3 text-sm outline-none transition-all focus:border-[#F57C00] focus:bg-background focus:ring-2 focus:ring-[#F57C00]/20"
                required
                value={formData.phone}
                onChange={(e) =>
                  setFormData((current) => ({
                    ...current,
                    phone: e.target.value,
                  }))
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
                className="w-full rounded-xl border border-border/80 bg-muted/30 px-4 py-3 text-sm outline-none transition-all focus:border-[#F57C00] focus:bg-background focus:ring-2 focus:ring-[#F57C00]/20"
                required
                value={formData.password}
                onChange={(e) =>
                  setFormData((current) => ({
                    ...current,
                    password: e.target.value,
                  }))
                }
              />
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-[#F57C00] py-6 text-base font-bold text-white shadow-xl shadow-[#F57C00]/20 transition-all hover:scale-[1.01] hover:bg-[#E65100] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? "Mendaftarkan..." : "Daftarkan EO Sekarang 🚀"}
              </Button>
            </div>
          </form>

          <p className="border-t border-border/50 pt-4 text-center text-sm text-muted-foreground">
            Sudah memiliki akun mitra?{" "}
            <Link
              href="/login"
              className="font-black text-[#0B1B3D] transition-colors hover:text-[#F57C00]"
            >
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>

      {/* BAGIAN KANAN */}
      <div className="relative hidden flex-1 items-center justify-center overflow-hidden bg-[#0B1B3D] p-12 md:flex lg:p-20">
        <div className="pointer-events-none absolute left-0 top-0 h-96 w-96 rounded-full bg-[#F57C00]/20 blur-[120px]" />

        <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-blue-500/20 blur-[100px]" />

        <div className="relative z-10 max-w-lg space-y-8 text-white">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#F57C00] backdrop-blur-md">
            Fasilitas Eksklusif
          </div>

          <h2 className="text-3xl font-black leading-[1.2] tracking-tight lg:text-4xl">
            Tingkatkan skala event lari Anda dengan infrastruktur kelas dunia.
          </h2>

          <ul className="space-y-4 pt-4">
            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F57C00]/20 font-bold text-[#F57C00]">
                ✓
              </span>

              <span className="font-medium text-zinc-300">
                Dashboard Analitik Real-time
              </span>
            </li>

            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F57C00]/20 font-bold text-[#F57C00]">
                ✓
              </span>

              <span className="font-medium text-zinc-300">
                Pencairan Dana Otomatis &amp; Cepat
              </span>
            </li>

            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F57C00]/20 font-bold text-[#F57C00]">
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
