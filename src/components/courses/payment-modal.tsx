// src/components/courses/payment-modal.tsx
"use client";

import { X, Send, Copy, Check } from "lucide-react";
import { useState } from "react";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  amount: string;
  courseTitle: string;
  /** To'lov tizimi (Click/Payme) hali ulanmagan bo'lsa false qiling */
  isPaymentEnabled?: boolean;
  /** @ belgisisiz, masalan "cfm_admin" */
  adminTelegramUsername?: string;
}

export function PaymentModal({
  open,
  onClose,
  amount,
  courseTitle,
  isPaymentEnabled = false,
  adminTelegramUsername = "cfm_admin",
}: PaymentModalProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const orderNo = String(Date.now()).slice(-6);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`@${adminTelegramUsername}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-t-3xl border border-black bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobil uchun tortish tutqichi */}
        <div className="flex justify-center pt-2.5 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-black/15" />
        </div>

        {/* Top strip — chek raqami */}
        <div className="font-ledger mt-1 flex items-center justify-between bg-black px-5 py-2.5 text-[11px] tracking-wide text-white sm:mt-0">
          <span>Chek № {orderNo}</span>
          <button
            onClick={onClose}
            className="rounded-full p-0.5 transition-opacity hover:opacity-60"
            aria-label="Yopish"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Sarlavha */}
        <div className="px-5 pt-5 pb-4 sm:px-6 sm:pt-6 sm:pb-5">
          <p className="font-ledger text-[11px] tracking-wide text-black/45">
            Kursga yozilish
          </p>
          <h3 className="font-display mt-1 text-lg leading-snug font-bold text-black sm:text-xl">
            {courseTitle}
          </h3>
        </div>

        {/* Narx bloki */}
        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          <div className="flex items-baseline justify-between rounded-xl border border-black/15 px-4 py-3.5">
            <span className="font-ledger text-[11px] tracking-wide text-black/45">
              To'lov summasi
            </span>
            <div className="font-display text-2xl font-bold text-black sm:text-3xl">
              {Number(amount).toLocaleString()}
              <span className="ml-1.5 text-sm font-normal text-black/45">so'm</span>
            </div>
          </div>
        </div>

        {/* Ajratuvchi chiziq */}
        <div className="mx-5 border-t border-black/10 sm:mx-6" />

        {/* ====== ASOSIY QISM ====== */}
        <div className="p-5 sm:p-6">
          {isPaymentEnabled ? (
            <div className="flex flex-col gap-2.5">
              <button className="font-ledger flex w-full items-center justify-center gap-2.5 rounded-xl bg-black py-3.5 text-sm font-medium tracking-wide text-white transition-opacity hover:opacity-85 active:scale-[0.99]">
                Click orqali to'lash
              </button>
              <button className="font-ledger flex w-full items-center justify-center gap-2.5 rounded-xl border border-black py-3.5 text-sm font-medium tracking-wide text-black transition-colors hover:bg-black/[0.03] active:scale-[0.99]">
                Payme orqali to'lash
              </button>
              <p className="font-ledger pt-1 text-center text-[10px] tracking-wide text-black/40">
                To'lov xavfsiz ulanish orqali amalga oshiriladi
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-black/15 px-5 py-6 text-center">
              <div className="flex size-11 items-center justify-center rounded-full bg-black">
                <Send className="size-5 text-white" />
              </div>

              <div>
                <p className="text-sm font-medium text-black">
                  Kursni sotib olish uchun admin bilan bog'laning
                </p>
                <p className="mt-1 text-xs text-black/45">
                  To'lov Telegram orqali qo'lda tasdiqlanadi
                </p>
              </div>

              <button
                onClick={handleCopy}
                className="font-ledger flex w-full items-center justify-between gap-2 rounded-xl border border-black bg-black/[0.02] px-4 py-3 text-sm transition-colors hover:bg-black/[0.05]"
              >
                <span className="font-medium text-black">@{adminTelegramUsername}</span>
                {copied ? (
                  <span className="flex items-center gap-1 text-xs text-black/60">
                    <Check className="size-3.5" /> nusxalandi
                  </span>
                ) : (
                  <Copy className="size-4 text-black/40" />
                )}
              </button>

                <a
                  href={`https://t.me/${adminTelegramUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-ledger flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3.5 text-sm font-medium tracking-wide text-white transition-opacity hover:opacity-85 active:scale-[0.99]"
                >
                <Send className="size-4" />
                Telegramda yozish
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}