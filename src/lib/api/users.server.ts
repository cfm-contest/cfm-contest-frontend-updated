"use server";

import { cache } from "react";
import ApiProxy from "@/lib/api/django/backend.server";
import { ActivityResponse, CertificatesResponse, HeatmapResponse, HistoryResponse, SubmissionDetail, UserCoursesResponse, UserProfile } from "../types/users";


function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) sp.set(k, String(v));
  }
  const q = sp.toString();
  return q ? `?${q}` : "";
}

function handleError(label: string, status: number): null | never {
  if (status === 404) return null;
  throw new Error(`${label} — xatolik (${status})`);
}

/* ===================== SERVER API (cached) ===================== */

export const getUserProfile = cache(async (tgIdOrUsername: string): Promise<UserProfile | null> => {
  const res = await ApiProxy.get<UserProfile>(`/user/${encodeURIComponent(tgIdOrUsername)}`, {
    withAuth: true,
    cache: "no-store",
  });
  if (res.status >= 400) return handleError("getUserProfile", res.status);
  return res.data;
});

export const getUserHeatmap = cache(
  async (telegramId: number, days: number = 182): Promise<HeatmapResponse | null> => {
    const q = buildQuery({ days });
    const res = await ApiProxy.get<HeatmapResponse>(`/user/heatmap/${telegramId}${q}`, {
      withAuth: true,
      cache: "no-store",
    });
    if (res.status >= 400) return handleError("getUserHeatmap", res.status);
    return res.data;
  }
);

export const getUserHistory = cache(
  async (
    telegramId: string,
    params: { cursor?: string | null; limit?: number; verdict?: string | null } = {}
  ): Promise<HistoryResponse | null> => {
    const q = buildQuery({
      cursor: params.cursor ?? undefined,
      limit: params.limit ?? 20,
      verdict: params.verdict ?? undefined,
    });
    const res = await ApiProxy.get<HistoryResponse>(`/user/history/${telegramId}${q}`, {
      withAuth: true,
      cache: "no-store",
    });
    if (res.status >= 400) return handleError("getUserHistory", res.status);
    return res.data;
  }
);

export const getSubmissionDetail = cache(
  async (submissionId: number): Promise<SubmissionDetail | null> => {
    const res = await ApiProxy.get<SubmissionDetail>(
      `/problems/submission/${encodeURIComponent(String(submissionId))}`,
      {
        withAuth: true,
        cache: "no-store",
      },
    );
    if (res.status >= 400) return handleError("getSubmissionDetail", res.status);
    return res.data;
  }
);

export const getUserActivity = cache(
  async (tgIdOrUsername: string, limit: number = 15): Promise<ActivityResponse | null> => {
    const q = buildQuery({ limit });
    const res = await ApiProxy.get<ActivityResponse>(
      `/user/${encodeURIComponent(tgIdOrUsername)}/activity${q}`,
      { withAuth: true, cache: "no-store" }
    );
    if (res.status >= 400) return handleError("getUserActivity", res.status);
    return res.data;
  }
);

export const getUserCertificates = cache(
  async (tgIdOrUsername: string): Promise<CertificatesResponse | null> => {
    const res = await ApiProxy.get<CertificatesResponse>(
      `/user/${encodeURIComponent(tgIdOrUsername)}/certificates`,
      { withAuth: true, cache: "no-store" }
    );
    if (res.status >= 400) return handleError("getUserCertificates", res.status);
    return res.data;
  }
);

export const getUserCourses = cache(
  async (tgIdOrUsername: string, onlyActive: boolean = false): Promise<UserCoursesResponse | null> => {
    const q = buildQuery({ only_active: onlyActive });
    const res = await ApiProxy.get<UserCoursesResponse>(
      `/user/${encodeURIComponent(tgIdOrUsername)}/courses${q}`,
      { withAuth: true, cache: "no-store" }
    );
    if (res.status >= 400) return handleError("getUserCourses", res.status);
    return res.data;
  }
);
