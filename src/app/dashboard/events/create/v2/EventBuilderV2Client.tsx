"use client";

import Link from "next/link";

import useSWR from "swr";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  PackageOpen,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  useMemo,
  useState,
} from "react";

import {
  createEventFromTemplateAction,
} from "@/app/actions/events/create-from-template";

interface Sport {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
}

interface SportsResponse {
  success: boolean;
  data: Sport[];
  error?: string;
}

interface Template {
  id: string;
  sportId: string;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  allowEOEdit: boolean;
  sport: {
    id: string;
    name: string;
    slug: string;
  };
  versions: Array<{
    id: string;
    version: number;
    status: string;
    publishedAt: string | null;
  }>;
}

interface TemplatesResponse {
  success: boolean;
  data: Template[];
  error?: string;
}

interface TemplateField {
  id: string;
  key: string;
  label: string;
  description: string | null;
  fieldType: string;
  placeholder: string | null;
  order: number;
  isRequired: boolean;
  isSystem: boolean;
  isEditableByEO: boolean;
  isVisible: boolean;
}

interface TemplateDetailResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
    slug: string;
    sport: {
      id: string;
      name: string;
      slug: string;
    };
    versions: Array<{
      id: string;
      version: number;
      status: string;
      fields: TemplateField[];
    }>;
  };
  error?: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  status: string;
  isOwner?: boolean;
  title?: string | null;
}

interface OrganizationContextResponse {
  success: boolean;
  data: {
    role: string;
    organizations: Organization[];
  };
  error?: string;
}

async function fetcher<T>(
  url: string,
): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
  });

  const payload =
    (await response.json()) as T & {
      error?: string;
    };

  if (!response.ok) {
    throw new Error(
      payload.error ??
        "Gagal mengambil data.",
    );
  }

  return payload;
}

function formatFieldType(
  fieldType: string,
) {
  switch (fieldType) {
    case "TEXT":
      return "Teks";

    case "EMAIL":
      return "Email";

    case "PHONE":
      return "Nomor Telepon";

    case "DATE":
      return "Tanggal";

    case "GENDER":
      return "Jenis Kelamin";

    case "EMERGENCY_CONTACT":
      return "Kontak Darurat";

    default:
      return fieldType;
  }
}

