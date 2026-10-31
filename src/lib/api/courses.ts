// src/lib/api/courses.ts
"use client";

import { backendRequest } from "@/lib/api/django/backend";
import type {
  QuizDetail,
  QuizAnswerResult,
  TestQuestion,
  TestFinishResponse,
} from "@/lib/types/courses";

async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/* ==========================================================
 * 1. KURSGA YOZILISH
 * ========================================================== */

interface EnrollResult {
  success: boolean;
  needsPayment?: boolean;
  amount?: string;
  error?: string;
}

export async function enrollCourse(slug: string): Promise<EnrollResult> {
  try {
    const res = await backendRequest(`/api/courses/${slug}/enroll`, {
      method: "POST",
    });
    const data = await safeJson(res);

    if (res.status === 402) {
      return { success: false, needsPayment: true, amount: data?.amount };
    }
    if (!res.ok) {
      return {
        success: false,
        error: data?.detail || data?.error || "Kursga yozilishda xatolik yuz berdi",
      };
    }
    return { success: true };
  } catch {
    return {
      success: false,
      error: "Tarmoq xatoligi. Internetingizni tekshirib, qayta urinib ko'ring.",
    };
  }
}

/* ==========================================================
 * 2. LESSON QUIZ
 * YANGILANDI: endi /api/courses/lesson/{slug}/quizzes/{questionId}
 * ostida — top-level /api/lesson/** butunlay o'chirildi.
 * ========================================================== */

export async function getQuizDetail(
  lessonSlug: string,
  questionId: number
): Promise<QuizDetail | null> {
  try {
    const res = await backendRequest(
      `/api/courses/lesson/${lessonSlug}/quizzes/${questionId}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function submitQuizAnswer(
  lessonSlug: string,
  questionId: number,
  choiceId: number
): Promise<QuizAnswerResult | null> {
  try {
    const res = await backendRequest(
      `/api/courses/questions/${questionId}/answer/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice_id: choiceId }),
      }
    );
    if (!res.ok) return null;

    const raw = await res.json();

    // Django'ning tekis javobini QuizAnswerResult shakliga moslashtirish
    return {
      answer: { correct: Boolean(raw.correct) },
      explanation: raw.explanation ?? null,
      video: raw.video
        ? { url: raw.video.hls ?? null, thumbnail: raw.video.img ?? null }
        : null,
    };
  } catch {
    return null;
  }
}

/* ==========================================================
 * 3. MA'RUZANI TUGALLASH (YANGI)
 * Django: POST complete_lecture -> {xp: number}
 * ========================================================== */

export async function completeLecture(
  lessonSlug: string,
  lectureSlug: string
): Promise<{ xp: number } | { error: string } | null> {
  try {
    const res = await backendRequest(
      `/api/courses/lesson/${lessonSlug}/lectures/${lectureSlug}/complete`,
      { method: "POST" }
    );
    const data = await safeJson(res);

    if (!res.ok) {
      // Django 400: "hali boshlanmagan" / "yetarli vaqt o'tmadi"
      return { error: data?.detail || "Ma'ruzani tugatib bo'lmadi" };
    }
    return data; // {xp: number}
  } catch {
    return { error: "Tarmoq xatoligi." };
  }
}

/* ==========================================================
 * 4. MODUL TESTI — SESSION BOSHQARUVI
 * ========================================================== */

interface StartTestSessionResult {
  session_id: string;
  duration_minutes: number;
  questions: TestQuestion[];
}

export async function startTestSession(
  modulId: number
): Promise<StartTestSessionResult | null> {
  try {
    const res = await backendRequest(`/api/courses/modul/${modulId}/test/start`, {
      method: "GET",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function submitTestAnswer(
  sessionId: string,
  questionId: number,
  choiceId: number | null
): Promise<boolean> {
  try {
    const res = await backendRequest(`/api/courses/test-session/${sessionId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question_id: questionId, choice_id: choiceId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function finishTestSession(
  sessionId: string
): Promise<TestFinishResponse | null> {
  try {
    const res = await backendRequest(`/api/courses/test-session/${sessionId}/finish`, {
      method: "POST",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
