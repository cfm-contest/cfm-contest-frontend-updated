"use client";

import { backendRequest } from "@/lib/api/django/backend";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  AlignLeft,
  Camera,
  Check,
  ExternalLink,
  Globe,
  Loader2,
  Phone,
  Share2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { FaTelegram } from "react-icons/fa6";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SOCIALS, normalizeWebsite, socialHref, type SocialMeta } from "@/lib/user/social";

/* ------------------------------------------------------------------ */
/* Konstantalar — backend (ProfileForm) bilan bir xil bo'lishi shart   */
/* ------------------------------------------------------------------ */

const MAX_AVATAR_MB = 10;
const MAX_AVATAR_BYTES = MAX_AVATAR_MB * 1024 * 1024;
const BIO_MAX = 500;
const FIELD_MAX = 300;

/* ------------------------------------------------------------------ */
/* Validatsiya (qat'iy tekshiruv backendda; bu yerda tez qaytarma xato) */
/* ------------------------------------------------------------------ */

const text = (max: number) => z.string().trim().max(max, `Ko'pi bilan ${max} belgi`);
const noSpaces = z
  .string()
  .trim()
  .max(FIELD_MAX, `Ko'pi bilan ${FIELD_MAX} belgi`)
  .refine((v) => !/\s/.test(v), "Bo'sh joy bo'lmasligi kerak");

const schema = z.object({
  bio: z.string().max(BIO_MAX, `Ko'pi bilan ${BIO_MAX} belgi`),
  website: text(FIELD_MAX).refine((v) => !v || normalizeWebsite(v) !== null, "To'g'ri havola kiriting (misol.uz)"),
  telegram: noSpaces,
  github: noSpaces,
  linkedin: noSpaces,
  youtube: noSpaces,
  codeforces: noSpaces,
  leetcode: noSpaces,
  atcoder: noSpaces,
});

type FormValues = z.infer<typeof schema>;

export interface SettingsInitial extends FormValues {
  avatar: string | null;
}

export interface AccountInfo {
  telegramId: number;
  username: string | null;
  fullName: string | null;
  phone: string | null;
}

/* ------------------------------------------------------------------ */
/* Asosiy komponent                                                    */
/* ------------------------------------------------------------------ */

