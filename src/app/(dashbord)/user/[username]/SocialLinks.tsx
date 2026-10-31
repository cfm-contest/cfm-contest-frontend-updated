// Server komponent — "use client" kerak emas
import type { IconType } from "react-icons";
import { Globe } from "lucide-react";
import { SOCIALS, normalizeWebsite, socialHref, type SocialKey } from "@/lib/user/social";

export type SocialProfile = { website?: string | null } & Partial<Record<SocialKey, string | null>>;

export interface SocialLink {
  key: string;
  label: string;
  href: string;
  icon: IconType;
  color: string;
}

export function buildSocialLinks(profile: SocialProfile | null | undefined): SocialLink[] {
  if (!profile) return [];
  const links: SocialLink[] = [];

  const site = normalizeWebsite(profile.website);
  if (site) {
    links.push({ key: "website", label: "Veb-sayt", href: site, icon: Globe as unknown as IconType, color: "#34D399" });
  }

  for (const m of SOCIALS) {
    const href = socialHref(m, profile[m.key]);
    if (href) links.push({ key: m.key, label: m.label, href, icon: m.icon, color: m.onDark ?? m.color });
  }
  return links;
}

export function SocialLinks({ profile }: { profile: SocialProfile | null | undefined }) {
  const links = buildSocialLinks(profile);
  if (links.length === 0) return null;

  return (
    <ul className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
      {links.map(({ key, label, href, icon: Icon, color }) => (
        <li key={key}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            aria-label={label}
            title={label}
            style={{ color }}
            className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] transition hover:scale-105 hover:bg-white/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D9AE55]"
          >
            <Icon className="size-4" />
          </a>
        </li>
      ))}
    </ul>
  );
}
