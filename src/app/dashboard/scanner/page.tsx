"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Camera,
  CheckCircle2,
  CheckSquare2,
  Loader2,
  PackageCheck,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  TicketCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import Link from "next/link";

interface TicketDetails {
  ticketId: string;
  ticketNumber: string;
  qrCode: string;
  orderId: string | null;

  eventId: string;
  eventTitle: string;
  eventStatus: string;

  participantId: string | null;
  participantName: string;
  participantEmail: string | null;
  participantPhone: string | null;

  category: string;
  jerseySize: string | null;

  ticketStatus: string;
  isCheckedIn: boolean;
  checkedInAt: string | null;

  racepackClaimed: boolean;
  canCheckIn: boolean;
}

interface ApiResponse {
  success?: boolean;
  result?: string;
  error?: string;
  data?: TicketDetails;

  ticketId?: string;
  checkInId?: string;
  ticketStatus?: string;
  checkedInAt?: string | null;
}

type ScannerStatus =
  | "idle"
  | "starting"
  | "scanning"
  | "success"
  | "error";

export default function ScannerPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const lastScannedRef = useRef<string | null>(null);
  const mountedRef = useRef(false);

  const [scannerStatus, setScannerStatus] =
    useState<ScannerStatus>("idle");

  const [scanResult, setScanResult] =
    useState<string | null>(null);

  const [ticketDetails, setTicketDetails] =
    useState<TicketDetails | null>(null);

  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const [checkingIn, setCheckingIn] = useState(false);
  const [claimingRacepack, setClaimingRacepack] =
    useState(false);

  const [cameraCount, setCameraCount] = useState(0);

  const readerId = "iontix-scanner-reader";

  async function stopCamera() {
    const scanner = scannerRef.current;

    if (!scanner) {
      return;
    }

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch (error) {
      console.error(
        "Gagal menghentikan kamera:",
        error,
      );
    } finally {
      try {
        scanner.clear();
      } catch (error) {
        console.error(
          "Gagal membersihkan scanner:",
          error,
        );
      }

      scannerRef.current = null;
    }
  }

  async function validateTicket(qrCode: string) {
    if (
      !qrCode ||
      processingRef.current ||
      !mountedRef.current
    ) {
      return;
    }

    processingRef.current = true;
    setScannerStatus("scanning");
    setMessage(null);

    try {
      const response = await fetch(
        `/api/checkin/validate?qrCode=${encodeURIComponent(qrCode)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const payload =
        (await response.json()) as ApiResponse;

      if (
        !response.ok ||
        !payload.success ||
        !payload.data
      ) {
        setScannerStatus("error");

        setMessage({
          text:
            payload.error ||
            "QR Code tidak valid atau tiket tidak dapat diverifikasi.",
          type: "error",
        });

        return;
      }

      setScanResult(qrCode);
      setTicketDetails(payload.data);
      setScannerStatus("success");

      /*
       * Kamera dihentikan setelah validation berhasil,
       * bukan sebelum request ke server.
       */
      await stopCamera();
    } catch (error) {
      console.error(
        "Gagal memvalidasi tiket:",
        error,
      );

      setScannerStatus("error");

      setMessage({
        text:
          "Tidak dapat terhubung ke server.",
        type: "error",
      });
    } finally {
      processingRef.current = false;
    }
  }

  async function startCamera() {
    if (
      processingRef.current ||
      scannerRef.current ||
      !mountedRef.current
    ) {
      return;
    }

    setMessage(null);
    setScannerStatus("starting");

    try {
      const cameras =
        await Html5Qrcode.getCameras();

      if (!cameras.length) {
        throw new Error(
          "Tidak ada kamera yang tersedia pada perangkat ini.",
        );
      }

      setCameraCount(cameras.length);

      const cameraId = cameras[0].id;

      const scanner = new Html5Qrcode(
        readerId,
        false,
      );

      scannerRef.current = scanner;

      await scanner.start(
        cameraId,
        {
          fps: 18,
          qrbox: {
            width: 220,
            height: 220,
          },
          aspectRatio: 1.777778,
        },
        (decodedText) => {
          const normalized =
            decodedText.trim();

          if (
            !normalized ||
            processingRef.current ||
            lastScannedRef.current === normalized
          ) {
            return;
          }

          lastScannedRef.current = normalized;

          void validateTicket(normalized);
        },
        () => {
          /*
           * Error per frame diabaikan.
           */
        },
      );

      if (mountedRef.current) {
        setScannerStatus("scanning");
      }
    } catch (error) {
      console.error(
        "Gagal memulai kamera:",
        error,
      );

      scannerRef.current = null;
      setScannerStatus("error");

      setMessage({
        text:
          error instanceof Error
            ? error.message
            : "Kamera tidak dapat diaktifkan.",
        type: "error",
      });
    }
  }

  async function resetScan() {
    await stopCamera();

    setScanResult(null);
    setTicketDetails(null);
    setMessage(null);

    lastScannedRef.current = null;
    processingRef.current = false;

    setScannerStatus("idle");

    /*
     * Setelah hasil scan dibersihkan, kamera harus
     * otomatis aktif kembali untuk tiket berikutnya.
     */
    if (mountedRef.current) {
      await startCamera();
    }
  }

  async function switchCamera() {
    await stopCamera();

    lastScannedRef.current = null;

    await startCamera();
  }

  async function handleCheckIn() {
    if (
      !ticketDetails ||
      !scanResult ||
      ticketDetails.isCheckedIn ||
      !ticketDetails.canCheckIn ||
      checkingIn
    ) {
      return;
    }

    setCheckingIn(true);
    setMessage(null);

    try {
      const response = await fetch(
        "/api/checkin",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            qrCode: scanResult,
            deviceId:
              "dashboard-scanner",
          }),
        },
      );

      const payload =
        (await response.json()) as ApiResponse;

      if (
        response.ok &&
        payload.success
      ) {
        setMessage({
          text:
            "CHECK-IN BERHASIL. Peserta telah tercatat hadir.",
          type: "success",
        });

        setTicketDetails(
          (current) =>
            current
              ? {
                  ...current,
                  ticketStatus:
                    payload.ticketStatus ??
                    "USED",
                  isCheckedIn: true,
                  canCheckIn: false,
                  checkedInAt:
                    payload.checkedInAt ??
                    new Date().toISOString(),
                }
              : null,
        );

        return;
      }

      if (response.status === 409) {
        setMessage({
          text:
            payload.error ||
            "Tiket sudah digunakan.",
          type: "error",
        });

        if (scanResult) {
          /*
           * Refresh state dari server agar UI tidak
           * berbeda dengan device scanner lain.
           */
          const refresh =
            await fetch(
              `/api/checkin/validate?qrCode=${encodeURIComponent(scanResult)}`,
              {
                cache: "no-store",
              },
            );

          const refreshed =
            (await refresh.json()) as ApiResponse;

          if (
            refresh.ok &&
            refreshed.success &&
            refreshed.data
          ) {
            setTicketDetails(
              refreshed.data,
            );
          }
        }

        return;
      }

      setMessage({
        text:
          payload.error ||
          "Check-in gagal dilakukan.",
        type: "error",
      });
    } catch (error) {
      console.error(
        "Gagal check-in:",
        error,
      );

      setMessage({
        text:
          "Terjadi kesalahan saat check-in.",
        type: "error",
      });
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleClaimRacepack() {
    if (
      !ticketDetails?.orderId ||
      ticketDetails.racepackClaimed ||
      claimingRacepack
    ) {
      return;
    }

    setClaimingRacepack(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(
          ticketDetails.orderId,
        )}/claim`,
        {
          method: "POST",
        },
      );

      const payload =
        (await response.json()) as ApiResponse;

      if (response.ok) {
        setMessage({
          text:
            "RACEPACK BERHASIL DISERAHKAN.",
          type: "success",
        });

        setTicketDetails(
          (current) =>
            current
              ? {
                  ...current,
                  racepackClaimed: true,
                }
              : null,
        );

        return;
      }

      setMessage({
        text:
          payload.error ||
          "Racepack gagal diproses.",
        type: "error",
      });

      if (
        response.status === 409 &&
        scanResult
      ) {
        const refresh =
          await fetch(
            `/api/checkin/validate?qrCode=${encodeURIComponent(
              scanResult,
            )}`,
            {
              cache: "no-store",
            },
          );

        const refreshed =
          (await refresh.json()) as ApiResponse;

        if (
          refresh.ok &&
          refreshed.success &&
          refreshed.data
        ) {
          setTicketDetails(
            refreshed.data,
          );
        }
      }
    } catch (error) {
      console.error(
        "Gagal menyerahkan racepack:",
        error,
      );

      setMessage({
        text:
          "Terjadi kesalahan saat memproses racepack.",
        type: "error",
      });
    } finally {
      setClaimingRacepack(false);
    }
  }

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      void stopCamera();
    };
  }, []);

  const statusText =
    scannerStatus === "starting"
      ? "MENYIAPKAN KAMERA"
      : scannerStatus === "scanning"
        ? "KAMERA AKTIF"
        : scannerStatus === "success"
          ? "TIKET TERDETEKSI"
          : scannerStatus === "error"
            ? "PERLU PERHATIAN"
            : "KAMERA SIAP";

  const ticketState =
    ticketDetails?.isCheckedIn
      ? "SUDAH CHECK-IN"
      : ticketDetails?.ticketStatus ===
          "ACTIVE"
        ? "BELUM CHECK-IN"
        : ticketDetails?.ticketStatus ??
          "UNKNOWN";

  return (
    <div className="min-h-screen bg-[#070B14] text-white">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              ← Kembali ke Dashboard
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[#F57C00]">
                <ScanLine size={24} />
              </div>

              <div>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                  Gate Scanner
                </h1>

                <p className="mt-1 text-sm text-slate-400">
                  Validasi e-ticket, check-in peserta,
                  dan serah terima racepack.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              GATE ONLINE
            </span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Scanner */}
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#111827] shadow-2xl shadow-black/20">
            <div className="border-b border-white/10 px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                    QR SCANNER
                  </p>

                  <h2 className="mt-1 text-xl font-black">
                    Scan e-Ticket peserta
                  </h2>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  {scannerStatus ===
                  "success" ? (
                    <CheckCircle2
                      size={14}
                      className="text-emerald-400"
                    />
                  ) : scannerStatus ===
                    "error" ? (
                    <XCircle
                      size={14}
                      className="text-red-400"
                    />
                  ) : (
                    <Camera
                      size={14}
                      className="text-slate-400"
                    />
                  )}

                  <span className="text-[10px] font-black tracking-widest text-slate-300">
                    {statusText}
                  </span>
                </div>
              </div>
            </div>

            {/* Camera viewport */}
            <div className="p-5 sm:p-6">
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black">
                <div
                  id={readerId}
                  className="relative aspect-[4/3] w-full overflow-hidden"
                />

                {scannerStatus ===
                  "scanning" &&
                  !ticketDetails && (
                    <>
                      <div className="pointer-events-none absolute inset-0">
                        <div className="absolute inset-5 rounded-[26px] border border-white/5" />

                        <div className="absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2">
                          <span className="absolute left-0 top-0 h-9 w-9 rounded-tl-2xl border-l-4 border-t-4 border-[#F57C00]" />
                          <span className="absolute right-0 top-0 h-9 w-9 rounded-tr-2xl border-r-4 border-t-4 border-[#F57C00]" />
                          <span className="absolute bottom-0 left-0 h-9 w-9 rounded-bl-2xl border-b-4 border-l-4 border-[#F57C00]" />
                          <span className="absolute bottom-0 right-0 h-9 w-9 rounded-br-2xl border-b-4 border-r-4 border-[#F57C00]" />

                          <span className="absolute left-3 right-3 top-1/2 h-px -translate-y-1/2 bg-[#F57C00]/70 shadow-[0_0_14px_rgba(245,124,0,0.8)]" />
                        </div>
                      </div>

                      <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-4 py-2 text-[11px] font-semibold text-white backdrop-blur-md">
                        Arahkan QR ke dalam frame
                      </div>
                    </>
                  )}

                {!ticketDetails &&
                  scannerStatus ===
                    "idle" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#0B1220]">
                        <div className="max-w-sm px-8 text-center">
                          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#F57C00]/20 bg-[#F57C00]/10 text-[#F57C00]">
                            <Camera size={28} />
                          </div>

                          <h3 className="mt-5 text-xl font-black">
                            Kamera siap digunakan
                          </h3>

                          <p className="mt-2 text-sm leading-6 text-slate-400">
                            Aktifkan kamera untuk mulai
                            memindai QR E-Ticket peserta.
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              void startCamera()
                            }
                            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#F57C00] px-6 py-3 text-sm font-black text-white shadow-lg shadow-[#F57C00]/20 transition-all hover:bg-[#FF8A1A] active:scale-[0.98]"
                          >
                            <Camera size={17} />
                            MULAI SCAN
                          </button>
                        </div>
                      </div>
                    )}

                {!ticketDetails &&
                  scannerStatus ===
                    "starting" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#0B1220]">
                        <div className="text-center">
                          <Loader2
                            size={34}
                            className="mx-auto animate-spin text-[#F57C00]"
                          />

                          <p className="mt-4 text-sm font-bold text-white">
                            Menyiapkan kamera...
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Mohon izinkan akses kamera
                          </p>
                        </div>
                      </div>
                    )}
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                {!ticketDetails && (
                  <button
                    type="button"
                    onClick={() =>
                      scannerStatus === "scanning"
                        ? void stopCamera()
                        : void startCamera()
                    }
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
                  >
                    {scannerStatus ===
                    "scanning"
                      ? "HENTIKAN KAMERA"
                      : "AKTIFKAN KAMERA"}
                  </button>
                )}

                {ticketDetails && (
                  <button
                    type="button"
                    onClick={() =>
                      void resetScan()
                    }
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-900 transition-all hover:bg-slate-100"
                  >
                    <RefreshCw size={16} />
                    SCAN TIKET BERIKUTNYA
                  </button>
                )}

                {!ticketDetails &&
                  scannerStatus ===
                    "scanning" &&
                  cameraCount > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        void switchCamera()
                      }
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-300 transition-colors hover:bg-white/10"
                    >
                      GANTI KAMERA
                    </button>
                  )}
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <ShieldCheck
                  size={18}
                  className="mt-0.5 shrink-0 text-emerald-400"
                />

                <p className="text-xs leading-5 text-slate-400">
                  Scanner memvalidasi QR langsung ke server
                  IONtix. Tiket yang sudah digunakan tidak
                  dapat dipakai kembali untuk check-in.
                </p>
              </div>
            </div>
          </div>

          {/* Ticket panel */}
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#111827] shadow-2xl shadow-black/20">
            <div className="border-b border-white/10 px-6 py-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                TICKET VALIDATION
              </p>

              <h2 className="mt-1 text-xl font-black">
                Detail peserta
              </h2>
            </div>

            {!ticketDetails ? (
              <div className="flex min-h-[430px] items-center justify-center p-8 text-center">
                <div className="max-w-sm">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-500">
                    <TicketCheck size={28} />
                  </div>

                  <h3 className="mt-5 text-lg font-black text-white">
                    Belum ada tiket
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Hasil scan QR akan muncul di sini
                    setelah tiket berhasil diverifikasi.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F57C00]/10 text-[#F57C00]">
                      <UserRound size={22} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-widest text-[#F57C00]">
                        {ticketDetails.eventTitle}
                      </p>

                      <h3 className="mt-1 truncate text-xl font-black text-white">
                        {ticketDetails.participantName}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {ticketDetails.category}
                        {ticketDetails.jerseySize
                          ? ` • Jersey ${ticketDetails.jerseySize}`
                          : ""}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Status Tiket
                    </p>

                    <p
                      className={`mt-2 text-sm font-black ${
                        ticketDetails.isCheckedIn
                          ? "text-emerald-400"
                          : ticketDetails.ticketStatus ===
                              "ACTIVE"
                            ? "text-amber-400"
                            : "text-red-400"
                      }`}
                    >
                      {ticketState}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Racepack
                    </p>

                    <p
                      className={`mt-2 text-sm font-black ${
                        ticketDetails.racepackClaimed
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }`}
                    >
                      {ticketDetails.racepackClaimed
                        ? "SUDAH DIAMBIL"
                        : "BELUM DIAMBIL"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-[#0B1220] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-slate-500">
                      Ticket Number
                    </span>

                    <span className="truncate font-mono text-xs font-bold text-slate-300">
                      {ticketDetails.ticketNumber}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-slate-500">
                      QR
                    </span>

                    <span className="max-w-[220px] truncate font-mono text-[10px] font-bold text-slate-400">
                      {ticketDetails.qrCode}
                    </span>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <button
                    type="button"
                    onClick={() =>
                      void handleCheckIn()
                    }
                    disabled={
                      checkingIn ||
                      ticketDetails.isCheckedIn ||
                      !ticketDetails.canCheckIn
                    }
                    className={`flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-black transition-all ${
                      ticketDetails.isCheckedIn
                        ? "cursor-not-allowed bg-emerald-500/10 text-emerald-400"
                        : ticketDetails.canCheckIn
                          ? "bg-[#F57C00] text-white shadow-lg shadow-[#F57C00]/20 hover:bg-[#FF8A1A]"
                          : "cursor-not-allowed bg-white/5 text-slate-500"
                    }`}
                  >
                    {checkingIn ? (
                      <>
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />
                        MEMPROSES CHECK-IN
                      </>
                    ) : ticketDetails.isCheckedIn ? (
                      <>
                        <CheckCircle2 size={18} />
                        SUDAH CHECK-IN
                      </>
                    ) : (
                      <>
                        <CheckSquare2 size={18} />
                        CHECK-IN PESERTA
                      </>
                    )}
                  </button>

                  {ticketDetails.orderId &&
                    (ticketDetails.racepackClaimed ? (
                      <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-3.5 text-sm font-bold text-emerald-400">
                        <PackageCheck size={18} />
                        RACEPACK SUDAH DIAMBIL
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          void handleClaimRacepack()
                        }
                        disabled={
                          claimingRacepack
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-black text-white transition-all hover:bg-white/10"
                      >
                        {claimingRacepack ? (
                          <>
                            <Loader2
                              size={18}
                              className="animate-spin"
                            />
                            MEMPROSES RACEPACK
                          </>
                        ) : (
                          <>
                            <PackageCheck
                              size={18}
                            />
                            SERAHKAN RACEPACK
                          </>
                        )}
                      </button>
                    ))}

                  {message && (
                    <div
                      className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
                        message.type ===
                        "success"
                          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
                          : "border-red-400/20 bg-red-400/10 text-red-400"
                      }`}
                    >
                      {message.text}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