export function SettingsForm({ account, initial }: { account: AccountInfo; initial: SettingsInitial }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const { avatar: initialAvatar, ...initialValues } = initial;

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initialAvatar);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });

  const values = watch();
  const hasChanges = isDirty || avatarFile !== null || removeAvatar;
  const filledSocials = SOCIALS.filter((s) => values[s.key]?.trim()).length;
  const displayName = account.fullName || account.username || `ID ${account.telegramId}`;

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  // Saqlanmagan o'zgarishlar bilan tab yopilsa ogohlantirish
  useEffect(() => {
    if (!hasChanges) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges]);

  function revokeObjectUrl() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFileError("Faqat JPG, PNG yoki WebP rasmlar qabul qilinadi");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setFileError(`Fayl hajmi ${MAX_AVATAR_MB}MB dan oshmasligi kerak`);
      e.target.value = "";
      return;
    }

    setFileError(null);
    revokeObjectUrl();
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setAvatarFile(file);
    setRemoveAvatar(false);
    setPreview(url);
  }

  function handleCancelNewAvatar() {
    revokeObjectUrl();
    setAvatarFile(null);
    setRemoveAvatar(false);
    setPreview(initialAvatar);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleRemoveCurrentAvatar() {
    revokeObjectUrl();
    setAvatarFile(null);
    setRemoveAvatar(true);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDiscard() {
    reset(initialValues);
    handleCancelNewAvatar();
    setServerError(null);
  }

  async function onSubmit(formValues: FormValues) {
    setServerError(null);

    const formData = new FormData();
    // Bo'sh qiymat ham yuboriladi — backend uni "tozalash" deb qabul qiladi
    (Object.keys(formValues) as (keyof FormValues)[]).forEach((k) => {
      formData.append(k, formValues[k].trim());
    });
    if (avatarFile) formData.append("avatar", avatarFile);
    else if (removeAvatar) formData.append("remove_avatar", "1");

    try {
      const res = await backendRequest("/api/user/settings/update", { method: "POST", body: formData });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.detail || "Saqlashda xatolik yuz berdi");

      // Server qiymatlarni normallashtiradi ("@nik" -> "nik", havola -> nik) —
      // formani aynan serverdagi holat bilan to'ldiramiz
      const saved = payload?.profile as Partial<SettingsInitial> | undefined;
      const next: FormValues = { ...formValues };
      if (saved) {
        (Object.keys(next) as (keyof FormValues)[]).forEach((k) => {
          const v = saved[k];
          if (typeof v === "string") next[k] = v;
          else if (v === null) next[k] = "";
        });
        setPreview(saved.avatar ?? null);
      }
      reset(next);
      setAvatarFile(null);
      setRemoveAvatar(false);
      revokeObjectUrl();
      if (fileInputRef.current) fileInputRef.current.value = "";

      toast.success("O'zgarishlar saqlandi");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Saqlashda xatolik yuz berdi";
      setServerError(msg);
      toast.error(msg);
    }
  }

  const heroBtn =
    "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D9AE55] disabled:opacity-60";

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6 pb-28">
      {/* ================= HERO ================= */}
      <header className="relative overflow-hidden rounded-3xl bg-[#121212] p-5 text-white sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-10 -top-24 h-72 w-72 rounded-full opacity-[0.14] blur-3xl"
          style={{ background: "radial-gradient(circle, #D9AE55 0%, transparent 70%)" }}
        />

        <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:gap-7 sm:text-left">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
              aria-label="Avatar tanlash"
              className="group relative block size-24 overflow-hidden rounded-full bg-white/10 ring-4 ring-white/10 transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D9AE55] sm:size-32"
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Avatar" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center text-3xl font-semibold text-white/60 sm:text-4xl">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/45 group-hover:opacity-100">
                <Upload className="size-6 text-white" />
              </span>
            </button>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full bg-[#D9AE55] text-[#121212] ring-4 ring-[#121212] sm:size-9"
            >
              <Camera className="size-4" />
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
              disabled={isSubmitting}
            />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{displayName}</h1>
            {account.username && <p className="mt-0.5 text-white/45">@{account.username}</p>}

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/75">
                <FaTelegram className="size-3.5 text-[#26A5E4]" />
                ID {account.telegramId}
              </span>
              {account.phone && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/75">
                  <Phone className="size-3.5 text-emerald-400" />
                  {account.phone}
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                className={`${heroBtn} bg-[#D9AE55] text-[#121212] hover:bg-[#D9AE55]/90`}
              >
                <Upload className="size-4" /> Rasm yuklash
              </button>

              {avatarFile ? (
                <button
                  type="button"
                  onClick={handleCancelNewAvatar}
                  className={`${heroBtn} border border-white/15 bg-white/[0.06] text-white/80 hover:bg-white/10`}
                >
                  <X className="size-4" /> Bekor qilish
                </button>
              ) : (
                preview && (
                  <button
                    type="button"
                    onClick={handleRemoveCurrentAvatar}
                    disabled={isSubmitting}
                    className={`${heroBtn} border border-white/15 bg-white/[0.06] text-white/80 hover:bg-red-500/20 hover:text-red-200`}
                  >
                    <Trash2 className="size-4" /> O&apos;chirish
                  </button>
                )
              )}

              {account.username && (
                <Link
                  href={`/user/${account.username}`}
                  className={`${heroBtn} border border-white/15 text-white/80 hover:bg-white/10 sm:ml-auto`}
                >
                  Profilni ko&apos;rish <ExternalLink className="size-3.5" />
                </Link>
              )}
            </div>

            <p className="mt-2 text-xs text-white/35">JPG, PNG yoki WebP · {MAX_AVATAR_MB}MB gacha</p>
            {fileError && (
              <p role="alert" className="mt-1 text-xs text-red-300">
                {fileError}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* ================= CONTENT ================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          {/* ---------- Haqida ---------- */}
          <Section
            icon={<AlignLeft className="size-5" />}
            tint="#D9AE55"
            title="Siz haqingizda"
            description="Profilingizda hamma ko'radi."
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="bio">Bio</Label>
                <span
                  className={`text-xs tabular-nums ${values.bio.length > BIO_MAX * 0.9 ? "text-amber-600" : "text-[#9B958A]"}`}
                >
                  {values.bio.length}/{BIO_MAX}
                </span>
              </div>
              <Textarea
                id="bio"
                rows={5}
                maxLength={BIO_MAX}
                disabled={isSubmitting}
                placeholder="Qaysi yo'nalishda o'qiysiz, nimalarga qiziqasiz?"
                className="resize-none"
                aria-invalid={!!errors.bio}
                {...register("bio")}
              />
              {errors.bio && <p className="text-xs text-red-600">{errors.bio.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="website">Veb-sayt</Label>
              <div className="flex items-center gap-2 rounded-xl border border-[#ECEAE3] bg-white px-3 transition focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10">
                <Globe className="size-4 shrink-0 text-emerald-500" />
                <input
                  id="website"
                  type="text"
                  inputMode="url"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={FIELD_MAX}
                  disabled={isSubmitting}
                  placeholder="misol.uz"
                  aria-invalid={!!errors.website}
                  className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#B5AFA1] disabled:opacity-60"
                  {...register("website")}
                />
              </div>
              {errors.website && <p className="text-xs text-red-600">{errors.website.message}</p>}
            </div>
          </Section>

          {/* ---------- Ijtimoiy tarmoqlar ---------- */}
          <Section
            icon={<Share2 className="size-5" />}
            tint="#26A5E4"
            title="Ijtimoiy tarmoqlar"
            description="Foydalanuvchi nomini yozing — havola o'zi tuziladi. Bo'sh qoldirsangiz, o'chiriladi."
            badge={`${filledSocials}/${SOCIALS.length} ulangan`}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {SOCIALS.map((meta) => (
                <SocialField
                  key={meta.key}
                  meta={meta}
                  value={values[meta.key] ?? ""}
                  error={errors[meta.key]?.message}
                  disabled={isSubmitting}
                  register={register}
                />
              ))}
            </div>
          </Section>

          {serverError && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {serverError}
            </p>
          )}
        </div>

        {/* ---------- Jonli ko'rinish ---------- */}
        <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <LivePreview
            name={displayName}
            username={account.username}
            avatar={preview}
            bio={values.bio}
            website={values.website}
            values={values}
          />
        </aside>
      </div>

      {/* ================= SAQLASH PANELI ================= */}
      <div
        className={`fixed inset-x-0 bottom-0 z-30 border-t border-[#ECEAE3] bg-white/90 backdrop-blur transition-transform duration-200 ${
          hasChanges ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-hidden={!hasChanges}
        inert={!hasChanges}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <p className="hidden text-sm text-[#8C877D] sm:block">Saqlanmagan o&apos;zgarishlar bor</p>
          <div className="flex w-full gap-2 sm:w-auto">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={isSubmitting}
              className="h-10 flex-1 rounded-xl border border-[#E3DFD2] bg-white px-5 text-sm font-medium text-[#555149] transition hover:bg-[#FAFAF7] disabled:opacity-60 sm:flex-none"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !!fileError || !hasChanges}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#121212] px-6 text-sm font-medium text-white transition hover:bg-[#2a2a2a] disabled:opacity-60 sm:flex-none"
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Saqlash
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Bo'lim kartasi                                                      */
/* ------------------------------------------------------------------ */

function Section({
  icon,
  tint,
  title,
  description,
  badge,
  children,
}: {
  icon: React.ReactNode;
  tint: string;
  title: string;
  description?: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#ECEAE3] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${tint}1F`, color: tint }}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-[#121212]">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-[#8C877D]">{description}</p>}
        </div>
        {badge && (
          <span className="shrink-0 rounded-full bg-[#F5F3EC] px-2.5 py-1 text-xs font-medium text-[#706C63]">
            {badge}
          </span>
        )}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Ijtimoiy tarmoq maydoni                                             */
/* ------------------------------------------------------------------ */

function SocialField({
  meta,
  value,
  error,
  disabled,
  register,
}: {
  meta: SocialMeta;
  value: string;
  error?: string;
  disabled: boolean;
  register: UseFormRegister<FormValues>;
}) {
  const Icon = meta.icon;
  const href = socialHref(meta, value);
  const id = `social-${meta.key}`;

  return (
    <div
      className={`rounded-2xl border bg-white p-3.5 transition focus-within:ring-4 focus-within:ring-black/5 ${
        error ? "border-red-300" : "border-[#ECEAE3] focus-within:border-(--brand)"
      }`}
      style={{ "--brand": meta.color } as React.CSSProperties}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}
        >
          <Icon className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <Label htmlFor={id} className="text-sm font-semibold text-[#181818]">
            {meta.label}
          </Label>
          <p className="truncate text-xs text-[#9B958A]">
            {meta.prefix}
            <span className={value.trim() ? "text-[#555149]" : ""}>{value.trim() || meta.placeholder}</span>
          </p>
        </div>

        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${meta.label} havolasini ochish`}
            title="Havolani tekshirish"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100"
          >
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>

      <input
        id={id}
        type="text"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={FIELD_MAX}
        disabled={disabled}
        placeholder={meta.placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className="mt-3 h-10 w-full rounded-xl border border-[#ECEAE3] bg-[#FAFAF7] px-3 text-sm outline-none transition placeholder:text-[#B5AFA1] focus:bg-white disabled:opacity-60"
        {...register(meta.key)}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Profilning jonli ko'rinishi                                         */
/* ------------------------------------------------------------------ */

function LivePreview({
  name,
  username,
  avatar,
  bio,
  website,
  values,
}: {
  name: string;
  username: string | null;
  avatar: string | null;
  bio: string;
  website: string;
  values: FormValues;
}) {
  const site = normalizeWebsite(website);
  const dots = SOCIALS.map((m) => ({ meta: m, href: socialHref(m, values[m.key]) })).filter(
    (d): d is { meta: SocialMeta; href: string } => d.href !== null
  );

  return (
    <div className="overflow-hidden rounded-3xl border border-[#ECEAE3] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between px-5 pt-4">
        <h2 className="text-sm font-semibold text-[#121212]">Profilda shunday ko&apos;rinadi</h2>
        <span className="flex items-center gap-1.5 text-xs text-[#9B958A]">
          <span className="size-1.5 rounded-full bg-emerald-500" /> jonli
        </span>
      </div>

      <div className="m-4 rounded-2xl bg-[#121212] p-5 text-center text-white">
        <div className="mx-auto size-20 overflow-hidden rounded-full bg-white/10 ring-4 ring-white/10">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-2xl font-semibold text-white/60">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <p className="mt-3 truncate text-lg font-semibold">{name}</p>
        {username && <p className="text-sm text-white/40">@{username}</p>}

        {bio.trim() ? (
          <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-white/60">{bio.trim()}</p>
        ) : (
          <p className="mt-3 text-sm italic text-white/25">Bio hali yozilmagan</p>
        )}

        {(dots.length > 0 || site) && (
          <ul className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {site && (
              <li>
                <span
                  title="Veb-sayt"
                  className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-emerald-400"
                >
                  <Globe className="size-4" />
                </span>
              </li>
            )}
            {dots.map(({ meta }) => {
              const Icon = meta.icon;
              return (
                <li key={meta.key}>
                  <span
                    title={meta.label}
                    style={{ color: meta.onDark ?? meta.color }}
                    className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05]"
                  >
                    <Icon className="size-4" />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="px-5 pb-4 text-xs leading-relaxed text-[#9B958A]">
        Rasm, bio va havolalar saqlangandan keyingina boshqalarga ko&apos;rinadi.
      </p>
    </div>
  );
}
