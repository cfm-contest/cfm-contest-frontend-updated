"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Bell,
  CheckCircle2,
  XCircle,
  Trash2,
  Loader2,
  CheckCheck,
  Trophy,
  BookOpen,
  Info,
  Zap,
  Clock,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useSSE } from "@/context/SSEContext";
import {
  getNotifications,
  markNotificationsRead,
  deleteNotification,
  clearAllNotifications,
} from "@/lib/problems/api";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  submission: <CheckCircle2 className="size-4" />,
  contest_start: <Trophy className="size-4" />,
  contest_end: <Clock className="size-4" />,
  achievement: <Zap className="size-4" />,
  course: <BookOpen className="size-4" />,
  system: <Info className="size-4" />,
};

const TYPE_COLORS: Record<string, string> = {
  submission: "bg-emerald-100 text-emerald-600",
  contest_start: "bg-blue-100 text-blue-600",
  contest_end: "bg-amber-100 text-amber-600",
  achievement: "bg-purple-100 text-purple-600",
  course: "bg-cyan-100 text-cyan-600",
  system: "bg-neutral-100 text-neutral-600",
};

type LiveNotification = {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  link?: string;
};

type FollowerEvent = {
  type?: string;
  u?: {
    ph?: string | null;
    u?: string | number | null;
    f_n?: string | null;
  };
};

type NotificationData = {
  data?: LiveNotification[];
  unread_count?: number;
  count?: number;
};

function relativeTime(ts: string): string {
  const then = new Date(ts).getTime();

  if (Number.isNaN(then)) return "";

  const sec = Math.max(0, Math.floor((Date.now() - then) / 1000));

  if (sec < 10) return "Hozir";
  if (sec < 60) return `${sec} soniya`;

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} daq`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} soat`;

  return `${Math.floor(hr / 24)} kun`;
}

