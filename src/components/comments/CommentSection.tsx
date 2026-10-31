"use client"

/**
 * Universal komment bo'limi. Istalgan joyda:
 *   <CommentSection target="test-analysis" targetId={analysis.id} />
 * Backend bilan to'g'ridan-to'g'ri, cookie orqali ishlaydi (lib/api/backend.ts).
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import {
  DEFAULT_EMOJI_PICKER_I18N,
  EmojiPicker,
  EmojiPickerCategories,
  EmojiPickerContent,
  EmojiPickerFooter,
  EmojiPickerHeader,
  EmojiPickerList,
  EmojiPickerPreview,
  EmojiPickerSearch,
  EmojiPickerSkinTone,
  EmojiPickerTrigger,
  EmojiPickerValue,
  findEmoji,
  getEmojiValue,
  useEmojiPicker,
  type EmojiPickerEmoji,
  type EmojiPickerSkinTone as SkinTone,
} from "@/components/reui/emoji-picker"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Item, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  ImagePlusIcon,
  Loader2Icon,
  PencilIcon,
  ReplyIcon,
  SendIcon,
  SmilePlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { backendFetch, mediaUrl } from "@/lib/api/django/backend"

/* ------------------------------------------------------------------ */
/* Turlar                                                              */
/* ------------------------------------------------------------------ */
type Reaction = { emoji: string; label: string; count: number; mine: boolean; people: string[] }
type CommentT = {
  id: number
  parent: number | null
  author: { id: number; name: string; avatar: string | null }
  body: string
  images: { id: number; url: string }[]
  reactions: Reaction[]
  replies: CommentT[]
  is_edited: boolean
  is_deleted: boolean
  can_edit: boolean
  can_delete: boolean
  created_at: string
}
type Page = { items: CommentT[]; hn: boolean; no: number | null; w: boolean }

const PAGE = 20
const MAX_IMAGES = 4
const TONES = DEFAULT_EMOJI_PICKER_I18N.labels.skinTones
const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "🙏", "👀"]

const labelOf = (emoji: EmojiPickerEmoji, tone: SkinTone) =>
  tone > 0 && emoji.skins ? `${emoji.label}, ${TONES[tone].toLowerCase()} skin tone` : emoji.label

const initials = (name: string) =>
  name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?"

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("uz-UZ", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })

function namesOf(r: Reaction) {
  const names = r.mine ? [...r.people, "siz"] : r.people
  if (names.length <= 1) return names[0] ?? ""
  return `${names.slice(0, -1).join(", ")} va ${names[names.length - 1]}`
}

/** Reaksiyam almashadi / olib tashlanadi (serverdagi mantiq bilan bir xil) */
function switchMyReaction(list: Reaction[], emoji: string, label: string): Reaction[] {
  const wasSame = list.some((r) => r.mine && r.emoji === emoji)

  // avval mening eski reaksiyamni olib tashlaymiz
  const rest = list
    .map((r) => (r.mine ? { ...r, count: r.count - 1, mine: false } : r))
    .filter((r) => r.count > 0)

  if (wasSame) return rest // o'z reaksiyam ustiga bosildi — faqat olib tashlash

  const hit = rest.find((r) => r.emoji === emoji)
  if (hit) return rest.map((r) => (r === hit ? { ...r, count: r.count + 1, mine: true } : r))
  return [...rest, { emoji, label, count: 1, mine: true, people: [] }]
}

/** Daraxtdan kommentni topish (ildiz yoki javob) */
function findComment(list: CommentT[], id: number): CommentT | undefined {
  for (const c of list) {
    if (c.id === id) return c
    const hit = findComment(c.replies, id)
    if (hit) return hit
  }
  return undefined
}

/** Daraxtda bitta kommentni yangilash (ildiz yoki javob) */
function patchTree(list: CommentT[], id: number, fn: (c: CommentT) => CommentT): CommentT[] {
  return list.map((c) =>
    c.id === id ? fn(c) : c.replies.length ? { ...c, replies: patchTree(c.replies, id, fn) } : c
  )
}

