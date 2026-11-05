// src/lib/auth/redirects.ts
import { redirect } from "next/navigation";

/** Server component ichida 401 bo'lganda ishlating. */
export function redirectToLogin(nextPath: string): never {
  redirect(`/login?next=${encodeURIComponent(nextPath)}&reason=expired`);
}
