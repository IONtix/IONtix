"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const lastScannedRef = useRef<string | null>(null);
  const isProcessingRef = useRef(false);

  const resetScan = useCallback(() => {
    setScanResult(null);
    setOrderDetails(null);
    setMessage(null);
    lastScannedRef.current = null;
    isProcessingRef.current = false;
  }, []);

  const fetchOrderData = useCallback(async (orderId: string) => {
    if (!orderId || isProcessingRef.current) {
      return;
    }

    isProcessingRef.current = true;
    setLoading(true);
    setMessage(null);
    setOrderDetails(null);

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = (await res.json()) as OrderDetails | { error?: string };

      if (!res.ok) {
        setMessage({
          text:
            "error" in data && data.error
              ? data.error
              : "Tiket tidak ditemukan!",
          type: "error",
        });
        return;
      }

      setScanResult(orderId);
      setOrderDetails(data as OrderDetails);

      /*
       * Setelah satu QR berhasil dibaca, hentikan kamera
       * agar callback scanner tidak menembakkan request
       * berulang kali.
       */
      if (scannerRef.current) {
        try {
          await scannerRef.current.clear();
        } catch (error) {
          console.error("Gagal menghentikan scanner:", error);
        } finally {
          scannerRef.current = null;
        }
      }
    } catch (error: unknown) {
      console.error("Gagal mengambil data order:", error);

      setMessage({
        text: "Gagal menghubungkan ke server.",
        type: "error",
      });
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 10,
        qrbox: {
          width: 250,
          height: 250,
        },
      },
      false,
    );

    scanner.render(
      (decodedText) => {
        const normalized = decodedText.trim();

        if (
          !normalized ||
          lastScannedRef.current === normalized ||
          isProcessingRef.current
        ) {
          return;
        }

        lastScannedRef.current = normalized;

        void fetchOrderData(normalized);
      },
      () => {
        /*
         * html5-qrcode memanggil callback error
         * pada banyak frame yang bukan QR valid.
         * Tidak perlu ditampilkan ke user.
         */
      },
    );

    scannerRef.current = scanner;

    return () => {
      void scanner
        .clear()
        .catch((error: unknown) =>
          console.error("Failed to clear scanner", error),
        );

      scannerRef.current = null;
    };
  }, [fetchOrderData]);

  async function handleClaimRacepack() {
    if (!scanResult || !orderDetails || orderDetails.isClaimed || loading) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(scanResult)}/claim`,
        {
          method: "POST",
        },
      );

      const data = (await res.json()) as {
        error?: string;
      };

      if (res.ok) {
        setMessage({
          text: "✅ VERIFIKASI BERHASIL! Racepack dapat diberikan.",
          type: "success",
        });

        setOrderDetails((current) =>
          current
            ? {
                ...current,
                isClaimed: true,
              }
            : null,
        );
      } else {
        setMessage({
          text: data.error || "Gagal memverifikasi tiket.",
          type: "error",
        });

        /*
         * Jika claim ditolak karena tiket sudah diambil
         * secara bersamaan di perangkat lain, refresh data
         * order agar status UI tetap benar.
         */
        if (res.status === 409) {
          await fetchOrderData(scanResult);
        }
      }
    } catch (error: unknown) {
      console.error("Gagal melakukan claim:", error);

      setMessage({
        text: "Terjadi kesalahan.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <Link
            href="/dashboard"
            className="mb-2 inline-block text-sm text-muted-foreground transition-colors hover:text-primary"
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

        <div className="overflow-hidden rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
          {!orderDetails && (
            <div id="reader" className="w-full overflow-hidden rounded-2xl" />
          )}

          {orderDetails && (
            <button
              type="button"
              onClick={resetScan}
              className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Scan Tiket Berikutnya
            </button>
          )}
        </div>

        {loading && (
          <div className="animate-pulse rounded-2xl bg-muted/40 p-4 text-center text-sm font-semibold">
            Memproses data tiket...
          </div>
        )}

        {message && (
          <div
            className={`rounded-2xl border p-4 text-center text-sm font-bold shadow-sm ${
              message.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {message.text}
          </div>
        )}

        {orderDetails && (
          <div className="space-y-4 rounded-3xl border-2 border-primary/20 bg-card p-6 shadow-md">
            <div className="flex items-start justify-between border-b border-border/40 pb-3">
              <div>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                  {orderDetails.ticketCategory.event.title}
                </span>

                <h3 className="mt-1 text-xl font-black">
                  {orderDetails.fullName}
                </h3>
              </div>

              <span className="rounded-lg border px-2.5 py-1 text-xs font-bold">
                Kategori: {orderDetails.ticketCategory.name}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Ukuran Jersey</p>
                <p className="text-2xl font-extrabold text-primary">
                  {orderDetails.jerseySize || "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Status Racepack</p>

                <p
                  className={`mt-1 text-sm font-bold ${
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
                <div className="w-full rounded-xl bg-muted p-3 text-center text-xs font-medium text-muted-foreground">
                  Peserta ini sudah mengambil racepack sebelumnya.
                </div>
              ) : (
                <Button
                  onClick={() => void handleClaimRacepack()}
                  disabled={loading}
                  className="w-full font-bold shadow-md"
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
