"use client";

import { useState } from "react";
import { AttemptsTable, SubmissionDetailModal } from "./Console";

/**
 * "Taqdimotlar" tabi. Hamma narsa console-panel.tsx ichida:
 *   - ro'yxat:    GET /api/problems/{slug}/submission?limit=10
 *   - batafsil:   GET /api/user/submissions/{id}
 * (backenddagi qisqa kalitlar: id, s, v, p, n, tm, mm, l, dt)
 */
export function SubmissionList({ slug }: { slug: string }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-900">
      {/* Yangilanish SSE "final" hodisasi orqali o'zi bo'ladi */}
      <AttemptsTable slug={slug} onOpen={setSelectedId} />
      <SubmissionDetailModal
        submissionId={selectedId}
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}