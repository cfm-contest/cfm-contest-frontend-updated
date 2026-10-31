import { backendRequest } from "@/lib/api/django/backend";
import type { ContestTasksResponse, TaskDetail } from "./types";

export class ContestApiError extends Error {
  code: string;
  status?: number;
  constructor(detail: string, code = "unknown_error", status?: number) {
    super(detail);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await backendRequest(url, {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  const text = await res.text();
  let body: any = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new ContestApiError(
        res.ok ? "Server JSON formatida javob qaytarmadi." : text.slice(0, 200),
        res.ok ? "invalid_response" : "http_error",
        res.status,
      );
    }
  }

  if (!res.ok) {
    throw new ContestApiError(
      body?.detail ?? `HTTP xatosi: ${res.status}`,
      body?.extra?.code ?? "http_error",
      res.status,
    );
  }
  return body as T;
}

/** Contest submit kodni base64 qilib yuboradimi? (avvalgi prototipda xom matn ketgan) */
export const CONTEST_SUBMIT_BASE64 = true;

const enc = encodeURIComponent;

export const getContestTasks = (slug: string) =>
  request<ContestTasksResponse>(`/api/contests/${enc(slug)}/tasks`);

export const getContestTask = (slug: string, alfa: string) =>
  request<TaskDetail>(`/api/contests/${enc(slug)}/tasks/${enc(alfa)}`);


/** POST /contests/{slug}/problems/{alfa}/submit
 * body: { id: language_id, code }
 */
export const submitContestCode = (
  slug: string,
  problem_slug: string,
  body: { id: number; code: string },
) =>
  request<{ t?: string; [k: string]: unknown }>(
    `/api/contests/${enc(slug)}/problems/${(problem_slug)}/submit`,
    {
      method: "POST",
      body: JSON.stringify({
        id: body.id,
        code: body.code,
      }),
    },
  );

/** POST /contests/{slug}/question/{question_id}/answer */
export const answerContestQuestion = (
  slug: string,
  questionId: number,
  body: Record<string, unknown>,
) =>
  request<Record<string, any>>(
    `/api/contests/${enc(slug)}/question/${questionId}/answer`,
    { method: "POST", body: JSON.stringify(body) },
  );
