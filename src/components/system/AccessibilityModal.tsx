"use client";

import { useEffect } from "react";
import { X, RotateCcw } from "lucide-react";
import { useAccessibility, type FontOption, type TextScale } from "@/context/AccessibilityContext";
import { cn } from "@/lib/utils";

const FONT_OPTIONS: { name: FontOption; label: string; preview: string }[] = [
  { name: "IBM Plex Sans", label: "IBM Plex Sans", preview: "Abc Абв O'g'" },
  { name: "Nunito Sans", label: "Nunito Sans", preview: "Abc Абв O'g'" },
  { name: "Inter", label: "Inter", preview: "Abc Абв O'g'" },
  { name: "Roboto", label: "Roboto", preview: "Abc Абв O'g'" },
  { name: "Open Sans", label: "Open Sans", preview: "Abc Абв O'g'" },
  { name: "PT Sans", label: "PT Sans", preview: "Abc Абв O'g'" },
];

const SCALES: { value: TextScale; label: string; pct: string }[] = [
  { value: 1, label: "1×", pct: "100%" },
  { value: 1.125, label: "1.125×", pct: "112%" },
  { value: 1.25, label: "1.25×", pct: "125%" },
  { value: 1.375, label: "1.375×", pct: "137%" },
  { value: 1.5, label: "1.5×", pct: "150%" },
];

export function AccessibilityModal() {
  const {
    isOpen,
    setIsOpen,
    grayscale,
    setGrayscale,
    textScale,
    setTextScale,
    font,
    setFont,
    resetAll,
  } = useAccessibility();

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  const currentScalePct =
    SCALES.find((s) => s.value === textScale)?.pct || `${Math.round(textScale * 100)}%`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessibility-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 sm:p-7">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-neutral-800">
          <h2
            id="accessibility-title"
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl"
          >
            Maxsus imkoniyatlar
          </h2>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Yopish"
            className="flex size-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-neutral-800 dark:hover:text-slate-200"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 py-5">
          {/* 1. Oq-qora rejim */}
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                Oq-qora rejim
              </span>
              <span className="block text-xs text-slate-500 dark:text-neutral-400">
                Saytdagi barcha ranglarni olib tashlaydi
              </span>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={grayscale}
              onClick={() => setGrayscale(!grayscale)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2",
                grayscale ? "bg-slate-900 dark:bg-white" : "bg-slate-200 dark:bg-neutral-700"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out dark:bg-neutral-900",
                  grayscale
                    ? "translate-x-5 bg-white dark:bg-neutral-900"
                    : "translate-x-0 bg-white dark:bg-neutral-400"
                )}
              />
            </button>
          </div>

          {/* 2. Matn o'lchami */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                Matn o'lchami
              </span>
              <span className="text-xs font-semibold tabular-nums text-slate-500 dark:text-neutral-400">
                {currentScalePct}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {SCALES.map((s) => {
                const active = textScale === s.value;
                return (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setTextScale(s.value)}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-xl border text-xs font-bold transition-all",
                      active
                        ? "border-slate-900 bg-slate-900 text-white shadow-sm dark:border-white dark:bg-white dark:text-neutral-900"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-neutral-800 dark:bg-neutral-800/80 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    )}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Shrift */}
          <div>
            <span className="block mb-2.5 text-sm font-semibold text-slate-900 dark:text-white">
              Shrift
            </span>

            <div className="space-y-1.5">
              {FONT_OPTIONS.map((f) => {
                const active = font === f.name;
                return (
                  <button
                    key={f.name}
                    type="button"
                    onClick={() => setFont(f.name)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-all",
                      active
                        ? "border-slate-900 bg-slate-50 font-semibold text-slate-900 dark:border-white/40 dark:bg-neutral-800/80 dark:text-white"
                        : "border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50/60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800/40"
                    )}
                  >
                    <span className="text-sm">{f.label}</span>
                    <span className="flex items-center gap-2 text-xs text-slate-400 dark:text-neutral-500">
                      <span>{f.preview}</span>
                      {active ? (
                        <span className="size-2 rounded-full bg-slate-900 dark:bg-white" />
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer / Reset */}
        <div className="border-t border-slate-100 pt-4 dark:border-neutral-800">
          <button
            type="button"
            onClick={resetAll}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            <RotateCcw className="size-3.5" />
            Asliga qaytarish
          </button>
        </div>
      </div>
    </div>
  );
}
