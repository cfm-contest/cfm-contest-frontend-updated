"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-16">
      <div className="mx-auto w-full max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          404 xatolik
        </p>

        <h1 className="mt-4 text-6xl font-bold tracking-tight sm:text-8xl">
          404
        </h1>

        <h2 className="mt-6 text-2xl font-semibold sm:text-3xl">
          Sahifa topilmadi
        </h2>

        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          Siz qidirayotgan sahifa mavjud emas, o‘chirilgan yoki manzil noto‘g‘ri
          kiritilgan bo‘lishi mumkin.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-black px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <Home className="h-4 w-4" />
            Bosh sahifa
          </Link>

          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border px-5 text-sm font-medium transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Orqaga qaytish
          </button>
        </div>
      </div>
    </main>
  );
}
