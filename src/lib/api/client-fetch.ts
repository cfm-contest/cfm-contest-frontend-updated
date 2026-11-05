// src/lib/api/client-fetch.ts
"use client";

export class ForbiddenError extends Error {
  constructor(message = "Ruxsat yo'q") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Sessiya tugagan") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Client tomondagi fetch'lar uchun.
 * 401 -> /login?reason=expired (loop'siz)
 * 403 -> ForbiddenError (UI'da <Forbidden /> yoki toast ko'rsating)
 */
export async function clientFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const res = await fetch(input, { credentials: "include", ...init });

  if (res.status === 401) {
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      const next = window.location.pathname + window.location.search;
      window.location.assign(`/login?next=${encodeURIComponent(next)}&reason=expired`);
    }
    throw new UnauthorizedError();
  }

  if (res.status === 403) {
    throw new ForbiddenError();
  }

  return res;
}
