// src/app/reset-password/page.tsx
"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!token) {
      setError("Token reset password tidak ditemukan pada tautan ini.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password minimal harus 8 karakter!");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak cocok!");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Gagal mereset password");
      } else {
        alert("🎉 Password berhasil diperbarui! Silakan login kembali.");
        router.push("/login");
      }
    } catch {
      setLoading(false);
      setError("Terjadi kesalahan koneksi. Silakan coba lagi.");
    }
  }

  return (
    <div className="w-full max-w-md bg-card border border-border shadow-xl rounded-3xl p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black tracking-tight text-foreground">
          Password Baru
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Masukkan kata sandi baru untuk akun Anda.
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm font-bold p-3 rounded-xl mb-6 text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Password Baru
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full mt-1.5 p-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-none transition-all text-sm"
            placeholder="Minimal 8 karakter"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Konfirmasi Password Baru
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full mt-1.5 p-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-none transition-all text-sm"
            placeholder="Ulangi password baru"
          />
        </div>

        <Button
          type="submit"
          disabled={loading || !token}
          className="w-full font-bold py-6 text-base rounded-xl shadow-md mt-4"
        >
          {loading ? "Menyimpan..." : "Simpan Password Baru 💾"}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-sm font-medium">Memuat...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
