import type {
  ProblemDetail,
  Problems,
  ProblemsResponse,
  RawProblemDetail,
  RawProblemListItem,
  RawProblemsListResponse,
  StarterCode,
} from "./types";

// ============================================================
// LIST ITEM
// ============================================================

export function mapListItem(
  raw: RawProblemListItem
): Problems {
  return {
    id: raw.id,

    slug: raw.s,

    title: raw.t,

    difficulty: raw.dif,

    xp: raw.xp,

    acceptance: raw.acc,

    category: raw.cat?.t ?? null,

    tags: raw.tags.map((tag) => tag.t),

    solved: raw.done,

    premium: raw.prem,

    hasAccess: raw.access,

    publishedAt: raw.published_at,
  };
}

// ============================================================
// LIST RESPONSE
// ============================================================

export function mapListResponse(
  raw: RawProblemsListResponse
): ProblemsResponse {
  return {
    count: raw.count,

    limit: raw.limit,

    offset: raw.offset,

    data: raw.data.map(mapListItem),
  };
}

// ============================================================
// DETAIL (Audio, Likes, IsLiked, IsBookmarked qo'shilgan)
// ============================================================

export function mapProblemDetail(
  raw: RawProblemDetail
): ProblemDetail {
  // ----------------------------------------------------------
  // COMMON DATA
  // ----------------------------------------------------------

  const base = {
    id: raw.id,

    title: raw.t,

    slug: raw.s,

    difficulty: raw.dif,

    xp: raw.xp,

    timeLimit: raw.tl,

    memoryLimit: raw.ml,

    category: raw.cat?.t ?? null,

    tags: (raw.tags || []).map((tag) => ({
      id: tag.id,
      name: tag.t,
    })),

    premium: raw.prem,

    hasAccess: raw.access,

    solved: raw.done,

    publishedAt: raw.published_at,

    // NEW: Backend'dan kelayotgan audio, likes, is_liked va is_bookmarked
    audio: raw.audio ?? null,

    likesCount: raw.likes ?? 0,

    isLiked: raw.is_liked ?? false,

    isBookmarked: raw.is_bookmarked ?? false,
  };

  // ----------------------------------------------------------
  // LOCKED ACCESS (Premia / Huquq yo'q)
  // ----------------------------------------------------------

  if (!raw.access) {
    return {
      ...base,
      hasAccess: false,
    };
  }

  // ----------------------------------------------------------
  // STARTER CODE
  // ----------------------------------------------------------

  const starterCode: Record<number, StarterCode> = {};

  if (raw.funcs) {
    for (const [
      languageId,
      functionData,
    ] of Object.entries(raw.funcs)) {
      const id = Number(languageId);

      if (!Number.isFinite(id)) {
        continue;
      }

      starterCode[id] = {
        id: functionData.id,

        code: functionData.fn,
      };
    }
  }

  // ----------------------------------------------------------
  // UNLOCKED ACCESS
  // ----------------------------------------------------------

  return {
    ...base,

    hasAccess: true,

    desc: raw.desc,

    languages: (raw.langs || []).map((language) => ({
      id: language.id,

      name: language.t,

      version: language.v,
    })),

    hints: (raw.hints || []).map((hint) => ({
      id: hint.id,

      text: hint.txt,
    })),

    challenges: (raw.challs || []).map((challenge) => ({
      id: challenge.id,

      text: challenge.txt,
    })),

    sampleTests: (raw.tests || []).map((testCase) => ({
      id: testCase.id,

      input: testCase.in,

      output: testCase.out,

      explanation:
        testCase.exp ?? undefined,
    })),

    starterCode,
  };
}