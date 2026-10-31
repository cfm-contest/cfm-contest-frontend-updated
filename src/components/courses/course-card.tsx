"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Lock,
  CheckCircle2,
  PlayCircle,
  FileQuestion,
  ArrowRight,
  Users,
} from "lucide-react";

const priceFormatter = new Intl.NumberFormat("uz-UZ");

interface CourseCardProps {
  course: {
    id: number;
    title: string;
    slug: string;
    price: number;
    discount_price?: number | null;
    thumbnail?: string | null;
    total_lessons: number;
    total_tests: number;
    has_access?: boolean;
    is_completed?: boolean;
    students?: number;
  };
}

export function CourseCard({ course }: CourseCardProps) {
  const price = Number(course.price);
  const discountPrice = course.discount_price ?? null;
  const currentPrice = discountPrice ?? price;
  const hasDiscount = discountPrice !== null && discountPrice < price;
  const discountPct = hasDiscount
    ? Math.round((1 - discountPrice / price) * 100)
    : 0;
  const isFree = !currentPrice || currentPrice <= 0;
  const isLocked = !isFree && !course.has_access;

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-400 dark:hover:border-white/30 hover:shadow-xl hover:shadow-black/5"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-100 dark:bg-zinc-800">
        {course.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt={course.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <PlayCircle className="size-12 text-slate-300 dark:text-zinc-600" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {course.is_completed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
              <CheckCircle2 className="size-3" />
              Tugallangan
            </span>
          )}
          {isLocked && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/80 dark:bg-white/90 px-2.5 py-1 text-[11px] font-medium text-white dark:text-black backdrop-blur">
              <Lock className="size-3" />
              Pullik
            </span>
          )}
          {hasDiscount && (
            <span className="rounded-full bg-rose-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
              -{discountPct}%
            </span>
          )}
          {isFree && (
            <span className="rounded-full bg-slate-900 text-white dark:bg-white dark:text-black px-2.5 py-1 text-[11px] font-bold shadow-sm">
              Bepul
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="font-semibold text-base sm:text-lg leading-snug text-slate-900 dark:text-white transition-colors group-hover:text-amber-500">
          {course.title}
        </h3>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-zinc-400">
          <span className="flex items-center gap-1.5">
            <PlayCircle className="size-3.5 text-amber-500" />
            {course.total_lessons} dars
          </span>
          <span className="flex items-center gap-1.5">
            <FileQuestion className="size-3.5 text-amber-500" />
            {course.total_tests} test
          </span>
          {course.students != null && course.students > 0 && (
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5 text-amber-500" />
              {priceFormatter.format(course.students)} o‘quvchi
            </span>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-4">
          <div className="flex items-baseline gap-2">
            {isFree ? (
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">Bepul</span>
            ) : (
              <>
                {hasDiscount && (
                  <span className="text-xs font-medium text-slate-400 dark:text-zinc-500 line-through tabular-nums">
                    {priceFormatter.format(price)}
                  </span>
                )}
                <span className="text-base font-bold text-slate-900 dark:text-white tabular-nums">
                  {priceFormatter.format(currentPrice)}
                  <span className="ml-1 text-xs font-normal text-slate-500 dark:text-zinc-400">
                    so‘m
                  </span>
                </span>
              </>
            )}
          </div>

          <span className="flex items-center gap-1 rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 px-3 py-1 text-xs font-semibold text-slate-800 dark:text-zinc-200 transition-colors group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black">
            Ko‘rish
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}