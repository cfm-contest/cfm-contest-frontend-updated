import type {
  TestInfoResponse,
  TestSessionStartResponse,
  SaveAnswersPayload,
  SaveAnswersResponse,
  FinishResponse,
  TestResult,
} from "@/lib/types/test-session";

import { backendRequest } from "@/lib/api/django/backend";
import { ApiRequestError } from "@/lib/utils/api-error";

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await backendRequest(url, {
    ...options,
    credentials: "include",
  });

  let data: unknown = null;

  try {
    data = await response.json();
  } catch {
    // empty response
  }

  if (!response.ok) {
    throw new ApiRequestError(response.status, data);
  }

  return data as T;
}

/* ==============================
   TEST INFO
   GET /api/courses/modul/{modulId}/test/
============================== */

export function fetchTestInfo(modulId: number) {
  return request<TestInfoResponse>(
    `/api/courses/modul/${modulId}/test/`
  );
}

/* ==============================
   START / CONTINUE
   GET /api/courses/modul/{modulId}/test/start
============================== */

export function startTestSession(modulId: number) {
  return request<TestSessionStartResponse>(
    `/api/courses/modul/${modulId}/test/start`
  );
}

/* ==============================
   SAVE ANSWERS (BULK — faqat finish da chaqiriladi!)
   POST /api/courses/test-session/{sessionId}/answers/
   Body: { answers: [{ q, choice_id? | selected_choice_ids? | answer_data? }] }
============================== */

export function saveTestAnswers(
  sessionId: string,
  payload: SaveAnswersPayload
) {
  return request<SaveAnswersResponse>(
    `/api/courses/test-session/${sessionId}/answers/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );
}

/* ==============================
   FINISH
   POST /api/courses/test-session/{sessionId}/finish/
============================== */

export function finishTestSession(sessionId: string) {
  return request<FinishResponse>(
    `/api/courses/test-session/${sessionId}/finish/`,
    {
      method: "POST",
    }
  );
}

/* ==============================
   RESULT
   GET /api/courses/test-session/{sessionId}/result/
============================== */

export function getTestSessionResult(sessionId: string) {
  return request<TestResult>(
    `/api/courses/test-session/${sessionId}/result/`
  );
}
