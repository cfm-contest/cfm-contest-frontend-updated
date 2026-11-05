// app/(auth)/login/page.tsx
"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
  type ClipboardEvent,
  type FormEvent,
} from "react";
import { Loader2, Send } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { AUTH_API_ENDPOINT } from "@/config/defaults";
import { safeNext } from "@/lib/auth/safe-next";

const OTP_LENGTH = 6;
const BOT_USERNAME = "cfm_login_bot";

export default function LoginPage() {
  const { login, isAuthenticated, isLoading, clearLocalAuth } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const expired = searchParams.get("reason") === "expired";

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const otp = digits.join("");
  const isComplete = otp.length === OTP_LENGTH && digits.every((d) => d !== "");

  // Server "sessiya yaroqsiz" degan bo'lsa — localStorage'ni tozalaymiz (loop'ni sindiradi)
  useEffect(() => {
    if (expired) clearLocalAuth();
  }, [expired, clearLocalAuth]);

  // Haqiqatan login qilgan bo'lsa — qayta yo'naltirish
  useEffect(() => {
    if (!isLoading && isAuthenticated && !expired) {
      router.replace(safeNext(searchParams.get("next"), "/"));
    }
  }, [isLoading, isAuthenticated, expired, searchParams, router]);

  const setDigitAt = useCallback((index: number, value: string) => {
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const focusInput = useCallback((index: number) => {
    inputsRef.current[index]?.focus({ preventScroll: true });
  }, []);

  const triggerError = useCallback((message: string) => {
    setError(message);
    setShake(true);
    setDigits(Array(OTP_LENGTH).fill(""));
    setTimeout(() => {
      inputsRef.current[0]?.focus();
      setShake(false);
    }, 420);
  }, []);

  const handleChange = useCallback(
    (index: number, raw: string) => {
      const value = raw.replace(/\D/g, "").slice(0, OTP_LENGTH);
      if (!value) return;

      if (value.length > 1) {
        const nextDigits = Array.from(
          { length: OTP_LENGTH },
          (_, digitIndex) => value[digitIndex] ?? ""
        );
        setDigits(nextDigits);
        setError("");
        focusInput(Math.min(value.length, OTP_LENGTH - 1));
        return;
      }

      setDigitAt(index, value);
      setError("");
      if (index < OTP_LENGTH - 1) focusInput(index + 1);
    },
    [focusInput, setDigitAt]
  );

  const handleKeyDown = useCallback(
    (index: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        e.preventDefault();
        if (digits[index]) {
          setDigitAt(index, "");
        } else if (index > 0) {
          setDigitAt(index - 1, "");
          focusInput(index - 1);
        }
      }
      if (e.key === "ArrowLeft" && index > 0) focusInput(index - 1);
      if (e.key === "ArrowRight" && index < OTP_LENGTH - 1)
        focusInput(index + 1);
      if (/^\d$/.test(e.key) && digits[index] && index < OTP_LENGTH - 1) {
        focusInput(index + 1);
      }
    },
    [digits, focusInput, setDigitAt]
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, OTP_LENGTH);
      if (!text) return;
      const next = Array(OTP_LENGTH).fill("");
      text.split("").forEach((c, i) => (next[i] = c));
      setDigits(next);
      setError("");
      setTimeout(() => {
        const idx = Math.min(text.length, OTP_LENGTH - 1);
        focusInput(idx);
      }, 10);
    },
    [focusInput]
  );

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      if (!isComplete || loading) return;

      setLoading(true);
      setError("");

      try {
        const authEndpoint =
          process.env.NEXT_PUBLIC_AUTH_API_ENDPOINT ||
          AUTH_API_ENDPOINT ||
          "https://auth.cfmcontest.uz";
        const res = await fetch(`${authEndpoint}/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ otp }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !data) {
          triggerError(
            data?.detail ?? data?.error ?? "Kod noto'g'ri yoki muddati o'tgan"
          );
          return;
        }

        login({
          id: data.u.id,
          telegramId: data.u.id,
          username: data.u.u || String(data.u.id),
          phone: data.u.p ?? null,
          fullName: data.u.f ?? null,
          lastLogin: data.u.l ?? null,
        });
      } catch {
        triggerError("Serverga ulanib bo'lmadi. Qayta urinib ko'ring.");
      } finally {
        setLoading(false);
      }
    },
    [isComplete, loading, otp, login, triggerError]
  );

  if (isLoading || (isAuthenticated && !expired)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50 dark:bg-black">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400 dark:text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="login-page flex min-h-dvh w-full items-center justify-center bg-slate-50 px-3 py-5 dark:bg-black sm:p-4">
      <div className="flex w-full max-w-sm flex-col items-center rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xl shadow-slate-200/40 dark:border-white/10 dark:bg-zinc-950 dark:shadow-none sm:p-9">
        {/* Logo */}
        <div className="mb-3 sm:mb-4">
          <div className="relative size-14 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50 dark:border-white/10 dark:bg-zinc-900 sm:size-16">
            <Image
              src="/cfm_logo.webp"
              alt="CfM Contest"
              fill
              sizes="64px"
              className="object-cover"
              priority
            />
          </div>
        </div>

        <h1 className="mb-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Kodni kiriting
        </h1>

        {expired && (
          <p
            role="status"
            className="mb-3 w-full rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"
          >
            Sessiyangiz tugagan. Iltimos, qaytadan kiring.
          </p>
        )}

        <p className="mb-6 max-w-xs text-center text-sm leading-relaxed text-slate-500 dark:text-zinc-400 sm:mb-7">
          <a
            href={`https://t.me/${BOT_USERNAME}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 transition hover:text-amber-600 hover:decoration-amber-500 dark:text-white dark:decoration-zinc-700 dark:hover:text-amber-400"
          >
            <Send className="h-3.5 w-3.5" strokeWidth={2.5} />@{BOT_USERNAME}
          </a>{" "}
          telegram botiga kiring va 1 daqiqalik bir martalik kodingizni oling.
        </p>

        {/* OTP */}
        <form
          onSubmit={handleSubmit}
          className="flex w-full flex-col items-center gap-4 sm:gap-5"
        >
          <div
            className={`grid w-full grid-cols-6 gap-1.5 sm:gap-3 ${shake ? "animate-shake" : ""}`}
            onPaste={handlePaste}
            role="group"
            aria-label="Tasdiqlash kodi"
          >
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputsRef.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                maxLength={i === 0 ? OTP_LENGTH : 1}
                value={digit}
                disabled={loading}
                aria-label={`${i + 1}-raqam`}
                aria-invalid={!!error}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`h-12 w-full min-w-0 rounded-xl border text-center text-xl font-bold outline-none transition-all sm:h-14 sm:rounded-2xl
                  ${
                    digit
                      ? "border-amber-500 bg-amber-50/50 text-slate-950 dark:border-amber-400 dark:bg-amber-400/10 dark:text-white"
                      : "border-slate-200 bg-slate-50 text-slate-900 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                  }
                  focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15
                  disabled:opacity-50`}
              />
            ))}
          </div>

          {error && (
            <p
              role="alert"
              className="-mt-1 w-full text-center text-sm font-medium text-rose-600 dark:text-rose-400"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!isComplete || loading}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition-all
              ${
                !isComplete || loading
                  ? "cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-zinc-800 dark:text-zinc-500"
                  : "bg-slate-950 text-white shadow-lg hover:bg-slate-800 active:scale-[0.98] dark:bg-white dark:text-slate-950 dark:hover:bg-zinc-200"
              }`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
                Tekshirilmoqda...
              </>
            ) : (
              "Tasdiqlash"
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-400 dark:text-zinc-500 sm:mt-6">
          Kod kelmadimi? Botga qayta{" "}
          <span className="font-semibold text-slate-600 dark:text-zinc-300">/start</span> yozing.
        </p>
      </div>

      <style jsx global>{`
        @media (max-height: 620px) {
          .login-page {
            align-items: flex-start;
          }
        }
        @keyframes shake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.42s ease-in-out;
        }
      `}</style>
    </div>
  );
}