export default function EventBuilderV2Client() {
  const [step, setStep] = useState(1);
  const [sportId, setSportId] =
    useState("");
  const [templateId, setTemplateId] =
    useState("");
  const [
    organizationId,
    setOrganizationId,
  ] = useState("");

  const [title, setTitle] =
    useState("");
  const [description, setDescription] =
    useState("");
  const [date, setDate] =
    useState("");
  const [endDate, setEndDate] =
    useState("");
  const [location, setLocation] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [submitError, setSubmitError] =
    useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const [
    createdEventId,
    setCreatedEventId,
  ] = useState("");

  const {
    data: sportsData,
    error: sportsError,
    isLoading: sportsLoading,
  } = useSWR<SportsResponse>(
    "/api/sports",
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const templateUrl = sportId
    ? `/api/form-templates?sportId=${sportId}`
    : null;

  const {
    data: templatesData,
    error: templatesError,
    isLoading: templatesLoading,
  } = useSWR<TemplatesResponse>(
    templateUrl,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const detailUrl = templateId
    ? `/api/form-templates/${templateId}`
    : null;

  const {
    data: templateDetail,
    error: templateDetailError,
    isLoading: templateDetailLoading,
  } = useSWR<TemplateDetailResponse>(
    detailUrl,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const {
    data: organizationData,
    error: organizationError,
    isLoading: organizationLoading,
  } = useSWR<OrganizationContextResponse>(
    "/api/organizations/context",
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const sports = useMemo(
    () => sportsData?.data ?? [],
    [sportsData?.data],
  );

  const templates = useMemo(
    () => templatesData?.data ?? [],
    [templatesData?.data],
  );

  const organizations =
    useMemo(
      () =>
        organizationData?.data
          .organizations ?? [],
      [
        organizationData?.data
          .organizations,
      ],
    );

  const userRole =
    organizationData?.data.role ?? "";

  const resolvedOrganizationId =
    organizationId ||
    (organizations.length === 1
      ? organizations[0].id
      : "");

  const selectedSport = useMemo(
    () =>
      sports.find(
        (sport) =>
          sport.id === sportId,
      ) ?? null,
    [sportId, sports],
  );

  const selectedTemplate = useMemo(
    () =>
      templates.find(
        (template) =>
          template.id ===
          templateId,
      ) ?? null,
    [templateId, templates],
  );

  const publishedVersion =
    templateDetail?.data.versions[0] ??
    null;

  const canNextFromStep1 =
    Boolean(sportId);

  const canNextFromStep2 =
    Boolean(
      templateId &&
        publishedVersion,
    );

  const canSubmit =
    Boolean(
      resolvedOrganizationId &&
        title.trim() &&
        date &&
        location.trim() &&
        sportId &&
        templateId &&
        publishedVersion,
    );

  async function handleCreateDraft() {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    setSuccessMessage("");

    try {
      const result =
        await createEventFromTemplateAction({
          title,
          organizationId:
            resolvedOrganizationId,
          sportId,
          formTemplateId:
            templateId,
          description,
          date,
          endDate:
            endDate || null,
          location,
          submissionMode:
            "DRAFT",
        });

      if (!result.success) {
        const errorMessage =
          "error" in result
            ? result.error
            : undefined;

        setSubmitError(
          errorMessage ??
            "Gagal membuat event.",
        );

        return;
      }

      if ("data" in result) {
        setCreatedEventId(
          result.data.event.id,
        );
      }

      setSuccessMessage(
        "Draft event berhasil dibuat dari template.",
      );

      setStep(5);
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Gagal membuat event.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function goBack() {
    setSubmitError("");
    setSuccessMessage("");
    setCreatedEventId("");
    setStep(
      (current) =>
        Math.max(current - 1, 1),
    );
  }

  function goNext() {
    setSubmitError("");

    if (step === 1) {
      if (!canNextFromStep1) {
        return;
      }

      setStep(2);
      return;
    }

    if (step === 2) {
      if (!canNextFromStep2) {
        return;
      }

      setStep(3);
      return;
    }

    if (step === 3) {
      setStep(4);
    }
  }

  return (
    <div className="min-h-screen -m-6 bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-orange-700">
            <Sparkles size={13} />
            Event Builder V2
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Buat Event
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Buat event berdasarkan sport dan
            template registrasi yang tersedia.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <StepIndicator
            number={1}
            label="Sport"
            active={step === 1}
            completed={step > 1}
          />
          <StepIndicator
            number={2}
            label="Template"
            active={step === 2}
            completed={step > 2}
          />
          <StepIndicator
            number={3}
            label="Fields"
            active={step === 3}
            completed={step > 3}
          />
          <StepIndicator
            number={4}
            label="Detail"
            active={step === 4}
            completed={step > 4}
          />
          <StepIndicator
            number={5}
            label="Selesai"
            active={step === 5}
            completed={step === 5}
          />
        </div>

        {(sportsError ||
          templatesError ||
          templateDetailError ||
          organizationError) && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {sportsError?.message ??
              templatesError?.message ??
              templateDetailError?.message ??
              organizationError?.message ??
              "Gagal memuat konfigurasi event."}
          </div>
        )}

        {submitError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {submitError}
          </div>
        )}

        {successMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            {successMessage}
          </div>
        )}

        <main className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {step === 1 && (
            <section>
              <SectionHeader
                icon={<Trophy size={18} />}
                title="Pilih Cabang Olahraga"
                description="Sport menjadi klasifikasi utama event."
              />

              {sportsLoading ? (
                <LoadingGrid />
              ) : (
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sports.map(
                    (sport) => {
                      const active =
                        sport.id ===
                        sportId;

                      return (
                        <button
                          key={sport.id}
                          type="button"
                          onClick={() => {
                            setSportId(
                              sport.id,
                            );
                            setTemplateId(
                              "",
                            );
                            setStep(
                              1,
                            );
                          }}
                          className={`rounded-2xl border p-5 text-left transition ${
                            active
                              ? "border-orange-400 bg-orange-50 ring-2 ring-orange-100"
                              : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                              <Trophy
                                size={18}
                                className={
                                  active
                                    ? "text-orange-500"
                                    : "text-slate-500"
                                }
                              />
                            </div>

                            {active && (
                              <CheckCircle2
                                size={18}
                                className="text-orange-500"
                              />
                            )}
                          </div>

                          <h3 className="mt-4 text-base font-black text-slate-900">
                            {
                              sport.name
                            }
                          </h3>

                          <p className="mt-1 text-xs text-slate-500">
                            {sport.description ??
                              `Event ${sport.name}`}
                          </p>
                        </button>
                      );
                    },
                  )}
                </div>
              )}

              <div className="mt-8 flex justify-end">
                <PrimaryButton
                  onClick={goNext}
                  disabled={
                    !canNextFromStep1
                  }
                >
                  Lanjut
                  <ChevronRight size={15} />
                </PrimaryButton>
              </div>
            </section>
          )}

          {step === 2 && (
            <section>
              <SectionHeader
                icon={<ClipboardList size={18} />}
                title="Pilih Template Registrasi"
                description={
                  selectedSport
                    ? `Template untuk ${selectedSport.name}.`
                    : "Pilih template yang tersedia."
                }
              />

              {templatesLoading ? (
                <LoadingList />
              ) : templates.length ===
                0 ? (
                <EmptyState
                  title="Belum ada template"
                  description="Sport ini belum memiliki template registrasi yang dipublikasikan."
                />
              ) : (
                <div className="mt-6 space-y-3">
                  {templates.map(
                    (template) => {
                      const active =
                        template.id ===
                        templateId;

                      const version =
                        template
                          .versions[0];

                      return (
                        <button
                          key={
                            template.id
                          }
                          type="button"
                          onClick={() =>
                            setTemplateId(
                              template.id,
                            )
                          }
                          className={`w-full rounded-2xl border p-5 text-left transition ${
                            active
                              ? "border-orange-400 bg-orange-50 ring-2 ring-orange-100"
                              : "border-slate-200 hover:border-orange-200"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-base font-black text-slate-900">
                                {
                                  template.name
                                }
                              </h3>

                              <p className="mt-1 text-xs text-slate-500">
                                {
                                  template.description
                                }
                              </p>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase text-slate-500">
                                  v
                                  {
                                    version?.version ??
                                    "—"
                                  }
                                </span>

                                {template.isSystem && (
                                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase text-blue-700">
                                    System
                                  </span>
                                )}

                                {template.allowEOEdit && (
                                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">
                                    Bisa disesuaikan EO
                                  </span>
                                )}
                              </div>
                            </div>

                            {active && (
                              <CheckCircle2
                                size={18}
                                className="shrink-0 text-orange-500"
                              />
                            )}
                          </div>
                        </button>
                      );
                    },
                  )}
                </div>
              )}

              <div className="mt-8 flex justify-between gap-3">
                <SecondaryButton
                  onClick={goBack}
                >
                  <ChevronLeft size={15} />
                  Kembali
                </SecondaryButton>

                <PrimaryButton
                  onClick={goNext}
                  disabled={
                    !canNextFromStep2
                  }
                >
                  Lanjut
                  <ChevronRight size={15} />
                </PrimaryButton>
              </div>
            </section>
          )}

          {step === 3 && (
            <section>
              <SectionHeader
                icon={<ClipboardList size={18} />}
                title="Field Registrasi"
                description="Preview field yang akan menjadi bagian dari formulir peserta."
              />

              {templateDetailLoading ? (
                <LoadingList />
              ) : publishedVersion ? (
                <div className="mt-6 space-y-3">
                  {publishedVersion.fields.map(
                    (field) => (
                      <div
                        key={field.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-black text-slate-900">
                              {
                                field.label
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {
                                field.key
                              }{" "}
                              ·{" "}
                              {formatFieldType(
                                field.fieldType,
                              )}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {field.isSystem && (
                              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[9px] font-black uppercase text-blue-700">
                                System
                              </span>
                            )}

                            {field.isRequired && (
                              <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[9px] font-black uppercase text-red-700">
                                Wajib
                              </span>
                            )}

                            {field.isEditableByEO && (
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase text-emerald-700">
                                EO
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <EmptyState
                  title="Template belum tersedia"
                  description="Pilih template yang memiliki versi published."
                />
              )}

              <div className="mt-8 flex justify-between gap-3">
                <SecondaryButton
                  onClick={goBack}
                >
                  <ChevronLeft size={15} />
                  Kembali
                </SecondaryButton>

                <PrimaryButton
                  onClick={goNext}
                  disabled={
                    !publishedVersion
                  }
                >
                  Lanjut
                  <ChevronRight size={15} />
                </PrimaryButton>
              </div>
            </section>
          )}

          {step === 4 && (
            <section>
              <SectionHeader
                icon={<CalendarDays size={18} />}
                title="Detail Event"
                description="Isi informasi dasar event. Pengaturan kategori, ticket, dan add-on akan kita tambahkan setelah fondasi ini stabil."
              />

              <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className="lg:col-span-2">
                  <label className="block">
                    <div className="mb-2 flex items-center gap-1 text-xs font-black text-slate-700">
                      Organisasi
                      <span className="text-red-500">
                        *
                      </span>
                    </div>

                    {organizationLoading ? (
                      <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
                    ) : (
                      <select
                        value={
                          organizationId ||
                          (organizations.length ===
                          1
                            ? organizations[0].id
                            : "")
                        }
                        onChange={(event) =>
                          setOrganizationId(
                            event.target.value,
                          )
                        }
                        disabled={
                          organizations.length ===
                          1
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <option value="">
                          Pilih organisasi
                        </option>

                        {organizations.map(
                          (organization) => (
                            <option
                              key={
                                organization.id
                              }
                              value={
                                organization.id
                              }
                            >
                              {organization.name}
                            </option>
                          ),
                        )}
                      </select>
                    )}

                    {organizations.length === 0 &&
                      !organizationLoading && (
                        <p className="mt-2 text-xs font-semibold text-red-600">
                          Tidak ada organisasi aktif yang dapat digunakan.
                        </p>
                      )}

                    {userRole ===
                      "SUPER_ADMIN" &&
                      organizations.length >
                        1 && (
                        <p className="mt-2 text-[11px] font-semibold text-slate-400">
                          Super Admin: pilih organisasi yang akan menjadi owner event ini.
                        </p>
                      )}
                  </label>
                </div>

                <Field
                  label="Nama Event"
                  required
                  value={title}
                  onChange={setTitle}
                  placeholder="Contoh: Jakarta Running Festival"
                />

                <Field
                  label="Lokasi"
                  required
                  value={location}
                  onChange={setLocation}
                  placeholder="Contoh: Jakarta"
                />

                <Field
                  label="Tanggal Mulai"
                  required
                  type="datetime-local"
                  value={date}
                  onChange={setDate}
                />

                <Field
                  label="Tanggal Selesai"
                  type="datetime-local"
                  value={endDate}
                  onChange={setEndDate}
                />

                <div className="lg:col-span-2">
                  <Field
                    label="Deskripsi"
                    value={description}
                    onChange={setDescription}
                    placeholder="Deskripsi singkat event..."
                    textarea
                  />
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-600">
                  Konfigurasi yang dipilih
                </p>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <SummaryBox
                    label="Sport"
                    value={
                      selectedSport?.name ??
                      "—"
                    }
                  />

                  <SummaryBox
                    label="Template"
                    value={
                      selectedTemplate?.name ??
                      "—"
                    }
                  />

                  <SummaryBox
                    label="Version"
                    value={
                      publishedVersion
                        ? `v${publishedVersion.version}`
                        : "—"
                    }
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-between gap-3">
                <SecondaryButton
                  onClick={goBack}
                >
                  <ChevronLeft size={15} />
                  Kembali
                </SecondaryButton>

                <PrimaryButton
                  onClick={
                    handleCreateDraft
                  }
                  disabled={
                    !canSubmit ||
                    isSubmitting
                  }
                >
                  {isSubmitting
                    ? "Menyimpan..."
                    : "Buat Draft Event"}
                  {!isSubmitting && (
                    <ChevronRight size={15} />
                  )}
                </PrimaryButton>
              </div>
            </section>
          )}

          {step === 5 && (
            <section className="py-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50">
                <CheckCircle2
                  size={30}
                  className="text-emerald-600"
                />
              </div>

              <h2 className="mt-5 text-2xl font-black text-slate-900">
                Draft Event Berhasil Dibuat
              </h2>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Event sudah dibuat menggunakan
                Sport dan Template yang dipilih.
                Langkah berikutnya adalah
                menambahkan kategori ticket,
                add-on, dan konfigurasi
                operasional.
              </p>

              <div className="mx-auto mt-6 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryBox
                  label="Event ID"
                  value={
                    createdEventId ||
                    "—"
                  }
                />

                <SummaryBox
                  label="Sport"
                  value={
                    selectedSport?.name ??
                    "—"
                  }
                />

                <SummaryBox
                  label="Template"
                  value={
                    selectedTemplate?.name ??
                    "—"
                  }
                />

                <SummaryBox
                  label="Status"
                  value="DRAFT"
                />
              </div>

              {createdEventId && (
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href={`/dashboard/events/${createdEventId}`}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-xs font-black text-white transition hover:bg-slate-800"
                  >
                    Lihat Event
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard
                        .writeText(
                          createdEventId,
                        )
                        .catch(() => undefined);
                    }}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 transition hover:border-orange-300 hover:text-orange-700"
                  >
                    Salin Event ID
                  </button>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function StepIndicator({
  number,
  label,
  active,
  completed,
}: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-3 ${
        active
          ? "border-orange-300 bg-orange-50"
          : completed
            ? "border-emerald-200 bg-emerald-50"
            : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-black ${
            active
              ? "bg-orange-500 text-white"
              : completed
                ? "bg-emerald-500 text-white"
                : "bg-slate-100 text-slate-500"
          }`}
        >
          {completed ? (
            <CheckCircle2 size={14} />
          ) : (
            number
          )}
        </div>

        <span className="text-xs font-black text-slate-700">
          {label}
        </span>
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-orange-600">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-[0.15em]">
          Event Configuration
        </span>
      </div>

      <h2 className="mt-2 text-xl font-black text-slate-900">
        {title}
      </h2>

      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  required,
  value,
  onChange,
  placeholder,
  type = "text",
  textarea = false,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  textarea?: boolean;
}) {
  const className =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100";

  return (
    <label className="block">
      <div className="mb-2 flex items-center gap-1 text-xs font-black text-slate-700">
        {label}

        {required && (
          <span className="text-red-500">
            *
          </span>
        )}
      </div>

      {textarea ? (
        <textarea
          rows={5}
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          placeholder={placeholder}
          className={className}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          placeholder={placeholder}
          className={className}
        />
      )}
    </label>
  );
}

function SummaryBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-orange-100 bg-white p-3 text-left">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-xs font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 transition hover:border-orange-300 hover:text-orange-700"
    >
      {children}
    </button>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
      <PackageOpen
        size={28}
        className="mx-auto text-slate-300"
      />

      <p className="mt-3 text-sm font-black text-slate-700">
        {title}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map(
        (_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-2xl bg-slate-100"
          />
        ),
      )}
    </div>
  );
}

function LoadingList() {
  return (
    <div className="mt-6 space-y-3">
      {Array.from({ length: 4 }).map(
        (_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-2xl bg-slate-100"
          />
        ),
      )}
    </div>
  );
}
