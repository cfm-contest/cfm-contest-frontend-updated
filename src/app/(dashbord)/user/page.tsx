"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/**
 * /user — statik yo'l. Foydalanuvchining o'z profiliga (/user/{username})
 * avtomatik yo'naltiradi. Boshqa birovning profilini ko'rish uchun
 * to'g'ridan-to'g'ri /user/{username} manziliga kirish kerak.
 */
export default function OwnProfileRedirectPage() {
  const { isAuthenticated, user, isLoading, loginRequiredRedirect } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      loginRequiredRedirect();
      return;
    }

    router.replace(`/user/${user.username}`);
  }, [isLoading, isAuthenticated, user, router, loginRequiredRedirect]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-[#FAFAF7]">
      <div className="size-8 animate-spin rounded-full border-2 border-[#E9E6DD] border-t-[#D9AE55]" />
      <p className="text-sm text-[#8B877E]">Profilingizga yo'naltirilmoqda...</p>
    </div>
  );
}