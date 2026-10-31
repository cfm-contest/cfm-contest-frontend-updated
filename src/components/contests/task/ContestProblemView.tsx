"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Code2, FileText } from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { CodeEditorPanel, type CodeEditorPanelHandle } from "@/components/problems/code-editor-panel"; // patched/code-editor-panel.tsx
import { toProblemDetail } from "@/lib/contests/adapt";
import type { ContestProblemData, ContestOwner } from "@/lib/contests/types";
import { cn } from "@/lib/utils";
import { ContestProblemDescription } from "./ContestProblemDescription";

// NOTE: import yo'lini loyihangizdagi joylashuvga moslang.

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    const update = () => setMatches(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, [query]);
  return matches;
}

interface Props {
  slug: string;
  alfa: string;
  data: ContestProblemData;
  owner: ContestOwner;
  maxScore: number;
  mode: string;
  canSubmit: boolean;
  /** submit tugagach (SSE "final") ro'yxat va vazifani yangilash */
  onSubmitted: () => void;
}

export function ContestProblemView({
  slug,
  alfa,
  data,
  owner,
  maxScore,
  mode,
  canSubmit,
  onSubmitted,
}: Props) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [mobileTab, setMobileTab] = useState<"desc" | "code">("desc");
  const editorRef = useRef<CodeEditorPanelHandle>(null);
  const wasSubmitting = useRef(false);

  const problem = useMemo(() => toProblemDetail(data), [data]);

  // Navbar'dagi "Yuborish" tugmasi:  window.dispatchEvent(new Event("contest:submit"))
  useEffect(() => {
    const submit = () => editorRef.current?.submit();
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        submit();
      }
    };
    window.addEventListener("contest:submit", submit);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("contest:submit", submit);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const handleSubmitState = useCallback(
    (submitting: boolean) => {
      window.dispatchEvent(new CustomEvent("contest:submitting", { detail: submitting }));
      if (wasSubmitting.current && !submitting) onSubmitted();
      wasSubmitting.current = submitting;
    },
    [onSubmitted],
  );

  // Vazifa almashganda Yuborish tugmasi "yuborilmoqda" holatida qolib ketmasin
  useEffect(
    () => () => {
      window.dispatchEvent(new CustomEvent("contest:submitting", { detail: false }));
    },
    [],
  );

  const description = (
    <ContestProblemDescription
      data={data}
      owner={owner}
      maxScore={maxScore}
      showExtras={mode !== "contest"}
    />
  );

  const editor = (
    <CodeEditorPanel
      ref={editorRef}
      problem={problem}
      contest={{ slug, letter: alfa, canSubmit }}
      onSubmitStateChange={handleSubmitState}
    />
  );

  const card = "h-full overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950";

  if (isMobile) {
    return (
      <div className="flex h-full flex-col gap-2">
        <div className="grid shrink-0 grid-cols-2 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
          {(
            [
              ["desc", "Masala", FileText],
              ["code", "Kod", Code2],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMobileTab(key)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition",
                mobileTab === key
                  ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-950 dark:text-white"
                  : "text-neutral-500"
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
        <div className={cn(card, "min-h-0 flex-1")}>
          {/* ikkalasi ham mount holatda qoladi — yozilgan kod yo'qolmasin */}
          <div className={cn("h-full", mobileTab !== "desc" && "hidden")}>{description}</div>
          <div className={cn("h-full", mobileTab !== "code" && "hidden")}>{editor}</div>
        </div>
      </div>
    );
  }

  return (
    <ResizablePanelGroup orientation="horizontal">
      <ResizablePanel defaultSize="50%" minSize="25%">
        <div className={card}>{description}</div>
      </ResizablePanel>
      <ResizableHandle withHandle className="mx-1" />
      <ResizablePanel defaultSize="50%" minSize="30%">
        <div className={card}>{editor}</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