export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const { subscribe } = useSSE();

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [liveNotifications, setLiveNotifications] = useState<
    LiveNotification[]
  >([]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const nextLiveId = useRef(-1);

  const {
    data,
    isLoading,
    error,
    mutate,
  } = useSWR<NotificationData>(
    isAuthenticated ? "notifications" : null,
    () => getNotifications({ limit: 30 }),
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
    }
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // SSE orqali kelgan yangi obunachi hodisasini qabul qilish.
  useEffect(() => {
    if (!isAuthenticated) {
      setLiveNotifications([]);
      return;
    }

    const unsubscribe = subscribe("notification", (rawEvent: unknown) => {
      const event = rawEvent as FollowerEvent;

      if (event?.type !== "new_follower") return;

      const follower = event.u;

      const followerName = String(
        follower?.f_n ||
          follower?.u ||
          "Yangi foydalanuvchi"
      );

      const username = follower?.u
        ? String(follower.u)
        : "";

      // Agar backend username yuborsa, profilga o'tish havolasi.
      // Profil routingiz boshqacha bo'lsa, shu URLni moslang.
      const link = username.startsWith("@")
        ? `/users/${encodeURIComponent(username.slice(1))}`
        : username && !/^\d+$/.test(username)
          ? `/users/${encodeURIComponent(username)}`
          : undefined;

      const notification: LiveNotification = {
        id: nextLiveId.current--,
        type: "system",
        title: "Yangi obunachi",
        message: `${followerName} sizga obuna bo'ldi.`,
        is_read: false,
        created_at: new Date().toISOString(),
        link,
      };

      setLiveNotifications((previous) => [
        notification,
        ...previous,
      ]);
    });

    return unsubscribe;
  }, [isAuthenticated, subscribe]);

  // Dropdown tashqarisiga bosilganda yopish.
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, []);

  // SSE xabarlari birinchi ko'rsatiladi.
  const backendNotifications = data?.data ?? [];
  const notifications = [
    ...liveNotifications,
    ...backendNotifications,
  ];

  const liveUnreadCount = liveNotifications.filter(
    (notification) => !notification.is_read
  ).length;

  const unreadCount =
    (data?.unread_count ?? 0) + liveUnreadCount;

  const handleMarkRead = useCallback(
    async (event: React.MouseEvent, id: number) => {
      event.preventDefault();
      event.stopPropagation();

      // Manfiy ID — faqat frontendda mavjud vaqtinchalik xabar.
      if (id < 0) {
        setLiveNotifications((previous) =>
          previous.map((notification) =>
            notification.id === id
              ? { ...notification, is_read: true }
              : notification
          )
        );
        return;
      }

      try {
        await markNotificationsRead([id]);
        await mutate();
      } catch {
        void mutate();
      }
    },
    [mutate]
  );

  const handleMarkAllRead = useCallback(
    async (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      setLiveNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );

      try {
        if ((data?.unread_count ?? 0) > 0) {
          await markNotificationsRead();
          await mutate();
        }
      } catch {
        void mutate();
      }
    },
    [data, mutate]
  );

  const handleDelete = useCallback(
    async (event: React.MouseEvent, id: number) => {
      event.preventDefault();
      event.stopPropagation();

      if (id < 0) {
        setLiveNotifications((previous) =>
          previous.filter((notification) => notification.id !== id)
        );
        return;
      }

      try {
        await deleteNotification(id);
        await mutate();
      } catch {
        void mutate();
      }
    },
    [mutate]
  );

  const handleClearAll = useCallback(
    async (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      setLiveNotifications([]);

      try {
        if ((data?.count ?? backendNotifications.length) > 0) {
          await clearAllNotifications();
          await mutate();
        }
      } catch {
        void mutate();
      }
    },
    [data, backendNotifications.length, mutate]
  );

  if (!mounted || !isAuthenticated) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition-all",
          open
            ? "bg-orange-50 text-orange-600"
            : "hover:bg-neutral-100 hover:text-neutral-700"
        )}
        aria-label="Bildirishnomalar"
        aria-expanded={open}
      >
        <Bell
          className={cn(
            "size-[18px]",
            unreadCount > 0 && "fill-current"
          )}
        />

        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-neutral-100 bg-gradient-to-r from-orange-50/50 to-white px-5 py-3.5">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                Bildirishnomalar
              </h3>

              <p className="text-[11px] text-neutral-500">
                {unreadCount > 0
                  ? `${unreadCount} ta o'qilmagan xabar`
                  : "Barchasi o'qildi"}
              </p>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                  title="Barchasini o'qilgan deb belgilash"
                >
                  <CheckCheck className="size-3.5" />
                  <span className="hidden sm:inline">O'qildi</span>
                </button>
              )}

              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-500"
                  title="Hammasini tozalash"
                  aria-label="Hammasini tozalash"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[28rem] overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12">
                <Loader2 className="size-6 animate-spin text-orange-400" />
                <p className="text-xs text-neutral-400">
                  Yuklanmoqda...
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <XCircle className="size-8 text-red-300" />
                <p className="text-xs text-red-500">
                  Yuklashda xatolik
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-neutral-300">
                <div className="flex size-14 items-center justify-center rounded-full bg-neutral-50">
                  <Bell className="size-7 opacity-40" />
                </div>

                <div className="text-center">
                  <p className="text-sm font-medium text-neutral-500">
                    Hali xabar yo'q
                  </p>
                  <p className="mt-0.5 text-[11px] text-neutral-400">
                    Yangi obunachi va boshqa xabarlar shu yerda chiqadi
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-neutral-50">
                {notifications.map((notification) => (
                  <NotificationRow
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkRead}
                    onDelete={handleDelete}
                    onClose={() => setOpen(false)}
                  />
                ))}
              </div>
            )}
          </div>

          {(data?.count ?? 0) > 0 && (
            <div className="border-t border-neutral-100 bg-neutral-50/50 px-4 py-2.5 text-center">
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-orange-600 hover:text-orange-700"
              >
                Barcha bildirishnomalar →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  notification: n,
  onMarkRead,
  onDelete,
  onClose,
}: {
  notification: LiveNotification;
  onMarkRead: (event: React.MouseEvent, id: number) => void;
  onDelete: (event: React.MouseEvent, id: number) => void;
  onClose: () => void;
}) {
  const icon = TYPE_ICONS[n.type] || TYPE_ICONS.system;
  const colorClass = TYPE_COLORS[n.type] || TYPE_COLORS.system;

  const content = (
    <div
      className={cn(
        "group relative flex items-start gap-3 px-5 py-3.5 transition-colors",
        !n.is_read ? "bg-orange-50/30" : "hover:bg-neutral-50"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
          colorClass
        )}
      >
        {icon}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm leading-snug",
              !n.is_read
                ? "font-semibold text-neutral-900"
                : "font-medium text-neutral-600"
            )}
          >
            {n.title}
          </p>

          <span className="shrink-0 text-[10px] tabular-nums text-neutral-400">
            {relativeTime(n.created_at)}
          </span>
        </div>

        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-neutral-500">
          {n.message}
        </p>

        <div className="mt-2 flex items-center gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          {!n.is_read && (
            <button
              type="button"
              onClick={(event) => onMarkRead(event, n.id)}
              className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-orange-600 hover:bg-orange-50"
            >
              <CheckCheck className="size-3" />
              O'qildi
            </button>
          )}

          <button
            type="button"
            onClick={(event) => onDelete(event, n.id)}
            className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-neutral-400 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 className="size-3" />
            O'chirish
          </button>
        </div>
      </div>

      {!n.is_read && (
        <span className="absolute right-4 top-4 size-2 rounded-full bg-orange-500 ring-2 ring-white" />
      )}
    </div>
  );

  if (n.link) {
    return (
      <Link href={n.link} onClick={onClose} className="block">
        {content}
      </Link>
    );
  }

  return <div>{content}</div>;
}
