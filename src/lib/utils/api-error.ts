/**
 * Backend (Django Ninja) xatolarini bitta joyda parse qilish.
 *
 * MUHIM: avvalgi kodda `String(data.detail)` ishlatilgani sababli
 * Ninja/Pydantic validatsiya xatosi (422) obyektlar massivi bo'lganda
 * "[object Object]" chiqib ketardi. Bu fayl asl `data` ni saqlab qoladi,
 * shunda component har doim to'liq, o'qsa bo'ladigan xabarni chiqara oladi.
 */

/**
 * Django Ninja / FastAPI-uslubidagi pydantic validatsiya xatosi elementi.
 * Masalan:
 * { "loc": ["body", "payload", "answers", 0, "choice_id"], "msg": "field required", "type": "value_error.missing" }
 */
interface PydanticErrorItem {
  loc?: Array<string | number>;
  msg?: string;
  type?: string;
}

export class ApiRequestError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, data: unknown) {
    super(getErrorMessage(data));
    this.name = "ApiRequestError";
    this.status = status;
    this.data = data;
  }
}

function isPydanticErrorItem(
  value: unknown
): value is PydanticErrorItem {
  return (
    typeof value === "object" &&
    value !== null &&
    ("msg" in value || "loc" in value)
  );
}

function formatLoc(loc?: Array<string | number>): string {
  if (!loc || loc.length === 0) return "";

  // "body" / "payload" kabi texnik segmentlarni tashlab yuboramiz,
  // foydalanuvchiga tushunarli qismini qoldiramiz (masalan "answers.0.choice_id")
  const meaningful = loc.filter(
    (segment) => segment !== "body" && segment !== "payload"
  );

  return (meaningful.length > 0 ? meaningful : loc).join(".");
}

function formatPydanticErrors(
  items: PydanticErrorItem[]
): string {
  const messages = items
    .map((item) => {
      const location = formatLoc(item.loc);
      const msg = item.msg?.trim();

      if (!msg) return null;

      return location ? `${location}: ${msg}` : msg;
    })
    .filter((item): item is string => Boolean(item));

  return messages.join("; ");
}

/**
 * API javobidan (yoki xato obyektidan) inson o'qiy oladigan matn qaytaradi.
 *
 * API ba'zida:
 * { detail: "..." }
 * { detail: [{ loc, msg, type }, ...] }   <- Django Ninja / Pydantic 422
 * { detail: { message: "..." } }
 * { message: "..." }
 * { error: "..." }
 * { non_field_errors: [...] }
 * { field_name: ["xato matni"] }          <- DRF-uslubidagi field xatolari
 * kabi turli formatlarda xato qaytarishi mumkin.
 *
 * String(object) qilinsa "[object Object]" chiqadi, shu sababli bu yerda
 * xato obyektini chuqur tahlil qilib, to'g'ri matnga aylantiramiz.
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof ApiRequestError) {
    return error.message;
  }

  if (error instanceof Error) {
    const message = error.message;

    if (message && message !== "[object Object]") {
      return message;
    }
  }

  if (Array.isArray(error)) {
    // Pydantic validatsiya xatolari massivi
    if (error.every(isPydanticErrorItem)) {
      const formatted = formatPydanticErrors(error);

      if (formatted) return formatted;
    }

    const messages = error
      .map((item) => {
        if (typeof item === "string") return item;

        if (isPydanticErrorItem(item)) {
          const location = formatLoc(item.loc);
          const msg = item.msg?.trim();

          if (!msg) return null;

          return location ? `${location}: ${msg}` : msg;
        }

        if (typeof item === "object" && item !== null) {
          const itemObject = item as Record<string, unknown>;

          const candidate =
            itemObject.message ??
            itemObject.detail ??
            itemObject.error ??
            null;

          return typeof candidate === "string" ? candidate : null;
        }

        return null;
      })
      .filter(
        (item): item is string =>
          typeof item === "string" && Boolean(item.trim())
      );

    if (messages.length > 0) {
      return messages.join("; ");
    }
  }

  if (typeof error === "object" && error !== null) {
    const value = error as Record<string, unknown>;

    // detail massiv bo'lsa (Ninja 422) — avval shu yo'l bilan urinamiz
    if (Array.isArray(value.detail)) {
      const nested = getErrorMessage(value.detail);

      if (nested) return nested;
    }

    const candidates = [
      value.detail,
      value.message,
      value.error,
      value.non_field_errors,
      value.errors,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate;
      }

      if (Array.isArray(candidate)) {
        const nested = getErrorMessage(candidate);

        if (nested) return nested;
      }

      if (typeof candidate === "object" && candidate !== null) {
        const nested = getErrorMessage(candidate);

        if (nested && nested !== "Noma'lum xatolik yuz berdi.") {
          return nested;
        }
      }
    }

    // DRF-uslubidagi { field_name: ["xato"] } formatini tekshiramiz
    const fieldErrors: string[] = [];

    for (const [key, val] of Object.entries(value)) {
      if (
        [
          "detail",
          "message",
          "error",
          "non_field_errors",
          "errors",
        ].includes(key)
      ) {
        continue;
      }

      if (Array.isArray(val)) {
        const strings = val.filter(
          (item): item is string => typeof item === "string"
        );

        if (strings.length > 0) {
          fieldErrors.push(`${key}: ${strings.join(", ")}`);
        }
      } else if (typeof val === "string") {
        fieldErrors.push(`${key}: ${val}`);
      }
    }

    if (fieldErrors.length > 0) {
      return fieldErrors.join("; ");
    }

    try {
      const serialized = JSON.stringify(error);

      if (serialized && serialized !== "{}") {
        return serialized;
      }
    } catch {
      // continue
    }
  }

  return "Noma'lum xatolik yuz berdi.";
}