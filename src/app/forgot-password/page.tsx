"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.resetToken) {
      // Langsung arahkan ke halaman reset dengan token
      router.push(`/reset-password?token=${data.resetToken}`);
    } else {
      setMessage("Jika email terdaftar, instruksi reset telah dikirim.");
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border shadow-xl rounded-3xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            Lupa Password?
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Masukkan email terdaftar Anda untuk mengatur ulang kata sandi.
          </p>
        </div>

        {message && (
          <div className="bg-primary/10 border border-primary/30 text-primary text-sm font-bold p-3 rounded-xl mb-6 text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Alamat Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1.5 p-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-none transition-all"
              placeholder="eo@iontix.com"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full font-bold py-6 text-base rounded-xl shadow-md mt-4"
          >
            {loading ? "Memproses..." : "Lanjutkan Reset Password 🔑"}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
          >
            &larr; Batal & Kembali ke Login
          </Link>
        </div>
      </div>
    </div>
  );
}
