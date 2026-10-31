// Server Component helpers for direct Django API requests.
import { cookies } from "next/headers";
import { DJANGO_API_ENDPOINT } from "@/config/defaults";

type ProxyResponse<T = unknown> = { status: number; data: T | null; error?: string };
type RequestBody = Record<string, unknown> | FormData | null;

type FetchOptions = {
  cache?: RequestCache;
  next?: { revalidate?: number; tags?: string[] };
  withAuth?: boolean;
  timeoutMs?: number; // so'rov muddati
};

const DEFAULT_TIMEOUT = 8000; // 8 soniya

class ApiProxy {
  private static async getToken(): Promise<string | undefined> {
    const store = await cookies();
    return store.get("access_token")?.value;
  }

  private static async headers(isFormData = false, withAuth = false): Promise<HeadersInit> {
    const headers = new Headers();
    if (!isFormData) headers.set("Content-Type", "application/json");

    if (withAuth) {
      const token = await this.getToken();
      if (token) headers.set("Cookie", `access_token=${encodeURIComponent(token)}`);
    }

    return headers;
  }

  /** FormData bo'lsa o'zgarishsiz, aks holda JSON. (Avval PATCH/PUT FormData'ni "{}" ga aylantirib yuborardi.) */
  private static payload(body: RequestBody) {
    const isForm = body instanceof FormData;
    return {
      isForm,
      body: isForm ? body : body === null ? undefined : JSON.stringify(body),
    };
  }

  // Markazlashtirilgan, xavfsiz fetch — hech qachon throw qilmaydi
  private static async safeFetch<T>(
    endpoint: string,
    init: RequestInit,
    options: FetchOptions
  ): Promise<ProxyResponse<T>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT);

    try {
      const res = await fetch(`${DJANGO_API_ENDPOINT}${endpoint}`, {
        ...init,
        signal: controller.signal,
      });
      return await this.handle<T>(res);
    } catch {
      return {
        status: 503,
        data: null,
        error: "UPSTREAM_UNAVAILABLE",
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  static async get<T = unknown>(endpoint: string, options: FetchOptions = {}) {
    return this.safeFetch<T>(
      endpoint,
      {
        method: "GET",
        headers: await this.headers(false, options.withAuth),
        cache: options.cache ?? "no-store",
        next: options.next,
      },
      options
    );
  }

  static async post<T = unknown>(endpoint: string, body: RequestBody, options: FetchOptions = {}) {
    const p = this.payload(body);
    return this.safeFetch<T>(
      endpoint,
      { method: "POST", headers: await this.headers(p.isForm, options.withAuth), body: p.body },
      options
    );
  }

  static async put<T = unknown>(endpoint: string, body: RequestBody, options: FetchOptions = {}) {
    const p = this.payload(body);
    return this.safeFetch<T>(
      endpoint,
      { method: "PUT", headers: await this.headers(p.isForm, options.withAuth), body: p.body },
      options
    );
  }

  static async patch<T = unknown>(endpoint: string, body: RequestBody, options: FetchOptions = {}) {
    const p = this.payload(body);
    return this.safeFetch<T>(
      endpoint,
      { method: "PATCH", headers: await this.headers(p.isForm, options.withAuth), body: p.body },
      options
    );
  }

  static async delete<T = unknown>(endpoint: string, options: FetchOptions = {}) {
    return this.safeFetch<T>(
      endpoint,
      {
        method: "DELETE",
        headers: await this.headers(false, options.withAuth),
      },
      options
    );
  }

  private static async handle<T>(res: Response): Promise<ProxyResponse<T>> {
    let data: T | null = null;
    try {
      data = await res.json();
    } catch {
      // Bo'sh yoki JSON bo'lmagan javob — muammo emas
    }
    return { status: res.status, data };
  }
}

export default ApiProxy;
