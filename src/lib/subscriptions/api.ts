"use client";

import { backendRequest } from "@/lib/api/django/backend";
import { ApiErrorResponse, MySubscriptionResponse, SubscriptionHistoryItem, SubscriptionHistoryResponse, SubscriptionPlan, SubscriptionPlansResponse } from "./types";



// ============================================================
// API ERROR
// ============================================================

export class ApiError extends Error {
  status: number;

  code?: string;

  data?: ApiErrorResponse;

  constructor(
    message: string,
    status: number,
    data?: ApiErrorResponse,
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.code = data?.code;
    this.data = data;
  }
}


// ============================================================
// CLIENT GET
// ============================================================

async function clientGet<T>(
  url: string,
): Promise<T> {
  const res = await backendRequest(url, {
    method: "GET",
    cache: "no-store",
  });

  const data = await res.json().catch(
    () => null,
  );

  // ----------------------------------------------------------
  // ERROR
  // ----------------------------------------------------------

  if (!res.ok) {
    const errorData =
      data as ApiErrorResponse | null;

    const message =
      errorData?.detail ??
      "So'rovni bajarishda xatolik";

    throw new ApiError(
      message,
      res.status,
      errorData ?? undefined,
    );
  }

  // ----------------------------------------------------------
  // EMPTY RESPONSE
  // ----------------------------------------------------------

  if (data === null) {
    throw new Error(
      "Serverdan bo'sh javob keldi",
    );
  }

  return data as T;
}


// ============================================================
// PLANS
// GET /api/subscriptions/plans/
// ============================================================

export async function getSubscriptionPlans(): Promise<
  SubscriptionPlan[]
> {
  const response =
    await clientGet<SubscriptionPlansResponse>(
      "/api/subscriptions/plans/",
    );

  return response.data;
}


// ============================================================
// CURRENT SUBSCRIPTION
// GET /api/subscriptions/me/
// ============================================================

export async function getMySubscription(): Promise<
  MySubscriptionResponse
> {
  try {
    return await clientGet<MySubscriptionResponse>(
      "/api/subscriptions/me/",
    );
  } catch (error) {
    /*
     * Login qilmagan user uchun subscription
     * mavjud emas deb hisoblaymiz.
     *
     * Lekin network/server xatosini yashirmaslik
     * kerak bo'lsa bu yerda faqat 401 ni catch
     * qilish yaxshiroq.
     */

    if (
      error instanceof ApiError &&
      error.status !== 401
    ) {
      throw error;
    }

    return {
      is_premium: false,
      subscription: null,
    };
  }
}


// ============================================================
// SUBSCRIPTION HISTORY
// GET /api/subscriptions/me/history/
// ============================================================

export async function getSubscriptionHistory(): Promise<
  SubscriptionHistoryItem[]
> {
  const response =
    await clientGet<SubscriptionHistoryResponse>(
      "/api/subscriptions/me/history/",
    );

  return response.data;
}
