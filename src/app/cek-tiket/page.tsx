"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { TicketOrderLookup } from "@/lib/platform-types";

export default function CekTiketPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<TicketOrderLookup[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setHasSearched(true);

    try {
      const res = await fetch("/api/cek-tiket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Tiket tidak ditemukan.");
        setOrders([]);
      } else {
        setOrders(data.orders);
      }
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tight">
            Cari Tiket Saya 🔍
          </h1>
          <p className="text-muted-foreground mt-2">
            Masukkan email yang Anda gunakan saat mendaftar untuk melihat
            E-Ticket.
          </p>
        </div>

        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
          <form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row gap-3"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Contoh: pelari@email.com"
              className="flex-1 p-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-none transition-all"
            />
            <Button
              type="submit"
              disabled={loading}
              className="py-6 px-8 rounded-xl font-bold"
            >
              {loading ? "Mencari..." : "Cari Tiket"}
            </Button>
          </form>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive font-bold p-4 rounded-2xl text-center">
            {error}
          </div>
        )}

        {orders.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">
              Tiket Ditemukan ({orders.length}) 🎉
            </h2>
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-card border border-border rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm"
              >
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">
                    {order.ticketCategory.event.title}
                  </p>
                  <h3 className="text-lg font-bold">{order.fullName}</h3>
                  <div className="text-sm text-muted-foreground mt-1 flex gap-3">
                    <span>
                      Kategori: <b>{order.ticketCategory.name}</b>
                    </span>
                    <span>•</span>
                    <span>
                      Jersey: <b>{order.jerseySize}</b>
                    </span>
                  </div>
                </div>

                {/* INI BAGIAN YANG DIPERBARUI: href sudah diarahkan ke URL e-ticket */}
                <Link
                  href={`/e-ticket/${order.id}`}
                  className="w-full md:w-auto"
                >
                  <Button
                    variant="outline"
                    className="w-full md:w-auto font-bold rounded-xl border-primary text-primary hover:bg-primary/10"
                  >
                    Lihat QR Code
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}

        {hasSearched && !loading && orders.length === 0 && !error && (
          <div className="text-center text-muted-foreground p-8">
            Belum ada tiket untuk email ini.
          </div>
        )}

        <div className="text-center pt-8">
          <Link
            href="/"
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            &larr; Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