/* ------------------------------------------------------------------ */
/* Tez reaksiyalar (picker ichida)                                     */
/* ------------------------------------------------------------------ */
function QuickReactions({ reactions }: { reactions: Reaction[] }) {
  const { emojis, skinTone, select } = useEmojiPicker()
  return (
    <div
      role="group"
      aria-label="Tez reaksiyalar"
      className="grid auto-cols-(--emoji-picker-cell) grid-flow-col justify-start justify-items-center px-(--emoji-picker-gutter) pt-(--emoji-picker-padding)"
    >
      {QUICK_REACTIONS.map((glyph) => {
        const emoji = findEmoji(emojis, glyph)
        const value = emoji ? getEmojiValue(emoji, skinTone) : glyph
        const mine = reactions.some((r) => r.mine && r.emoji === value)
        return (
          <Button
            key={glyph}
            variant={mine ? "secondary" : "ghost"}
            size="icon-sm"
            aria-pressed={mine}
            aria-label={emoji ? labelOf(emoji, skinTone) : glyph}
            disabled={!emoji}
            onClick={() => emoji && select(emoji)}
          >
            <span aria-hidden="true" className="text-(length:--emoji-picker-emoji) leading-none">
              <EmojiPickerValue value={value} />
            </span>
          </Button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Reaksiyalar qatori                                                  */
/* ------------------------------------------------------------------ */
function ReactionBar({
  reactions,
  onToggle,
}: {
  reactions: Reaction[]
  onToggle: (emoji: string, label: string) => void
}) {
  const id = useId()
  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-1.5">
                  {reactions.map((r) => (
            <Tooltip key={r.emoji}>
              <TooltipTrigger asChild>
                <Button
                  variant={r.mine ? "default" : "secondary"}
                  size="sm"
                  aria-pressed={r.mine}
                  aria-label={`${r.label}, ${r.count} ta reaksiya`}
                  aria-describedby={`${id}-${r.emoji}`}
                  onClick={() => onToggle(r.emoji, r.label)}
                >
                  <span aria-hidden="true" className="text-sm leading-none">
                    {r.emoji}
                  </span>
                  <span aria-hidden="true" className="tabular-nums">
                    {r.count}
                  </span>
                  <span id={`${id}-${r.emoji}`} hidden>
                    {namesOf(r)} — {r.label}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {namesOf(r) || r.label}
              </TooltipContent>
            </Tooltip>
          ))}
        <EmojiPicker
          value={null}
          aria-label="Reaksiya qo'shish"
          onEmojiSelect={({ value, emoji, skinTone }) => onToggle(value, labelOf(emoji, skinTone))}
        >
          <EmojiPickerTrigger variant="secondary" size="icon-sm" title="Reaksiya qo'shish">
            <SmilePlusIcon aria-hidden="true" />
          </EmojiPickerTrigger>
          <EmojiPickerContent side="bottom" align="start" sideOffset={12}>
            <QuickReactions reactions={reactions} />
            <EmojiPickerHeader><EmojiPickerSearch /></EmojiPickerHeader>
            <EmojiPickerCategories />
            <EmojiPickerList />
            <EmojiPickerFooter>
              <EmojiPickerPreview />
              <EmojiPickerSkinTone />
            </EmojiPickerFooter>
          </EmojiPickerContent>
        </EmojiPicker>
      </div>
    </TooltipProvider>
  )
}

/* ------------------------------------------------------------------ */
/* Yozish maydoni (matn + rasm)                                        */
/* ------------------------------------------------------------------ */
function Composer({
  placeholder,
  initialBody = "",
  allowImages = true,
  autoFocus,
  submitLabel = "Yuborish",
  onSubmit,
  onCancel,
}: {
  placeholder: string
  initialBody?: string
  allowImages?: boolean
  autoFocus?: boolean
  submitLabel?: string
  onSubmit: (body: string, files: File[]) => Promise<void>
  onCancel?: () => void
}) {
  const [body, setBody] = useState(initialBody)
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Faqat files o'zgarganda yaratiladi va tozalanadi (har renderda emas)
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews])

  const addFiles = (list: FileList | null) => {
    if (!list) return
    const picked = Array.from(list).filter((f) => f.type.startsWith("image/"))
    setFiles((prev) => [...prev, ...picked].slice(0, MAX_IMAGES))
  }

  const canSend = !busy && (body.trim().length > 0 || files.length > 0)

  const submit = async () => {
    if (!canSend) return
    setBusy(true)
    setError("")
    try {
      await onSubmit(body.trim(), files)
      setBody("")
      setFiles([])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={body}
        autoFocus={autoFocus}
        placeholder={placeholder}
        maxLength={2000}
        rows={2}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit()
        }}
        onPaste={(e) => {
          if (allowImages && e.clipboardData.files.length) addFiles(e.clipboardData.files)
        }}
      />
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((src, i) => (
            <div key={src} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="size-16 rounded-md border object-cover" />
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                aria-label="Rasmni olib tashlash"
                className="absolute -top-2 -right-2 size-5 rounded-full"
                onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
              >
                <XIcon className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
      <div className="flex items-center gap-2">
        {allowImages && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              hidden
              onChange={(e) => {
                addFiles(e.target.files)
                e.target.value = ""
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={files.length >= MAX_IMAGES}
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlusIcon aria-hidden="true" /> Rasm
            </Button>
          </>
        )}
        <span className="text-muted-foreground ml-auto text-xs tabular-nums">{body.length}/2000</span>
        {onCancel && <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Bekor</Button>}
        <Button type="button" size="sm" disabled={!canSend} onClick={submit}>
          {busy ? <Loader2Icon className="animate-spin" /> : <SendIcon aria-hidden="true" />} {submitLabel}
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Bitta komment                                                       */
/* ------------------------------------------------------------------ */
function ImageGrid({ images }: { images: CommentT["images"] }) {
  if (!images.length) return null
  return (
    <div className={`grid gap-2 pt-1 ${images.length === 1 ? "max-w-xs grid-cols-1" : "max-w-md grid-cols-2"}`}>
      {images.map((img) => (
        <a key={img.id} href={mediaUrl(img.url)} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaUrl(img.url)}
            alt="Komment rasmi"
            loading="lazy"
            className="aspect-video w-full rounded-md border object-cover"
          />
        </a>
      ))}
    </div>
  )
}

function CommentItem({
  comment,
  canComment,
  isReply = false,
  onReact,
  onReply,
  onEdit,
  onDelete,
}: {
  comment: CommentT
  canComment: boolean
  isReply?: boolean
  onReact: (id: number, emoji: string, label: string) => void
  onReply: (parentId: number, body: string, files: File[]) => Promise<void>
  onEdit: (id: number, body: string) => Promise<void>
  onDelete: (id: number) => Promise<void>
}) {
  const [replying, setReplying] = useState(false)
  const [editing, setEditing] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      <Item variant="outline" className={isReply ? "bg-muted/30" : ""}>
        <ItemMedia className="self-start">
          <Avatar>
            {comment.author.avatar && <AvatarImage src={mediaUrl(comment.author.avatar)} alt="" />}
            <AvatarFallback>{initials(comment.author.name)}</AvatarFallback>
          </Avatar>
        </ItemMedia>
        <ItemContent>
          <ItemTitle>
            {comment.author.name}
            <span aria-hidden="true" className="bg-muted-foreground/40 size-1 shrink-0 rounded-full" />
            <span className="text-muted-foreground font-normal">{fmt(comment.created_at)}</span>
            {comment.is_edited && !comment.is_deleted && (
              <span className="text-muted-foreground text-xs font-normal">(tahrirlangan)</span>
            )}
          </ItemTitle>

          {comment.is_deleted ? (
            <p className="text-muted-foreground italic">Bu komment o&apos;chirilgan.</p>
          ) : editing ? (
            <Composer
              placeholder="Kommentni tahrirlash"
              initialBody={comment.body}
              allowImages={false}
              submitLabel="Saqlash"
              autoFocus
              onCancel={() => setEditing(false)}
              onSubmit={async (body) => {
                await onEdit(comment.id, body)
                setEditing(false)
              }}
            />
          ) : (
            <>
              {comment.body && <p className="text-pretty whitespace-pre-wrap">{comment.body}</p>}
              <ImageGrid images={comment.images} />
            </>
          )}

          {!comment.is_deleted && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              <ReactionBar
                reactions={comment.reactions}
                onToggle={(emoji, label) => onReact(comment.id, emoji, label)}
              />
              {canComment && (
                <Button variant="ghost" size="sm" onClick={() => setReplying((v) => !v)}>
                  <ReplyIcon aria-hidden="true" /> Javob
                </Button>
              )}
              {comment.can_edit && (
                <Button variant="ghost" size="icon-sm" aria-label="Tahrirlash" onClick={() => setEditing(true)}>
                  <PencilIcon aria-hidden="true" />
                </Button>
              )}
              {comment.can_delete && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="O'chirish"
                  onClick={() => confirm("Kommentni o'chirasizmi?") && onDelete(comment.id)}
                >
                  <Trash2Icon aria-hidden="true" />
                </Button>
              )}
            </div>
          )}
        </ItemContent>
      </Item>

      {replying && (
        <div className="pl-6 sm:pl-12">
          <Composer
            placeholder={`${comment.author.name} ga javob`}
            autoFocus
            onCancel={() => setReplying(false)}
            onSubmit={async (body, files) => {
              await onReply(comment.id, body, files)
              setReplying(false)
            }}
          />
        </div>
      )}

      {comment.replies.length > 0 && (
        <div className="border-border flex flex-col gap-3 border-l-2 pl-4 sm:ml-6">
          {comment.replies.map((r) => (
            <CommentItem
              key={r.id}
              comment={r}
              isReply
              canComment={canComment}
              onReact={onReact}
              // Backend baribir ildiz kommentga bog'laydi (1 daraja)
              onReply={(_, body, files) => onReply(comment.id, body, files)}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Asosiy komponent                                                    */
/* ------------------------------------------------------------------ */
export function CommentSection({
  target,
  targetId,
  canComment = true,
  title = "Kommentlar",
}: {
  target: string
  targetId: string | number
  canComment?: boolean
  title?: string
}) {
  const titleId = useId()
  const [comments, setComments] = useState<CommentT[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [next, setNext] = useState<number | null>(null)
  const [canWrite, setCanWrite] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(
    async (offset = 0) => {
      try {
        const qs = new URLSearchParams({
          target,
          id: String(targetId),
          limit: String(PAGE),
          offset: String(offset),
        })
        const res = await backendFetch<Page>(`/comments/?${qs}`)
        setComments((prev) =>
          offset === 0
            ? res.items
            : // yangi komment qo'shilganda offset siljiydi — dublikatlarni tashlaymiz
              [...prev, ...res.items.filter((i) => !prev.some((p) => p.id === i.id))]
        )
        setNext(res.no)
        setCanWrite(res.w)
        setError("")
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [target, targetId]
  )

  useEffect(() => {
    setLoading(true)
    setComments([])
    setNext(null)
    load()
  }, [load])

  const writable = canComment && canWrite

  const create = async (body: string, files: File[], parent?: number) => {
    const fd = new FormData()
    fd.set("target", target)
    fd.set("id", String(targetId))
    fd.set("body", body)
    if (parent) fd.set("parent", String(parent))
    files.forEach((f) => fd.append("images", f))

    // Backend yangi kommentni qaytaradi — ro'yxatni qayta yuklamaymiz
    const created = await backendFetch<CommentT>("/comments/create", { method: "POST", body: fd })
    setComments((prev) =>
      parent
        ? prev.map((c) => (c.id === parent ? { ...c, replies: [...c.replies, created] } : c))
        : [created, ...prev]
    )
  }

  // Telegramdagidek: har kim bitta kommentga faqat BITTA reaksiya qo'yadi.
  //  - boshqa emoji (yoki birovning chipi) bosilsa — reaksiyam shunga almashadi
  //  - o'z reaksiyam ustiga bosilsa — olib tashlanadi
  // Interfeys darhol yangilanadi (optimistik), xato bo'lsa orqaga qaytadi.
  const react = async (id: number, emoji: string, label: string) => {
    const before = findComment(comments, id)?.reactions
    if (!before) return

    setComments((prev) => patchTree(prev, id, (c) => ({ ...c, reactions: switchMyReaction(c.reactions, emoji, label) })))
    try {
      const res = await backendFetch<{ id: number; reactions: Reaction[] }>(`/comments/${id}/react`, {
        method: "POST",
        body: JSON.stringify({ emoji, label }),
      })
      setComments((prev) => patchTree(prev, id, (c) => ({ ...c, reactions: res.reactions })))
    } catch (e) {
      setComments((prev) => patchTree(prev, id, (c) => ({ ...c, reactions: before })))
      setError((e as Error).message)
    }
  }

  const edit = async (id: number, body: string) => {
    const updated = await backendFetch<{ id: number; body: string }>(`/comments/${id}/update`, {
      method: "PATCH",
      body: JSON.stringify({ body }),
    })
    setComments((prev) => patchTree(prev, id, (c) => ({ ...c, body: updated.body, is_edited: true })))
  }

  const remove = async (id: number) => {
    try {
      await backendFetch(`/comments/${id}/delete`, { method: "DELETE" })
      setComments((prev) =>
        patchTree(prev, id, (c) => ({ ...c, is_deleted: true, body: "", images: [], reactions: [] }))
      )
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const total = comments.reduce((n, c) => n + 1 + c.replies.filter((r) => !r.is_deleted).length, 0)

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <h2 id={titleId} className="text-lg font-semibold">
        {title}{" "}
        <span className="text-muted-foreground text-sm font-normal">
          ({total}
          {next !== null ? "+" : ""})
        </span>
      </h2>

      {writable && (
        <Item variant="outline">
          <ItemContent>
            <Composer
              placeholder="Fikringizni yozing… (Ctrl+Enter — yuborish)"
              onSubmit={(b, f) => create(b, f)}
            />
          </ItemContent>
        </Item>
      )}

      {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
      {loading && <Loader2Icon className="text-muted-foreground mx-auto animate-spin" />}
      {!loading && !error && comments.length === 0 && (
        <p className="text-muted-foreground py-6 text-center text-sm">
          Hozircha kommentlar yo&apos;q. Birinchi bo&apos;lib yozing.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {comments.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            canComment={writable}
            onReact={react}
            onReply={(parentId, body, files) => create(body, files, parentId)}
            onEdit={edit}
            onDelete={remove}
          />
        ))}
      </div>

      {next !== null && (
        <Button
          variant="outline"
          className="self-center"
          disabled={loadingMore}
          onClick={() => {
            setLoadingMore(true)
            load(next)
          }}
        >
          {loadingMore && <Loader2Icon className="animate-spin" />} Yana yuklash
        </Button>
      )}
    </section>
  )
}
