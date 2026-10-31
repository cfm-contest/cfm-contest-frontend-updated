// lib/lesson/api.ts

"use client";

import { backendRequest } from "@/lib/api/django/backend";
import type {
  LectureCompleteResult,
  LectureDetail,
  QuizCompleteResult,
  QuizDetail,
  LessonProblemDetail,
} from "./types";


class LessonApiError extends Error {
  status: number;

  constructor(
    message: string,
    status: number
  ) {
    super(message);
    this.status = status;
  }
}


export { LessonApiError };


async function handle<T>(
  res: Response
): Promise<T> {

  if (!res.ok) {

    const body =
      await res.json()
        .catch(() => ({}));


    throw new LessonApiError(
      body.detail ?? "So'rovda xatolik yuz berdi",
      res.status
    );
  }


  return res.json();
}



/**
 * Problem detail olish
 *
 * DIQQAT:
 * Componentlarda shu nom ishlatilgani uchun
 * eski nom saqlanmoqda.
 */
export async function fetchLessonProblemPreviewClient(
  lessonSlug: string,
  problemSlug: string
): Promise<LessonProblemDetail> {


  const res =
    await backendRequest(
      `/api/lesson/${lessonSlug}/problem/${problemSlug}`,
      {
        method: "GET",
        credentials: "include",
      }
    );


  return handle<LessonProblemDetail>(res);
}




export async function fetchLectureClient(
  lessonSlug: string,
  lectureSlug: string
): Promise<LectureDetail> {


  const res =
    await backendRequest(
      `/api/courses/lesson/${lessonSlug}/lectures/${lectureSlug}`,
      {
        method: "GET",
        credentials: "include",
      }
    );


  return handle<LectureDetail>(res);
}





export async function completeLectureClient(
  lessonSlug: string,
  lectureSlug: string
): Promise<LectureCompleteResult> {


  const res =
    await backendRequest(
      `/api/courses/lesson/${lessonSlug}/lectures/${lectureSlug}/complete`,
      {
        method: "POST",

        credentials: "include",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({}),
      }
    );


  return handle<LectureCompleteResult>(res);
}





export async function fetchQuizClient(
  lessonSlug: string,
  questionId: number
): Promise<QuizDetail> {


  const res =
    await backendRequest(
      `/api/courses/lesson/${lessonSlug}/quizzes/${questionId}`,
      {
        method: "GET",
        credentials: "include",
      }
    );


  return handle<QuizDetail>(res);
}





export async function completeQuizClient(
  lessonSlug: string,
  questionId: number,
  choiceId: number
): Promise<QuizCompleteResult> {


  const res =
    await backendRequest(
      `/api/courses/questions/${questionId}/answer/`,
      {
        method: "POST",

        credentials: "include",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          choice_id: choiceId,
        }),
      }
    );


  return handle<QuizCompleteResult>(res);
}
