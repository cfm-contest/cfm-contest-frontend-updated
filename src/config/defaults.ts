import {
  isProductionSafeHttpEndpoint,
  normalizeHttpEndpoint,
} from "./http-endpoint";

const isDevelopment = process.env.NODE_ENV === "development";
const defaultDjangoEndpoint = "https://api.cfmcontest.uz/api/v1";

function resolveBackendEndpoint(
  ...values: Array<string | null | undefined>
): string | undefined {
  for (const value of values) {
    const endpoint = normalizeHttpEndpoint(value);

    if (
      endpoint &&
      (isDevelopment || isProductionSafeHttpEndpoint(endpoint))
    ) {
      return endpoint;
    }
  }

  return undefined;
}

const versionedDjangoEndpoints = [
  process.env.DJANGO_API_ENDPOINT_5,
  process.env.DJANGO_API_ENDPOINT_4,
  process.env.DJANGO_API_ENDPOINT_3,
  process.env.DJANGO_API_ENDPOINT_2,
];
const djangoEndpointCandidates = isDevelopment
  ? [process.env.DJANGO_API_ENDPOINT, ...versionedDjangoEndpoints]
  : [...versionedDjangoEndpoints, process.env.DJANGO_API_ENDPOINT];

const versionedAuthEndpoints = [
  process.env.AUTH_API_ENDPOINT_5,
  process.env.AUTH_API_ENDPOINT_4,
  process.env.AUTH_API_ENDPOINT_3,
  process.env.AUTH_API_ENDPOINT_2,
];
const authEndpointCandidates = isDevelopment
  ? [process.env.AUTH_API_ENDPOINT, ...versionedAuthEndpoints]
  : [...versionedAuthEndpoints, process.env.AUTH_API_ENDPOINT];

export const DJANGO_API_ENDPOINT =
  resolveBackendEndpoint(
    process.env.NEXT_PUBLIC_DJANGO_API_ENDPOINT,
    process.env.NEXT_PUBLIC_API_URL,
    ...djangoEndpointCandidates,
  ) ?? defaultDjangoEndpoint;

export const AUTH_API_ENDPOINT =
  resolveBackendEndpoint(
    process.env.NEXT_PUBLIC_AUTH_API_ENDPOINT,
    ...authEndpointCandidates,
  ) ?? "https://auth.cfmcontest.uz/api/v1";

export const DEFAULT_SSE_SERVER_URL =
  process.env.NEXT_PUBLIC_SSE_SERVER_URL ||
  process.env.NEXT_PUBLIC_SSE_SERVE ||
  "https://api.cfmcontest.uz/api/v1/sse/events";

