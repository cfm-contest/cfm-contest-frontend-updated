export const TEST_PAGE_SIZE = 12;

export type TestStatus = "all" | "upcoming" | "ongoing" | "finished";
export type TestStatusValue = Exclude<TestStatus, "all">;

export interface TestItem {
  id: number;
  t: string;
  slug: string;
  fan: string | null;
  center: string | null;
  min: number;
  start: string | null;
  end: string | null;
  img: string | null;
  price: string;
  discount: string | null;
  reg: boolean;
  status: TestStatusValue;
}

export interface TestDetail extends TestItem {
  desc: string | null;
  open: boolean;
}

export interface TestListResponse {
  items: TestItem[];
  hn: boolean;
  no: number | null;
}

export interface TestDetailResponse {
  item: TestDetail;
}

export interface TestSubject {
  id: number;
  n: string;
  s: string;
}

export const EMPTY_TEST_LIST: TestListResponse = {
  items: [],
  hn: false,
  no: null,
};

export const TEST_STATUSES: { value: TestStatus; label: string }[] = [
  { value: "all", label: "Barchasi" },
  { value: "ongoing", label: "Davom etmoqda" },
  { value: "upcoming", label: "Keladigan" },
  { value: "finished", label: "Tugagan" },
];

export const STATUS_META: Record<
  TestStatusValue,
  { label: string; className: string }
> = {
  upcoming: {
    label: "Keladigan",
    className: "bg-blue-50 text-blue-700 ring-blue-600/10",
  },
  ongoing: {
    label: "Davom etmoqda",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
  },
  finished: {
    label: "Tugagan",
    className: "bg-slate-100 text-slate-600 ring-slate-500/10",
  },
};

/* ---------- URL parametrlarini tozalash ---------- */

export function parseStatus(value?: string | null): TestStatus {
  return TEST_STATUSES.some((s) => s.value === value)
    ? (value as TestStatus)
    : "all";
}

export function parsePositiveInt(value?: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const n = Number(value);
  return n > 0 ? n : undefined;
}

export function parseOffset(value?: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 0;
  return Number(value);
}

/** Backend `FilterParams` ga mos query. Server (page) va client bir xil ishlatadi. */
export function buildTestsQuery(f: {
  status: TestStatus;
  search?: string;
  fan?: number | string;
  offset?: number;
}): URLSearchParams {
  const q = new URLSearchParams({
    limit: String(TEST_PAGE_SIZE),
    offset: String(f.offset ?? 0),
    status: f.status,
  });
  const search = f.search?.trim().slice(0, 100);
  if (search) q.set("search", search);
  if (f.fan) q.set("fan", String(f.fan));
  return q;
}

/* ---------- Ko'rinish helper'lari ---------- */

export function hasDiscount(t: Pick<TestItem, "price" | "discount">): boolean {
  return t.discount !== null && Number(t.discount) < Number(t.price);
}

export function formatPrice(value: string | number): string {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n <= 0) return "Bepul";
  return `${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} so‘m`;
}

const UZ_MONTHS = [
  "yan", "fev", "mar", "apr", "may", "iyn",
  "iyl", "avg", "sen", "okt", "noy", "dek",
];

/** Server va brauzerda bir xil natija beradi (hydration mismatch bo'lmaydi). */
export function formatDateTime(iso: string | null, withTime = false): string {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tashkent",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const date = `${get("day")} ${UZ_MONTHS[Number(get("month")) - 1]} ${get("year")}`;
  return withTime ? `${date}, ${get("hour")}:${get("minute")}` : date;
}
