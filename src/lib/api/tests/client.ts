// lib/api/tests/client.ts
import { backendRequest } from "@/lib/api/django/backend";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string, // masalan: `${slug}/result`
  init?: { method?: "GET" | "POST"; body?: unknown },
): Promise<T> {
  const hasBody = init?.body !== undefined;
  let res: Response;
  try {
    res = await backendRequest(`/api/tests/${path}`, {
      method: init?.method ?? "GET",
      cache: "no-store",
      headers: hasBody ? { "Content-Type": "application/json" } : undefined,
      body: hasBody ? JSON.stringify(init!.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Internet aloqasi yo‘q. Qayta urinib ko‘ring.");
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.detail || "Xatolik yuz berdi");
  }
  return data as T;
}

/** SWR uchun */
export const fetcher = <T,>(path: string) => apiFetch<T>(path);
