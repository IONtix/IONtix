"use client";

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

    // Autentikasi menggunakan NextAuth Credentials Provider
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setErrorMsg("Email atau kata sandi salah. Silakan periksa kembali.");
      setIsLoading(false);
    } else {
      // Jika berhasil login, langsung arahkan ke Dashboard
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row selection:bg-[#F57C00] selection:text-white">
      {/* BAGIAN KIRI: Area Formulir Login */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-24 xl:px-32 relative py-12 md:py-0">
        {/* Tombol Kembali ke Beranda */}
        <div className="absolute top-6 left-6 sm:top-8 sm:left-12 lg:left-24 xl:left-32">
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-[#0B1B3D] transition-colors flex items-center gap-2"
          >
            ← Kembali
          </Link>
        </div>

        <div className="max-w-md w-full mx-auto space-y-8 mt-12 md:mt-0">
          {/* Logo & Judul */}
          <div className="space-y-6">
            <img
              src="/logo.png"
              alt="IONtix Logo"
              className="h-10 sm:h-12 w-auto object-contain"
            />
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#0B1B3D]">
                Masuk Portal EO
              </h1>
              <p className="text-muted-foreground mt-2 text-sm sm:text-base leading-relaxed">
                Kelola event lari Anda, pantau transaksi, dan akses analitik
                secara real-time.
              </p>
            </div>
          </div>

          {/* Formulir Login */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-sm font-medium">
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
                className="w-full px-4 py-3.5 rounded-xl border border-border/80 bg-muted/30 focus:bg-background focus:ring-2 focus:ring-[#F57C00]/20 focus:border-[#F57C00] outline-none transition-all text-sm"
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
                  className="text-xs font-bold text-[#F57C00] hover:text-[#E65100] transition-colors"
                >
                  Lupa sandi?
                </Link>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-3.5 rounded-xl border border-border/80 bg-muted/30 focus:bg-background focus:ring-2 focus:ring-[#F57C00]/20 focus:border-[#F57C00] outline-none transition-all text-sm"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-6 rounded-xl font-bold text-base bg-[#0B1B3D] hover:bg-[#0B1B3D]/90 text-white shadow-xl shadow-[#0B1B3D]/10 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? "Memverifikasi..." : "Masuk ke Dashboard 🔐"}
              </Button>
            </div>
          </form>

          {/* Tautan Pendaftaran */}
          <p className="text-center text-sm text-muted-foreground pt-4 border-t border-border/50">
            Belum menjadi Mitra EO?{" "}
            <Link
              href="/register"
              className="font-black text-[#F57C00] hover:text-[#E65100] transition-colors"
            >
              Ajukan Kemitraan
            </Link>
          </p>
        </div>
      </div>

      {/* BAGIAN KANAN */}
      <div className="hidden md:flex flex-1 relative bg-[#0B1B3D] items-center justify-center p-12 lg:p-20 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#F57C00]/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-lg text-white space-y-8">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-[#F57C00]">
            Testimoni Mitra
          </div>
          <h2 className="text-3xl lg:text-4xl font-black leading-[1.2] tracking-tight">
            &quot;Teknologi IONtix membuat sistem pendaftaran kami lebih cepat, dan
            QR Check-in mereka luar biasa lancar saat hari H perlombaan.&quot;
          </h2>
          <div className="flex items-center gap-4 pt-2">
            <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center font-black text-xl backdrop-blur-sm border border-white/20 shadow-lg text-[#F57C00]">
              NR
            </div>
            <div>
              <p className="font-bold text-lg leading-tight">
                Nusantara Run Official
              </p>
              <p className="text-sm text-zinc-400 mt-0.5">
                Penyelenggara Event Lari Nasional
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
