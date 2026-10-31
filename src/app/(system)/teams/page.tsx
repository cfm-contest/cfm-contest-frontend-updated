import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, Users, Globe, Mail, Sparkles, Trophy, Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvitationsList } from "@/components/teams/invitations-list";
import { TeamCard } from "@/components/teams/team-card";
import { TeamContests } from "@/components/teams/team-contests";
import { TeamFormDialog } from "@/components/teams/team-form-dialog";
import { getInvitations, getMyTeamContests, getMyTeams, getPublicTeams } from "@/lib/teams/queries";
import { mediaUrl } from "@/lib/teams/utils";

export const dynamic = "force-dynamic";

const TABS = ["mine", "public", "contests", "invitations"] as const;

function Empty({
  icon: Icon = Sparkles,
  title,
  description,
  action
}: {
  icon?: any;
  title: string;
  description: string;
  action?: React.ReactNode
}) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-card/40 p-8 text-center backdrop-blur-sm sm:p-12">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner mb-4">
        <Icon className="size-7" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground leading-relaxed">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

const triggerCls =
  "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium sm:text-sm transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm";
const countCls =
  "ml-1 flex size-5 items-center justify-center rounded-full bg-muted-foreground/15 text-[10px] font-bold text-foreground";

type SP = { tab?: string; q?: string; page?: string };

