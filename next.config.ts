import {
  isProductionSafeHttpEndpoint,
  normalizeHttpEndpoint,
  resolveHttpEndpoint,
} from "./src/config/http-endpoint";

const isDevelopment = process.env.NODE_ENV === "development";
const localDjangoEndpoint = "http://localhost:8008/api/v1";

function resolveDeployableEndpoint(
  ...values: Array<string | null | undefined>
): string | undefined {
  for (const value of values) {
    const endpoint = resolveHttpEndpoint(value);

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
const djangoEndpoint =
  resolveDeployableEndpoint(...djangoEndpointCandidates) ??
  (isDevelopment ? localDjangoEndpoint : undefined);

const publicDjangoEndpoint =
  resolveDeployableEndpoint(
    process.env.NEXT_PUBLIC_DJANGO_API_ENDPOINT,
    process.env.NEXT_PUBLIC_API_URL,
    djangoEndpoint,
  ) ?? (isDevelopment ? localDjangoEndpoint : undefined);

const publicApiUrl =
  resolveDeployableEndpoint(
    process.env.NEXT_PUBLIC_API_URL,
    publicDjangoEndpoint,
  ) ?? "";

const publicSseUrl =
  resolveDeployableEndpoint(
    process.env.NEXT_PUBLIC_SSE_SERVER_URL,
    publicDjangoEndpoint ? `${publicDjangoEndpoint}/events` : undefined,
  ) ?? "";

const apiImagePattern = (() => {
  const endpoint = normalizeHttpEndpoint(djangoEndpoint);

  if (!endpoint) {
    return undefined;
  }

  const url = new URL(endpoint);

  return {
    protocol: url.protocol.slice(0, -1) as "http" | "https",
    hostname: url.hostname,
    ...(url.port ? { port: url.port } : {}),
    pathname: "/**",
  };
})();

const nextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_DJANGO_API_ENDPOINT: publicDjangoEndpoint ?? "",
    NEXT_PUBLIC_API_URL: publicApiUrl,
    NEXT_PUBLIC_SSE_SERVER_URL: publicSseUrl,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  images: {
    dangerouslyAllowLocalIP: isDevelopment,
    remotePatterns: [
      ...(isDevelopment
        ? [
            {
              protocol: "http" as const,
              hostname: "localhost",
              port: "9000",
              pathname: "/**",
            },
          ]
        : []),
      {
        protocol: "https" as const,
        hostname: "picsum.photos",
        pathname: "/**",
      },
      {
        protocol: "https" as const,
        hostname: "cfmcontest.uz",
        pathname: "/**",
      },
      {
        protocol: "https" as const,
        hostname: "*.cfmcontest.uz",
        pathname: "/**",
      },
      {
        protocol: "https" as const,
        hostname: "api.cfmcontest.uz",
        pathname: "/**",
      },
      ...(apiImagePattern ? [apiImagePattern] : []),
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 30,
    },
  },
};

export default nextConfig;
