import {
  isProductionSafeHttpEndpoint,
  resolveHttpEndpoint,
} from "@/config/http-endpoint";

export const SITE_NAME = "CFM Contest";

const isDevelopment = process.env.NODE_ENV === "development";

function endpointFromHost(host: string | undefined): string | undefined {
  if (!host) {
    return undefined;
  }

  const value = /^[a-z][a-z\d+.-]*:\/\//i.test(host)
    ? host
    : `https://${host}`;

  return resolveHttpEndpoint(value);
}

const configuredSiteUrl = resolveHttpEndpoint(process.env.NEXT_PUBLIC_SITE_URL);
const productionSiteUrl =
  [
    endpointFromHost(process.env.VERCEL_PROJECT_PRODUCTION_URL),
    endpointFromHost(process.env.VERCEL_URL),
    "https://cfmcontest.uz",
  ].find(isProductionSafeHttpEndpoint) ?? "https://cfmcontest.uz";

export const SITE_URL =
  configuredSiteUrl &&
  (isDevelopment || isProductionSafeHttpEndpoint(configuredSiteUrl))
    ? configuredSiteUrl
    : productionSiteUrl;

export const DEFAULT_LOCALE = "uz_UZ";

export const TWITTER_HANDLE = "@cfm_uz";

export const DEFAULT_DESCRIPTION =
  "CFM Contest — O‘zbekistonda milliy sertifikat, attestatsiya testlari, fan olimpiadalari, onlayn kurslar va dasturlash musobaqalari bo‘yicha zamonaviy ta'lim platformasi.";

export const DEFAULT_OG_IMAGE = `${SITE_URL}/cfm_logo.webp`;

export function absoluteUrl(path: string): string {
  if (!path) return SITE_URL;

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function cleanDescription(
  text: string | undefined | null,
  maxLength = 160
): string {
  if (!text) return "";

  const plain = text
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[.*?\]\(.*?\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/(\*\*|__|\*|_|`|~~)/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!plain) return "";

  if (plain.length <= maxLength) {
    return plain;
  }

  const truncated = plain.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  return `${(
    lastSpace > maxLength * 0.7
      ? truncated.slice(0, lastSpace)
      : truncated
  ).trim()}...`;
}
