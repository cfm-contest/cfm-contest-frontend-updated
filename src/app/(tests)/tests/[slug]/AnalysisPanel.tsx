"use client";

import useSWR from "swr";
import { FileText } from "lucide-react";

import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { CommentSection } from "@/components/comments/CommentSection";
import { BackendError, backendFetcher } from "@/lib/api/django/backend";
import { Empty } from "./ResultPanel";

type AnalysisResponse = { id: number; cont: string };

export default function AnalysisPanel({ slug }: { slug: string }) {
  // Brauzer -> Django: GET {API}/tests/{slug}/analysis (cookie bilan)
  const { data, error, isLoading } = useSWR<AnalysisResponse, BackendError>(
    `/tests/${encodeURIComponent(slug)}/analysis`,
    backendFetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-64 rounded-2xl bg-slate-100" />
        <div className="h-32 rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (error || !data) {
    const status = error?.status;
    return (
      <Empty
        title={
          status === 404
            ? "Tahlil hali qo‘shilmagan"
            : status === 403
              ? "Tahlil hozircha ochiq emas"
              : "Tahlilni yuklab bo‘lmadi"
        }
        // 403 da backend sababni aytadi: "Natijalar hali e'lon qilinmagan!" va h.k.
        text={error?.message}
      />
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <FileText className="size-[18px]" />
          </span>
          <h2 className="text-lg font-bold tracking-tight text-slate-950">Test tahlili</h2>
        </div>

        <div className="mt-4 break-words text-[15px] leading-7 text-slate-600 [&_a]:break-all [&_a]:font-medium [&_a]:text-amber-700 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-amber-800 [&_p+p]:mt-3">
          {data.cont ? (
            <MarkdownRenderer content={data.cont} />
          ) : (
            <p className="text-slate-400">Tahlil matni bo‘sh.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <CommentSection target="test-analysis" targetId={data.id} />
      </section>
    </div>
  );
}
