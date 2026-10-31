export function normalizeHttpEndpoint(
  value: string | null | undefined,
): string | undefined {
  const candidate = value?.trim();

  if (!candidate || /process\.env\./i.test(candidate)) {
    return undefined;
  }

  try {
    const url = new URL(candidate);

    if (
      !["http:", "https:"].includes(url.protocol) ||
      !url.hostname ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return undefined;
    }

    return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
  } catch {
    return undefined;
  }
}

export function resolveHttpEndpoint(
  ...values: Array<string | null | undefined>
): string | undefined {
  for (const value of values) {
    const endpoint = normalizeHttpEndpoint(value);

    if (endpoint) {
      return endpoint;
    }
  }

  return undefined;
}

export function isProductionSafeHttpEndpoint(
  value: string | null | undefined,
): boolean {
  const endpoint = normalizeHttpEndpoint(value);

  if (!endpoint) {
    return false;
  }

  const url = new URL(endpoint);
  const hostname = url.hostname.toLowerCase();
  const isLoopback =
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    hostname.startsWith("127.");

  return url.protocol === "https:" && !isLoopback;
}
