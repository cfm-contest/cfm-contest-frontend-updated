import { NextResponse } from "next/server";

/** Django Bolt router prefiksi — loyihangizdagi urls ga moslang. */
export const TEAMS_API = "/teams";

type Proxied = { status: number; data: unknown; error?: string };

/** ApiProxy natijasini Next route handler javobiga aylantiradi. */
export function reply(res: Proxied) {
  if (res.data === null || res.data === undefined) {
    if (res.status < 400) return NextResponse.json({}, { status: res.status });
    return NextResponse.json(
      {
        detail:
          res.status === 503
            ? "Server bilan bog'lanib bo'lmadi"
            : res.error ?? "Xatolik yuz berdi",
      },
      { status: res.status }
    );
  }
  return NextResponse.json(res.data, { status: res.status });
}

export type Ctx<P> = { params: Promise<P> };
