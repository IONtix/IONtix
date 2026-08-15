"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Mail, Lock, Loader2, ArrowRight, Shield } from "lucide-react";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Kredensial tidak valid. Akses ditolak.");
      setIsLoading(false);
    } else {
      router.push("/super-admin");
      router.refresh();
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#F6F8FA] overflow-hidden selection:bg-blue-600 selection:text-white font-sans">
      {/* =========================================
          EFEK BACKGROUND MEWAH (MESH GRADIENT)
          ========================================= */}
      {/* Cahaya Biru di Kiri Atas */}
      <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-400/10 blur-[120px] pointer-events-none" />
      {/* Cahaya Ungu di Kanan Bawah */}
      <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-indigo-400/10 blur-[120px] pointer-events-none" />
      {/* Grid Pattern transparan untuk kesan teknikal */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.015] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* =========================================
          KARTU LOGIN (GLASSMORPHISM)
          ========================================= */}
      <div className="relative z-10 w-full max-w-[440px] px-6">
        {/* LOGO & HEADER */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative h-14 w-40 mb-6 drop-shadow-sm">
            <Image
              src="/logo.png"
              alt="IONtix Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 mb-6">
            <Shield className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
              Secure Portal
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight text-center">
            Command Center
          </h1>
          <p className="text-slate-500 text-sm mt-2 text-center font-medium">
            Otentikasi diperlukan untuk mengakses sistem.
          </p>
        </div>

        {/* BOX FORM */}
        <div className="bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-8 sm:p-10 transition-all">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Error Message */}
            {error && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-red-50/80 border border-red-100 p-3.5 text-sm text-red-600 animate-in fade-in slide-in-from-top-1">
                <p className="font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-5">
              {/* Input Email */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Alamat Email
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <Mail className="h-4.5 w-4.5" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="admin@iontix.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="block w-full rounded-2xl border-0 bg-slate-50/50 py-3.5 pl-11 pr-4 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-blue-600 focus:bg-white transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Input Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Kata Sandi
                  </label>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <Lock className="h-4.5 w-4.5" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="block w-full rounded-2xl border-0 bg-slate-50/50 py-3.5 pl-11 pr-4 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-blue-600 focus:bg-white transition-all disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Tombol Submit ala Apple/Stripe */}
            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-900/20 disabled:bg-slate-900/70 shadow-md hover:shadow-xl hover:-translate-y-0.5"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <span>Otorisasi Masuk</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
            © {new Date().getFullYear()} IONtix Infrastructure
          </p>
        </div>
      </div>
    </div>
  );
}
