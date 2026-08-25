"use client";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  CircleAlert,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

type ReadinessCheck = {
  key: string;
  label: string;
  passed: boolean;
  severity?: "ERROR" | "WARNING";
  message?: string;
};

type ReadinessData = {
  ready: boolean;
  summary: {
    passed: number;
    failed: number;
    warnings: number;
    total: number;
  };
  checks: ReadinessCheck[];
};

function getEventId() {
  const parts =
    window.location.pathname.split("/");

  return parts[
    parts.indexOf("events") + 1
  ];
}

export default function EventReadinessPage() {
  const [data, setData] =
    useState<ReadinessData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const eventId = getEventId();

  useEffect(() => {
    if (!eventId) {
      return;
    }

    let cancelled = false;

    async function loadReadiness() {
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

        if (!response.ok || !json.success) {
          throw new Error(
            json.message ||
              "Gagal memeriksa kesiapan event.",
          );
        }

        if (cancelled) {
          return;
        }

        setData(json.data);
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

    void loadReadiness();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  async function refresh() {
    if (!eventId) {
      return;
    }

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

      if (!response.ok || !json.success) {
        throw new Error(
          json.message ||
            "Gagal memeriksa kesiapan event.",
        );
      }

      setData(json.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memeriksa kesiapan event.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2
            size={20}
            className="animate-spin"
          />
          Memeriksa kesiapan event...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Event Management
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Kesiapan Publikasi
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Pastikan seluruh komponen penting event
              telah lengkap sebelum event dikirim untuk
              review atau dipublikasikan.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Perbarui
          </button>
        </header>

        {error ? (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
            {error}
          </section>
        ) : null}

        {data ? (
          <>
            <section
              className={[
                "overflow-hidden rounded-3xl border p-6",
                data.ready
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-amber-200 bg-amber-50",
              ].join(" ")}
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={[
                      "rounded-2xl p-3",
                      data.ready
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700",
                    ].join(" ")}
                  >
                    {data.ready ? (
                      <CheckCircle2 size={24} />
                    ) : (
                      <AlertTriangle size={24} />
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Status Kesiapan
                    </p>

                    <h2 className="mt-1 text-xl font-bold text-slate-900">
                      {data.ready
                        ? "Event siap diproses"
                        : "Event belum siap diproses"}
                    </h2>

                    <p className="mt-1 text-sm text-slate-600">
                      {data.ready
                        ? "Seluruh persyaratan utama telah terpenuhi."
                        : "Perbaiki item yang masih menjadi penghambat."}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <Metric
                    label="Lulus"
                    value={data.summary.passed}
                  />

                  <Metric
                    label="Masalah"
                    value={data.summary.failed}
                  />

                  <Metric
                    label="Peringatan"
                    value={data.summary.warnings}
                  />
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-6 py-5">
                <h2 className="font-semibold text-slate-900">
                  Pemeriksaan Kesiapan
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Semua item berikut diperiksa oleh
                  sistem IONtix.
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {data.checks.map(
                  (check) => (
                    <div
                      key={check.key}
                      className="flex items-start gap-4 px-6 py-4"
                    >
                      <div className="mt-0.5 shrink-0">
                        {check.passed ? (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                            <Check size={16} />
                          </div>
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                            <X size={16} />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800">
                          {check.label}
                        </p>

                        {!check.passed &&
                        check.message ? (
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {check.message}
                          </p>
                        ) : null}
                      </div>

                      <div className="shrink-0">
                        {check.passed ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                            Terpenuhi
                          </span>
                        ) : (
                          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600">
                            Perlu diperbaiki
                          </span>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </section>

            {!data.ready ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start gap-3">
                  <CircleAlert
                    size={19}
                    className="mt-0.5 text-amber-500"
                  />

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Event belum dapat dipublikasikan
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Selesaikan seluruh item bertanda
                      “Perlu diperbaiki”, kemudian
                      perbarui pemeriksaan kesiapan.
                    </p>
                  </div>
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-20 rounded-xl border border-white/70 bg-white/70 px-3 py-2 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}
