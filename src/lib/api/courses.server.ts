"use server";

import { cache } from "react";
import ApiProxy from "@/lib/api/django/backend.server";
import type {
  RawCourseListItem,
  RawHeroCourse,
  RawCourseDetail,
  RawModule,
  RawLesson,
  RawProgress,
  CourseListItem,
  CourseHeroData,
  CourseDetail,
  CourseModule,
  CourseLesson,
  CourseUserProgress,
  CourseLevel,
  TestInfo,
} from "@/lib/types/courses";

/* ===================== API ACTIONS ===================== */

export const getCourseList = cache(async (): Promise<CourseListItem[]> => {
  try {
    const res = await ApiProxy.get<RawCourseListItem[]>("/courses/", {
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
  } catch {

    return [];
  }
});

export const getHeroCourse = cache(async (): Promise<CourseHeroData | null> => {
  try {
    const res = await ApiProxy.get<RawHeroCourse>("/courses/hero/", {
      withAuth: false,
      cache: "no-store",
    });

    if (res.status === 204 || res.status >= 400 || !res.data) return null;

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
  } catch {

    return null;
  }
});

function mapLesson(l: RawLesson): CourseLesson {
  return {
    id: l.id,
    title: l.t,
    slug: l.s,
    order: l.o,
    total_tasks: l.tk ?? 0,
    locked: l.locked ?? false,
    user_status: l.us
      ? {
          is_completed: Boolean(l.us.done),
          finished_tasks: l.us.ft ?? 0,
        }
      : null,
  };
}

function mapModule(m: RawModule): CourseModule {
  return {
    id: m.id,
    title: m.t,
    slug: m.s,
    order: m.o,
    total_lessons: m.tl ?? 0,
    total_tests: m.tt ?? 0,
    locked: m.locked ?? false,
    user_status: m.ms
      ? {
          is_completed: Boolean(m.ms.done),
          completed_lessons: m.ms.cl ?? 0,
          completed_tests: m.ms.ct ?? 0,
        }
      : null,
    test: m.test
      ? {
          id: m.test.id,
          title: m.test.t,
          slug: m.test.s,
          duration_minutes: m.test.dur ?? 0,
          min_pass_percentage: m.test.min_pct ?? 0,
          result: m.test.result
            ? {
                attempted: m.test.result.attempted ?? false,
                score_pct: m.test.result.score_pct ?? null,
                passed: m.test.result.passed ?? null,
              }
            : null,
        }
      : null,
    lessons: (m.ls ?? []).map(mapLesson),
  };
}

function mapUserProgress(p: RawProgress): CourseUserProgress {
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
    const res = await ApiProxy.get<RawCourseDetail>(`/courses/${slug}`, {
      withAuth: true,
      cache: "no-store",
    });

    if (res.status === 404 || res.status >= 400 || !res.data) return null;

    const raw = res.data;
    return {
      id: raw.id,
      title: raw.t,
      slug: raw.s,
      description: raw.desc ?? "",
      level: raw.level as CourseLevel,
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
      total_modules: raw.tm,
      students: raw.students,
      modules: (raw.mods ?? []).map(mapModule),
      user_progress: raw.progress ? mapUserProgress(raw.progress) : undefined,
    };
  } catch {

    return null;
  }
});

export const getTestInfo = cache(async (modulId: number): Promise<TestInfo | null> => {
  try {
    const res = await ApiProxy.get<any>(`/courses/modul/${modulId}/test/`, {
      withAuth: true,
      cache: "no-store",
    });

    if (res.status === 404 || res.status >= 400 || !res.data) return null;

    const raw = res.data;
    return {
      id: raw.id,
      title: raw.title,
      slug: raw.slug,
      description: raw.description ?? null,
      duration_minutes: raw.duration_minutes ?? 0,
      min_pass_percentage: raw.min_pass_percentage ?? 0,
      max_lifelines: raw.max_lifelines ?? 0,
      question_count: raw.question_count ?? 0,
      video: {
        hls_url: raw.video?.hls_url ?? null,
        thumbnail: raw.video?.thumbnail ?? null,
      },
      best_result: raw.best_result
        ? {
            correct: raw.best_result.correct ?? 0,
            wrong: raw.best_result.wrong ?? 0,
            unanswered: raw.best_result.unanswered ?? 0,
            xp: raw.best_result.xp ?? 0,
            completed_at: raw.best_result.completed_at,
          }
        : null,
      active_session_id: raw.active_session_id ?? null,
    };
  } catch {

    return null;
  }
});
