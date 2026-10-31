import { AUTH_API_ENDPOINT } from "@/config/defaults";

export async function isTokenValid(
  token: string
): Promise<boolean> {
  if (!AUTH_API_ENDPOINT) {
    return false;
  }

  try {
    const res = await fetch(
      `${AUTH_API_ENDPOINT}/api/verify`,
      {
        method: "GET", // endpoint GET bo'lsa
        headers: {
          Cookie: `access_token=${encodeURIComponent(token)}`,
        },
        cache: "no-store",
      }
    );

    return res.ok;
  } catch {
    return false;
  }
}
