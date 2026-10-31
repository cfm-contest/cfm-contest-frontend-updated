"use client";

import { useRouter } from "next/navigation";

import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Trophy,
  RotateCcw,
} from "lucide-react";

import type {
  TestResult,
} from "@/lib/types/test-session";

interface Props {
  result: TestResult;
  courseSlug: string;
  testSlug: string;
}

function computeScore(result: TestResult) {
  const total = result.rs.length;

  const percentage =
    total > 0
      ? Math.round(
          (result.c / total) * 100 * 100
        ) / 100
      : 0;

  const passed = percentage >= result.min_pct;

  return { total, percentage, passed };
}

export function TestResultPage({
  result,
  courseSlug,
  testSlug,
}: Props) {
  const router = useRouter();

  const { total, percentage, passed } =
    computeScore(result);

  return (
    <div className="rounded-3xl bg-white p-8">

      <div className="text-center">

        <Trophy className="mx-auto size-14 text-amber-500" />

        <h1 className="mt-4 text-3xl font-black text-slate-900">
          Test yakunlandi
        </h1>

        <p className="mt-2 text-slate-500">
          {passed
            ? "Tabriklaymiz!"
            : "Test qayta topshirilishi mumkin."}
        </p>

        <p className="mt-1 text-xs text-slate-400">
          O'tish balli: {result.min_pct}%
        </p>

      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">

        <div className="rounded-2xl bg-slate-50 p-5 text-center">
          <b className="text-2xl">
            {percentage}%
          </b>
          <p className="text-xs text-slate-400">
            Foiz
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-50 p-5 text-center">
          <b className="text-2xl text-emerald-600">
            {result.c}
          </b>
          <p className="text-xs text-slate-400">
            To'g'ri
          </p>
        </div>

        <div className="rounded-2xl bg-rose-50 p-5 text-center">
          <b className="text-2xl text-rose-600">
            {result.w}
          </b>
          <p className="text-xs text-slate-400">
            Xato
          </p>
        </div>

        <div className="rounded-2xl bg-amber-50 p-5 text-center">
          <b className="text-2xl text-amber-600">
            {result.xp}
          </b>
          <p className="text-xs text-slate-400">
            XP
          </p>
        </div>

      </div>

      {result.u > 0 && (
        <p className="mt-4 text-center text-xs text-slate-400">
          Javob berilmagan savollar: {result.u} / {total}
        </p>
      )}

      {/* SAVOLLAR BO'YICHA SHARH */}

      {result.rs.length > 0 && (
        <div className="mt-8 space-y-2">
          <p className="mb-2 text-xs font-bold uppercase text-slate-400">
            Savollar
          </p>

          {result.rs.map((item, index) => (
            <div
              key={item.q}
              className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
            >
              {!item.answered ? (
                <HelpCircle className="size-5 shrink-0 text-slate-300" />
              ) : item.ok ? (
                <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
              ) : (
                <XCircle className="size-5 shrink-0 text-rose-500" />
              )}

              <p className="line-clamp-1 flex-1 text-sm text-slate-700">
                {index + 1}. {item.txt}
              </p>

              <span className="text-xs font-bold text-slate-400">
                {item.answered
                  ? item.ok
                    ? `+${item.xp} XP`
                    : "0 XP"
                  : "Javobsiz"}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() =>
          router.push(
            `/courses/${courseSlug}/test/${testSlug}`
          )
        }
        className="mt-8 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 font-bold text-white"
      >
        <RotateCcw className="size-5" />
        Testga qaytish
      </button>

    </div>
  );
}