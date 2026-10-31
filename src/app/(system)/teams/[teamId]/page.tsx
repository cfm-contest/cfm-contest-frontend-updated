import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Globe,
  Lock,
  Medal,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JoinRequestsList } from "@/components/teams/join-requests-list";
import { MembersList } from "@/components/teams/members-list";
import { SentInvitations } from "@/components/teams/sent-invitations";
import { TeamActions } from "@/components/teams/team-actions";
import { TeamContests } from "@/components/teams/team-contests";
import { getJoinRequests, getMembers, getTeam, getTeamContests, getTeamInvitations } from "@/lib/teams/queries";
import type { ContestStatus } from "@/lib/teams/types";
import { fmtDate, initials, mediaUrl } from "@/lib/teams/utils";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

const STATUS_FILTERS: { value: ContestStatus | ""; label: string }[] = [
  { value: "", label: "Barchasi" },
  { value: "ongoing", label: "Jarayonda" },
  { value: "upcoming", label: "Kutilmoqda" },
  { value: "ended", label: "Yakunlangan" },
];

type SP = { tab?: string; status?: string; page?: string };

function Message({ title, text }: { title: string; text: string }) {
  return (
    <div className="mx-auto max-w-md space-y-3 p-12 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{text}</p>
      <Link href="/teams" className="text-sm underline underline-offset-4">
        Jamoalar ro'yxatiga qaytish
      </Link>
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: React.ReactNode }) {
  return (
    <Card className="gap-0 rounded-xl py-0 shadow-none">
      <CardContent className="flex items-center gap-3 p-4 sm:p-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="truncate text-lg font-semibold tabular-nums leading-tight sm:text-xl">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-sm first:pt-0 last:pb-0">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-medium">{children}</dd>
    </div>
  );
}

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<SP>;
}) {
  const { teamId } = await params;
  const sp = await searchParams;

  const status = STATUS_FILTERS.some((f) => f.value && f.value === sp.status)
    ? (sp.status as ContestStatus)
    : undefined;
  const page = Math.max(Number(sp.page) || 1, 1);

  const [teamRes, membersRes, contestsRes] = await Promise.all([
    getTeam(teamId),
    getMembers(teamId),
    getTeamContests(teamId, { status, page, page_size: PAGE_SIZE }),
  ]);

  if (teamRes.status === 401) redirect("/login");
  if (teamRes.status === 404) notFound();
  if (teamRes.status === 403)
    return <Message title="Bu yopiq jamoa" text="Ma'lumotlarni faqat jamoa a'zolari ko'ra oladi." />;
  if (!teamRes.data) return <Message title="Yuklab bo'lmadi" text="Server bilan aloqa yo'q. Keyinroq urinib ko'ring." />;

  const team = teamRes.data;
  const members = membersRes.data?.members ?? [];
  const contests = contestsRes.data?.results ?? [];
  const ownerName = team.owner.full_name || team.owner.username || "—";

  // Yopiq jamoada taklif olgan / so'rov yuborgan, lekin hali a'zo bo'lmagan odam a'zolarni ko'ra olmaydi.
  const membersHidden = membersRes.status === 403;
  const contestsHidden = contestsRes.status === 403;

  const sent = team.can_manage ? (await getTeamInvitations(teamId)).data?.results ?? [] : [];

  const requestsCount = team.pending_requests_count ?? 0;
  const showRequests = team.can_manage && (!team.is_public || requestsCount > 0);
  const requests = showRequests ? (await getJoinRequests(teamId)).data?.results ?? [] : [];

  const availableTabs = ["contests", "members", ...(showRequests ? ["requests"] : []), ...(team.can_manage ? ["invitations"] : [])];
  const tab = availableTabs.includes(sp.tab ?? "") ? (sp.tab as string) : "contests";

  const contestsHref = (o: { status?: string; page?: number }) => {
    const q = new URLSearchParams({ tab: "contests" });
    if (o.status) q.set("status", o.status);
    if (o.page && o.page > 1) q.set("page", String(o.page));
    return `/teams/${teamId}?${q}`;
  };

  const contestsTotal = contestsRes.data?.count ?? 0;
  const hasNext = contestsRes.data?.has_next ?? false;

  const triggerCls =
    "shrink-0 gap-2 rounded-lg px-3 py-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm";

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <Link
        href="/teams"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Jamoalar
      </Link>

      {/* ───────── Header ───────── */}
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="relative h-24 bg-foreground sm:h-32">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.14),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_100%,rgba(255,255,255,0.08),transparent_50%)]" />
        </div>

        <div className="px-4 pb-6 sm:px-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0 space-y-3">
              <Avatar className="-mt-10 size-20 rounded-2xl ring-4 ring-background sm:-mt-12 sm:size-24">
                <AvatarImage src={mediaUrl(team.avatar)} alt={team.name} className="object-cover" />
                <AvatarFallback className="rounded-2xl bg-muted text-2xl font-semibold">
                  {initials(team.name)}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{team.name}</h1>
                  <Badge variant="outline" className="gap-1 rounded-full">
                    {team.is_public ? <Globe className="size-3" /> : <Lock className="size-3" />}
                    {team.is_public ? "Ommaviy" : "Yopiq"}
                  </Badge>
                  {team.is_owner && <Badge className="rounded-full">Egasi</Badge>}
                  {!team.is_owner && team.can_manage && <Badge className="rounded-full">Admin</Badge>}
                </div>
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {team.description || "Tavsif kiritilmagan"}
                </p>
              </div>
            </div>

            <div className="shrink-0 md:pb-1">
              <TeamActions team={team} />
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Stats ───────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Users} label="A'zolar" value={team.members_count} />
        <StatTile icon={Trophy} label="Contestlar" value={team.stats.contests_count} />
        <StatTile
          icon={Medal}
          label="Eng yaxshi o'rin"
          value={team.stats.best_rank !== null ? `#${team.stats.best_rank}` : "—"}
        />
        <StatTile icon={CalendarDays} label="Yaratilgan" value={fmtDate(team.created_at)} />
      </div>

      {/* ───────── Main ───────── */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <Tabs defaultValue={tab} className="min-w-0 gap-4">
          <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl bg-muted p-1">
            <TabsTrigger value="contests" className={triggerCls}>
              Contestlar
              <span className="text-xs tabular-nums text-muted-foreground">{team.stats.contests_count}</span>
            </TabsTrigger>
            <TabsTrigger value="members" className={triggerCls}>
              A'zolar
              <span className="text-xs tabular-nums text-muted-foreground">{team.members_count}</span>
            </TabsTrigger>
            {showRequests && (
              <TabsTrigger value="requests" className={triggerCls}>
                So'rovlar
                {requestsCount > 0 && <Badge className="h-5 rounded-full px-1.5">{requestsCount}</Badge>}
              </TabsTrigger>
            )}
            {team.can_manage && (
              <TabsTrigger value="invitations" className={triggerCls}>
                Takliflar
                {sent.length > 0 && <Badge className="h-5 rounded-full px-1.5">{sent.length}</Badge>}
              </TabsTrigger>
            )}
          </TabsList>

          {/* Contestlar */}
          <TabsContent value="contests">
            <Card className="rounded-2xl shadow-none">
              <CardHeader className="gap-4 border-b pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-base">Qatnashgan contestlar</CardTitle>
                  <CardDescription>
                    {contestsRes.data ? `${contestsTotal} ta natija` : "Jamoaning musobaqalardagi natijalari"}
                  </CardDescription>
                </div>

                {!contestsHidden && (
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
                    {STATUS_FILTERS.map((f) => {
                      const active = (status ?? "") === f.value;
                      return (
                        <Button
                          key={f.value || "all"}
                          asChild
                          size="sm"
                          variant={active ? "default" : "outline"}
                          className="h-8 shrink-0 rounded-full px-3.5 text-xs"
                        >
                          <Link href={contestsHref({ status: f.value })} scroll={false}>
                            {f.label}
                          </Link>
                        </Button>
                      );
                    })}
                  </div>
                )}
              </CardHeader>

              <CardContent className="px-4 sm:px-6">
                {contestsHidden ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Contestlar faqat jamoa a'zolariga ko'rinadi.
                  </p>
                ) : !contestsRes.data ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">Contestlarni yuklab bo'lmadi.</p>
                ) : (
                  <TeamContests
                    rows={contests}
                    emptyText={
                      status
                        ? "Bu holat bo'yicha contest topilmadi."
                        : "Jamoa hali birorta contestda qatnashmagan."
                    }
                  />
                )}
              </CardContent>

              {(page > 1 || hasNext) && (
                <div className="flex items-center justify-between gap-3 border-t px-4 py-3 sm:px-6">
                  <Button asChild variant="outline" size="sm" className="rounded-lg">
                    <Link
                      href={contestsHref({ status, page: page - 1 })}
                      scroll={false}
                      aria-disabled={page <= 1}
                      className={page <= 1 ? "pointer-events-none opacity-40" : ""}
                    >
                      <ChevronLeft className="size-4" /> Oldingi
                    </Link>
                  </Button>
                  <span className="text-xs tabular-nums text-muted-foreground">{page}-sahifa</span>
                  <Button asChild variant="outline" size="sm" className="rounded-lg">
                    <Link
                      href={contestsHref({ status, page: page + 1 })}
                      scroll={false}
                      aria-disabled={!hasNext}
                      className={!hasNext ? "pointer-events-none opacity-40" : ""}
                    >
                      Keyingi <ChevronRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* A'zolar */}
          <TabsContent value="members">
            <Card className="rounded-2xl shadow-none">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-base">A'zolar</CardTitle>
                <CardDescription>Jamoa tarkibi va rollar</CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                {membersHidden ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    A'zolar ro'yxati faqat jamoa a'zolariga ko'rinadi.
                  </p>
                ) : !membersRes.data ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    A'zolar ro'yxatini yuklab bo'lmadi.
                  </p>
                ) : members.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">Hozircha a'zolar yo'q.</p>
                ) : (
                  <MembersList
                    teamId={team.id}
                    members={members}
                    canManage={team.can_manage}
                    isOwner={team.is_owner}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {showRequests && (
            <TabsContent value="requests">
              <Card className="rounded-2xl shadow-none">
                <CardHeader className="border-b pb-4">
                  <CardTitle className="text-base">Qo'shilish so'rovlari</CardTitle>
                  <CardDescription>Jamoaga qo'shilmoqchi bo'lganlar</CardDescription>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  <JoinRequestsList teamId={team.id} items={requests} />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {team.can_manage && (
            <TabsContent value="invitations">
              <Card className="rounded-2xl shadow-none">
                <CardHeader className="border-b pb-4">
                  <CardTitle className="text-base">Yuborilgan takliflar</CardTitle>
                  <CardDescription>Hali javob berilmagan takliflar</CardDescription>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  <SentInvitations items={sent} />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* ───────── Sidebar ───────── */}
        <aside className="lg:sticky lg:top-6">
          <Card className="rounded-2xl shadow-none">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base">Jamoa haqida</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y">
                <InfoRow label="Egasi">
                  <span className="inline-flex items-center justify-end gap-2">
                    <Avatar className="size-6">
                      <AvatarFallback className="text-[10px]">{initials(ownerName)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate">{ownerName}</span>
                  </span>
                </InfoRow>

                <InfoRow label="Ko'rinish">
                  <span className="inline-flex items-center gap-1.5">
                    {team.is_public ? <Globe className="size-3.5" /> : <Lock className="size-3.5" />}
                    {team.is_public ? "Ommaviy" : "Yopiq"}
                  </span>
                </InfoRow>

                <InfoRow label="Yaratilgan">{fmtDate(team.created_at)}</InfoRow>

                {!membersHidden && members.length > 0 && (
                  <InfoRow label="A'zolar">
                    <span className="inline-flex items-center justify-end">
                      <span className="flex -space-x-2">
                        {members.slice(0, 5).map((m) => (
                          <Avatar key={m.user_id} className="size-7 ring-2 ring-background">
                            <AvatarFallback className="text-[10px]">
                              {initials(m.full_name || m.username)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </span>
                      {team.members_count > 5 && (
                        <span className="ml-2 text-xs text-muted-foreground">+{team.members_count - 5}</span>
                      )}
                    </span>
                  </InfoRow>
                )}
              </dl>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
