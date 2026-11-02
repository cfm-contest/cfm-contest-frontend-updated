"use client";

import { useState } from "react";
import useSWR from "swr";
import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";

import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { BackendError, backendFetcher } from "@/lib/api/django/backend";
import { Empty } from "./ResultPanel";

type Status = "correct" | "wrong" | "skipped";

type ReviewItem = {
  id: number;
  n: number;
  txt: string;
  ins: string;
  qtype: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "MATCHING" | "ARRANGE_WORDS" | "FILL_BLANKS";
  xp: number;
  status: Status;
  exp: string | null;
  exp_video: number | null;
  choices?: { id: number; txt: string; ok: boolean; sel: boolean }[];
  pairs?: { left: string; right: string; user: string | null; ok: boolean }[];
  correct_order?: string[];
  user_order?: (string | null)[];
  blanks?: { pos: number; accepted: string[]; user: string | null; ok: boolean }[];
};

type ReviewResponse = {
  result: { a: { n: number; c: number; w: number; u: number } };
  items: ReviewItem[];
};

const STATUS = {
  correct: { label: "To‘g‘ri", icon: CheckCircle2, cls: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  wrong: { label: "Noto‘g‘ri", icon: XCircle, cls: "text-rose-600 bg-rose-50 border-rose-200" },
  skipped: { label: "Javobsiz", icon: MinusCircle, cls: "text-slate-500 bg-slate-50 border-slate-200" },
} as const;

const okCls = (ok: boolean) => (ok ? "text-emerald-700" : "text-rose-600");

function Body({ q }: { q: ReviewItem }) {
  if (q.choices)
    return (
      <ul className="mt-4 space-y-2">
        {q.choices.map((c) => (
          <li
            key={c.id}
            className={`rounded-xl border px-4 py-2.5 text-[15px] ${
              c.ok
                ? "border-emerald-300 bg-emerald-50"
                : c.sel
                  ? "border-rose-300 bg-rose-50"
                  : "border-slate-200"
            }`}
          >
            <MarkdownRenderer content={c.txt} />
            <p className="mt-1 text-xs font-medium text-slate-500">
              {c.sel && c.ok && "Sizning javobingiz — to‘g‘ri"}
              {c.sel && !c.ok && "Sizning javobingiz"}
              {!c.sel && c.ok && "To‘g‘ri javob"}
            </p>
          </li>
        ))}
      </ul>
    );

  if (q.pairs)
    return (
      <ul className="mt-4 space-y-2 text-[15px]">
        {q.pairs.map((p, i) => (
          <li key={i} className="rounded-xl border border-slate-200 px-4 py-2.5">
            <b>{p.left}</b> → <span className={okCls(p.ok)}>{p.user ?? "—"}</span>
            {!p.ok && <span className="ml-2 text-emerald-700">(to‘g‘ri: {p.right})</span>}
          </li>
        ))}
      </ul>
    );

  if (q.correct_order)
    return (
      <div className="mt-4 space-y-2 text-[15px]">
        <p>
          <span className="text-slate-500">Sizniki: </span>
          <span className={okCls(q.status === "correct")}>
            {q.user_order?.length ? q.user_order.join(" ") : "—"}
          </span>
        </p>
        <p>
          <span className="text-slate-500">To‘g‘ri: </span>
          <span className="text-emerald-700">{q.correct_order.join(" ")}</span>
        </p>
      </div>
    );

  if (q.blanks)
    return (
      <ul className="mt-4 space-y-2 text-[15px]">
        {q.blanks.map((b) => (
          <li key={b.pos} className="rounded-xl border border-slate-200 px-4 py-2.5">
            <span className="text-slate-500">{b.pos}-bo‘sh joy: </span>
            <span className={okCls(b.ok)}>{b.user || "—"}</span>
            {!b.ok && <span className="ml-2 text-emerald-700">(to‘g‘ri: {b.accepted.join(" / ")})</span>}
          </li>
        ))}
      </ul>
    );

  return null;
}

export default function ReviewPanel({ slug }: { slug: string }) {
  const [filter, setFilter] = useState<"all" | Status>("all");
  const { data, error, isLoading } = useSWR<ReviewResponse, BackendError>(
    `/tests/${encodeURIComponent(slug)}/review`,
    backendFetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );

  if (isLoading) return <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />;

  if (error || !data) {
    return (
      <Empty
        title={error?.status === 403 ? "Siz bu testda qatnashmagansiz" : "Javoblar hozircha ochiq emas"}
        text={error?.message} // "Natijalar hali e'lon qilinmagan!" va h.k.
      />
    );
  }

  const { a } = data.result;
  const items = filter === "all" ? data.items : data.items.filter((i) => i.status === filter);

  const tabs: { key: "all" | Status; label: string; n: number }[] = [
    { key: "all", label: "Hammasi", n: a.n },
    { key: "correct", label: "To‘g‘ri", n: a.c },
    { key: "wrong", label: "Noto‘g‘ri", n: a.w },
    { key: "skipped", label: "Javobsiz", n: a.u },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              filter === t.key
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t.label} · {t.n}
          </button>
        ))}
      </div>

      {items.map((q) => {
        const s = STATUS[q.status];
        const Icon = s.icon;
        return (
          <section key={q.id} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-slate-950">{q.n}-savol</h3>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${s.cls}`}>
                <Icon className="size-3.5" />
                {s.label}
              </span>
            </div>

            <div className="mt-3 text-[15px] leading-7 text-slate-700">
              <MarkdownRenderer content={q.txt} />
            </div>

            <Body q={q} />

            {q.exp && (
              <div className="mt-4 rounded-xl bg-amber-50 p-4 text-[15px] leading-7 text-slate-700">
                <p className="mb-1 text-sm font-semibold text-amber-800">Izoh</p>
                <MarkdownRenderer content={q.exp} />
              </div>
            )}
          </section>
        );
      })}

      {items.length === 0 && <Empty title="Bu bo‘limda savol yo‘q" text="" />}
    </div>
  );
}
