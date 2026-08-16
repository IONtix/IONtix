"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setErrorMsg("Email atau kata sandi salah. Silakan periksa kembali.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setErrorMsg(
        "Terjadi kesalahan saat menghubungi server. Silakan coba lagi.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-[#F57C00] selection:text-white md:flex-row">
      {/* BAGIAN KIRI: Area Formulir Login */}
      <div className="relative flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:px-24 xl:px-32 md:py-0">
        {/* Tombol Kembali ke Beranda */}
        <div className="absolute left-6 top-6 sm:left-12 sm:top-8 lg:left-24 xl:left-32">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-[#0B1B3D]"
          >
            ← Kembali
          </Link>
        </div>

        <div className="mx-auto mt-12 w-full max-w-md space-y-8 md:mt-0">
          {/* Logo & Judul */}
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
                Masuk Portal EO
              </h1>

              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Kelola event lari Anda, pantau transaksi, dan akses analitik
                secara real-time.
              </p>
            </div>
          </div>

          {/* Formulir Login */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMsg && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-medium text-red-600">
                {errorMsg}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">
                Email Perusahaan
              </label>

              <input
                type="email"
                placeholder="eo@perusahaan.com"
                className="w-full rounded-xl border border-border/80 bg-muted/30 px-4 py-3.5 text-sm outline-none transition-all focus:border-[#F57C00] focus:bg-background focus:ring-2 focus:ring-[#F57C00]/20"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-foreground">
                  Kata Sandi
                </label>

                <Link
                  href="/forgot-password"
                  className="text-xs font-bold text-[#F57C00] transition-colors hover:text-[#E65100]"
                >
                  Lupa sandi?
                </Link>
              </div>

              <input
                type="password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-border/80 bg-muted/30 px-4 py-3.5 text-sm outline-none transition-all focus:border-[#F57C00] focus:bg-background focus:ring-2 focus:ring-[#F57C00]/20"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-[#0B1B3D] py-6 text-base font-bold text-white shadow-xl shadow-[#0B1B3D]/10 transition-all hover:scale-[1.01] hover:bg-[#0B1B3D]/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? "Memverifikasi..." : "Masuk ke Dashboard 🔐"}
              </Button>
            </div>
          </form>

          {/* Tautan Pendaftaran */}
          <p className="border-t border-border/50 pt-4 text-center text-sm text-muted-foreground">
            Belum menjadi Mitra EO?{" "}
            <Link
              href="/register"
              className="font-black text-[#F57C00] transition-colors hover:text-[#E65100]"
            >
              Ajukan Kemitraan
            </Link>
          </p>
        </div>
      </div>

      {/* BAGIAN KANAN */}
      <div className="relative hidden flex-1 items-center justify-center overflow-hidden bg-[#0B1B3D] p-12 md:flex lg:p-20">
        <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-[#F57C00]/20 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-96 w-96 rounded-full bg-blue-500/20 blur-[100px]" />

        <div className="relative z-10 max-w-lg space-y-8 text-white">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#F57C00] backdrop-blur-md">
            Testimoni Mitra
          </div>

          <h2 className="text-3xl font-black leading-[1.2] tracking-tight lg:text-4xl">
            &quot;Teknologi IONtix membuat sistem pendaftaran kami lebih cepat,
            dan QR Check-in mereka luar biasa lancar saat hari H
            perlombaan.&quot;
          </h2>

          <div className="flex items-center gap-4 pt-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xl font-black text-[#F57C00] shadow-lg backdrop-blur-sm">
              NR
            </div>

            <div>
              <p className="text-lg font-bold leading-tight">
                Nusantara Run Official
              </p>

              <p className="mt-0.5 text-sm text-zinc-400">
                Penyelenggara Event Lari Nasional
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
