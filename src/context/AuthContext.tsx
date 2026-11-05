"use client";
// context/AuthContext.tsx
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AuthUser } from "@/lib/types";
import { AUTH_API_ENDPOINT } from "@/config/defaults";
import { safeNext } from "@/lib/auth/safe-next";

type AuthContextType = {
  isAuthenticated: boolean;
  user: AuthUser | null;
  isLoading: boolean;
  login: (user: AuthUser) => void;
  logout: () => Promise<void>;
  loginRequiredRedirect: () => void;
  clearLocalAuth: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

const LOGIN_REQUIRED_URL = "/login";
const LOCAL_STORAGE_KEY = "is-logged-in";
const LOCAL_USER_KEY = "auth-user";

function getAuthEndpoint() {
  return (
    process.env.NEXT_PUBLIC_AUTH_API_ENDPOINT ||
    AUTH_API_ENDPOINT ||
    "https://auth.cfmcontest.uz"
  );
}

// DIQQAT: localStorage faqat "optimistik" holat (tezkor UI uchun).
// Haqiqiy manba — httpOnly cookie. Shuning uchun mount bo'lganda
// backend'dan /user orqali tekshiramiz va 401 kelsa localStorage'ni tozalaymiz.

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const clearLocalAuth = useCallback(() => {
    setIsAuthenticated(false);
    setUser(null);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, "0");
      localStorage.removeItem(LOCAL_USER_KEY);
    } catch {
      // ignore
    }
  }, []);

  // localStorage is only available in the browser after hydration.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false;

    const storedAuthStatus = localStorage.getItem(LOCAL_STORAGE_KEY);
    const storedUser = localStorage.getItem(LOCAL_USER_KEY);

    // Login sahifasiga ?reason=expired bilan kelgan bo'lsak, server
    // sessiya yaroqsiz degan: localStorage'ga ishonmaymiz.
    const expired =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("reason") === "expired";

    if (expired) {
      localStorage.setItem(LOCAL_STORAGE_KEY, "0");
      localStorage.removeItem(LOCAL_USER_KEY);
      setIsLoading(false);
      return;
    }

    if (storedAuthStatus === "1" && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      } catch {
        localStorage.removeItem(LOCAL_USER_KEY);
        localStorage.setItem(LOCAL_STORAGE_KEY, "0");
      }

      // Fon rejimida haqiqiy holatni tekshiramiz (cookie bilan)
      fetch(`${getAuthEndpoint()}/user`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      })
        .then((res) => {
          if (cancelled) return;
          if (res.status === 401 || res.status === 403) clearLocalAuth();
        })
        .catch(() => {
          // tarmoq xatosi: holatni o'zgartirmaymiz
        });
    }

    setIsLoading(false);
    return () => {
      cancelled = true;
    };
  }, [clearLocalAuth]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const login = (userData: AuthUser) => {
    const safeUser: AuthUser = {
      ...userData,
      username:
        userData.username?.trim() ||
        String(userData.telegramId ?? userData.id),
    };

    setIsAuthenticated(true);
    setUser(safeUser);

    localStorage.setItem(LOCAL_STORAGE_KEY, "1");
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(safeUser));

    const redirectTo = safeNext(
      searchParams.get("next"),
      `/user/${safeUser.username}`
    );

    // MUHIM: Next.js client navigation emas, haqiqiy browser navigation
    // (yangi cookie bilan server component'lar qayta render bo'lishi uchun).
    window.location.assign(redirectTo);
  };

  const logout = async () => {
    try {
      await fetch(`${getAuthEndpoint()}/logout`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
    } catch (error) {
      console.error("Logout so'rovida xatolik:", error);
    } finally {
      // Backend so'rovi muvaffaqiyatsiz bo'lsa ham, frontend holatini tozalaymiz.
      clearLocalAuth();
      window.location.assign(LOGIN_REQUIRED_URL);
    }
  };

  const loginRequiredRedirect = () => {
    clearLocalAuth();
    const target =
      pathname === LOGIN_REQUIRED_URL
        ? LOGIN_REQUIRED_URL
        : `${LOGIN_REQUIRED_URL}?next=${encodeURIComponent(pathname)}&reason=expired`;
    router.replace(target);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        isLoading,
        login,
        logout,
        loginRequiredRedirect,
        clearLocalAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth faqat AuthProvider ichida ishlatilishi kerak");
  }
  return context;
}
