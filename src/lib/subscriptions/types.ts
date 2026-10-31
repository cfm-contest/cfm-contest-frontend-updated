// subscriptions/types.ts

// ============================================================
// SUBSCRIPTION PLAN
// ============================================================

export interface SubscriptionPlan {
  id: number;
  name: string;
  slug: string;
  price: string;
  currency: string;
  duration_days: number;
}


// ============================================================
// CURRENT SUBSCRIPTION
// ============================================================

export interface MySubscriptionPlan {
  id: number;
  name: string;
  slug: string;
  price: string;
  currency: string;
  duration_days: number;
}

export interface MySubscription {
  id: number;

  plan: MySubscriptionPlan;

  started_at: string;

  expires_at: string;

  is_active: boolean;
}

export interface MySubscriptionResponse {
  is_premium: boolean;

  subscription: MySubscription | null;
}


// ============================================================
// SUBSCRIPTION HISTORY
// ============================================================

export interface SubscriptionHistoryItem {
  id: number;

  plan: {
    id: number;
    name: string;
    slug: string;
    price: string;
    currency: string;
    duration_days: number;
  };

  started_at: string;

  expires_at: string;

  is_active: boolean;

  is_current: boolean;
}


// ============================================================
// API RESPONSES
// ============================================================

export interface SubscriptionPlansResponse {
  data: SubscriptionPlan[];
}

export interface SubscriptionHistoryResponse {
  data: SubscriptionHistoryItem[];
}


// ============================================================
// API ERROR
// ============================================================

export interface ApiErrorResponse {
  detail?: string;

  code?: string;

  [key: string]: unknown;
}