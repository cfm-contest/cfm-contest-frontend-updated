import ApiProxy from "@/lib/api/django/backend.server";

import type {
  TestInfoResponse,
  TestResult,
} from "@/lib/types/test-session";

function getApiErrorMessage(data: unknown, fallback: string): string {
  if (
    typeof data === "object" &&
    data !== null &&
    "detail" in data &&
    typeof data.detail === "string"
  ) {
    return data.detail;
  }

  return fallback;
}

export async function fetchTestInfo(
  modulId: number
): Promise<TestInfoResponse> {
  const { status, data } = await ApiProxy.get<TestInfoResponse>(
    `/courses/modul/${modulId}/test/`,
    {
      withAuth: true,
      cache: "no-store",
    }
  );

  if (status >= 400) {
    throw new Error(
      getApiErrorMessage(data, "Test ma'lumotlarini olishda xatolik")
    );
  }

  return data as TestInfoResponse;
}

export async function getTestSessionResult(
  sessionId: string
): Promise<TestResult> {
  const { status, data } = await ApiProxy.get<TestResult>(
    `/courses/test-session/${sessionId}/result/`,
    {
      withAuth: true,
      cache: "no-store",
    }
  );

  if (status >= 400) {
    throw new Error(
      getApiErrorMessage(data, "Test natijasini olishda xatolik")
    );
  }

  return data as TestResult;
}
