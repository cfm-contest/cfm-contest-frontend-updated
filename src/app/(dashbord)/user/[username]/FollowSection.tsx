"use client";

import { backendRequest } from "@/lib/api/django/backend";

import { useState } from "react";
import Link from "next/link";
import useSWRInfinite from "swr/infinite";
import { toast } from "sonner";
import { Loader2, UserCheck, UserGroup, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetcher } from "@/lib/utils";

interface FollowUser {
  telegram_id: number;
  username: string | null;
  full_name: string | null;
  avatar: string | null;
}

interface FollowPage {
  results: FollowUser[];
  page: number;
  has_more: boolean;
}

type ListKind = "followers" | "following";

interface FollowSectionProps {
  telegramId: number;
  isOwner: boolean;
  isAuthenticated: boolean;
  initialFollowers: number;
  initialFollowing: number;
  initialIsFollowing: boolean;
}

const nf = new Intl.NumberFormat("uz-UZ").format;

export function FollowSection({
  telegramId,
  isOwner,
  isAuthenticated,
  initialFollowers,
  initialFollowing,
  initialIsFollowing,
}: FollowSectionProps) {
  const [followers, setFollowers] = useState(initialFollowers);
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [pending, setPending] = useState(false);
  const [openList, setOpenList] = useState<ListKind | null>(null);

  async function toggle() {
    if (pending) return;
    const next = !isFollowing;

    // Optimistik yangilash — xato bo'lsa orqaga qaytariladi
    setPending(true);
    setIsFollowing(next);
    setFollowers((c) => Math.max(0, c + (next ? 1 : -1)));

    try {
      const res = await backendRequest(
        next ? "/api/follows" : `/api/follows/${telegramId}`,
        next
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: telegramId }),
            }
          : { method: "DELETE" }
      );

      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.detail || "Amalni bajarib bo'lmadi");

      // Server hisoblagichi — haqiqat manbai
      if (typeof payload?.followers_count === "number") setFollowers(payload.followers_count);
    } catch (err) {
      setIsFollowing(!next);
      setFollowers((c) => Math.max(0, c + (next ? -1 : 1)));
      toast.error(err instanceof Error ? err.message : "Amalni bajarib bo'lmadi");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 sm:justify-start">
      <div className="flex items-center gap-4 text-sm">
        <button
          type="button"
          onClick={() => setOpenList("followers")}
          className="text-white/50 transition hover:text-white"
        >
          <b className="font-semibold tabular-nums text-white">{nf(followers)}</b> obunachi
        </button>
        <button
          type="button"
          onClick={() => setOpenList("following")}
          className="text-white/50 transition hover:text-white"
        >
          <b className="font-semibold tabular-nums text-white">{nf(initialFollowing)}</b> obuna
        </button>
        <div className="flex gap-2">
            <UserGroup />
            <p>Jamolar</p>
        </div>
      </div>

      {!isOwner &&
        (isAuthenticated ? (
          <Button
            type="button"
            size="sm"
            onClick={toggle}
            disabled={pending}
            aria-pressed={isFollowing}
            className={
              isFollowing
                ? "gap-1.5 border border-white/15 bg-white/[0.06] text-white hover:bg-white/10"
                : "gap-1.5 bg-[#D9AE55] text-[#121212] hover:bg-[#D9AE55]/90"
            }
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : isFollowing ? (
              <UserCheck className="size-3.5" />
            ) : (
              <UserPlus className="size-3.5" />
            )}
            {isFollowing ? "Obuna bo'lingan" : "Obuna bo'lish"}
          </Button>
        ) : (
          <Button asChild size="sm" className="gap-1.5 bg-[#D9AE55] text-[#121212] hover:bg-[#D9AE55]/90">
            <Link href="/login">
              <UserPlus className="size-3.5" /> Obuna bo&apos;lish
            </Link>
          </Button>
        ))}

      <FollowListDialog
        telegramId={telegramId}
        kind={openList}
        onClose={() => setOpenList(null)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function FollowListDialog({
  telegramId,
  kind,
  onClose,
}: {
  telegramId: number;
  kind: ListKind | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={kind !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[80dvh] w-[calc(100%-2rem)] flex-col gap-0 rounded-2xl p-0 sm:max-w-md">
        <DialogHeader className="border-b border-slate-100 px-5 py-4">
          <DialogTitle>{kind === "following" ? "Obunalar" : "Obunachilar"}</DialogTitle>
        </DialogHeader>
        {/* kind o'zgarganda holat yangilanishi uchun key */}
        {kind && <FollowList key={kind} telegramId={telegramId} kind={kind} onNavigate={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function FollowList({
  telegramId,
  kind,
  onNavigate,
}: {
  telegramId: number;
  kind: ListKind;
  onNavigate: () => void;
}) {
  const { data, error, size, setSize, isLoading, isValidating } = useSWRInfinite<FollowPage>(
    (index, prev) => {
      if (prev && !prev.has_more) return null;
      return `/api/follows/${telegramId}/${kind}?page=${index + 1}&page_size=20`;
    },
    fetcher,
    { revalidateFirstPage: false, revalidateOnFocus: false }
  );

  const items = data?.flatMap((p) => p.results) ?? [];
  const hasMore = data ? data[data.length - 1]?.has_more : false;

  if (isLoading) {
    return (
      <ul className="space-y-1 p-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 px-2 py-2">
            <div className="size-10 animate-pulse rounded-full bg-[#F1EFE7]" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-[#F1EFE7]" />
          </li>
        ))}
      </ul>
    );
  }

  if (error && items.length === 0) {
    return <p className="px-5 py-10 text-center text-sm text-red-600">Ro&apos;yxatni yuklab bo&apos;lmadi.</p>;
  }

  if (items.length === 0) {
    return (
      <p className="px-5 py-10 text-center text-sm text-[#9B958A]">
        {kind === "following" ? "Hali hech kimga obuna bo'linmagan." : "Hali obunachilar yo'q."}
      </p>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      <ul>
        {items.map((u) => {
          const name = u.full_name || u.username || `ID ${u.telegram_id}`;
          const row = (
            <>
              {u.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u.avatar} alt="" className="size-10 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F1EFE7] text-sm font-medium text-[#8C877D]">
                  {name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-[#181818]">{name}</span>
                {u.username && <span className="block truncate text-xs text-[#9B958A]">@{u.username}</span>}
              </span>
            </>
          );

          return (
            <li key={u.telegram_id}>
              {u.username ? (
                <Link
                  href={`/user/${u.username}`}
                  onClick={onNavigate}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-[#FAFAF7]"
                >
                  {row}
                </Link>
              ) : (
                <div className="flex items-center gap-3 px-2 py-2">{row}</div>
              )}
            </li>
          );
        })}
      </ul>

      {hasMore && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 w-full"
          onClick={() => setSize(size + 1)}
          disabled={isValidating}
        >
          {isValidating && <Loader2 className="mr-1.5 size-4 animate-spin" />}
          Yana yuklash
        </Button>
      )}
    </div>
  );
}
