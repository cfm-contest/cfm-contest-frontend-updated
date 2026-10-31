import Link from "next/link";
import Image from "next/image";
import { Globe, Lock, ShieldCheck, Users, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROLE_LABEL } from "@/lib/teams/utils";
import type { MembershipStatus, Role } from "@/lib/teams/types";

interface TeamCardProps {
  id: string | number;
  name: string;
  description?: string | null;
  isPublic?: boolean;
  role?: string | null;
  owner?: string | null;
  membersCount?: number;
  img?: string | null; // Backend'dan keladigan rasm URL manzili
  joinable?: boolean;
  /** Yopiq jamoaga yuborilgan so'rov holati. */
  myStatus?: MembershipStatus | null;
}

export function TeamCard({
  id,
  name,
  description,
  isPublic,
  role,
  owner,
  membersCount,
  img,
  joinable,
  myStatus,
}: TeamCardProps) {
  const avatarChar = name ? name.charAt(0).toUpperCase() : "T";

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border/60 bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5">
      <div className="space-y-4">
        {/* Card Header: Image/Avatar & Badges */}
        <div className="flex items-start justify-between gap-3">
          {img ? (
            <div className="relative size-12 shrink-0 overflow-hidden rounded-2xl border border-primary/20 shadow-sm">
              <Image
                src={img}
                alt={name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          ) : (
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-lg font-bold text-primary border border-primary/20 shadow-sm">
              {avatarChar}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <Badge
              variant="outline"
              className="gap-1 rounded-xl border-border/60 bg-muted/30 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
            >
              {isPublic ? (
                <>
                  <Globe className="size-3 text-blue-500" /> Ommaviy
                </>
              ) : (
                <>
                  <Lock className="size-3 text-amber-500" /> Maxfiy
                </>
              )}
            </Badge>

            {myStatus === "pending" && (
              <Badge variant="secondary" className="rounded-xl px-2.5 py-1 text-[11px] font-medium">
                So'rov yuborilgan
              </Badge>
            )}

            {role && (
              <Badge className="gap-1 rounded-xl bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary border border-primary/20">
                <ShieldCheck className="size-3" />
                {ROLE_LABEL[role as Role] ?? role}
              </Badge>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5">
          <h3 className="line-clamp-1 text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
            {name}
          </h3>
          <p className="line-clamp-2 text-xs sm:text-sm text-muted-foreground leading-relaxed min-h-[40px]">
            {description || "Jamoa uchun tavsif kiritilmagan."}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between border-t border-border/40 pt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 font-medium">
          {membersCount !== undefined && (
            <span className="flex items-center gap-1.5 rounded-xl bg-muted/40 px-2.5 py-1 text-foreground/80">
              <Users className="size-3.5 text-primary" />
              {membersCount} a'zo
            </span>
          )}
        </div>

        <Button
          asChild
          size="sm"
          className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold shadow-sm transition-all"
        >
          <Link href={`/teams/${id}`}>
            Kirish
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
