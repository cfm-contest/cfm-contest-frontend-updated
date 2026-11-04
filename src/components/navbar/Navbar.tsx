// components/layout/Navbar.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Menu,
  X,
  LogOut,
  User,
  Phone,
  MessageCircle,
  ChevronDown,
  Code2,
  Trophy,
  BookOpen,
  FlaskConical,
  GraduationCap,
  Settings,
  Check,
  Users,
  HelpCircle,
  LifeBuoy,
  ArrowUpRight,
  Headset,
  Mail,
  Send,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  useNavbarStreaks,
  type NavbarStreaks as StreakData,
} from "@/hooks/useNavbarStreaks";
import { NotificationBell } from "../NotificationBell";
import {
  AnimatedBolt,
  AnimatedFlame,
  AnimatedNumber,
  FloatingGain,
  StreakAnimStyles,
  useIncrease,
} from "./StreakIcons";

/* -------------------------------------------------------------------------- */
/*  Config                                                                    */
/* -------------------------------------------------------------------------- */

const navLinks = [
  { href: "/problems", label: "Masalalar", icon: Code2 },
  { href: "/contests", label: "Musobaqalar", icon: Trophy },
  { href: "/courses", label: "Kurslar", icon: GraduationCap },
  { href: "/tests", label: "Testlar", icon: FlaskConical },
  { href: "/faq", label: "FAQ", icon: HelpCircle },
];

/** Yordam — Telegram orqali admin bilan bog'lanish. */
const SUPPORT_URL = "https://t.me/cfm_admin";

type MenuName = "user" | "streak" | "mobile" | null;

const isActivePath = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

const fmt = (n: number) => n.toLocaleString("uz-UZ");

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function useOutsideClick(
  ref: RefObject<HTMLElement | null>,
  onOutside: () => void,
  active: boolean
) {
  useEffect(() => {
    if (!active) return;

    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOutside();
      }
    };

    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);

    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [ref, onOutside, active]);
}

/* -------------------------------------------------------------------------- */
/*  Navbar                                                                    */
/* -------------------------------------------------------------------------- */

