/** Direct browser requests to Django use the shared access-token cookie. */

import { resolveHttpEndpoint } from "@/config/http-endpoint";

const DEFAULT_API_URL = "https://api.cfmcontest.uz/api/v1";

export const API_URL =
  resolveHttpEndpoint(
    process.env.NEXT_PUBLIC_DJANGO_API_ENDPOINT,
    process.env.NEXT_PUBLIC_API_URL,
  ) ?? DEFAULT_API_URL;

/** Media fayllar backend ildizida (/media/...), /api/v1 ostida emas */
const ORIGIN = (() => {
  try {
    return new URL(API_URL).origin;
  } catch {
    return "";
  }
})();

export function mediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  return url.startsWith("http") ? url : `${ORIGIN}${url}`;
}

export class BackendError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "BackendError";
    this.status = status;
  }
}

export function redirectToLogin() {
  if (typeof window === "undefined") return;
  const next = window.location.pathname + window.location.search;
  window.location.assign(`/login?next=${encodeURIComponent(next)}`);
}

function messageFrom(data: unknown): string {
  const detail = (data as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: string } | string | undefined;
    if (typeof first === "string") return first;
    if (first?.msg) return first.msg;
  }
  return "Xatolik yuz berdi";
}

function resolveBackendPath(path: string, method = "GET"): string {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new BackendError("Backend API path must be relative", 400);
  }

  const parsed = new URL(path, "https://frontend.local");
  const originalPath = parsed.pathname;
  const verb = method.toUpperCase();
  let backendPath = originalPath;

  if (originalPath === "/api/home" || originalPath === "/api/home/") {
    backendPath = "/center/home";
  } else if (originalPath === "/api/follows" || originalPath.startsWith("/api/follows/")) {
    backendPath = originalPath.replace(/^\/api\/follows/, "/user/follows");
  } else if (/^\/api\/run\/?$/.test(originalPath)) {
    backendPath = "/code/run";
  } else if (/^\/api\/submit\/?$/.test(originalPath)) {
    backendPath = "/code/submit";
  } else if (/^\/api\/code\/execude\/?$/.test(originalPath)) {
    backendPath = "/code/execude";
  } else if (originalPath === "/api/tests" || originalPath === "/api/tests/") {
    backendPath = "/tests/";
  } else if (/^\/api\/problems\/category\/?$/.test(originalPath)) {
    backendPath = "/problems/categories/";
  } else if (/^\/api\/problems\/bookmarks\/?$/.test(originalPath)) {
    backendPath = "/problems/bookmark/list";
  } else if (/^\/api\/problems\/[^/]+\/embeddable\/run\/?$/.test(originalPath)) {
    backendPath = "/code/run";
  } else if (/^\/api\/problems\/[^/]+\/(?:like|bookmark)\/?$/.test(originalPath)) {
    backendPath = `${originalPath.replace(/^\/api/, "").replace(/\/+$/, "")}/`;
  } else if (/^\/api\/problems\/[^/]+\/hls\/video\/?$/.test(originalPath)) {
    backendPath = `${originalPath.replace(/^\/api/, "").replace(/\/+$/, "")}/`;
  } else if (originalPath === "/api/notifications" || originalPath === "/api/notifications/") {
    backendPath = verb === "POST" ? "/notifications/read/" : "/notifications/";
  } else if (/^\/api\/notifications\/[^/]+\/?$/.test(originalPath)) {
    backendPath = `${originalPath.replace(/^\/api/, "").replace(/\/+$/, "")}/`;
  } else {
    const invitation = originalPath.match(
      /^\/api\/teams\/invitations\/([^/]+)(?:\/([^/]+))?\/?$/,
    );
    const teamMember = originalPath.match(
      /^\/api\/teams\/([^/]+)\/members\/([^/]+)\/?$/,
    );
    const teamJoin = originalPath.match(/^\/api\/teams\/([^/]+)\/join\/?$/);
    const team = originalPath.match(/^\/api\/teams\/([^/]+)\/?$/);
    const lessonQuiz = originalPath.match(
      /^\/api\/courses\/lesson\/([^/]+)\/quizzes\/([^/]+)(\/complete)?\/?$/,
    );
    const lessonProblem = originalPath.match(
      /^\/api\/lesson\/([^/]+)\/problem\/([^/]+)\/?$/,
    );
    const courseEnroll = originalPath.match(/^\/api\/courses\/([^/]+)\/enroll\/?$/);
    const courseLesson = originalPath.match(/^\/api\/courses\/lesson\/([^/]+)\/?$/);
    const lecture = originalPath.match(
      /^\/api\/courses\/lesson\/([^/]+)\/lectures\/([^/]+)\/?$/,
    );
    const lectureComplete = originalPath.match(
      /^\/api\/courses\/lesson\/([^/]+)\/lectures\/([^/]+)\/complete\/?$/,
    );
    const testStart = originalPath.match(
      /^\/api\/courses\/modul\/([^/]+)\/test\/start\/?$/,
    );
    const testFinish = originalPath.match(
      /^\/api\/courses\/test-session\/([^/]+)\/finish\/?$/,
    );
    const courseQuestion = originalPath.match(/^\/api\/courses\/questions\/([^/]+)\/?$/);
    const courseQuestionAnswer = originalPath.match(
      /^\/api\/courses\/questions\/([^/]+)\/answer\/?$/,
    );
    const testAnswer = originalPath.match(
      /^\/api\/courses\/test-session\/([^/]+)\/answer\/?$/,
    );

    if (invitation && (invitation[2] || verb === "DELETE")) {
      backendPath = `/teams/team-invitations/${invitation[1]}/${invitation[2] ?? "cancel"}`;
    } else if (teamMember && verb === "PATCH") {
      backendPath = `/teams/${teamMember[1]}/members/${teamMember[2]}/role`;
    } else if (teamMember && verb === "DELETE") {
      backendPath = `/teams/${teamMember[1]}/members/${teamMember[2]}/removing`;
    } else if (teamJoin) {
      backendPath = `/teams/${teamJoin[1]}/members/join`;
    } else if (team && verb === "PATCH") {
      backendPath = `/teams/${team[1]}/update`;
    } else if (team && verb === "DELETE") {
      backendPath = `/teams/${team[1]}/delete`;
    } else if (courseEnroll) {
      backendPath = `/courses/${courseEnroll[1]}/enroll`;
    } else if (lectureComplete) {
      backendPath = `/courses/lesson/${lectureComplete[1]}/lectures/${lectureComplete[2]}/complete/`;
    } else if (lecture) {
      backendPath = `/courses/lesson/${lecture[1]}/lectures/${lecture[2]}/`;
    } else if (courseLesson) {
      backendPath = `/courses/lesson/${courseLesson[1]}/`;
    } else if (lessonQuiz) {
      backendPath =
        verb === "GET" && !lessonQuiz[3]
          ? `/courses/lesson/${lessonQuiz[1]}/question/${lessonQuiz[2]}/`
          : `/courses/questions/${lessonQuiz[2]}/answer/`;
    } else if (lessonProblem) {
      backendPath = `/courses/lesson/${lessonProblem[1]}/problem/${lessonProblem[2]}/`;
    } else if (testStart) {
      backendPath = `/courses/modul/${testStart[1]}/test/start`;
    } else if (testFinish) {
      backendPath = `/courses/test-session/${testFinish[1]}/finish/`;
    } else if (courseQuestionAnswer) {
      backendPath = `/courses/questions/${courseQuestionAnswer[1]}/answer/`;
    } else if (courseQuestion) {
      backendPath = `/courses/questions/${courseQuestion[1]}/`;
    } else if (testAnswer) {
      backendPath = `/courses/test-session/${testAnswer[1]}/answers/`;
    } else if (originalPath.startsWith("/api/")) {
      backendPath = originalPath.slice(4);
    }
  }

  return `${backendPath}${parsed.search}`;
}


export async function backendRequest(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${API_URL}${resolveBackendPath(path, init.method)}`, {
    ...init,
    credentials: "include",
    headers,
  });
}

export async function backendFetch<T>(
  path: string,
  init: RequestInit & { redirectOn401?: boolean } = {},
): Promise<T> {
  const { redirectOn401 = true, ...requestInit } = init;
  const res = await backendRequest(path, requestInit);

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    if (res.status === 401 && redirectOn401) redirectToLogin();
    throw new BackendError(messageFrom(data), res.status);
  }

  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/** SWR uchun: useSWR<T, BackendError>(path, backendFetcher) */
export const backendFetcher = <T,>(path: string) => backendFetch<T>(path);
