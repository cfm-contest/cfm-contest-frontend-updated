import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import ApiProxy from "@/lib/api/django/backend.server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import RankBadge from "@/components/rank/RankBadge";
import RankProgress from "@/components/rank/RankProgress";
import RankLevelsSection from "@/components/rank/RankLevelsSection";
import { levelLabel, levelBadgeClass } from "@/lib/levels";
import { Zap, ShieldCheck, Settings } from "lucide-react";
import { ProblemsStatsCard } from "./ProblemsStatsCard";
import { ProfileTabs } from "./ProfileTabs";
import { FollowSection } from "./FollowSection";
import { SocialLinks, buildSocialLinks, type SocialProfile } from "./SocialLinks";
import Heatmap from "./Heatmap";

export const dynamic = "force-dynamic";

// ============================================================
// TYPES
// ============================================================

interface UserProfileResponse {
  telegram_id: number;
  username: string;
  phone: string | null;
  full_name: string;
  last_login: string | null;
  is_owner: boolean;
  is_authenticated: boolean;
  profile: (SocialProfile & { avatar: string | null; bio: string | null }) | null;
  stats: { xp: number; level: string } | null;
  follow: { followers: number; following: number; is_following: boolean };
}

interface RouteParams {
  params: Promise<{ username: string }>;
}

// ============================================================
// API
// ============================================================

async function getProfile(username: string): Promise<UserProfileResponse | null> {
  const res = await ApiProxy.get<UserProfileResponse>(`/user/${encodeURIComponent(username)}`, {
    withAuth: true,
    cache: "no-store",
  });

  if (res.status === 404) return null;
  // Backend ishlamayotgan bo'lsa "topilmadi" emas, error.tsx ko'rsatilsin
  if (!res.data) throw new Error(res.error ?? "Profilni yuklab bo'lmadi");
  return res.data;
}

// ============================================================
// SEO METADATA
// ============================================================

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { username } = await params;
  const user = await getProfile(username);

  if (!user) return { title: "Foydalanuvchi topilmadi" };

  const displayName = user.full_name || user.username;
  const xp = user.stats?.xp ?? 0;
  const level = levelLabel(user.stats?.level ?? "beginner");

  const title = `${displayName} (@${user.username}) — CfM Contest profili`;
  const description = user.profile?.bio
    ? user.profile.bio.slice(0, 155)
    : `${displayName} CfM Contest platformasida ${xp} XP to'plagan (${level} darajasi). Yechilgan masalalar, sertifikatlar va kurslardagi progressni ko'ring.`;

  const canonical = `/user/${user.username}`;
  const ogImage = user.profile?.avatar || "/cfm_logo.webp";

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "profile",
      images: [{ url: ogImage, width: 400, height: 400, alt: `${displayName} profili` }],
    },
    twitter: { card: "summary", title, description, images: [ogImage] },
  };
}

// ============================================================
// PROFILE PAGE
// ============================================================

export default async function UserProfilePage({ params }: RouteParams) {
  const { username } = await params;
  const user = await getProfile(username);

  if (!user) notFound();

  const displayName = user.full_name || user.username;
  const avatar = user.profile?.avatar ?? null;
  const xp = user.stats?.xp ?? 0;
  const level = user.stats?.level ?? "beginner";

  const sameAs = buildSocialLinks(user.profile).map((l) => l.href);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    dateModified: user.last_login ?? undefined,
    mainEntity: {
      "@type": "Person",
      name: displayName,
      alternateName: user.username,
      description: user.profile?.bio ?? undefined,
      image: user.profile?.avatar ?? undefined,
      url: `https://cfmcontest.uz/user/${user.username}`,
      sameAs: sameAs.length ? sameAs : undefined,
    },
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-black dark:text-zinc-100 pb-16">
      <script
        type="application/ld+json"
        // "<" ni escape qilamiz: bio ichidagi "</script>" sahifani buzmasligi uchun
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      {/* ==================== HERO ==================== */}
      <div className="mx-auto w-full max-w-5xl px-4 pt-6 sm:px-6 sm:pt-8">
        <section className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-black p-6 text-white shadow-2xl shadow-black/20 sm:p-8 lg:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 z-0 size-72 rounded-full bg-amber-500/10 blur-[90px] sm:size-[28rem]"
          />

          <div className="relative z-10 mx-auto flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            <RankBadge image={avatar} level={level} size={150} alt={displayName} className="shrink-0" />

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">{displayName}</h1>
              <p className="mt-1 text-sm font-medium text-zinc-400">@{user.username}</p>

              {user.profile?.bio && (
                <p className="mx-auto mt-3 max-w-xl whitespace-pre-line text-sm leading-relaxed text-zinc-300 sm:mx-0">
                  {user.profile.bio}
                </p>
              )}

              <SocialLinks profile={user.profile} />

              {/* Level, XP va egasi uchun amallar */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <Badge className={`border ${levelBadgeClass(level)} px-3 py-1 text-xs font-semibold`}>{levelLabel(level)}</Badge>

                <Badge className="flex items-center gap-1.5 border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
                  <Zap className="size-3" />
                  {xp.toLocaleString("uz-UZ")} XP
                </Badge>

                {user.is_owner && (
                  <>
                    <Badge className="flex items-center gap-1 border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
                      <ShieldCheck className="size-3 text-amber-400" />
                      Bu — sizning profilingiz
                    </Badge>

                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="gap-1.5 rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                    >
                      <Link href="/settings">
                        <Settings className="size-3.5" /> Sozlamalar
                      </Link>
                    </Button>
                  </>
                )}
              </div>

              <FollowSection
                telegramId={user.telegram_id}
                isOwner={user.is_owner}
                isAuthenticated={user.is_authenticated}
                initialFollowers={user.follow.followers}
                initialFollowing={user.follow.following}
                initialIsFollowing={user.follow.is_following}
              />

              <Link href="/ranks" className="block">
                <RankProgress xp={xp} dark showHeader={false} className="mx-auto mt-5 max-w-sm sm:mx-0" />
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* ==================== MAIN CONTENT ==================== */}
      <section className="mx-auto max-w-5xl px-4 py-10 sm:py-12">
        {user.is_owner ? (
          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
            <ProblemsStatsCard />
            <Heatmap telegramId={user.telegram_id} />
          </div>
        ) : (
          <div className="mb-8">
            <Heatmap telegramId={user.telegram_id} />
          </div>
        )}

        <ProfileTabs username={user.username} telegramId={user.telegram_id} />
      </section>

      {/* ==================== DARAJALAR ==================== */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <RankLevelsSection xp={xp} image={avatar} name={displayName} />
      </section>
    </main>
  );
}