export function Navbar() {
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const pathname = usePathname();

  const streaks = useNavbarStreaks(isAuthenticated && !!user);

  const [menu, setMenu] = useState<MenuName>(null);
  const [isContactOpen, setIsContactOpen] = useState(false);

  const userRef = useRef<HTMLDivElement>(null);
  const streakRef = useRef<HTMLDivElement>(null);

  const toggle = (name: Exclude<MenuName, null>) =>
    setMenu((cur) => (cur === name ? null : name));

  const closeMenu = useCallback(() => setMenu(null), []);

  // Sahifa almashganda hamma narsani yopish
  useEffect(() => {
    setMenu(null);
    setIsContactOpen(false);
  }, [pathname]);

  // Tashqariga bosish
  useOutsideClick(userRef, closeMenu, menu === "user");
  useOutsideClick(streakRef, closeMenu, menu === "streak");

  // Escape bilan yopish
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(null);
        setIsContactOpen(false);
      }
    };

    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Mobil menyu yoki modal ochiq bo'lsa sahifa skrolini qulflash
  useEffect(() => {
    if (menu === "mobile" || isContactOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [menu, isContactOpen]);

  // Ekran kengayganda (md+) mobil menyuni yopish
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");

    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setMenu((cur) => (cur === "mobile" ? null : cur));
      }
    };

    mq.addEventListener("change", onChange);

    return () => {
      mq.removeEventListener("change", onChange);
    };
  }, []);

  const handleLogout = () => {
    setMenu(null);
    logout();
  };

  const displayName = user?.fullName || user?.username || "";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white">
      <StreakAnimStyles />

      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:px-4 lg:px-8">
        {/* ------------------------------ Logo ------------------------------ */}

        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          <Image
            src="/cfm_logo.webp"
            alt="CFM"
            width={32}
            height={32}
            className="size-8 rounded-md object-contain"
            priority
          />

          <span className="text-base font-semibold tracking-tight text-slate-900 max-[360px]:hidden">
            CFM Contest
          </span>
        </Link>

        {/* ------------------------ Desktop navigation ----------------------- */}

        <nav
          aria-label="Asosiy menyu"
          className="hidden flex-1 items-center justify-center gap-1 md:flex"
        >
          {navLinks.map((link) => {
            const active = isActivePath(pathname, link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <link.icon className="size-4" strokeWidth={1.5} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* --------------------------- Right section ------------------------- */}

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {isLoading ? (
            <div className="h-8 w-24 animate-pulse rounded-md bg-slate-100" />
          ) : isAuthenticated && user ? (
            <>
              {/* Streak + XP */}

              <div className="relative" ref={streakRef}>
                <StreakButton
                  data={streaks.data}
                  loading={streaks.loading}
                  error={streaks.error}
                  open={menu === "streak"}
                  onClick={() => toggle("streak")}
                />

                {menu === "streak" && streaks.data && (
                  <div
                    id="streak-panel"
                    role="dialog"
                    aria-label="Streak va XP"
                    className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80"
                  >
                    <StreakDetails data={streaks.data} />
                  </div>
                )}
              </div>

              {/* Bildirishnomalar */}

              <NotificationBell />

              {/* Foydalanuvchi dropdown (faqat md+) */}

              <div className="relative hidden md:block" ref={userRef}>
                <button
                  onClick={() => toggle("user")}
                  aria-haspopup="menu"
                  aria-expanded={menu === "user"}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm transition-colors",
                    menu === "user"
                      ? "border-slate-300 bg-slate-50 text-slate-900"
                      : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Avatar name={user.username} className="size-7 text-xs" />

                  <span className="hidden max-w-[110px] truncate text-sm font-medium lg:block">
                    {user.username}
                  </span>

                  <ChevronDown
                    className={cn(
                      "size-3.5 text-slate-400 transition-transform duration-200",
                      menu === "user" && "rotate-180"
                    )}
                  />
                </button>

                {menu === "user" && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                  >
                    <div className="border-b border-slate-100 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={user.username}
                          className="size-9 text-sm"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {displayName}
                          </p>

                          <p className="truncate text-xs text-slate-400">
                            @{user.username}
                          </p>
                        </div>
                      </div>

                      {(user.telegramId || user.phone) && (
                        <div className="mt-2 space-y-1">
                          {user.telegramId && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <MessageCircle className="size-3 text-slate-400" />
                              <span className="tabular-nums">
                                {user.telegramId}
                              </span>
                            </div>
                          )}

                          {user.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Phone className="size-3 text-slate-400" />
                              <span className="tabular-nums">
                                {user.phone}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="p-1">
                      <DropdownItem
                        href={`/user/${user.username}`}
                        icon={<User className="size-4" />}
                        label="Profilim"
                      />

                      <DropdownItem
                        href="/ranks"
                        icon={<Trophy className="size-4" />}
                        label="Daraja & Sovg'alar"
                      />

                      <DropdownItem
                        href="/teams"
                        icon={<Users className="size-4" />}
                        label="Jamoalarim"
                      />

                      <DropdownItem
                        href="/courses"
                        icon={<BookOpen className="size-4" />}
                        label="Kurslarim"
                      />

                      <DropdownItem
                        href="/settings"
                        icon={<Settings className="size-4" />}
                        label="Sozlamalar"
                      />

                      <div className="my-1 border-t border-slate-100" />

                      <DropdownItem
                        href={SUPPORT_URL}
                        external
                        icon={<LifeBuoy className="size-4" />}
                        label="Yordam"
                      />

                      <div className="my-1 border-t border-slate-100" />

                      <button
                        role="menuitem"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                      >
                        <LogOut className="size-4" />
                        Chiqish
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/login"
                className="hidden rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 sm:block"
              >
                Kirish
              </Link>

              <Link
                href="/login"
                className="rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 sm:px-4"
              >
                Boshlash
              </Link>
            </div>
          )}

          {/* Mobil menyu tugmasi */}

          <button
            onClick={() => toggle("mobile")}
            aria-label={
              menu === "mobile" ? "Menyuni yopish" : "Menyuni ochish"
            }
            aria-expanded={menu === "mobile"}
            aria-controls="mobile-menu"
            className="flex size-10 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 md:hidden"
          >
            {menu === "mobile" ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>
        </div>
      </div>

      {/* ------------------------------ Mobil menyu ------------------------- */}

      {menu === "mobile" && (
        <div
          id="mobile-menu"
          className="fixed inset-x-0 bottom-0 top-14 z-40 overflow-y-auto overscroll-contain bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-4">
            {/* Foydalanuvchi kartasi */}

            {isAuthenticated && user && (
              <>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <Avatar name={user.username} className="size-11 text-base" />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {displayName}
                    </p>

                    <p className="truncate text-xs text-slate-400">
                      @{user.username}
                    </p>
                  </div>

                  <Link
                    href="/settings"
                    aria-label="Sozlamalar"
                    className="flex size-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                  >
                    <Settings className="size-5" strokeWidth={1.5} />
                  </Link>
                </div>

                {/* Streak / XP */}

                {streaks.data && (
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <StreakDetails data={streaks.data} />
                  </div>
                )}
              </>
            )}

            {/* Navigatsiya */}

            <nav aria-label="Mobil menyu" className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const active = isActivePath(pathname, link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-3 text-[15px] font-medium transition-colors",
                      active
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <link.icon className="size-5" strokeWidth={1.5} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-slate-100" />

            {isAuthenticated && user ? (
              <div className="flex flex-col gap-1">
                <Link
                  href={`/user/${user.username}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-[15px] font-medium text-slate-600 hover:bg-slate-50"
                >
                  <User className="size-5" strokeWidth={1.5} />
                  Profilim
                </Link>

                <Link
                  href="/ranks"
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-[15px] font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Trophy className="size-5" strokeWidth={1.5} />
                  Daraja & Sovg'alar
                </Link>

                <Link
                  href="/teams"
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-[15px] font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Users className="size-5" strokeWidth={1.5} />
                  Jamoalarim
                </Link>

                <Link
                  href="/courses"
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-[15px] font-medium text-slate-600 hover:bg-slate-50"
                >
                  <BookOpen className="size-5" strokeWidth={1.5} />
                  Kurslarim
                </Link>

                <a
                  href={SUPPORT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-[15px] font-medium text-slate-600 hover:bg-slate-50"
                >
                  <LifeBuoy className="size-5" strokeWidth={1.5} />
                  Yordam
                  <ArrowUpRight className="ml-auto size-4 text-slate-400" />
                </a>

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-[15px] font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut className="size-5" strokeWidth={1.5} />
                  Chiqish
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/login"
                  className="flex items-center justify-center rounded-lg bg-slate-900 py-3 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Boshlash
                </Link>

                <Link
                  href="/login"
                  className="flex items-center justify-center rounded-lg border border-slate-200 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Kirish
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --------------------------- BIZ BILAN BOG'LANISH MODAL --------------------------- */}

      {isContactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            {/* Header */}

            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <Headset className="size-5" />
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Biz bilan bog'lanish
                  </h3>

                  <p className="text-xs text-slate-500">
                    Savol va takliflar uchun yozing
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsContactOpen(false)}
                aria-label="Modalni yopish"
                className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Body */}

            <div className="space-y-3 py-5">
              {/* Gmail */}

              <a
                href="mailto:codingformachinecontest@gmail.com"
                className="group flex items-center gap-4 rounded-xl border border-red-100 bg-red-50/50 p-3.5 transition-all hover:border-red-200 hover:bg-red-50"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white shadow-sm shadow-red-500/20 transition-transform group-hover:scale-105">
                  <Mail className="size-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-red-600/80">
                    Elektron pochta (Gmail)
                  </span>

                  <span className="block truncate text-sm font-semibold text-slate-900">
                    codingformachinecontest@gmail.com
                  </span>
                </div>

                <ArrowUpRight className="size-4 text-red-400 opacity-0 transition-opacity group-hover:opacity-100" />
              </a>

              {/* Telegram */}

              <a
                href="https://t.me/cfm_admin"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 rounded-xl border border-sky-100 bg-sky-50/50 p-3.5 transition-all hover:border-sky-200 hover:bg-sky-50"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white shadow-sm shadow-sky-500/20 transition-transform group-hover:scale-105">
                  <Send className="size-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-sky-600/80">
                    Telegram Admin
                  </span>

                  <span className="block truncate text-sm font-semibold text-slate-900">
                    @cfm_admin
                  </span>
                </div>

                <ArrowUpRight className="size-4 text-sky-400 opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
            </div>

            {/* Footer */}

            <div className="pt-2">
              <button
                onClick={() => setIsContactOpen(false)}
                className="w-full rounded-xl bg-slate-100 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/*  Streak komponentlari                                                      */
/* -------------------------------------------------------------------------- */

function StreakButton({
  data,
  loading,
  error,
  open,
  onClick,
}: {
  data: StreakData | null;
  loading: boolean;
  error: boolean;
  open: boolean;
  onClick: () => void;
}) {
  const streakUp = useIncrease(data?.streak.current);
  const xpUp = useIncrease(data?.xp.total);

  if (error && !data) return null;

  if (!data) {
    return loading ? (
      <div className="h-9 w-16 animate-pulse rounded-md bg-slate-100 motion-reduce:animate-none sm:w-28" />
    ) : null;
  }

  const { streak, xp } = data;

  const atRisk = streak.current > 0 && !streak.doneToday;

  const flameState = streak.doneToday
    ? "lit"
    : atRisk
    ? "risk"
    : "off";

  return (
    <button
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls="streak-panel"
      aria-label={`Streak ${streak.current} kun, ${xp.total} XP`}
      className={cn(
        "flex h-9 items-center gap-0.5 rounded-md border px-1.5 text-sm font-semibold transition-colors",
        open
          ? "border-slate-300 bg-slate-50"
          : "border-transparent hover:border-slate-200 hover:bg-slate-50"
      )}
    >
      <span
        className={cn(
          "flex items-center gap-1 px-1",
          streak.doneToday
            ? "text-orange-600"
            : streak.current > 0
            ? "text-slate-600"
            : "text-slate-400"
        )}
      >
        <span className="relative">
          <AnimatedFlame
            state={flameState}
            burst={streakUp.active}
            burstKey={streakUp.key}
            className="size-[18px]"
          />

          {atRisk && (
            <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full border border-white bg-red-500" />
          )}

          {streakUp.active && (
            <FloatingGain
              key={streakUp.key}
              text={`+${streakUp.delta}`}
              className="text-orange-600"
            />
          )}
        </span>

        <AnimatedNumber
          value={streak.current}
          pop={streakUp.active}
          popKey={streakUp.key}
        />
      </span>

      <span className="hidden items-center gap-1 px-1 text-amber-600 sm:flex">
        <span className="relative">
          <AnimatedBolt
            burst={xpUp.active}
            burstKey={xpUp.key}
            className="size-[18px]"
          />

          {xpUp.active && (
            <FloatingGain
              key={xpUp.key}
              text={`+${xpUp.delta}`}
              className="text-amber-600"
            />
          )}
        </span>

        <AnimatedNumber
          value={xp.total}
          pop={xpUp.active}
          popKey={xpUp.key}
        />
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Streak details                                                            */
/* -------------------------------------------------------------------------- */

function StreakDetails({ data }: { data: StreakData }) {
  const { streak, xp } = data;

  const atRisk = streak.current > 0 && !streak.doneToday;

  return (
    <>
      <div className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full",
              streak.doneToday ? "bg-orange-100" : "bg-slate-100"
            )}
          >
            <AnimatedFlame
              state={streak.doneToday ? "lit" : atRisk ? "risk" : "off"}
              className="size-5"
            />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {streak.current} kunlik streak
            </p>

            <p className="truncate text-xs text-slate-400">
              Eng uzun: {streak.longest} kun
            </p>
          </div>
        </div>

        <div
          className={cn(
            "mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-xs",
            streak.doneToday
              ? "bg-emerald-50 text-emerald-700"
              : atRisk
              ? "bg-red-50 text-red-700"
              : "bg-slate-50 text-slate-500"
          )}
        >
          {streak.doneToday ? (
            <>
              <Check className="size-3.5 shrink-0" />
              Bugungi vazifa bajarildi
            </>
          ) : atRisk ? (
            "Streakni saqlash uchun bugun masala yeching"
          ) : (
            "Masala yechib streakni boshlang"
          )}
        </div>
      </div>

      <div className="border-t border-slate-100 px-4 py-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">
            {xp.levelLabel}
          </p>

          <p className="text-xs text-slate-500">
            Bugun{" "}
            <span className="font-semibold tabular-nums text-amber-600">
              +{fmt(xp.today)} XP
            </span>
          </p>
        </div>

        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-label="Keyingi darajagacha progress"
          aria-valuenow={xp.progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-amber-500 transition-[width] duration-500 motion-reduce:transition-none"
            style={{
              width: `${xp.progress > 0 ? Math.max(xp.progress, 4) : 0}%`,
            }}
          />
        </div>

        <div className="mt-1.5 flex justify-between gap-2 text-xs tabular-nums text-slate-400">
          <span>{fmt(xp.total)} XP</span>

          <span className="text-right">
            {xp.toNext > 0
              ? `Keyingi darajagacha ${fmt(xp.toNext)} XP`
              : "Eng yuqori daraja"}
          </span>
        </div>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Kichik komponentlar                                                       */
/* -------------------------------------------------------------------------- */

function Avatar({
  name,
  className,
}: {
  name?: string | null;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-slate-900 font-medium text-white",
        className
      )}
    >
      {name?.slice(0, 1).toUpperCase() ?? "?"}
    </span>
  );
}

function DropdownItem({
  href,
  icon,
  label,
  external = false,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  external?: boolean;
}) {
  const className =
    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900";

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        role="menuitem"
        className={className}
      >
        <span className="text-slate-400">{icon}</span>
        {label}
        <ArrowUpRight className="ml-auto size-3.5 text-slate-300" />
      </a>
    );
  }

  return (
    <Link href={href} role="menuitem" className={className}>
      <span className="text-slate-400">{icon}</span>
      {label}
    </Link>
  );
}
