"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface OrderDetails {
  id: string;
  fullName: string;
  jerseySize: string;
  isClaimed: boolean;
  ticketCategory: {
    name: string;
    event: {
      title: string;
    };
  };
}

export default function ScannerPage() {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const fetchOrderData = useCallback(async (orderId: string) => {
    setLoading(true);
    setMessage(null);
    setOrderDetails(null);

    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();

      if (!res.ok) {
        setMessage({
          text: data.error || "Tiket tidak ditemukan!",
          type: "error",
        });
      } else {
        setOrderDetails(data as OrderDetails);
      }
    } catch {
      setMessage({ text: "Gagal menghubungkan ke server.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false,
    );

    scanner.render(
      (decodedText) => {
        setScanResult(decodedText);
        void fetchOrderData(decodedText);
      },
      () => {
        // Ignore per-frame scan errors.
      },
    );

    scannerRef.current = scanner;

    return () => {
      scanner
        .clear()
        .catch((error) => console.error("Failed to clear scanner", error));
      scannerRef.current = null;
    };
  }, [fetchOrderData]);

  // Fungsi konfirmasi verifikasi Racepack
  async function handleClaimRacepack() {
    if (!scanResult) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/orders/${scanResult}/claim`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        setMessage({
          text: "✅ VERIFIKASI BERHASIL! Racepack dapat diberikan.",
          type: "success",
        });
        if (orderDetails) {
          setOrderDetails({ ...orderDetails, isClaimed: true });
        }
      } else {
        setMessage({
          text: data.error || "Gagal memverifikasi tiket.",
          type: "error",
        });
      }
    } catch {
      setMessage({ text: "Terjadi kesalahan.", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-primary transition-colors mb-2 inline-block"
          >
            &larr; Kembali ke Dashboard
          </Link>
          <h1 className="text-3xl font-black tracking-tight">
            Panitia QR Scanner
          </h1>
          <p className="text-sm text-muted-foreground">
            Arahkan kamera ke E-Ticket peserta untuk verifikasi Racepack /
            Check-in.
          </p>
        </div>

        {/* Box Kamera Scanner */}
        <div className="bg-card border border-border/60 rounded-3xl p-4 shadow-sm overflow-hidden">
          <div id="reader" className="w-full rounded-2xl overflow-hidden"></div>
        </div>

        {/* Status Loading */}
        {loading && (
          <div className="text-center p-4 bg-muted/40 rounded-2xl animate-pulse text-sm font-semibold">
            Memproses data tiket...
          </div>
        )}

        {/* Status Pesan Error / Sukses */}
        {message && (
          <div
            className={`p-4 rounded-2xl text-center text-sm font-bold shadow-sm ${
              message.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                : "bg-destructive/10 text-destructive border border-destructive/30"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Hasil Detail Tiket Peserta */}
        {orderDetails && (
          <div className="bg-card border-2 border-primary/20 rounded-3xl p-6 shadow-md space-y-4">
            <div className="flex justify-between items-start border-b border-border/40 pb-3">
              <div>
                <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-md uppercase">
                  {orderDetails.ticketCategory.event.title}
                </span>
                <h3 className="text-xl font-black mt-1">
                  {orderDetails.fullName}
                </h3>
              </div>
              <span className="text-xs font-bold border px-2.5 py-1 rounded-lg">
                Kategori: {orderDetails.ticketCategory.name}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Ukuran Jersey</p>
                <p className="font-extrabold text-2xl text-primary">
                  {orderDetails.jerseySize}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status Racepack</p>
                <p
                  className={`font-bold text-sm mt-1 ${
                    orderDetails.isClaimed
                      ? "text-emerald-600"
                      : "text-amber-600"
                  }`}
                >
                  {orderDetails.isClaimed
                    ? "SUDAH DIAMBIL ✅"
                    : "BELUM DIAMBIL ⏳"}
                </p>
              </div>
            </div>

            <div className="pt-2">
              {orderDetails.isClaimed ? (
                <div className="w-full p-3 bg-muted rounded-xl text-center text-xs text-muted-foreground font-medium">
                  Peserta ini sudah mengambil racepack sebelumnya.
                </div>
              ) : (
                <Button
                  onClick={handleClaimRacepack}
                  disabled={loading}
                  className="w-full font-bold size-lg shadow-md"
                >
                  Serahkan Racepack & Tandai Selesai &rarr;
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
