// app/(system)/settings/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ApiProxy from "@/lib/api/django/backend.server";
import { SettingsForm, type SettingsInitial } from "./SettingsForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sozlamalar",
  robots: { index: false, follow: false },
};

interface MySettingsResponse {
  telegram_id: number;
  username: string | null;
  full_name: string | null;
  phone: string | null;
  profile: (Partial<SettingsInitial> & { avatar: string | null }) | null;
}

export default async function SettingsPage() {
  // Himoya: token Django'da tekshiriladi (get_current_user). Token yo'q/yaroqsiz bo'lsa — login.
  const res = await ApiProxy.get<MySettingsResponse>("/user/settings/profile", {
    withAuth: true,
    cache: "no-store",
  });

  if (res.status === 401 || res.status === 403) redirect("/login");
  // Backend ishlamasa error.tsx ko'rsatilsin (bo'sh forma ma'lumotni o'chirib yuborishi mumkin)
  if (!res.data) throw new Error(res.error ?? "Sozlamalarni yuklab bo'lmadi");

  const me = res.data;
  const p = me.profile;

  return (
    <main className="min-h-screen bg-[#FAFAF7]">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-[#121212] sm:text-2xl">Sozlamalar</h1>
            <p className="mt-0.5 text-sm text-[#8C877D]">Profilingiz va havolalaringizni boshqaring</p>
          </div>
          {me.username && (
            <Link
              href={`/user/${me.username}`}
              className="inline-flex shrink-0 items-center gap-1.5 text-sm text-[#8C877D] transition hover:text-[#181818]"
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Profilga qaytish</span>
            </Link>
          )}
        </div>

        <SettingsForm
          account={{
            telegramId: me.telegram_id,
            username: me.username,
            fullName: me.full_name,
            phone: me.phone,
          }}
          initial={{
            avatar: p?.avatar ?? null,
            bio: p?.bio ?? "",
            website: p?.website ?? "",
            telegram: p?.telegram ?? "",
            github: p?.github ?? "",
            linkedin: p?.linkedin ?? "",
            youtube: p?.youtube ?? "",
            codeforces: p?.codeforces ?? "",
            leetcode: p?.leetcode ?? "",
            atcoder: p?.atcoder ?? "",
          }}
        />
      </div>
    </main>
  );
}
