"use client";

import { useState } from "react";
import useSWR from "swr";
import type { ProblemDetail, ProblemDetailUnlocked } from "@/lib/problems/types";
import { getSolutionVideo } from "@/lib/problems/api";
import { SubmissionList } from "./submission-list";
import { MarkdownRenderer } from "../MarkdownRenderer";
import { VideoPlayer } from "../VideoPlayer";
import {
  Zap,
  Timer,
  MemoryStick,
  BadgeCheck,
  Lightbulb,
  ListChecks,
  PlayCircle,
  Lock,
} from "lucide-react";
import { DIFFICULTY_LABELS, DIFFICULTY_CLASSES } from "@/lib/problems/utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ProblemBottomBar } from "./ProblemBottomBar";

type Tab = "description" | "hints" | "challenges" | "submissions" | "video";

/** Backend'dan kelishi mumkin bo'lgan ixtiyoriy maydonlar */
type ProblemExtras = {
  audio?: string | null;
  likes_count?: number;
  is_liked?: boolean;
  is_bookmarked?: boolean;
  rating?: number;
  rating_count?: number;
};

interface DescriptionPanelProps {
  problem: ProblemDetail;
}

export function DescriptionPanel({ problem }: DescriptionPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("description");
  const [fontSize, setFontSize] = useState<number>(15);

  const handleFontSizeChange = (delta: number) => {
    setFontSize((prev) => Math.min(Math.max(prev + delta, 12), 24));
  };

  const hasVideo = problem.hasAccess && problem.solved;

  const {
    data: videoData,
    isLoading: videoLoading,
    error: videoError,
  } = useSWR(
    hasVideo && activeTab === "video" ? `video-${problem.slug}` : null,
    () => getSolutionVideo(problem.slug),
    { revalidateOnFocus: false }
  );

  if (!problem.hasAccess) {
    return <LockedPanel problem={problem} />;
  }

  const unlocked = problem as ProblemDetailUnlocked & ProblemExtras;
  const hasHints = unlocked.hints.length > 0;
  const hasChallenges = unlocked.challenges.length > 0;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white dark:bg-[#0f172a]">
      {/* 1. Tablar (sticky) */}
      <div className="flex shrink-0 items-center gap-0.5 overflow-x-auto border-b border-neutral-200 bg-white px-1 dark:border-neutral-800 dark:bg-[#0f172a]">
        <TabButton
          active={activeTab === "description"}
          onClick={() => setActiveTab("description")}
          label="Tavsif"
        />
        {hasHints && (
          <TabButton
            active={activeTab === "hints"}
            onClick={() => setActiveTab("hints")}
            label="Maslahatlar"
            count={unlocked.hints.length}
          />
        )}
        {hasChallenges && (
          <TabButton
            active={activeTab === "challenges"}
            onClick={() => setActiveTab("challenges")}
            label="Talablar"
            count={unlocked.challenges.length}
          />
        )}
        {hasVideo && (
          <TabButton
            active={activeTab === "video"}
            onClick={() => setActiveTab("video")}
            label="Video yechim"
            icon={<PlayCircle className="size-3.5" />}
          />
        )}
        <TabButton
          active={activeTab === "submissions"}
          onClick={() => setActiveTab("submissions")}
          label="Taqdimotlar"
        />
      </div>

      {/* 2. Scroll qilinadigan kontent */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeTab === "description" && (
          <DescriptionContent problem={unlocked} fontSize={fontSize} />
        )}
        {activeTab === "hints" && (
          <HintsContent problem={unlocked} fontSize={fontSize} />
        )}
        {activeTab === "challenges" && (
          <ChallengesContent problem={unlocked} fontSize={fontSize} />
        )}
        {activeTab === "video" && (
          <VideoTab
            videoData={videoData}
            loading={videoLoading}
            error={videoError}
          />
        )}
        {activeTab === "submissions" && (
          <div className="p-3 sm:p-6">
            <SubmissionList slug={problem.slug} />
          </div>
        )}
      </div>

      {/* 3. Pastki bar — A-/A+ endi ishlaydi, mobilga mos */}
      <ProblemBottomBar
        slug={problem.slug}
        audio={unlocked.audio ?? null}
        likesCount={unlocked.likes_count ?? 0}
        isLiked={unlocked.is_liked ?? false}
        isBookmarked={unlocked.is_bookmarked ?? false}
        fontSize={fontSize}
        onFontSizeChange={handleFontSizeChange}
        rating={unlocked.rating}
        ratingCount={unlocked.rating_count}
      />
    </div>
  );
}

