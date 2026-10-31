"use client";

import { SubscriptionPlan } from "@/lib/subscriptions/types";
import {
  Send,
  X,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Calendar,
  CreditCard,
  ExternalLink,
} from "lucide-react";

interface TelegramModalProps {
  plan: SubscriptionPlan | null;
  isOpen: boolean;
  onClose: () => void;
  adminUsername?: string;
}

export function TelegramModal({
  plan,
  isOpen,
  onClose,
  adminUsername = "@cfm_admin",
}: TelegramModalProps) {
  if (!isOpen || !plan) return null;

  // Narxni so'mda formatlash
  const formattedPrice = new Intl.NumberFormat("uz-UZ").format(
    Number(plan.price)
  );

  // Telegram deep-link uchun tayyor matn
  const message = `🚀 YANGI OBUNA SO'ROVI

📌 Tarif: ${plan.name}
💰 Narxi: ${formattedPrice} UZS
⏱ Davomiyligi: ${plan.duration_days} kun

Assalomu alaykum! Ushbu tarifga obuna bo'lmoqchiman. To'lov rekvizitlarini yuborsangiz.`;

  // Telegram linki
  const telegramUrl = `https://t.me/${adminUsername.replace(
    "@",
    ""
  )}?text=${encodeURIComponent(message)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Modal Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl transition-all scale-100 animate-in zoom-in-95 duration-200">
        
        {/* Yengil Slate/Amber Gradient Bezak */}
        <div className="absolute -top-16 -right-16 h-36 w-36 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-slate-500/10 blur-2xl pointer-events-none" />

        {/* Yopish tugmasi */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          aria-label="Yopish"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 sm:p-7">
          
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-900 dark:bg-slate-800 text-amber-400 border border-slate-800 dark:border-slate-700 shadow-md">
              <Send className="h-7 w-7 -rotate-12 translate-x-0.5" />
              <div className="absolute -bottom-1 -right-1 rounded-full bg-amber-500 p-0.5 text-slate-950 ring-2 ring-white dark:ring-slate-900">
                <Sparkles className="h-3 w-3" />
              </div>
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Obunani rasmiylashtirish
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xs leading-relaxed">
              To'lovni Telegram administratorimiz orqali amalga oshirishingiz mumkin.
            </p>
          </div>

          {/* Tarif Detallari Kartasi */}
          <div className="mt-6 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200/80 dark:border-slate-800 space-y-3">
            
            {/* Tarif nomi */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="h-4 w-4 text-emerald-500" /> Tarif
              </span>
              <span className="font-semibold text-slate-900 dark:text-white text-sm">
                {plan.name}
              </span>
            </div>

            <div className="h-px bg-slate-200 dark:bg-slate-700/60" />

            {/* Muddat */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="h-4 w-4 text-amber-500" /> Muddat
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {plan.duration_days} kun
              </span>
            </div>

            <div className="h-px bg-slate-200 dark:bg-slate-700/60" />

            {/* Summa */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <CreditCard className="h-4 w-4 text-slate-400 dark:text-slate-500" /> To'lov summasi
              </span>
              <span className="font-extrabold text-slate-900 dark:text-white text-base">
                {formattedPrice} <span className="text-xs font-normal text-slate-500">UZS</span>
              </span>
            </div>
          </div>

          {/* Qadamlar */}
          <div className="mt-4 space-y-2 rounded-lg bg-slate-100/70 dark:bg-slate-800/30 p-3 border border-slate-200/50 dark:border-slate-800">
            <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Tugmani bosganingizdan so'ng Telegram dasturi ochiladi.</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Adminga xabarni yuboring va to'lov rekvizitlarini oling.</span>
            </div>
          </div>

          {/* Action Tugmalar */}
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-1/3 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer order-2 sm:order-1"
            >
              Bekor qilish
            </button>
            
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="w-full sm:w-2/3 flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs py-2.5 shadow-md transition-all cursor-pointer order-1 sm:order-2"
            >
              <Send className="h-4 w-4" />
              <span>Telegram orqali yozish</span>
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          </div>

          {/* Izoh */}
          <p className="mt-4 text-center text-[11px] text-slate-400 dark:text-slate-500">
            Obuna to'lov tasdiqlangandan so'ng faollashtiriladi.
          </p>

        </div>
      </div>
    </div>
  );
}