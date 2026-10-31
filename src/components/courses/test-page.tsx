"use client";

import { useRouter } from "next/navigation";
import {
  Clock,
  ListChecks,
  Play,
  Target,
  Zap,
} from "lucide-react";

import type {
  TestInfoResponse,
} from "@/lib/types/test-session";

interface Props {
  courseSlug: string;
  testSlug: string;
  modulId: number;
  testInfo: TestInfoResponse;
}

export function TestPage({
  courseSlug,
  testSlug,
  testInfo,
}: Props) {
  const router = useRouter();

  const start = () => {
    router.push(
      `/courses/${courseSlug}/test/${testSlug}/question/1`
    );
  };

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-lg sm:rounded-3xl sm:p-6 lg:p-8">
      {/* Badge */}
      <div className="mb-4 inline-flex rounded-full bg-indigo-50 px-3 py-1.5 text-[11px] font-bold tracking-wide text-indigo-600 sm:mb-5 sm:px-4 sm:py-2 sm:text-xs">
        TEST
      </div>

      {/* Title */}
      <h1 className="text-2xl font-black leading-tight text-slate-900 sm:text-3xl lg:text-4xl">
        {testInfo.t}
      </h1>

      {/* Description */}
      {testInfo.desc && (
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
          {testInfo.desc}
        </p>
      )}

      {/* Statistics */}
      <div className="mt-6 grid grid-cols-2 gap-2.5 sm:mt-8 sm:gap-3 lg:grid-cols-4">
        {/* Questions */}
        <div className="rounded-xl bg-slate-50 p-3 text-center sm:rounded-2xl sm:p-4">
          <ListChecks className="mx-auto mb-2 size-5 text-indigo-500 sm:size-6" />

          <b className="block text-sm text-slate-900 sm:text-base">
            {testInfo.qc}
          </b>

          <p className="mt-0.5 text-[11px] text-slate-400 sm:text-xs">
            Savollar
          </p>
        </div>

        {/* Duration */}
        <div className="rounded-xl bg-slate-50 p-3 text-center sm:rounded-2xl sm:p-4">
          <Clock className="mx-auto mb-2 size-5 text-amber-500 sm:size-6" />

          <b className="block text-sm text-slate-900 sm:text-base">
            {testInfo.dur} daq
          </b>

          <p className="mt-0.5 text-[11px] text-slate-400 sm:text-xs">
            Vaqt
          </p>
        </div>

        {/* Passing score */}
        <div className="rounded-xl bg-slate-50 p-3 text-center sm:rounded-2xl sm:p-4">
          <Target className="mx-auto mb-2 size-5 text-emerald-500 sm:size-6" />

          <b className="block text-sm text-slate-900 sm:text-base">
            {testInfo.min_pct}%
          </b>

          <p className="mt-0.5 text-[11px] text-slate-400 sm:text-xs">
            O&apos;tish
          </p>
        </div>

        {/* Lifeline */}
        <div className="rounded-xl bg-slate-50 p-3 text-center sm:rounded-2xl sm:p-4">
          <Zap className="mx-auto mb-2 size-5 text-rose-500 sm:size-6" />

          <b className="block text-sm text-slate-900 sm:text-base">
            {testInfo.ml}
          </b>

          <p className="mt-0.5 text-[11px] text-slate-400 sm:text-xs">
            Lifeline
          </p>
        </div>
      </div>

      {/* Best Result */}
      {testInfo.best && (
        <div className="mt-5 rounded-xl bg-slate-50 p-4 sm:mt-6 sm:rounded-2xl sm:p-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 sm:text-xs">
            Eng yaxshi natija
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2 sm:flex sm:gap-6">
            <div className="min-w-0">
              <p className="text-[11px] text-slate-400 sm:text-xs">
                To&apos;g&apos;ri
              </p>

              <b className="text-sm text-emerald-600 sm:text-base">
                {testInfo.best.c}
              </b>
            </div>

            <div className="min-w-0">
              <p className="text-[11px] text-slate-400 sm:text-xs">
                Xato
              </p>

              <b className="text-sm text-rose-600 sm:text-base">
                {testInfo.best.w}
              </b>
            </div>

            <div className="min-w-0">
              <p className="text-[11px] text-slate-400 sm:text-xs">
                XP
              </p>

              <b className="text-sm text-amber-600 sm:text-base">
                {testInfo.best.xp}
              </b>
            </div>
          </div>
        </div>
      )}

      {/* Start / Continue */}
      <button
        type="button"
        onClick={start}
        className="
          mt-6
          flex h-12 w-full items-center justify-center gap-2
          rounded-xl
          bg-black
          px-4
          text-sm font-semibold text-white
          shadow-md shadow-black/15
          transition-all duration-200
          hover:bg-slate-900
          hover:shadow-lg hover:shadow-black/20
          active:scale-[0.99]
          focus:outline-none
          focus:ring-2 focus:ring-black/20
          focus:ring-offset-2
          sm:mt-8
          sm:h-14
          sm:rounded-2xl
          sm:text-base
        "
      >
        <Play className="size-4 fill-current sm:size-5" />

        <span>
          {testInfo.as
            ? "Testni davom ettirish"
            : "Testni boshlash"}
        </span>
      </button>
    </div>
  );
}