// ========== VIDEO TAB ==========
function VideoTab({
  videoData,
  loading,
  error,
}: {
  videoData?: { hls_url: string; thumbnail: string | null; duration: number | null };
  loading: boolean;
  error: any;
}) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-neutral-400">
        <div className="size-6 animate-spin rounded-full border-2 border-neutral-300 border-t-orange-500" />
        <span className="ml-2 text-sm">Video yuklanmoqda...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-neutral-400">
        <Lock className="size-8" />
        <p className="text-sm font-medium">Videoni ko'rish mumkin emas</p>
        <p className="text-xs text-neutral-400">
          {error.message || "Avval masalani yeching"}
        </p>
      </div>
    );
  }

  if (!videoData?.hls_url) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-neutral-400">
        <p className="text-sm">Ushbu masala uchun video mavjud emas</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4">
      <VideoPlayer
        src={videoData.hls_url}
        poster={videoData.thumbnail}
        title="Masala yechimi"
      />
      <p className="mt-3 text-xs text-neutral-400">
        Videoni tomosha qilish uchun klaviatura boshqaruvidan foydalanishingiz
        mumkin: Space (play/pause), ← → (oldinga/orqaga), F (fullscreen)
      </p>
    </div>
  );
}

// ========== TAB TUGMASI ==========
function TabButton({
  active,
  onClick,
  label,
  count,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex shrink-0 items-center gap-1.5 px-3 py-3 text-xs font-medium transition-colors sm:px-4 sm:text-sm",
        active
          ? "text-orange-600 dark:text-orange-500"
          : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
      )}
    >
      {icon}
      {label}
      {typeof count === "number" && (
        <span
          className={cn(
            "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
            active
              ? "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
              : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
          )}
        >
          {count}
        </span>
      )}
      {active && (
        <span className="absolute bottom-0 left-0 h-0.5 w-full bg-orange-500" />
      )}
    </button>
  );
}

