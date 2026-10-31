import { backendRequest } from "@/lib/api/django/backend";

import type {
  UserProfile,
  HeatmapResponse,
  HistoryResponse,
  SubmissionDetail,
  ActivityResponse,
  CertificatesResponse,
  UserCoursesResponse,
} from "../types/users";

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) sp.set(k, String(v));
  }
  const q = sp.toString();
  return q ? `?${q}` : "";
}

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await backendRequest(url, options);
  
  if (!res.ok) {
    if (res.status === 404) throw new Error("NOT_FOUND");
    throw new Error(`API error: ${res.status}`);
  }
  
  return res.json();
}

/* ===================== CLIENT API ===================== */

export function getUserProfileClient(tgIdOrUsername: string) {
  return fetchApi<UserProfile>(`/user/${encodeURIComponent(tgIdOrUsername)}`);
}

export function getUserHeatmapClient(telegramId: number, days: number = 182) {
  const q = buildQuery({ days });
  return fetchApi<HeatmapResponse>(`/user/heatmap/${telegramId}${q}`);
}

export function getUserHistoryClient(
  telegramId: string,
  params?: { cursor?: string | null; limit?: number; verdict?: string | null }
) {
  const q = buildQuery({
    cursor: params?.cursor ?? undefined,
    limit: params?.limit ?? 20,
    verdict: params?.verdict ?? undefined,
  });
  return fetchApi<HistoryResponse>(`/user/history/${telegramId}${q}`);
}

export function getSubmissionDetailClient(submissionId: number) {
  return fetchApi<SubmissionDetail>(`/user/submissions/${submissionId}`);
}

export function getUserActivityClient(tgIdOrUsername: string, limit: number = 15) {
  const q = buildQuery({ limit });
  return fetchApi<ActivityResponse>(
    `/user/${encodeURIComponent(tgIdOrUsername)}/activity${q}`
  );
}

export function getUserCertificatesClient(tgIdOrUsername: string) {
  return fetchApi<CertificatesResponse>(
    `/user/${encodeURIComponent(tgIdOrUsername)}/certificates`
  );
}

export function getUserCoursesClient(tgIdOrUsername: string, onlyActive: boolean = false) {
  const q = buildQuery({ only_active: onlyActive });
  return fetchApi<UserCoursesResponse>(
    `/user/${encodeURIComponent(tgIdOrUsername)}/courses${q}`
  );
}
