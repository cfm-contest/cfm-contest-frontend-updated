import type { ProblemDetail } from "@/lib/problems/types";
import type { ContestProblemData } from "./types";

/**
 * Contest javobini mavjud CodeEditorPanel kutadigan ProblemDetail shakliga o'tkazadi.
 * hasAccess = true: kirish huquqini backend (get_contest_access) allaqachon tekshirgan.
 * Submit ruxsati alohida (can_submit) boshqariladi.
 */
export function toProblemDetail(d: ContestProblemData): ProblemDetail {
  return {
    id: d.id,
    slug: d.slug,
    title: d.title,
    desc: d.desc,
    difficulty: d.dif,
    xp: d.xp,
    timeLimit: d.time_l,
    memoryLimit: d.memory_l,
    category: d.cate_name,
    tags: d.tags,
    hasAccess: true,
    solved: d.solved,
    hints: d.hints,
    challenges: d.chall,
    languages: d.langs,
    starterCode: d.func ?? {},
    sampleTests: d.exam,
  } as unknown as ProblemDetail;
}