// ========== TAVSIF KONTENTI ==========
function DescriptionContent({
  problem,
  fontSize,
}: {
  problem: ProblemDetailUnlocked;
  fontSize: number;
}) {
  return (
    <div className="p-4 sm:p-6" style={{ fontSize: `${fontSize}px` }}>
      {/* Sarlavha */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <h1 className="mb-2 text-xl font-bold text-neutral-900 dark:text-neutral-100 sm:text-2xl">
            {problem.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={`border px-2.5 py-0.5 text-xs ${DIFFICULTY_CLASSES[problem.difficulty]}`}
            >
              {DIFFICULTY_LABELS[problem.difficulty]}
            </Badge>
            {problem.category && (
              <Badge variant="outline" className="px-2.5 py-0.5 text-xs">
                {problem.category}
              </Badge>
            )}
            {problem.tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="px-2.5 py-0.5 text-xs font-normal"
              >
                #{tag.name}
              </Badge>
            ))}
          </div>
        </div>

        {problem.solved && (
          <div className="flex shrink-0 items-center gap-1.5 self-start rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 sm:text-sm">
            <BadgeCheck className="size-4" />
            Yechim topildi
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
        <MetaItem
          icon={<Zap className="size-4 text-orange-500" />}
          label="XP"
          value={String(problem.xp)}
        />
        <MetaItem
          icon={<Timer className="size-4 text-orange-500" />}
          label="Vaqt"
          value={`${problem.timeLimit} ms`}
        />
        <MetaItem
          icon={<MemoryStick className="size-4 text-orange-500" />}
          label="Xotira"
          value={`${problem.memoryLimit} MB`}
        />
      </div>

      {/* Tavsif matni */}
      <MarkdownRenderer content={problem.desc} fontSize={fontSize} />
    </div>
  );
}

// ========== MASLAHATLAR ==========
function HintsContent({
  problem,
  fontSize,
}: {
  problem: ProblemDetailUnlocked;
  fontSize: number;
}) {
  if (problem.hints.length === 0) {
    return (
      <EmptyTabState
        icon={<Lightbulb className="size-8" />}
        text="Maslahatlar mavjud emas"
      />
    );
  }

  return (
    <div className="space-y-3 p-4 sm:p-6" style={{ fontSize: `${fontSize}px` }}>
      {problem.hints.map((h, i) => (
        <div
          key={h.id}
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300"
        >
          <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
            <Lightbulb className="size-4" />
            Maslahat {i + 1}
          </div>
          <MarkdownRenderer content={h.text} fontSize={fontSize} />
        </div>
      ))}
    </div>
  );
}

// ========== TALABLAR ==========
function ChallengesContent({
  problem,
  fontSize,
}: {
  problem: ProblemDetailUnlocked;
  fontSize: number;
}) {
  if (problem.challenges.length === 0) {
    return (
      <EmptyTabState
        icon={<ListChecks className="size-8" />}
        text="Qo'shimcha talablar mavjud emas"
      />
    );
  }

  return (
    <div className="p-4 sm:p-6" style={{ fontSize: `${fontSize}px` }}>
      <ul className="space-y-3">
        {problem.challenges.map((c, i) => (
          <li
            key={c.id}
            className="flex gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-semibold text-orange-600 dark:bg-orange-950 dark:text-orange-400">
              {i + 1}
            </span>
            <div className="text-neutral-700 dark:text-neutral-300">
              <MarkdownRenderer content={c.text} fontSize={fontSize} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyTabState({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-neutral-300">
      {icon}
      <p className="text-sm text-neutral-400">{text}</p>
    </div>
  );
}

// ========== QULFLANGAN HOLAT ==========
function LockedPanel({ problem }: { problem: ProblemDetail }) {
  const locked = problem as ProblemDetail & ProblemExtras;

  return (
    <div className="flex h-full flex-col bg-white dark:bg-[#0f172a]">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="mb-3 text-xl font-bold text-neutral-900 dark:text-neutral-100 sm:text-2xl">
                {problem.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={`border px-2.5 py-0.5 text-xs ${DIFFICULTY_CLASSES[problem.difficulty]}`}
                >
                  {DIFFICULTY_LABELS[problem.difficulty]}
                </Badge>
                {problem.category && (
                  <Badge variant="outline" className="px-2.5 py-0.5 text-xs">
                    {problem.category}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3">
            <MetaItem
              icon={<Zap className="size-4 text-orange-500" />}
              label="XP"
              value={String(problem.xp)}
            />
            <MetaItem
              icon={<Lock className="size-4 text-amber-500" />}
              label="Kirish"
              value="Premium"
            />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-3 px-6 pb-16 text-center text-neutral-400">
          <Lock className="size-10 text-amber-400" />
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Bu masala Premium foydalanuvchilar uchun
          </p>
          <p className="text-xs text-neutral-400">
            To'liq tavsif, maslahatlar va kod muharriridan foydalanish uchun
            Premiumga obuna bo'ling
          </p>
        </div>
      </div>

      <ProblemBottomBar
        slug={problem.slug}
        audio={locked.audio ?? null}
        likesCount={locked.likes_count ?? 0}
        isLiked={locked.is_liked ?? false}
        isBookmarked={locked.is_bookmarked ?? false}
        rating={locked.rating}
        ratingCount={locked.rating_count}
      />
    </div>
  );
}

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-neutral-400">
        {icon}
        {label}
      </div>
      <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 sm:text-sm">
        {value}
      </p>
    </div>
  );
}