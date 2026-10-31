import { Skeleton } from "@/components/ui/skeleton";

const panel =
  "h-full overflow-hidden rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950";

export function HeaderSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-neutral-200 px-3 py-3 dark:border-neutral-800">
      <Skeleton className="size-8 rounded-lg" />
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="ml-4 h-6 w-28" />
      <Skeleton className="ml-auto h-9 w-28 rounded-lg" />
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="flex shrink-0 gap-1.5 p-2 md:w-[88px] md:flex-col">
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-14 shrink-0 rounded-xl md:h-[72px] md:w-full" />
      ))}
    </div>
  );
}

export function ProblemSkeleton() {
  return (
    <div className="grid h-full grid-cols-1 gap-2 md:grid-cols-2">
      <div className={panel}>
        <div className="mb-4 flex gap-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-36 rounded-lg" />
        </div>
        <Skeleton className="mb-3 h-8 w-1/2" />
        <Skeleton className="mb-6 h-5 w-5/6" />
        <Skeleton className="mb-3 h-6 w-24" />
        <Skeleton className="mb-6 h-4 w-2/3" />
        <Skeleton className="mb-3 h-6 w-24" />
        <Skeleton className="mb-6 h-4 w-1/3" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
      <div className={`${panel} hidden md:block`}>
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-7 w-24" />
        </div>
        <Skeleton className="mb-4 h-[52%] w-full rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="mt-3 h-20 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function QuestionSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl px-2 py-8">
      <div className="mb-4 flex gap-2">
        <Skeleton className="size-9 rounded-xl" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
      <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
        <Skeleton className="h-6 w-3/4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[62px] w-full rounded-2xl" />
        ))}
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}
