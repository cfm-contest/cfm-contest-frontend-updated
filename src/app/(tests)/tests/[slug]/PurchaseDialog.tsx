"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { ArrowUpRight, Copy, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TestDetailData } from "@/lib/api/tests/types";

const TELEGRAM_USERNAME = "cfm_admin";
const ADMIN_EMAIL = "codingformachinecontest@gmail.com";

/* ---------------- rangli brend ikonkalar ---------------- */

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#229ED9" />
      <path
        fill="#fff"
        d="M17.9 7.1 15.7 17c-.16.72-.6.9-1.2.56l-3.3-2.43-1.6 1.53c-.18.18-.32.32-.66.32l.24-3.36 6.1-5.5c.27-.24-.06-.37-.41-.13l-7.55 4.75-3.25-1.02c-.7-.22-.72-.7.15-1.04l12.7-4.9c.59-.21 1.1.14.9 1.04z"
      />
    </svg>
  );
}

function GmailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2.5" fill="#fff" />
      <path fill="#4285F4" d="M2 7.2V18a2 2 0 0 0 2 2h3V10.4z" />
      <path fill="#34A853" d="M22 7.2V18a2 2 0 0 1-2 2h-3v-9.6z" />
      <path fill="#FBBC04" d="M22 6.2v1l-5 3.6V7.4l1.9-1.4a1.6 1.6 0 0 1 3.1.2z" />
      <path fill="#C5221F" d="M2 6.2v1l5 3.6V7.4L5.1 6A1.6 1.6 0 0 0 2 6.2z" />
      <path fill="none" stroke="#EA4335" strokeWidth="2.2" strokeLinejoin="round" d="m7 7.4 5 3.9 5-3.9" />
    </svg>
  );
}

/* ---------------- dialog ---------------- */

export default function PurchaseDialog({
  open,
  onClose,
  test,
  priceText,
  oldPriceText,
  username,
}: {
  open: boolean;
  onClose: () => void;
  test: TestDetailData;
  priceText: string;
  oldPriceText?: string | null;
  username?: string | null;
}) {
  // Xabar avtomatik shakllanadi: test nomi, narx, havola, foydalanuvchi
  const message = useMemo(() => {
    const url = typeof window === "undefined" ? "" : `${window.location.origin}/tests/${test.slug}`;
    return [
      "Assalomu alaykum!",
      `Men “${test.t}” testini sotib olish bo‘yicha murojaat qilayapman.`,
      "",
      `Narxi: ${priceText}`,
      url && `Havola: ${url}`,
      username && `Profilim: @${username}`,
      "",
      "To‘lov va ro‘yxatdan o‘tish tartibini tushuntirib bera olasizmi?",
    ]
      .filter((l) => l !== undefined  && l !== null)
      .join("\n");
  }, [test.slug, test.t, priceText, username, open]);

  const subject = `Test sotib olish: ${test.t}`;
  const telegramHref = `https://t.me/${TELEGRAM_USERNAME}?text=${encodeURIComponent(message)}`;
  const mailHref = `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    message.replace(/\n/g, "\r\n"),
  )}`;

  const copy = async (text: string, okText: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(okText);
    } catch {
      toast.error("Nusxalab bo‘lmadi");
    }
  };

  // Telegram `?text=` ba’zi mijozlarda tushib qolishi mumkin — zaxira sifatida xabarni nusxalab qo‘yamiz
  const copyQuietly = () => navigator.clipboard?.writeText(message).catch(() => {});

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <div className="mb-1 flex size-12 items-center justify-center rounded-2xl bg-amber-100">
            <ShoppingBag className="size-6 text-amber-700" />
          </div>
          <DialogTitle className="text-xl font-black">Testni sotib olish</DialogTitle>
          <DialogDescription>
            Bu pullik test. Quyidagi kanallardan biri orqali admin bilan bog‘laning — xabar siz uchun tayyor.
          </DialogDescription>
        </DialogHeader>

        {/* narx */}
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
          <p className="min-w-0 truncate text-sm font-semibold text-slate-700">{test.t}</p>
          <div className="shrink-0 text-right">
            {oldPriceText && <p className="text-xs text-slate-400 line-through">{oldPriceText}</p>}
            <p className="text-lg font-black text-slate-900">{priceText}</p>
          </div>
        </div>

        {/* kontaktlar */}
        <div className="grid gap-2.5">
          <a
            href={telegramHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={copyQuietly}
            className="group flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50/60 p-3.5 transition hover:border-sky-400 hover:bg-sky-50"
          >
            <TelegramIcon className="size-11 shrink-0 drop-shadow-sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">Telegram orqali yozish</p>
              <p className="truncate text-sm text-sky-700">@{TELEGRAM_USERNAME}</p>
            </div>
            <ArrowUpRight className="size-5 shrink-0 text-sky-500 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>

          <a
            href={mailHref}
            onClick={copyQuietly}
            className="group flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/50 p-3.5 transition hover:border-red-300 hover:bg-red-50"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
              <GmailIcon className="size-7" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">Email orqali yozish</p>
              <p className="truncate text-sm text-red-600">{ADMIN_EMAIL}</p>
            </div>
            <ArrowUpRight className="size-5 shrink-0 text-red-400 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>

        {/* tayyor xabar */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Yuboriladigan xabar</p>
            <button
              type="button"
              onClick={() => copy(message, "Xabar nusxalandi")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 transition hover:text-black"
            >
              <Copy className="size-3.5" /> Nusxalash
            </button>
          </div>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-slate-200 bg-white p-3.5 font-sans text-[13px] leading-6 text-slate-600">
            {message}
          </pre>
        </div>

        <DialogFooter className="gap-2 sm:flex-row sm:justify-between">
          <Button
            variant="ghost"
            className="h-10 rounded-xl text-slate-600"
            onClick={() => copy(ADMIN_EMAIL, "Email nusxalandi")}
          >
            <Copy className="size-4" /> Emailni nusxalash
          </Button>
          <Button variant="outline" className="h-10 rounded-xl" onClick={onClose}>
            Yopish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
