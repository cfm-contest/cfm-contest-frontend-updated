import { backendRequest } from "@/lib/api/django/backend";

export async function api<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await backendRequest(url, init);
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const detail = data?.detail;
    throw new Error(
      typeof detail === "string" ? detail : "Ma'lumotlar noto'g'ri yoki xatolik yuz berdi"
    );
  }
  return data as T;
}

export const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});
