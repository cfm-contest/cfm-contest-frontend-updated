import "server-only";

import ApiProxy from "@/lib/api/django/backend.server";
import { cache } from "react";

import type {
  LessonSummary,
  LectureDetail,
  LessonProblemDetail,
} from "./types";

import type { QuestionBackendResponse } from "@/lib/types/question";

async function request<T>(endpoint: string): Promise<T | null> {
  const { status, data } = await ApiProxy.get<T>(endpoint, {
    withAuth: true,
  });

  if ([401, 403, 404].includes(status)) {
    return null;
  }

  if (status >= 400) {
    throw new Error(`Lesson request failed: ${endpoint}`);
  }

  return data;
}

export function getLessonSummary(slug: string) {
  return request<LessonSummary>(`/courses/lesson/${slug}/`);
}

export function getLessonLecture(lessonSlug: string, lectureSlug: string) {
  return request<LectureDetail>(
    `/courses/lesson/${lessonSlug}/lectures/${lectureSlug}/`
  );
}

export function getLessonQuiz(lessonSlug: string, questionId: number) {
  return request<QuestionBackendResponse>(
    `/courses/lesson/${lessonSlug}/question/${questionId}/`
  );
}

export function getLessonProblem(lessonSlug: string, problemSlug: string) {
  return request<LessonProblemDetail>(
    `/courses/lesson/${lessonSlug}/problem/${problemSlug}/`
  );
}


import type {
  CourseListItem,
  CourseHeroData,
  CourseDetail,
  CourseModule,
  CourseLesson,
  CourseUserProgress,
  ModuleTest,
} from "@/lib/types/courses";

/* ===================== API ===================== */

export async function getCourseList(): Promise<CourseListItem[]> {
  try {
    const res = await ApiProxy.get<any[]>("/courses/", {
      withAuth: true,
      cache: "no-store",
    });

    if (res.status >= 400) return [];
    const raw = res.data ?? [];

    return raw.map((c) => ({
      id: c.id,
      title: c.t,
      slug: c.s,
      price: c.p ?? 0,
      discount_price: c.dp ?? null,
      thumbnail: c.img ?? null,
      total_lessons: c.tl ?? 0,
      total_tests: c.tt ?? 0,
      is_paid: c.paid ?? false,
      completed_lessons: c.cl ?? 0,
      completed_tests: c.ct ?? 0,
      is_completed: c.done ?? false,
      students: c.students,
    }));
  } catch (err) {

    return [];
  }
}

export async function getHeroCourse(): Promise<CourseHeroData | null> {
  try {
    const res = await ApiProxy.get<any>("/courses/hero/", {
      withAuth: false,
      cache: "no-store",
    });

    if (res.status === 204) return null;
    if (res.status >= 400) return null;

    const raw = res.data;
    return {
      id: raw.id,
      title: raw.t,
      slug: raw.s,
      description: raw.desc ?? "",
      price: raw.p ?? 0,
      discount_price: raw.dp ?? null,
      video: raw.vid
        ? {
            hls_url: raw.vid.hls ?? undefined,
            thumbnail: raw.vid.img ?? undefined,
            duration: raw.vid.dur ?? undefined,
          }
        : null,
      total_lessons: raw.tl ?? 0,
      total_tests: raw.tt ?? 0,
      students: raw.students ?? 0,
    };
  } catch (err) {

    return null;
  }
}

function mapLesson(l: any): CourseLesson {
  return {
    id: l.id,
    title: l.t,
    slug: l.s,
    order: l.o,
    total_tasks: l.tk ?? 0,
    // Backend endi anonim va login qilingan userlar uchun ham "locked"
    // qaytaradi (progression lock). Kalit yo'q bo'lsa xavfsiz default — ochiq.
    locked: Boolean(l.locked),
    user_status: l.us
      ? {
          is_completed: Boolean(l.us.done),
          finished_tasks: l.us.ft ?? 0,
        }
      : null,
  };
}

function mapTest(t: any): ModuleTest | null {
  if (!t) return null;
  return {
    id: t.id,
    title: t.t,
    slug: t.s,
    duration_minutes: t.dur ?? 0,
    min_pass_percentage: t.min_pct ?? 60,
    result: t.result
      ? {
          attempted: Boolean(t.result.attempted),
          score_pct: t.result.score_pct ?? null,
          passed: t.result.passed ?? null,
        }
      : null,
  };
}

function mapModule(m: any): CourseModule {
  return {
    id: m.id,
    title: m.t,
    slug: m.s,
    order: m.o,
    total_lessons: m.tl ?? 0,
    total_tests: m.tt ?? 0,
    locked: Boolean(m.locked),
    test: mapTest(m.test),
    // YANGI: backend ms (module status) ni map qilish
    user_status: m.ms
      ? {
          is_completed: Boolean(m.ms.done),
          completed_lessons: m.ms.cl ?? 0,
          completed_tests: m.ms.ct ?? 0,
        }
      : null,
    lessons: (m.ls ?? []).map(mapLesson),
  };
}

function mapUserProgress(p: any): CourseUserProgress {
  return {
    is_paid: p.paid ?? false,
    started_at: p.started_at ?? null,
    completed_lessons: p.cl ?? 0,
    completed_tests: p.ct ?? 0,
    is_completed: p.done ?? false,
  };
}

export const getCourseDetail = cache(async (slug: string): Promise<CourseDetail | null> => {
  try {
    const res = await ApiProxy.get<any>(`/courses/${slug}`, {
      withAuth: true,
      cache: "no-store",
    });

    if (res.status === 404) return null;
    if (res.status >= 400) throw new Error("Xatolik");

    const raw = res.data;
    return {
      id: raw.id,
      title: raw.t,
      slug: raw.s,
      description: raw.desc ?? "",
      level: raw.level ?? "beginner",
      price: raw.p ?? 0,
      discount_price: raw.dp ?? null,
      video: raw.vid
        ? {
            hls_url: raw.vid.hls ?? undefined,
            thumbnail: raw.vid.img ?? undefined,
            duration: raw.vid.dur ?? undefined,
          }
        : null,
      total_lessons: raw.tl ?? 0,
      total_tests: raw.tt ?? 0,
      total_modules: raw.tm ?? (raw.mods?.length ?? 0),
      students: raw.students ?? 0,
      modules: (raw.mods ?? []).map(mapModule),
      user_progress: raw.progress ? mapUserProgress(raw.progress) : undefined,
    };
  } catch (err) {

    return null;
  }
});
