// src/proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { importSPKI, jwtVerify } from "jose";

const COOKIE = "access_token";
// prod: ".cfmcontest.uz", dev (localhost): bo'sh qoldiring
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || ".cfmcontest.uz";

// Backend (cfmauth/bot/jwt_token.py) bilan bir xil bo'lishi shart
const ISSUER = process.env.JWT_ISSUER || "https://auth.cfmcontest.uz";
const AUDIENCE = process.env.JWT_AUDIENCE || "https://cfmcontest.uz";
const CLOCK_TOLERANCE_SEC = 10; // backend: leeway=10
const REQUIRED_CLAIMS = ["sub", "iat", "exp", "iss", "aud", "jti"];

// Faqat shu sahifalar cookie talab qiladi
const PROTECTED = [
  /^\/courses\/[^/]+\/lesson\//,
  /^\/courses\/[^/]+\/test\//,
];

let keyPromise: Promise<CryptoKey> | null = null;
function getKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    const pem = (process.env.JWT_PUBLIC_KEY ?? "").replace(/\\n/g, "\n").trim();
    keyPromise = importSPKI(pem, "RS256").catch((err) => {
      keyPromise = null; // keyingi so'rovda qayta urinadi
      throw err;
    });
  }
  return keyPromise;
}

function clearCookie(res: NextResponse) {
  res.cookies.set(COOKIE, "", {
    maxAge: 0,
    expires: new Date(0),
    path: "/",
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  });
  return res;
}

function toLogin(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const url = new URL("/login", request.url);
  url.searchParams.set("next", pathname + search);
  url.searchParams.set("reason", "expired");
  return clearCookie(NextResponse.redirect(url));
}

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Server 401 bergan va /login?reason=expired ga yuborgan:
  // eski cookie'ni shu yerda o'chiramiz (server component cookie o'chira olmaydi).
  if (pathname === "/login") {
    if (searchParams.get("reason") === "expired") {
      return clearCookie(NextResponse.next());
    }
    return NextResponse.next();
  }

  if (!PROTECTED.some((re) => re.test(pathname))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE)?.value;
  if (!token) return toLogin(request);

  // Kalit sozlanmagan/yaroqsiz bo'lsa — bu foydalanuvchi aybi emas.
  // Login'ga yubormaymiz (aks holda hamma doim chiqib ketadi);
  // tekshiruvni backend (401/403) baribir bajaradi.
  let key: CryptoKey;
  try {
    key = await getKey();
  } catch (err) {
    console.error("[proxy] JWT_PUBLIC_KEY yaroqsiz (SPKI/PEM kerak):", err);
    return NextResponse.next();
  }

  try {
    await jwtVerify(token, key, {
      algorithms: ["RS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
      clockTolerance: CLOCK_TOLERANCE_SEC,
      requiredClaims: REQUIRED_CLAIMS,
    });
  } catch {
    return toLogin(request);
  }

  // Sessiya bekor qilingan (jti mos emas) / user bloklangan holatlar
  // backend'dan 401/403 bo'lib keladi va sahifa o'zi hal qiladi.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/courses/:slug/lesson/:path*",
    "/courses/:slug/test/:path*",
  ],
};
