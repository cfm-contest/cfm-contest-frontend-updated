// Fayl manzili: lib/problems/proxy-helpers.ts
//
// Loyihangizda allaqachon lib/utils/api-error.ts bo'lishi mumkin —
// agar shu formatga mos ekan, shuni ishlating va bu faylni olib
// tashlang. Mos kelmasa, quyidagi kichik helper barcha
// problems/* route handlerlar uchun bir xil xatolik formatini
// ta'minlaydi.

import { NextResponse } from "next/server";
import type { ApiErrorResponse } from "./types";

/**
 * Backenddan kelgan { status, data } juftligini xavfsiz tarzda
 * NextResponse'ga aylantiradi. `mapper` berilsa, faqat status 200-299
 * bo'lganda ishlatiladi — xatolik javoblari (detail/extra) backend
 * shaklida o'zgarmasdan uzatiladi, shunda frontend `extra.code`
 * bo'yicha aniq UX qarorlari qabul qila oladi.
 */
export function forwardBackendResponse<TRaw, TClient>(
  status: number,
  data: TRaw | ApiErrorResponse | null,
  mapper?: (raw: TRaw) => TClient
) {
  if (status >= 200 && status < 300 && mapper && data) {
    return NextResponse.json(mapper(data as TRaw), { status });
  }

  // Xatolik holati yoki mapper berilmagan — o'zgarmasdan uzatamiz
  return NextResponse.json(
    data ?? { detail: "Noma'lum xatolik" },
    { status }
  );
}

/**
 * ApiProxy o'zi tashlagan (tarmoq uzilishi, backend ishlamay qolishi
 * kabi) istisnolarni ushlab, foydalanuvchiga tushunarli xato
 * qaytaradi. Har doim 502 (Bad Gateway) — chunki muammo bizning
 * Next.js serverimizda emas, Django bilan bog'lanishda.
 */
export function proxyCatch(error: unknown, context: string) {
  void error;
  void context;

  return NextResponse.json(
    {
      detail: "Server bilan bog'lanishda xatolik yuz berdi. Birozdan so'ng qayta urinib ko'ring.",
      extra: { code: "UPSTREAM_UNAVAILABLE" },
    } satisfies ApiErrorResponse,
    { status: 502 }
  );
}
