"use client";

import useSWR from "swr";
import Link from "next/link";
import { fetcher } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  Trophy,
  GraduationCap,
  Award,
  ExternalLink,
  Download,
} from "lucide-react";
import { SOURCE_TYPE_LABELS, type CertificateSourceType } from "@/lib/levels";
import type {
  ActivityResponse,
  CertificatesResponse,
  UserCoursesResponse,
  HistoryResponse,
} from "@/lib/types/users";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#E3DFD2] bg-white/60 py-16 text-center text-sm text-[#9B958A]">
      {text}
    </div>
  );
}

/* ---- SKELETONS (content-shape, spinner emas — CLS bo'lmasin) ---- */

function ListRowSkeleton() {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="size-4 shrink-0 rounded-full bg-[#F1EFE7] animate-pulse" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3 w-2/3 rounded bg-[#F1EFE7] animate-pulse" />
        <div className="h-2 w-1/3 rounded bg-[#F5F3EC] animate-pulse" />
      </div>
      <div className="h-5 w-16 shrink-0 rounded-full bg-[#F1EFE7] animate-pulse" />
    </li>
  );
}

function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul className="divide-y divide-[#F0EEE8] rounded-2xl border border-[#ECEAE3] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {Array.from({ length: rows }).map((_, i) => (
        <ListRowSkeleton key={i} />
      ))}
    </ul>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-[#ECEAE3] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="h-4 w-3/5 rounded bg-[#F1EFE7] animate-pulse" />
        <div className="h-5 w-16 shrink-0 rounded-full bg-[#F5F3EC] animate-pulse" />
      </div>
      <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-[#F1EFE7]">
        <div className="h-full w-1/3 rounded-full bg-[#E7E3D8] animate-pulse" />
      </div>
      <div className="h-3 w-2/5 rounded bg-[#F5F3EC] animate-pulse" />
    </div>
  );
}

function GridSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {Array.from({ length: cards }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

function CertCardSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[#ECEAE3] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="size-10 shrink-0 rounded-full bg-[#F1EFE7] animate-pulse" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-2.5 w-1/4 rounded bg-[#F5F3EC] animate-pulse" />
        <div className="h-3.5 w-3/4 rounded bg-[#F1EFE7] animate-pulse" />
        <div className="h-2.5 w-2/5 rounded bg-[#F5F3EC] animate-pulse" />
        <div className="flex gap-3 pt-1">
          <div className="h-3 w-16 rounded bg-[#F5F3EC] animate-pulse" />
          <div className="h-3 w-10 rounded bg-[#F5F3EC] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function CertGridSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {Array.from({ length: cards }).map((_, i) => (
        <CertCardSkeleton key={i} />
      ))}
    </div>
  );
}


