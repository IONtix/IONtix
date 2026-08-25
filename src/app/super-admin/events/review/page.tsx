"use client";

import {
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Loader2,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

type EventItem = {
  id: string;
  title: string;
  status: string;
  date: string;
  location: string;
  organization?: {
    name: string;
  } | null;
  eo?: {
    name: string;
  } | null;
};

function formatDate(
  value: string,
) {
  return new Date(
    value,
  ).toLocaleDateString(
    "id-ID",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );
}

export default function EventReviewPage() {
  const [events, setEvents] =
    useState<EventItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState<string | null>(null);

  const [selected, setSelected] =
    useState<EventItem | null>(null);

  const [reason, setReason] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReviewQueue() {
      try {
        const response =
          await fetch(
            "/api/super-admin/events/review",
            {
              cache: "no-store",
            },
          );

        const json =
          await response.json();

        if (cancelled) {
          return;
        }

        if (json.success) {
          setEvents(
            json.data ?? [],
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Gagal memuat review event:",
            error,
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadReviewQueue();

    return () => {
      cancelled = true;
    };
  }, []);

  async function load() {
    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/super-admin/events/review",
          {
            cache: "no-store",
          },
        );

      const json =
        await response.json();

      if (json.success) {
        setEvents(
          json.data ?? [],
        );
      }
    } catch (error) {
      console.error(
        "Gagal memperbarui review event:",
        error,
      );
    } finally {
      setLoading(false);
    }
  }

  async function approve(
    eventId: string,
  ) {
    if (
      !window.confirm(
        "Setujui dan publikasikan event ini?",
      )
    ) {
      return;
    }

    setProcessing(eventId);

    try {
      const response =
        await fetch(
          "/api/super-admin/events/review",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              eventId,
              action:
                "APPROVE",
            }),
          },
        );

      const json =
        await response.json();

      if (!response.ok) {
        throw new Error(
          json.message ||
            "Gagal mempublikasikan event.",
        );
      }

      await load();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Gagal memproses event.",
      );
    } finally {
      setProcessing(null);
    }
  }

  async function returnToDraft() {
    if (!selected) {
      return;
    }

    if (!reason.trim()) {
      window.alert(
        "Alasan wajib diisi.",
      );
      return;
    }

    setProcessing(
      selected.id,
    );

    try {
      const response =
        await fetch(
          "/api/super-admin/events/review",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              eventId:
                selected.id,
              action:
                "RETURN_TO_DRAFT",
              reason:
                reason.trim(),
            }),
          },
        );

      const json =
        await response.json();

      if (!response.ok) {
        throw new Error(
          json.message ||
            "Gagal mengembalikan event.",
        );
      }

      setSelected(null);
      setReason("");

      await load();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Gagal memproses event.",
      );
    } finally {
      setProcessing(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-900 p-3 text-white">
              <ShieldCheck size={22} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Super Admin
              </p>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Review Event
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Tinjau event sebelum dipublikasikan
                kepada peserta.
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="font-semibold text-slate-900">
                Menunggu Review
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                {events.length} event menunggu
                keputusan.
              </p>
            </div>

            <ClipboardCheck
              size={19}
              className="text-slate-400"
            />
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <Loader2
                className="animate-spin text-slate-400"
                size={24}
              />
            </div>
          ) : events.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <CheckCircle2
                size={34}
                className="text-emerald-500"
              />

              <p className="mt-3 font-semibold text-slate-700">
                Tidak ada event menunggu review
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Semua event sudah diproses.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {events.map(
                (event) => (
                  <div
                    key={event.id}
                    className="px-6 py-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-700">
                            Menunggu Review
                          </span>
                        </div>

                        <h3 className="mt-2 text-base font-bold text-slate-900">
                          {event.title}
                        </h3>

                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                          <span>
                            EO:{" "}
                            {event.eo
                              ?.name ||
                              "—"}
                          </span>

                          <span>
                            Organisasi:{" "}
                            {event.organization
                              ?.name ||
                              "—"}
                          </span>

                          <span>
                            {formatDate(
                              event.date,
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <a
                          href={`/dashboard/events/${event.id}`}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Detail
                          <ChevronRight
                            size={14}
                          />
                        </a>

                        <button
                          type="button"
                          disabled={
                            processing ===
                            event.id
                          }
                          onClick={() =>
                            void approve(
                              event.id,
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          <CheckCircle2
                            size={15}
                          />
                          Setujui & Publikasikan
                        </button>

                        <button
                          type="button"
                          disabled={
                            processing ===
                            event.id
                          }
                          onClick={() =>
                            setSelected(
                              event,
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        >
                          <RotateCcw
                            size={15}
                          />
                          Kembalikan
                        </button>
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </section>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Kembalikan ke Draft
            </p>

            <h2 className="mt-1 text-lg font-bold text-slate-900">
              {selected.title}
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Berikan alasan agar EO mengetahui
              perbaikan yang harus dilakukan.
            </p>

            <textarea
              value={reason}
              onChange={(event) =>
                setReason(
                  event.target.value,
                )
              }
              className="mt-4 min-h-32 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
              placeholder="Contoh: Formulir peserta belum memiliki versi published."
            />

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setReason("");
                }}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={
                  processing === selected.id
                }
                onClick={() =>
                  void returnToDraft()
                }
                className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                Simpan & Kembalikan
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
