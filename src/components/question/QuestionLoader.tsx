"use client";

import { backendRequest } from "@/lib/api/django/backend";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import {
  QuestionAnswerPayload,
  QuestionBackendResponse,
  QuestionSubmitResponse,
} from "@/lib/types/question";
import { Question } from "./Question";

interface QuestionLoaderProps {
  slug: string;
  questionId: string | number;
}

export function QuestionLoader({
  slug, // hozircha API endpoint'da ishlatilmaydi (kelajakda kurs konteksti uchun saqlab qo'yildi)
  questionId,
}: QuestionLoaderProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questionData, setQuestionData] =
    useState<QuestionBackendResponse | null>(null);

  const endpoint = `/courses/questions/${questionId}`;
  const answerEndpoint = `/courses/questions/${questionId}/answer/`;

  useEffect(() => {
    let isMounted = true;

    const fetchQuestion = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await backendRequest(endpoint, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data?.detail ||
              "Savol ma'lumotlarini yuklab bo'lmadi."
          );
        }

        if (isMounted) {
          setQuestionData(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Tizimda kutilmagan xatolik yuz berdi."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchQuestion();

    return () => {
      isMounted = false;
    };
  }, [endpoint]);

  const handleAnswerSubmit = async (
  payload: QuestionAnswerPayload
): Promise<QuestionSubmitResponse> => {
  const res = await backendRequest(answerEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail || "Javobni yuborishda xatolik yuz berdi.");
  }
  return data;
};

  if (loading) {
    return (
      <div className="my-6 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-500">
        <Loader2 className="size-5 animate-spin text-amber-500" />
        <span className="text-sm font-medium">
          Savol #{questionId} yuklanmoqda...
        </span>
      </div>
    );
  }

  if (error || !questionData) {
    return (
      <div className="my-6 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700">
        <AlertCircle className="size-4 shrink-0" />
        <span>
          Savol #{questionId} yuklanmadi. ({error})
        </span>
      </div>
    );
  }

  return (
    <div className="my-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <Question
        data={questionData}
        onAnswerSubmit={handleAnswerSubmit}
      />
    </div>
  );
}
