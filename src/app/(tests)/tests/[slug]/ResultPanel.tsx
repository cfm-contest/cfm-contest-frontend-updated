"use client";

import useSWR from "swr";
import { motion } from "framer-motion";
import { Ring } from "@/components/tests/Ring";
import { ApiError, fetcher } from "@/lib/api/tests/client";
import { MAX_BALL, type TestResultResponse } from "@/lib/api/tests/types";

const num = (v: number | null | undefined, d = 1) =>
  v === null || v === undefined ? "—" : v.toFixed(d).replace(/\.0+$/, "");

export default function ResultPanel({ slug }: { slug: string }) {
  const { data, error, isLoading } = useSWR<TestResultResponse, ApiError>(
    `${slug}/result`,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );

  if (isLoading) return <Skeleton />;

  if (error || !data) {
    return (
      <Empty
        title={error?.status === 403 ? "Siz bu testda qatnashmagansiz" : "Natijani yuklab bo‘lmadi"}
        text={error?.status === 403 ? "Natija faqat testni topshirgan ishtirokchilarga ko‘rinadi." : error?.message}
      />
    );
  }

  const { a, r } = data;
  const answered = a.c + a.w;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 sm:grid-cols-[auto_1fr] sm:items-center sm:p-8">
        {r ? (
          <Ring value={r.ball} max={MAX_BALL} size={168} stroke={9} color="#f59e0b" className="mx-auto">
            <div className="text-center">
              <div className="text-4xl font-black tabular-nums text-slate-900">{num(r.ball, 2)}</div>
              <div className="mt-0.5 text-sm font-semibold text-slate-500">ball</div>
              {r.g && (
                <div className="mx-auto mt-2 w-fit rounded-full bg-amber-50 px-3 py-0.5 text-sm font-bold text-amber-700 ring-1 ring-inset ring-amber-200">
                  {r.g}
                </div>
              )}
            </div>
          </Ring>
        ) : (
          <Ring value={answered} max={a.n} size={168} stroke={9} color="#64748b" className="mx-auto">
            <div className="text-center">
              <div className="text-3xl font-black tabular-nums text-slate-900">
                {answered}
                <span className="text-lg font-semibold text-slate-400">/{a.n}</span>
              </div>
              <div className="mt-0.5 text-sm font-semibold text-slate-500">javob berilgan</div>
            </div>
          </Ring>
        )}

        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {r ? "Sizning natijangiz" : "Natijalar hali e’lon qilinmagan"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {r
              ? "Ball Rasch modeli bo‘yicha butun test ishtirokchilariga nisbatan hisoblangan."
              : "Test tugagach Rasch bo‘yicha ball hisoblanadi va shu yerda paydo bo‘ladi."}
          </p>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <Stat label="To‘g‘ri" value={a.c} total={a.n} color="#10b981" tone="text-emerald-700" />
            <Stat label="Noto‘g‘ri" value={a.w} total={a.n} color="#f43f5e" tone="text-rose-700" />
            <Stat label="Javobsiz" value={a.u} total={a.n} color="#94a3b8" tone="text-slate-600" />
          </div>
        </div>
      </div>

      {r && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="grid grid-cols-2 gap-3">
            <Mini label="Ishtirokchilar" value={String(r.st.n)} />
            <Mini label="Savollar" value={String(r.st.q)} />
            <Mini label="O‘rtacha ball" value={num(r.st.avg)} />
            <Mini label="Median ball" value={num(r.st.med)} />
          </div>
          <GradeBars gr={r.st.gr} mine={r.g} />
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  total,
  color,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  tone: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-slate-50 p-3">
      <Ring value={value} max={total} size={64} stroke={12} color={color}>
        <span className={`text-base font-black tabular-nums ${tone}`}>{value}</span>
      </Ring>
      <span className="mt-2 text-xs font-semibold text-slate-500">{label}</span>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-2xl font-black tabular-nums text-slate-900">{value}</div>
      <div className="mt-1 text-xs font-medium text-slate-500">{label}</div>
    </div>
  );
}

const GRADE_ORDER = ["A+", "A", "B+", "B", "C+", "C", "NC"];

function GradeBars({ gr, mine }: { gr: Record<string, number>; mine: string }) {
  const max = Math.max(1, ...GRADE_ORDER.map((g) => gr[g] ?? 0));
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-bold text-slate-900">Darajalar taqsimoti</h3>
      <div className="mt-4 space-y-2.5">
        {GRADE_ORDER.map((g, i) => {
          const n = gr[g] ?? 0;
          const isMine = g === mine;
          return (
            <div key={g} className="flex items-center gap-3 text-sm">
              <span className={`w-8 font-bold ${isMine ? "text-amber-700" : "text-slate-500"}`}>{g}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  className={`h-full rounded-full ${isMine ? "bg-amber-500" : "bg-slate-300"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(n / max) * 100}%` }}
                  transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                />
              </div>
              <span className="w-8 text-right tabular-nums text-slate-500">{n}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-56 rounded-2xl bg-slate-100" />
      <div className="h-32 rounded-2xl bg-slate-100" />
    </div>
  );
}

export function Empty({ title, text }: { title: string; text?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <p className="font-semibold text-slate-800">{title}</p>
      {text && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{text}</p>}
    </div>
  );
}