export default async function TeamsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(Number(sp.page) || 1, 1);
  const tab = TABS.includes(sp.tab as (typeof TABS)[number]) ? (sp.tab as string) : q ? "public" : "mine";

  const [mine, pub, inv, contests] = await Promise.all([
    getMyTeams(),
    getPublicTeams({ q, page, page_size: 12 }),
    getInvitations(),
    getMyTeamContests({ page_size: 20 }),
  ]);

  if ([mine, pub, inv].some((r) => r.status === 401)) redirect("/login");

  if (!mine.data || !pub.data || !inv.data) {
    return (
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <Alert variant="destructive" className="rounded-2xl border-destructive/30 bg-destructive/10 p-5 shadow-lg backdrop-blur-md">
          <AlertCircle className="size-5" />
          <AlertTitle className="text-base font-semibold">Jamoalarni yuklab bo'lmadi</AlertTitle>
          <AlertDescription className="mt-1 text-sm opacity-90">
            Server bilan aloqa uzildi. Iltimos, internet aloqasini tekshiring yoki sahifani yangilang.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const myTeams = mine.data.results;
  const publicTeams = pub.data.results;
  const invitations = inv.data.results;
  const contestRows = contests.data?.results ?? [];

  const pageHref = (p: number) =>
    `/teams?${new URLSearchParams({ tab: "public", ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <div className="min-h-screen bg-background/50">
      <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                Jamoalar
              </h1>
              <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {myTeams.length} ta jamoam
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground sm:text-sm max-w-2xl leading-relaxed">
              Contestlarda jamoa bo'lib qatnashing, hamkorlarni taklif qiling yoki ommaviy jamoalarga qo'shiling.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <TeamFormDialog />
          </div>
        </div>

        {/* Tabs & Content */}
        <Tabs defaultValue={tab} className="space-y-6">

          <div className="overflow-x-auto pb-1 scrollbar-none">
            <TabsList className="inline-flex h-12 items-center justify-start rounded-2xl bg-muted/80 p-1.5 text-muted-foreground backdrop-blur-md border border-border/40">
              <TabsTrigger value="mine" className={triggerCls}>
                <Users className="size-4 text-primary" />
                <span>Mening jamoalarim</span>
                <span className={countCls}>{myTeams.length}</span>
              </TabsTrigger>

              <TabsTrigger value="public" className={triggerCls}>
                <Globe className="size-4 text-blue-500" />
                <span>Ommaviy</span>
                <span className={countCls}>{pub.data.count}</span>
              </TabsTrigger>

              <TabsTrigger value="contests" className={triggerCls}>
                <Trophy className="size-4 text-emerald-500" />
                <span>Contestlarim</span>
                <span className={countCls}>{contests.data?.count ?? 0}</span>
              </TabsTrigger>

              <TabsTrigger value="invitations" className={triggerCls}>
                <Mail className="size-4 text-amber-500" />
                <span>Takliflar</span>
                {invitations.length > 0 ? (
                  <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground animate-pulse">
                    {invitations.length}
                  </span>
                ) : (
                  <span className={countCls}>0</span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="mine" className="focus-visible:outline-none">
            {myTeams.length === 0 ? (
              <Empty
                icon={Users}
                title="Sizda hali jamoalar yo'q"
                description="Siz hali hech qanday jamoaga a'zo emassiz. Yangi jamoa yarating yoki ommaviylaridan birini tanlang."
                action={<TeamFormDialog />}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-6">
                {myTeams.map((t) => (
                  <div key={t.id} className="group relative transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 rounded-2xl">
                    <TeamCard
                      id={t.id}
                      name={t.name}
                      description={t.description}
                      isPublic={t.is_public}
                      role={t.role}
                      membersCount={t.members_count}
                      img={mediaUrl(t.img)}
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="public" className="space-y-6 focus-visible:outline-none">
            {/* GET forma: ?tab=public&q=... (server tomonda qidiruv) */}
            <form action="/teams" method="get" className="flex gap-2">
              <input type="hidden" name="tab" value="public" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Jamoa nomi bo'yicha qidirish..."
                className="max-w-sm rounded-xl"
              />
              <Button type="submit" variant="secondary" className="rounded-xl gap-2">
                <Search className="size-4" /> Qidirish
              </Button>
            </form>

            {publicTeams.length === 0 ? (
              <Empty
                icon={Globe}
                title="Ommaviy jamoalar topilmadi"
                description={q ? `"${q}" bo'yicha hech narsa topilmadi.` : "Hozirda barcha jamoalar yopiq yoki hali yaratilmagan."}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-6">
                {publicTeams.map((t) => (
                  <div key={t.id} className="group relative transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/5 rounded-2xl">
                    <TeamCard
                      id={t.id}
                      name={t.name}
                      description={t.description}
                      isPublic
                      owner={t.owner}
                      role={t.my_role}
                      myStatus={t.my_status}
                      membersCount={t.members_count}
                      img={mediaUrl(t.avatar)}
                      joinable
                    />
                  </div>
                ))}
              </div>
            )}

            {(page > 1 || pub.data.has_next) && (
              <div className="flex items-center justify-center gap-3">
                <Button asChild variant="outline" size="sm" className="rounded-xl" disabled={page <= 1}>
                  <Link href={pageHref(page - 1)} aria-disabled={page <= 1} className={page <= 1 ? "pointer-events-none opacity-50" : ""}>
                    Oldingi
                  </Link>
                </Button>
                <span className="text-xs text-muted-foreground">{page}-sahifa</span>
                <Button asChild variant="outline" size="sm" className="rounded-xl">
                  <Link href={pageHref(page + 1)} aria-disabled={!pub.data.has_next} className={!pub.data.has_next ? "pointer-events-none opacity-50" : ""}>
                    Keyingi
                  </Link>
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="contests" className="focus-visible:outline-none">
            <div className="rounded-3xl border border-border/60 bg-card/60 p-4 sm:p-6 shadow-sm backdrop-blur-md">
              {!contests.data ? (
                <p className="text-sm text-muted-foreground">Contestlarni yuklab bo'lmadi.</p>
              ) : (
                <TeamContests
                  rows={contestRows}
                  showTeam
                  emptyText="Siz hali jamoa bilan birorta contestda qatnashmagansiz."
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="invitations" className="focus-visible:outline-none">
            {invitations.length === 0 ? (
              <Empty
                icon={Mail}
                title="Taklifnomalar yo'q"
                description="Sizga yuborilgan jamoaviy taklifnomalar shu yerda ko'rinadi."
              />
            ) : (
              <div className="rounded-3xl border border-border/60 bg-card/60 p-4 sm:p-6 shadow-sm backdrop-blur-md">
                <InvitationsList items={invitations} />
              </div>
            )}
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