/* ---- ACTIVITY ---- */
function ActivityTab({ username }: { username: string }) {
  const key = `/api/user/${username}/activity?limit=20`;

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<ActivityResponse>(key, fetcher, {
    dedupingInterval: 60_000,
    errorRetryCount: 2,
    revalidateOnFocus: false,
  });

  if (isLoading && !data) {
    return <ListSkeleton rows={6} />;
  }

  if (error && !data) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center"
      >
        <XCircle className="mx-auto mb-3 size-8 text-red-500" />

        <h3 className="font-semibold text-[#181818]">
          Faoliyatni yuklab bo‘lmadi
        </h3>

        <p className="mt-2 text-sm text-[#8C877D]">
          Server bilan bog‘lanishda xatolik yuz berdi.
          Iltimos, qayta urinib ko‘ring.
        </p>

        <button
          type="button"
          onClick={() => mutate()}
          className="mt-4 rounded-full bg-[#D9AE55] px-5 py-2 text-sm font-semibold text-[#121212] transition hover:bg-[#C89A3D]"
        >
          Qayta urinish
        </button>
      </div>
    );
  }

  const activity = data?.activity ?? [];

  if (activity.length === 0) {
    return (
      <EmptyState text="Hali hech qanday faollik qayd etilmagan." />
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p
          role="status"
          className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          Ma’lumotlarni yangilashda xatolik yuz berdi.
          Hozircha oldingi ma’lumotlar ko‘rsatilmoqda.
        </p>
      )}

      <ul className="divide-y divide-[#F0EEE8] overflow-hidden rounded-2xl border border-[#ECEAE3] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">

        {activity.map((item) => {
          const content = (
            <>
              {/* Faoliyat turi ikonkasi */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F7F4ED]">
                {item.type === "submission" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : item.type === "test" ? (
                  <GraduationCap className="h-5 w-5 text-[#B8862F]" />
                ) : (
                  <Trophy className="h-5 w-5 text-orange-500" />
                )}
              </div>

              {/* Faoliyat nomi va sanasi */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#181818]">
                  {item.title}
                </p>

                <p className="mt-1 text-xs text-[#9B958A]">
                  {formatDate(item.timestamp)}
                </p>

                {/* Masala yechimi natijasi */}
                {item.type === "submission" && (
                  <div className="mt-2">
                    <Badge variant="outline">
                      {item.verdict_display}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Test natijasi */}
              {item.type === "test" && (
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-[#B8862F]">
                    {item.score ?? "—"} ball
                  </p>

                  <p className="mt-1 text-xs text-[#8C877D]">
                    {item.grade != null
                      ? `Daraja: ${item.grade}`
                      : "Test yakunlangan"}
                  </p>
                </div>
              )}

              {/* Musobaqa natijasi */}
              {item.type === "contest" && (
                <div className="shrink-0 text-right">
                  {item.rank != null && (
                    <p className="text-sm font-bold text-[#B8862F]">
                      {item.rank}-o‘rin
                    </p>
                  )}

                  {item.xp != null && (
                    <p className="mt-1 text-xs text-[#8C877D]">
                      {item.xp} ball
                    </p>
                  )}
                </div>
              )}
            </>
          );

          // Test bosilganda natijalar sahifasiga o'tish
          if (item.type === "test") {
            return (
              <li key={`test-${item.slug}`}>
                <Link
                  href={`/tests/${encodeURIComponent(item.slug)}?tab=natija`}
                  className="flex items-center gap-3 rounded-lg px-4 py-4 transition-colors hover:bg-[#FCFBF8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8862F]"
                  aria-label={`${item.title} test natijalarini ko‘rish`}
                >
                  {content}
                </Link>
              </li>
            );
          }

          // Submission va contest elementlari
          return (
            <li key={`${item.type}-${item.id}`}>
              <div className="flex items-center gap-3 px-4 py-4">
                {content}
              </div>
            </li>
          );
        })}

      </ul>

      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-xs text-[#9B958A]">
          {data?.count ?? activity.length} ta faoliyat
        </p>

        <button
          type="button"
          onClick={() => mutate()}
          className="text-xs font-medium text-[#8C877D] transition hover:text-[#B8862F]"
        >
          Yangilash
        </button>
      </div>
    </div>
  );
}


/* ---- COURSES ---- */
function CoursesTab({ username }: { username: string }) {
  const { data, isLoading } = useSWR<UserCoursesResponse>(
    `/api/user/${username}/courses`,
    fetcher,
    { dedupingInterval: 90_000 }
  );

  if (isLoading) return <GridSkeleton cards={4} />;
  if (!data || data.courses.length === 0)
    return <EmptyState text="Hali birorta kursga yozilmagan." />;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {data.courses.map((enr) => (
        <Link
          key={enr.course.id}
          href={`/courses/${enr.course.slug}`}
          className="group rounded-2xl border border-[#ECEAE3] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:border-[#D9AE55]/50 hover:shadow-md"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <h4 className="font-semibold text-[#181818] transition-colors group-hover:text-[#B8862F]">
              {enr.course.title}
            </h4>
            {enr.is_completed && (
              <Badge className="shrink-0 border-emerald-200 bg-emerald-50 text-emerald-600">
                Tugallangan
              </Badge>
            )}
          </div>

          <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-[#F1EFE7]">
            <div
              className="h-full rounded-full bg-[#D9AE55] transition-all"
              style={{ width: `${enr.progress_percent}%` }}
            />
          </div>
          <p className="text-xs text-[#8C877D]">
            {enr.finished_lessons}/{enr.total_lessons} dars · {enr.finished_tests}/
            {enr.total_tests} test · {enr.progress_percent}%
          </p>
        </Link>
      ))}
    </div>
  );
}

/* ---- CERTIFICATES ---- */
function CertificatesTab({ username }: { username: string }) {
  const { data, isLoading } = useSWR<CertificatesResponse>(
    `/api/user/${username}/certificates`,
    fetcher,
    { dedupingInterval: 5 * 60_000, revalidateOnFocus: false }
  );

  if (isLoading) return <CertGridSkeleton cards={4} />;
  if (!data || data.certificates.length === 0)
    return <EmptyState text="Hali birorta sertifikat qo'lga kiritilmagan." />;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {data.certificates.map((cert) => (
        <div
          key={cert.id}
          className="flex items-start gap-3 rounded-2xl border border-[#ECEAE3] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#D9AE55]/10">
            <Award className="size-5 text-[#D9AE55]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-[#B8862F]">
              {SOURCE_TYPE_LABELS[cert.source_type as CertificateSourceType]}
            </p>
            <h4 className="truncate font-semibold text-[#181818]">{cert.source_title}</h4>
            <p className="mb-3 text-xs text-[#9B958A]">
              {cert.certificate_code} · {formatDate(cert.issued_at)}
            </p>
            <div className="flex items-center gap-3 text-xs font-medium">
              <a
                href={cert.verify_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[#8C877D] transition-colors hover:text-[#D9AE55]"
              >
                <ExternalLink className="size-3.5" /> Tekshirish
              </a>
              {cert.pdf_url && (
                <a
                  href={cert.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[#8C877D] transition-colors hover:text-[#D9AE55]"
                >
                  <Download className="size-3.5" /> PDF
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---- HISTORY ---- */
function HistoryTab({ telegramId }: { telegramId: number }) {
  const { data, isLoading } = useSWR<HistoryResponse>(
    `/api/user/history/${telegramId}?limit=15`,
    fetcher,
    { revalidateOnFocus: false }
  );

  if (isLoading) return <ListSkeleton rows={6} />;
  if (!data || data.results.length === 0)
    return <EmptyState text="Hali birorta masala yechilmagan." />;

  return (
    <ul className="divide-y divide-[#F0EEE8] rounded-2xl border border-[#ECEAE3] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {data.results.map((sub) => (
        <li key={sub.id} className="flex items-center gap-3 px-4 py-3">
          {sub.verdict === "AC" ? (
            <CheckCircle2 className="size-4 shrink-0 text-[#D9AE55]" />
          ) : (
            <XCircle className="size-4 shrink-0 text-[#D8D4C8]" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[#181818]">{sub.problem.title}</p>
            <p className="text-xs text-[#9B958A]">
              {sub.language ?? "—"} · {formatDate(sub.submitted_at)}
            </p>
          </div>
          <span className="text-xs text-[#B5AFA1]">{sub.progress}</span>
          <Badge
            variant={sub.verdict === "AC" ? "default" : "outline"}
            className={
              sub.verdict === "AC"
                ? "bg-[#D9AE55] text-[#121212] hover:bg-[#D9AE55]"
                : "border-[#E3DFD2] text-[#8C877D]"
            }
          >
            {sub.verdict_display}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

/* ---- MAIN ---- */
export function ProfileTabs({
  username,
  telegramId,
}: {
  username: string;
  telegramId: number;
}) {
  return (
    <Tabs defaultValue="activity" className="w-full">
      <TabsList className="mb-6 h-auto w-full justify-start gap-1 bg-transparent p-0 sm:w-fit">
        {[
          { value: "activity", label: "Faoliyat" },
          { value: "courses", label: "Kurslar" },
          { value: "certificates", label: "Sertifikatlar" },
          { value: "history", label: "Yechimlar" },
        ].map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold sm:text-sm text-slate-600 transition hover:text-slate-900 data-[state=active]:border-slate-900 data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-white dark:data-[state=active]:border-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="activity">
        <ActivityTab username={username} />
      </TabsContent>
      <TabsContent value="courses">
        <CoursesTab username={username} />
      </TabsContent>
      <TabsContent value="certificates">
        <CertificatesTab username={username} />
      </TabsContent>
      <TabsContent value="history">
        <HistoryTab telegramId={telegramId} />
      </TabsContent>
    </Tabs>
  );
}
