"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Send,
  ShieldCheck,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type Props = {
  eventId: string;
  status: string;
  role: string;
};

type ReadinessCheck = {
  key: string;
  label: string;
  passed: boolean;
  severity?: "ERROR" | "WARNING";
  message?: string;
};

type Readiness = {
  ready: boolean;
  summary: {
    passed: number;
    failed: number;
    warnings: number;
    total: number;
  };
  checks: ReadinessCheck[];
};

export default function EventPublishControl({
  eventId,
  status,
  role,
}: Props) {
  const [readiness, setReadiness] =
    useState<Readiness | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!eventId) {
      return;
    }

    let cancelled = false;

    async function fetchReadiness() {
      try {
        const response =
          await fetch(
            `/api/events/${eventId}/readiness`,
            {
              cache: "no-store",
            },
          );

        const json =
          await response.json();

        if (
          !response.ok ||
          !json.success
        ) {
          throw new Error(
            json.message ||
              "Gagal memeriksa kesiapan event.",
          );
        }

        if (cancelled) {
          return;
        }

        setReadiness(json.data);
        setError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Gagal memeriksa kesiapan event.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchReadiness();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const loadReadiness =
    useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        const response =
          await fetch(
            `/api/events/${eventId}/readiness`,
            {
              cache: "no-store",
            },
          );

        const json =
          await response.json();

        if (
          !response.ok ||
          !json.success
        ) {
          throw new Error(
            json.message ||
              "Gagal memeriksa kesiapan event.",
          );
        }

        setReadiness(json.data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Gagal memeriksa kesiapan event.",
        );
      } finally {
        setLoading(false);
      }
    }, [eventId]);

  async function handleAction(
    action:
      | "SUBMIT_REVIEW"
      | "PUBLISH",
  ) {
    const confirmMessage =
      action === "SUBMIT_REVIEW"
        ? "Ajukan event ini untuk direview oleh Super Admin?"
        : "Publikasikan event ini sekarang?";

    if (
      !window.confirm(
        confirmMessage,
      )
    ) {
      return;
    }

    setProcessing(true);
    setMessage(null);
    setError(null);

    try {
      const response =
        await fetch(
          `/api/events/${eventId}/publish-control`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              action,
            }),
          },
        );

      const json =
        await response.json();

      if (
        !response.ok ||
        !json.success
      ) {
        throw new Error(
          json.message ||
            "Gagal memproses event.",
        );
      }

      setMessage(
        json.message ||
          "Event berhasil diproses.",
      );

      await loadReadiness();

      window.setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memproses event.",
      );
    } finally {
      setProcessing(false);
    }
  }

  const isEO = role === "EO";
  const isSuperAdmin =
    role === "SUPER_ADMIN";

  const canSubmitReview =
    isEO &&
    status === "DRAFT";

  const canPublish =
    isSuperAdmin &&
    (
      status === "DRAFT" ||
      status === "PENDING_REVIEW"
    );

  if (
    !canSubmitReview &&
    !canPublish
  ) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-[#1E293B] bg-[#131A2B] p-5 shadow-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            {readiness?.ready ? (
              <CheckCircle2
                size={17}
                className="text-emerald-400"
              />
            ) : (
              <AlertTriangle
                size={17}
                className="text-amber-400"
              />
            )}

            <p className="text-sm font-black text-white">
              Kesiapan Publikasi
            </p>
          </div>

          <p className="mt-1 text-xs text-slate-400">
            {loading
              ? "Sedang memeriksa kesiapan event..."
              : readiness
                ? `${readiness.summary.passed} terpenuhi • ${readiness.summary.failed} perlu diperbaiki`
                : "Kesiapan belum dapat diperiksa."}
          </p>
        </div>

        <a
          href={`/dashboard/events/${eventId}/readiness`}
          className="text-xs font-bold text-[#F57C00] hover:text-white"
        >
          Lihat Detail Kesiapan →
        </a>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
          {message}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        {canSubmitReview ? (
          <button
            type="button"
            disabled={
              processing ||
              loading ||
              !readiness?.ready
            }
            onClick={() =>
              void handleAction(
                "SUBMIT_REVIEW",
              )
            }
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#F57C00] px-4 py-3 text-sm font-black text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {processing ? (
              <Loader2
                size={17}
                className="animate-spin"
              />
            ) : (
              <Send size={17} />
            )}

            Ajukan untuk Review
          </button>
        ) : null}

        {canPublish ? (
          <button
            type="button"
            disabled={
              processing ||
              loading ||
              !readiness?.ready
            }
            onClick={() =>
              void handleAction(
                "PUBLISH",
              )
            }
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {processing ? (
              <Loader2
                size={17}
                className="animate-spin"
              />
            ) : (
              <ShieldCheck size={17} />
            )}

            Publikasikan Event
          </button>
        ) : null}
      </div>

      {!loading &&
      readiness &&
      !readiness.ready ? (
        <p className="mt-3 text-center text-[11px] leading-5 text-amber-300/80">
          Tombol tindakan akan aktif setelah
          seluruh persyaratan utama event terpenuhi.
        </p>
      ) : null}
    </section>
  );
}
