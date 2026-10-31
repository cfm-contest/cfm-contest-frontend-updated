"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, PlayCircle, HelpCircle, Users, Play } from "lucide-react";
import type { CourseHeroData } from "@/lib/types/courses";

interface FeaturedCourseHeroProps {
  hero: CourseHeroData;
}

export function FeaturedCourseHero({ hero }: FeaturedCourseHeroProps) {
  const price = Number(hero.price ?? 0);
  const discountPrice = hero.discount_price != null ? Number(hero.discount_price) : null;
  const currentPrice = discountPrice ?? price;
  const isFree = !currentPrice || currentPrice <= 0;

  return (
    <div className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-black text-white shadow-2xl shadow-black/20">
      {hero.video?.thumbnail && (
        <div className="absolute inset-0 z-0 opacity-20">
          <Image src={hero.video.thumbnail} alt="" fill className="object-cover" priority />
        </div>
      )}
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-black via-black/85 to-black/40 lg:bg-gradient-to-r lg:from-black lg:via-black/90 lg:to-transparent" />
      <div className="pointer-events-none absolute -right-24 -top-24 z-0 size-72 rounded-full bg-amber-500/10 blur-[90px] sm:size-[28rem]" />

      <div className="relative z-10 grid grid-cols-1 gap-8 p-6 sm:p-8 lg:grid-cols-[1.2fr_auto] lg:items-center lg:p-10">
        <div className="flex flex-col gap-5">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-400 backdrop-blur">
            <span className="size-1.5 rounded-full bg-amber-400" />
            Tavsiya etilgan kurs
          </span>

          <h2 className="font-display text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
            {hero.title}
          </h2>

          {hero.description && (
            <p className="max-w-xl text-sm leading-relaxed text-zinc-300">
              {hero.description.replace(/[#*`]/g, "").slice(0, 190)}
              {hero.description.length > 190 ? "..." : ""}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-zinc-400 sm:text-sm">
            <span className="flex items-center gap-2">
              <PlayCircle className="size-4 text-amber-400" />
              {hero.total_lessons} ta dars
            </span>
            <span className="flex items-center gap-2">
              <HelpCircle className="size-4 text-amber-400" />
              {hero.total_tests} ta test
            </span>
            {hero.students > 0 && (
              <span className="flex items-center gap-2">
                <Users className="size-4 text-amber-400" />
                {hero.students.toLocaleString()}+ o‘quvchi
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href={`/courses/${hero.slug}`}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-black transition hover:bg-zinc-200 active:scale-[0.98]"
            >
              {isFree ? "Bepul boshlash" : "Kursni ko‘rish"}
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href={`/courses/${hero.slug}#curriculum`}
              className="rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10 active:scale-[0.98]"
            >
              Dastur bilan tanishish
            </Link>
          </div>
        </div>

        {hero.video?.thumbnail && (
          <div className="relative hidden aspect-[4/3] w-72 shrink-0 overflow-hidden rounded-2xl border border-white/10 lg:block">
            <Image src={hero.video.thumbnail} alt={hero.title} fill className="object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
              <span className="flex size-14 items-center justify-center rounded-full bg-white shadow-xl transition hover:scale-105">
                <Play className="ml-1 size-6 fill-black text-black" />
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}