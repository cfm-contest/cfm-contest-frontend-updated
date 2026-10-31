import { Skeleton } from "@/components/ui/skeleton";

/** shadcn Skeleton: workspace shakliga mos yuklanish holati */
export function ContestWorkspaceSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5" aria-busy="true" aria-label="Yuklanmoqda">
      <Skeleton className="h-4 w-28" />
      <div className="space-y-3">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-10 w-3/4 max-w-xl" />
      </div>
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 lg:flex-row lg:items-center">
        <div className="flex flex-1 items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Skeleton className="h-14 w-40 rounded-lg" />
        <Skeleton className="h-9 w-36" />
      </div>
      <Skeleton className="h-9 w-full max-w-md" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Skeleton className="h-72 rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-52 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
