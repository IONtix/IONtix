"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TargetUser = {
  id: string;
  name: string;
  email: string;
};

type TransferTicketDialogProps = {
  ticketId: string;
  disabled?: boolean;
};

export default function TransferTicketDialog({
  ticketId,
  disabled = false,
}: TransferTicketDialogProps) {
  const [open, setOpen] =
    useState(false);
  const [email, setEmail] =
    useState("");
  const [reason, setReason] =
    useState("");
  const [target, setTarget] =
    useState<TargetUser | null>(null);
  const [loadingLookup, setLoadingLookup] =
    useState(false);
  const [loadingTransfer, setLoadingTransfer] =
    useState(false);
  const [error, setError] =
    useState("");
  const [success, setSuccess] =
    useState("");

  function reset() {
    setEmail("");
    setReason("");
    setTarget(null);
    setError("");
    setSuccess("");
    setLoadingLookup(false);
    setLoadingTransfer(false);
  }

  async function handleLookup() {
    setError("");
    setSuccess("");
    setTarget(null);

    const normalized =
      email.trim().toLowerCase();

    if (!normalized) {
      setError(
        "Masukkan email penerima terlebih dahulu.",
      );
      return;
    }

    setLoadingLookup(true);

    try {
      const response =
        await fetch(
          `/api/tickets/${ticketId}/transfer/target?email=${encodeURIComponent(
            normalized,
          )}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

      const data =
        (await response.json()) as {
          data?: TargetUser;
          error?: string;
        };

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Penerima tidak ditemukan.",
        );
      }

      setTarget(
        data.data ?? null,
      );
    } catch (lookupError) {
      setError(
        lookupError instanceof Error
          ? lookupError.message
          : "Gagal mencari penerima.",
      );
    } finally {
      setLoadingLookup(false);
    }
  }

  async function handleTransfer() {
    if (!target) {
      setError(
        "Cari dan pilih penerima terlebih dahulu.",
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Transfer tiket ini kepada ${target.name} (${target.email})?`,
      );

    if (!confirmed) {
      return;
    }

    setLoadingTransfer(true);
    setError("");
    setSuccess("");

    try {
      const response =
        await fetch(
          `/api/tickets/${ticketId}/transfer`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              toUserId: target.id,
              reason:
                reason.trim() || undefined,
            }),
          },
        );

      const data =
        (await response.json()) as {
          error?: string;
        };

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Transfer tiket gagal.",
        );
      }

      setSuccess(
        "Tiket berhasil ditransfer. Halaman akan dimuat ulang.",
      );

      setTimeout(() => {
        window.location.reload();
      }, 900);
    } catch (transferError) {
      setError(
        transferError instanceof Error
          ? transferError.message
          : "Transfer tiket gagal.",
      );
    } finally {
      setLoadingTransfer(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        disabled={disabled}
        onClick={() => {
          reset();
          setOpen(true);
        }}
        variant="outline"
        className="w-full rounded-2xl border-slate-600 bg-slate-900/60 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-200 hover:bg-slate-800 hover:text-white sm:py-6"
      >
        TRANSFER TIKET
      </Button>

      {open && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-[#0D1527] p-5 shadow-2xl">
            <div className="mb-5">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400">
                TICKET TRANSFER
              </p>
              <h2 className="mt-1 text-xl font-black text-white">
                Alih Kepemilikan
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Masukkan email akun IONtix penerima
                tiket ini.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="transfer-email"
                  className="mb-2 block text-[9px] font-black uppercase tracking-widest text-slate-400"
                >
                  EMAIL PENERIMA
                </label>
                <div className="flex gap-2">
                  <Input
                    id="transfer-email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="penerima@email.com"
                    disabled={
                      loadingLookup ||
                      loadingTransfer
                    }
                    className="border-slate-700 bg-[#050A14] text-white"
                  />

                  <Button
                    type="button"
                    onClick={handleLookup}
                    disabled={
                      loadingLookup ||
                      loadingTransfer
                    }
                    className="shrink-0 bg-amber-500 text-black hover:bg-amber-400"
                  >
                    {loadingLookup
                      ? "..."
                      : "CARI"}
                  </Button>
                </div>
              </div>

              {target && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400">
                    PENERIMA DITEMUKAN
                  </p>

                  <p className="mt-2 text-base font-black text-white">
                    {target.name}
                  </p>

                  <p className="text-xs text-slate-300">
                    {target.email}
                  </p>

                  <p className="mt-2 text-[10px] text-slate-400">
                    Akun IONtix aktif dan siap menerima transfer.
                  </p>
                </div>
              )}

              <div>
                <label
                  htmlFor="transfer-reason"
                  className="mb-2 block text-[9px] font-black uppercase tracking-widest text-slate-400"
                >
                  ALASAN (OPSIONAL)
                </label>

                <Input
                  id="transfer-reason"
                  type="text"
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value)
                  }
                  placeholder="Contoh: tiket dialihkan ke teman"
                  disabled={
                    loadingTransfer
                  }
                  className="border-slate-700 bg-[#050A14] text-white"
                />
              </div>

              {error && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-300">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-300">
                  {success}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    reset();
                    setOpen(false);
                  }}
                  disabled={loadingTransfer}
                  className="rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  BATAL
                </Button>

                <Button
                  type="button"
                  onClick={handleTransfer}
                  disabled={
                    !target ||
                    loadingTransfer ||
                    loadingLookup
                  }
                  className="rounded-xl bg-amber-500 font-black text-black hover:bg-amber-400"
                >
                  {loadingTransfer
                    ? "MEMPROSES..."
                    : "TRANSFER SEKARANG"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
