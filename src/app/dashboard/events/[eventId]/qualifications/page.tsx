"use client";

import {
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Loader2,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Status =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

type Review = {
  id: string;
  status: Status;
  rejectionReason: string | null;
  notes: string | null;
  participantResponse?: {
    id: string;
    value: unknown;
    participant?: {
      id: string;
      fullName: string;
      email: string;
      phone: string;
    };
    eventFormField?: {
      id: string;
      key: string;
      label: string;
      fieldType: string;
      description: string | null;
      isRequired: boolean;
    };
  };
};

type Summary = {
  event: {
    id: string;
    title: string;
  };
  pending: number;
  approved: number;
  rejected: number;
  total: number;
};

const STATUS_LABEL: Record<Status, string> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

function getEventId() {
  const parts =
    window.location.pathname.split("/");

  return parts[
    parts.indexOf("events") + 1
  ];
}

function formatValue(value: unknown) {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  if (
    typeof value === "object"
  ) {
    return JSON.stringify(
      value,
      null,
      2,
    );
  }

  return String(value);
}

export default function QualificationPage() {
  const [summary, setSummary] =
    useState<Summary | null>(null);

  const [reviews, setReviews] =
    useState<Review[]>([]);

  const [status, setStatus] =
    useState<Status>("PENDING");

  const [selected, setSelected] =
    useState<Review | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [notes, setNotes] =
    useState("");

  const [rejectionReason, setRejectionReason] =
    useState("");

  const eventId = getEventId();

  useEffect(() => {
    if (!eventId) {
      return;
    }

    let cancelled = false;

    async function load() {
      if (!cancelled) {
        setLoading(true);
      }

      try {
        const [
          reviewsResponse,
          summaryResponse,
        ] = await Promise.all([
          fetch(
            `/api/events/${eventId}/qualification-reviews?status=${status}`,
            {
              cache: "no-store",
            },
          ),
          fetch(
            `/api/events/${eventId}/qualification-summary`,
            {
              cache: "no-store",
            },
          ),
        ]);

        const reviewsJson =
          await reviewsResponse.json();

        const summaryJson =
          await summaryResponse.json();

        if (cancelled) {
          return;
        }

        if (reviewsJson.success) {
          setReviews(
            reviewsJson.data ?? [],
          );
        }

        if (summaryJson.success) {
          setSummary(
            summaryJson.data ?? null,
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Gagal memuat workspace verifikasi:",
            error,
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [eventId, status]);

  const selectedValue =
    selected?.participantResponse
      ?.value;

  const selectedText =
    formatValue(selectedValue);

  const selectedType =
    selected?.participantResponse
      ?.eventFormField?.fieldType;

  const isLink =
    selectedType ===
      "QUALIFICATION_URL" ||
    selectedType === "URL";

  const statusText = useMemo(
    () =>
      selected
        ? STATUS_LABEL[
            selected.status
          ]
        : "",
    [selected],
  );

  async function submitDecision(
    decision:
      | "APPROVED"
      | "REJECTED",
  ) {
    if (!selected || !eventId) {
      return;
    }

    if (
      decision === "REJECTED" &&
      !rejectionReason.trim()
    ) {
      window.alert(
        "Alasan penolakan wajib diisi.",
      );
      return;
    }

    setSaving(true);

    try {
      const response =
        await fetch(
          `/api/events/${eventId}/qualification-reviews/${selected.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              status: decision,
              rejectionReason:
                rejectionReason.trim() ||
                undefined,
              notes:
                notes.trim() ||
                undefined,
            }),
          },
        );

      const json =
        await response.json();

      if (!response.ok) {
        throw new Error(
          json.message ||
            "Gagal memperbarui verifikasi.",
        );
      }

      setSelected(null);
      setNotes("");
      setRejectionReason("");

      const [
        reviewsResponse,
        summaryResponse,
      ] = await Promise.all([
        fetch(
          `/api/events/${eventId}/qualification-reviews?status=${status}`,
          {
            cache: "no-store",
          },
        ),
        fetch(
          `/api/events/${eventId}/qualification-summary`,
          {
            cache: "no-store",
          },
        ),
      ]);

      const reviewsJson =
        await reviewsResponse.json();

      const summaryJson =
        await summaryResponse.json();

      if (reviewsJson.success) {
        setReviews(
          reviewsJson.data ?? [],
        );
      }

      if (summaryJson.success) {
        setSummary(
          summaryJson.data ?? null,
        );
      }
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-900 p-3 text-white">
              <ClipboardCheck size={22} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Operasional Peserta
              </p>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Verifikasi Kualifikasi
              </h1>

              {summary?.event ? (
                <p className="mt-1 text-sm text-slate-500">
                  {summary.event.title}
                </p>
              ) : null}
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SummaryCard
            label="Menunggu"
            value={summary?.pending ?? 0}
            valueClass="text-amber-600"
          />
          <SummaryCard
            label="Disetujui"
            value={summary?.approved ?? 0}
            valueClass="text-emerald-600"
          />
          <SummaryCard
            label="Ditolak"
            value={summary?.rejected ?? 0}
            valueClass="text-rose-600"
          />
          <SummaryCard
            label="Total"
            value={summary?.total ?? 0}
            valueClass="text-slate-900"
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Antrian Verifikasi
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Pilih peserta untuk melihat
                data kualifikasi dan menentukan
                keputusan.
              </p>
            </div>

            <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
              {(
                [
                  "PENDING",
                  "APPROVED",
                  "REJECTED",
                ] as Status[]
              ).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setStatus(item)
                  }
                  className={[
                    "rounded-lg px-3 py-2 text-xs font-semibold",
                    status === item
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500",
                  ].join(" ")}
                >
                  {STATUS_LABEL[item]}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-72 items-center justify-center">
              <Loader2
                size={24}
                className="animate-spin text-slate-400"
              />
            </div>
          ) : reviews.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
              <ClipboardCheck
                size={32}
                className="text-slate-300"
              />
              <p className="mt-3 font-semibold text-slate-600">
                Belum ada data
              </p>
              <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
                Tidak ada data verifikasi dengan
                status yang dipilih.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {reviews.map((review) => (
                <button
                  key={review.id}
                  type="button"
                  onClick={() =>
                    setSelected(review)
                  }
                  className="block w-full px-5 py-4 text-left transition hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {
                          review
                            .participantResponse
                            ?.participant
                            ?.fullName
                        }
                      </p>

                      <p className="mt-1 truncate text-xs text-slate-400">
                        {
                          review
                            .participantResponse
                            ?.eventFormField
                            ?.label
                        }
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                      {STATUS_LABEL[
                        review.status
                      ]}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {selected ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Detail Kualifikasi
                  </p>

                  <h3 className="mt-1 text-lg font-bold text-slate-900">
                    {
                      selected
                        .participantResponse
                        ?.participant
                        ?.fullName
                    }
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    Status: {statusText}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelected(null)
                  }
                  className="rounded-full px-3 py-1 text-slate-400 hover:bg-slate-100"
                >
                  ×
                </button>
              </div>

              <div className="space-y-5 p-6">
                <div>
                  <p className="text-xs font-semibold text-slate-400">
                    Field
                  </p>

                  <p className="mt-1 font-semibold text-slate-800">
                    {
                      selected
                        .participantResponse
                        ?.eventFormField
                        ?.label
                    }
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-400">
                    Nilai / Dokumen
                  </p>

                  {isLink ? (
                    <a
                      href={selectedText}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
                    >
                      Buka Tautan
                      <ExternalLink size={15} />
                    </a>
                  ) : (
                    <div className="mt-3 flex gap-3 rounded-xl border border-slate-200 bg-white p-4">
                      <FileText
                        size={19}
                        className="mt-0.5 shrink-0 text-slate-400"
                      />

                      <pre className="max-h-48 flex-1 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">
                        {selectedText}
                      </pre>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500">
                    Catatan Verifikator
                  </label>

                  <textarea
                    value={notes}
                    onChange={(event) =>
                      setNotes(
                        event.target.value,
                      )
                    }
                    className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                    placeholder="Catatan internal..."
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500">
                    Alasan Penolakan
                  </label>

                  <textarea
                    value={rejectionReason}
                    onChange={(event) =>
                      setRejectionReason(
                        event.target.value,
                      )
                    }
                    className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 bg-rose-50/30 px-4 py-3 text-sm outline-none focus:border-rose-400"
                    placeholder="Wajib diisi jika ditolak."
                  />
                </div>

                <div className="flex gap-3 sm:justify-end">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      submitDecision(
                        "REJECTED",
                      )
                    }
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-600 sm:flex-none"
                  >
                    <XCircle size={17} />
                    Tolak
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      submitDecision(
                        "APPROVED",
                      )
                    }
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white sm:flex-none"
                  >
                    <CheckCircle2 size={17} />
                    Setujui
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: number;
  valueClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p
        className={`mt-2 text-3xl font-bold ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}
