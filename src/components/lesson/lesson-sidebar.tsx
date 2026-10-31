"use client";

import Link from "next/link";
import {
  Check,
  PlayCircle,
  Code2,
  HelpCircle,
  GraduationCap,
  ArrowLeft,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LessonSelection,
  LessonSummary,
} from "@/lib/lesson/types";
import { CircularProgress } from "@/components/ui/circular-progress";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface LessonSidebarProps {
  lesson: LessonSummary;
  selection: LessonSelection;
  onSelect: (sel: LessonSelection) => void;
  isLoading: boolean;
  courseSlug?: string;
}

function RowIcon({
  done,
  Icon,
}: {
  done: boolean;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  if (done) {
    return (
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#D9AE55] text-black">
        <Check className="size-3 stroke-[3]" />
      </span>
    );
  }

  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-black/20 text-black/40">
      <Icon className="size-3" />
    </span>
  );
}

export function LessonSidebar({
  lesson,
  selection,
  onSelect,
  isLoading,
  courseSlug,
}: LessonSidebarProps) {
  // Umumiy bajarilgan foiz
  const progress =
    lesson.tk > 0
      ? Math.round((lesson.us.ft / lesson.tk) * 100)
      : 0;

  const sortedLectures = [...lesson.lecs].sort(
    (a, b) => a.o - b.o
  );

  const backHref = courseSlug
    ? `/courses/${courseSlug}`
    : "/courses";

  return (
    <Sidebar
      collapsible="offcanvas"
      className="top-14 h-[calc(100vh-3.5rem)] border-r border-black/10 bg-white flex flex-col"
    >
      {/* Header - Yuqori qism qotirilgan */}
      <SidebarHeader className="shrink-0 gap-2 border-b border-black/10 bg-white px-3 py-3 sm:px-4 sm:py-3.5">
        <Link
          href={backHref}
          className="flex items-center gap-1.5 text-[11px] sm:text-xs text-black/40 transition hover:text-[#B88A2D]"
        >
          <ArrowLeft className="size-3" />
          Kursga qaytish
        </Link>

        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#D9AE55] text-black shadow-sm">
            <GraduationCap className="size-4" />
          </span>

          <h2 className="truncate text-xs sm:text-sm font-semibold text-black/90">
            {lesson.t}
          </h2>
        </div>
      </SidebarHeader>

      {/* Content - Flex-1 va scroll bo'ladigan qism */}
      <SidebarContent className="flex-1 overflow-y-auto bg-white px-1 py-1.5 sm:px-1.5 sm:py-2">
        {/* Agar kontent bo'sh bo'lsa */}
        {sortedLectures.length === 0 &&
          lesson.probs.length === 0 &&
          lesson.qs.length === 0 && (
            <div className="flex h-32 items-center justify-center text-xs text-black/40">
              Bu darsda hali kontent yo&apos;q
            </div>
          )}

        {/* Ma'ruzalar */}
        {sortedLectures.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-2 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-black/30">
              Ma&apos;ruzalar
            </SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu>
                {sortedLectures.map((lec) => {
                  const active =
                    selection.type === "lecture" &&
                    selection.slug === lec.s;

                  return (
                    <SidebarMenuItem key={lec.id}>
                      <SidebarMenuButton
                        isActive={active}
                        disabled={isLoading && active}
                        onClick={() =>
                          onSelect({
                            type: "lecture",
                            slug: lec.s,
                          })
                        }
                        className={cn(
                          "gap-2 rounded-md text-xs sm:text-sm text-black/70 transition h-9",

                          active &&
                            "bg-[#D9AE55]/10 font-medium text-[#B88A2D] hover:bg-[#D9AE55]/10",

                          !active &&
                            "hover:bg-black/5 hover:text-black"
                        )}
                      >
                        <RowIcon
                          done={lec.done}
                          Icon={PlayCircle}
                        />

                        <span className="truncate">
                          {lec.t}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Masalalar */}
        {lesson.probs.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-2 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-black/30">
              Masalalar
            </SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu>
                {lesson.probs.map((p) => {
                  const active =
                    selection.type === "problem" &&
                    selection.slug === p.s;

                  return (
                    <SidebarMenuItem key={p.id}>
                      <SidebarMenuButton
                        isActive={active}
                        disabled={isLoading && active}
                        onClick={() =>
                          onSelect({
                            type: "problem",
                            slug: p.s,
                          })
                        }
                        className={cn(
                          "gap-2 rounded-md text-xs sm:text-sm text-black/70 transition h-9",

                          active &&
                            "bg-[#D9AE55]/10 font-medium text-[#B88A2D] hover:bg-[#D9AE55]/10",

                          !active &&
                            "hover:bg-black/5 hover:text-black"
                        )}
                      >
                        <RowIcon
                          done={p.done}
                          Icon={Code2}
                        />

                        <span className="min-w-0 flex-1 truncate">
                          {p.t}
                        </span>

                        <span className="shrink-0 text-[10px] sm:text-xs text-black/30">
                          {p.xp} XP
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Savollar */}
        {lesson.qs.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-2 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-black/30">
              Savollar
            </SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu>
                {lesson.qs.map((q, i) => {
                  const active =
                    selection.type === "quiz" &&
                    selection.id === q.id;

                  return (
                    <SidebarMenuItem key={q.id}>
                      <SidebarMenuButton
                        isActive={active}
                        disabled={isLoading && active}
                        onClick={() =>
                          onSelect({
                            type: "quiz",
                            id: q.id,
                          })
                        }
                        className={cn(
                          "gap-2 rounded-md text-xs sm:text-sm text-black/70 transition h-9",

                          active &&
                            "bg-[#D9AE55]/10 font-medium text-[#B88A2D] hover:bg-[#D9AE55]/10",

                          !active &&
                            "hover:bg-black/5 hover:text-black"
                        )}
                      >
                        <RowIcon
                          done={q.done}
                          Icon={HelpCircle}
                        />

                        <span className="flex-1 truncate">
                          Savol {i + 1}
                        </span>

                        <span className="shrink-0 text-[10px] sm:text-xs text-black/30">
                          {q.xp} XP
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer - Har doim pastda ko'rinib turadigan Circular Progress paneli */}
      <SidebarFooter className="shrink-0 border-t border-black/10 bg-white p-2.5 sm:p-3">
        <div className="flex items-center justify-between gap-2 rounded-xl border border-black/10 bg-gradient-to-r from-[#D9AE55]/10 via-[#D9AE55]/5 to-transparent p-2.5 sm:p-3 shadow-xs">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-black/40 truncate">
              O&apos;zlashtirish
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-base sm:text-lg font-bold text-black/90 tabular-nums">
                {lesson.us.ft}/{lesson.tk}
              </span>
              <span className="text-[10px] sm:text-xs text-black/50">bajarildi</span>
            </div>
            <span className="text-[10px] sm:text-[11px] font-medium text-[#B88A2D]">
              Target: 100%
            </span>
          </div>

          <div className="relative flex shrink-0 items-center justify-center">
            <CircularProgress
              size={56}
              showLabel
              circleStrokeWidth={5}
              progressStrokeWidth={6.5}
              value={progress}
              trackDashArray="4 8"
              shape="round"
              progressClassName="transition-colors duration-500 text-[#B88A2D]"
              progressBgClassName="text-[#D9AE55]/20"
              renderLabel={(v) => (
                <div className="flex flex-col items-center justify-center">
                  <Zap className="size-3 text-[#B88A2D]" />
                  <span className="text-[11px] font-bold text-black/90 tabular-nums leading-none">
                    {Math.round(v)}%
                  </span>
                </div>
              )}
            />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
