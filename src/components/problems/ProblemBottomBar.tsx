"use client";

import { backendRequest } from "@/lib/api/django/backend";

import React, { useState, useRef } from "react";
import {
  Bookmark,
  Heart,
  Headphones,
  Play,
  Pause,
  X,
  Volume2,
  VolumeX,
  Flag,
  Star,
} from "lucide-react";
import type {
  ToggleLikeResponse,
  ToggleBookmarkResponse,
} from "@/lib/problems/types";

interface ProblemBottomBarProps {
  slug: string;
  audio: string | null;
  likesCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  fontSize?: number;
  onFontSizeChange?: (delta: number) => void;
  /** Reyting (ixtiyoriy): 3.4 ko'rinishida */
  rating?: number;
  ratingCount?: number;
}

export function ProblemBottomBar({
  slug,
  audio,
  likesCount: initialLikesCount,
  isLiked: initialIsLiked,
  isBookmarked: initialIsBookmarked,
  fontSize = 14,
  onFontSizeChange,
  rating,
  ratingCount,
}: ProblemBottomBarProps) {
  const [likesCount, setLikesCount] = useState<number>(initialLikesCount);
  const [isLiked, setIsLiked] = useState<boolean>(initialIsLiked);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(
    initialIsBookmarked
  );

  const [isLikeLoading, setIsLikeLoading] = useState<boolean>(false);
  const [isBookmarkLoading, setIsBookmarkLoading] = useState<boolean>(false);

  // Audio holati
  const [showAudioPlayer, setShowAudioPlayer] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const togglePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
  };

  // Like (slug bo'yicha)
  const handleLikeToggle = async () => {
    if (isLikeLoading) return;
    const prevLiked = isLiked;
    const prevCount = likesCount;

    setIsLiked(!prevLiked);
    setLikesCount(prevLiked ? prevCount - 1 : prevCount + 1);
    setIsLikeLoading(true);

    try {
      const res = await backendRequest(`/api/problems/${slug}/like`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const data: ToggleLikeResponse = await res.json();
      setIsLiked(data.is_liked);
      setLikesCount(data.likes_count);
    } catch {
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
    } finally {
      setIsLikeLoading(false);
    }
  };

  // Bookmark (slug bo'yicha)
  const handleBookmarkToggle = async () => {
    if (isBookmarkLoading) return;
    const prevBookmarked = isBookmarked;

    setIsBookmarked(!prevBookmarked);
    setIsBookmarkLoading(true);

    try {
      const res = await backendRequest(`/api/problems/${slug}/bookmark`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const data: ToggleBookmarkResponse = await res.json();
      setIsBookmarked(data.is_bookmarked);
    } catch {
      setIsBookmarked(prevBookmarked);
    } finally {
      setIsBookmarkLoading(false);
    }
  };

  return (
    <div className="sticky bottom-0 z-10 w-full select-none border-t border-neutral-200 bg-white text-neutral-700 dark:border-neutral-800 dark:bg-[#0f172a] dark:text-slate-300">
      {/* ---------- AUDIO PANEL ---------- */}
      {showAudioPlayer && audio && (
        <div className="flex items-center justify-between gap-2 border-b border-neutral-200 bg-neutral-100 px-3 py-2 text-xs transition-all dark:border-slate-700/50 dark:bg-[#1e293b]">
          <audio
            ref={audioRef}
            src={audio}
            onTimeUpdate={() =>
              setCurrentTime(audioRef.current?.currentTime || 0)
            }
            onLoadedMetadata={() =>
              setDuration(audioRef.current?.duration || 0)
            }
            onEnded={() => setIsPlaying(false)}
          />

          <button
            onClick={togglePlay}
            aria-label={isPlaying ? "Pauza" : "Ijro"}
            className="rounded-md p-1 text-neutral-800 transition hover:bg-neutral-200 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>

          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Audio pozitsiyasi"
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-neutral-300 accent-orange-500 dark:bg-slate-700"
          />

          <span className="whitespace-nowrap font-mono text-[11px] text-neutral-500 dark:text-slate-400">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <button
            onClick={togglePlaybackRate}
            className="rounded bg-neutral-200 px-1.5 py-0.5 font-mono text-[11px] transition hover:bg-neutral-300 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            {playbackRate}x
          </button>

          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.muted = !isMuted;
                setIsMuted(!isMuted);
              }
            }}
            aria-label={isMuted ? "Ovozni yoqish" : "Ovozni o'chirish"}
            className="p-1 text-neutral-500 hover:text-neutral-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          <button
            onClick={() => {
              if (audioRef.current) audioRef.current.pause();
              setIsPlaying(false);
              setShowAudioPlayer(false);
            }}
            aria-label="Yopish"
            className="p-1 text-neutral-500 hover:text-neutral-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ---------- ASOSIY BAR ---------- */}
      <div className="flex items-center justify-between px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm">
        {/* Chap guruh */}
        <div className="flex min-w-0 items-center gap-0.5 sm:gap-1">
          <button
            onClick={handleBookmarkToggle}
            disabled={isBookmarkLoading}
            aria-label="Saqlash"
            aria-pressed={isBookmarked}
            className={`rounded p-1.5 transition hover:bg-neutral-100 active:scale-95 dark:hover:bg-slate-800 ${
              isBookmarked
                ? "text-amber-500"
                : "text-neutral-400 dark:text-slate-400"
            }`}
          >
            <Bookmark size={17} fill={isBookmarked ? "currentColor" : "none"} />
          </button>

          <button
            onClick={handleLikeToggle}
            disabled={isLikeLoading}
            aria-label="Baho berish"
            aria-pressed={isLiked}
            className={`flex items-center gap-1 rounded p-1.5 transition hover:bg-neutral-100 active:scale-95 dark:hover:bg-slate-800 ${
              isLiked ? "text-red-500" : "text-neutral-400 dark:text-slate-400"
            }`}
          >
            <Heart size={17} fill={isLiked ? "currentColor" : "none"} />
            <span className="text-xs font-medium tabular-nums text-neutral-700 dark:text-slate-300">
              {likesCount}
            </span>
          </button>

          {/* Reyting (screenshot'dagi "3.4 · 317 baholar" bloki) */}
          {typeof rating === "number" && rating > 0 && (
            <div className="ml-1 hidden items-center gap-1.5 sm:flex">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    size={13}
                    className={
                      i <= Math.round(rating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-neutral-300 dark:text-slate-600"
                    }
                  />
                ))}
              </div>
              <span className="text-xs text-neutral-500 dark:text-slate-400">
                {rating.toFixed(1)}
                {ratingCount ? ` · ${ratingCount} baholar` : ""}
              </span>
            </div>
          )}

          <button
            aria-label="Shikoyat qilish"
            className="rounded p-1.5 text-neutral-400 transition hover:bg-neutral-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Flag size={16} />
          </button>
        </div>

        {/* O'ng guruh */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-0.5 rounded-lg border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 dark:border-slate-700/50 dark:bg-slate-800/60">
            <button
              onClick={() => onFontSizeChange && onFontSizeChange(-1)}
              className="px-1.5 py-0.5 text-xs font-semibold text-neutral-600 transition hover:text-neutral-900 active:scale-95 dark:text-slate-400 dark:hover:text-slate-200"
              title="Kichiklashtirish"
              aria-label="Shriftni kichiklashtirish"
            >
              A-
            </button>
            <span className="px-1 font-mono text-[11px] font-medium tabular-nums text-neutral-500 dark:text-neutral-400">
              {fontSize}px
            </span>
            <button
              onClick={() => onFontSizeChange && onFontSizeChange(1)}
              className="px-1.5 py-0.5 text-xs font-semibold text-neutral-600 transition hover:text-neutral-900 active:scale-95 dark:text-slate-400 dark:hover:text-slate-200"
              title="Kattalashtirish"
              aria-label="Shriftni kattalashtirish"
            >
              A+
            </button>
          </div>

          {audio && (
            <button
              onClick={() => setShowAudioPlayer(!showAudioPlayer)}
              aria-label="Audioni eshitish"
              aria-pressed={showAudioPlayer}
              className={`rounded p-1.5 transition active:scale-95 ${
                showAudioPlayer
                  ? "bg-orange-500 text-white"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <Headphones size={17} />
            </button>
          )}
        </div>
      </div>

      {/* Mobil uchun safe-area */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
