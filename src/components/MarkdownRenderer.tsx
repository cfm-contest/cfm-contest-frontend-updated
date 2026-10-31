"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown, {
  type Components,
  type ExtraProps,
} from "react-markdown";

import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import remarkUnwrapImages from "remark-unwrap-images";

import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";

import { visit } from "unist-util-visit";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

import { Check, Copy, ImageIcon } from "lucide-react";

import "katex/dist/katex.min.css";

import { VideoPlayer } from "@/components/VideoPlayer";
import { QuestionLoader } from "./question/QuestionLoader";
import { EmbeddableViews } from "./problems/EmbeddableViews";

interface MarkdownRendererProps {
  content: string | null | undefined;
  className?: string;
  inline?: boolean;
}

/* ============================================================
   REHYPE PLUGIN: <question> va <problem> tegini saqlaydigan
   <p> ni unwrap qilish

   Bu plugin rehypeRaw DAN OLDIN ishga tushishi kerak,
   chunki {{savol:id}} / {{problem:slug}} replacement'lari raw
   HTML sifatida kiritiladi va bu teglar paragraf ichida qolib
   ketadi. Natijada <p> ichida <div> (QuestionLoader /
   EmbeddableViews) paydo bo'lib, hydration xatosi chiqaradi.

   Ikkala embeddable teg ham bitta "block-level" ro'yxatda
   ushlanadi, shunda kelajakda yangi {{...}} turi qo'shilsa,
   faqat shu ro'yxatga bitta tagName qo'shish yetarli bo'ladi.
============================================================ */

const EMBEDDABLE_BLOCK_TAGS = new Set(["question", "problem"]);

function rehypeUnwrapEmbeddable() {
  return (tree: any) => {
    visit(tree, "element", (node: any, index: number | undefined, parent: any) => {
      if (node.tagName !== "p" || !parent || index == null) return;

      const hasEmbeddable = (node.children ?? []).some((child: any) =>
        EMBEDDABLE_BLOCK_TAGS.has(child?.tagName)
      );

      if (hasEmbeddable) {
        parent.children.splice(index, 1, ...node.children);
        return index;
      }
    });
  };
}

/* ============================================================
   HELPERS
============================================================ */

function isHlsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    return parsed.pathname
      .toLowerCase()
      .endsWith(".m3u8");
  } catch {
    return url
      .toLowerCase()
      .split("?")[0]
      .split("#")[0]
      .endsWith(".m3u8");
  }
}

function getYoutubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    if (
      hostname === "youtube.com" ||
      hostname === "www.youtube.com" ||
      hostname === "m.youtube.com"
    ) {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v");
      }

      if (parsed.pathname.startsWith("/embed/")) {
        return (
          parsed.pathname
            .replace("/embed/", "")
            .split("/")[0] || null
        );
      }

      if (parsed.pathname.startsWith("/shorts/")) {
        return (
          parsed.pathname
            .replace("/shorts/", "")
            .split("/")[0] || null
        );
      }
    }

    if (
      hostname === "youtu.be" ||
      hostname === "www.youtu.be"
    ) {
      return (
        parsed.pathname
          .replace(/^\/+/, "")
          .split("/")[0] || null
      );
    }

    return null;
  } catch {
    return null;
  }
}

/* ============================================================
   MEDIA HELPERS
============================================================ */

function isYoutubeUrl(url?: string): boolean {
  if (!url) return false;
  return Boolean(getYoutubeVideoId(url));
}

function isMediaUrl(url?: string): boolean {
  if (!url) return false;

  return isYoutubeUrl(url) || isHlsUrl(url);
}

/* ============================================================
   IMAGE
============================================================ */

function MarkdownImage({
  src,
  alt,
}: {
  src?: string;
  alt?: string;
}) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className="my-5 flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-400">
        <ImageIcon className="mb-2 size-7" />

        <span className="text-sm">
          {alt || "Rasm yuklanmadi"}
        </span>
      </div>
    );
  }

  return (
    <figure className="my-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt || "Rasm"}
        className="block h-auto w-full object-contain"
        loading="lazy"
        onError={() => setError(true)}
      />

      {alt && alt !== "image" && (
        <figcaption className="border-t border-slate-100 px-4 py-2.5 text-center text-xs text-slate-500">
          {alt}
        </figcaption>
      )}
    </figure>
  );
}

type MarkdownImgRendererProps =
  React.ComponentPropsWithoutRef<"img"> & ExtraProps;

function MarkdownImgRenderer({
  src,
  alt,
}: MarkdownImgRendererProps) {
  const resolvedSrc = typeof src === "string" ? src : undefined;

  return (
    <MarkdownImage
      src={resolvedSrc}
      alt={alt}
    />
  );
}

/* ============================================================
   YOUTUBE
============================================================ */

function YoutubePlayer({
  videoId,
}: {
  videoId: string;
}) {
  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-sm">
      <div className="aspect-video w-full">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          title="YouTube video"
          className="block h-full w-full border-0"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </div>
  );
}

/* ============================================================
   SMART LINK
============================================================ */

function MarkdownLink({
  href,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"a"> & ExtraProps) {
  if (!href) {
    return (
      <a
        {...props}
        href={href}
      >
        {children}
      </a>
    );
  }

  const youtubeVideoId = getYoutubeVideoId(href);

  if (youtubeVideoId) {
    return (
      <div className="my-6">
        <YoutubePlayer videoId={youtubeVideoId} />
      </div>
    );
  }

  if (isHlsUrl(href)) {
    return (
      <div className="my-6">
        <VideoPlayer src={href} />
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  );
}

/* ============================================================
   CODE
============================================================ */

function CodeBlock({
  className,
  children,
  ...props
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  const match = /language-(\w+)/.exec(
    className || ""
  );

  const handleCopy = useCallback(() => {
    const text = String(children).replace(/\n$/, "");

    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);

        window.setTimeout(() => {
          setCopied(false);
        }, 2000);
      })
      .catch(() => {});
  }, [children]);

  /* Inline code */
  if (!match) {
    return (
      <code
        className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[13px] text-slate-800 ring-1 ring-slate-200"
        {...props}
      >
        {children}
      </code>
    );
  }

  const language = match[1];

  return (
    <div className="group relative my-5 overflow-hidden rounded-xl border border-slate-200 bg-[#fafafa] shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {language}
        </span>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-emerald-600" />

              <span className="text-emerald-600">
                Nusxalandi
              </span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" />

              Nusxa olish
            </>
          )}
        </button>
      </div>

      {/* Kodni gorizontal scroll qilish uchun overflow-x-auto — mobilda kod qatori sig'masa sahifa kengaymaydi */}
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          style={oneLight}
          language={language}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: "1.25rem",
            background: "#fafafa",
            fontSize: "13px",
            lineHeight: "1.6",
          }}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

/* ============================================================
   PARAGRAPH

   Eski containsBlockMedia tekshiruvi ishlamas edi, chunki
   blockComponents useMemo ichida ekanligi uchun react-markdown
   custom komponentlarni React.memo bilan o'rab yuboradi va
   child.type hech qachon to'g'ridan-to'g'ri komponentga
   teng bo'lmaydi.

   rehypeUnwrapEmbeddable plugini <question> / <problem> ni
   saqlaydigan <p> larni allaqachon unwrap qilgani uchun, bu
   yerda qolgan holatlar (rasm, video link) uchun node.tagName
   orqali ishonchli tekshiruv qilamiz.
============================================================ */

const BLOCK_LEVEL_TAGS = new Set([
  "img",
  "a",
  ...EMBEDDABLE_BLOCK_TAGS,
]);

function MarkdownParagraph({
  children,
  node,
}: {
  children?: React.ReactNode;
  node?: any;
}) {
  const containsBlockMedia = (node?.children ?? []).some((child: any) =>
    BLOCK_LEVEL_TAGS.has(child?.tagName)
  );

  if (containsBlockMedia) {
    return <>{children}</>;
  }

  return (
    <p className="mb-4 leading-7">
      {children}
    </p>
  );
}

/* ============================================================
   INLINE COMPONENTS
============================================================ */
type CustomComponents = Components & {
  question?: (props: any) => React.ReactNode;
  problem?: (props: any) => React.ReactNode;
};
const inlineComponents: CustomComponents = {
  p: ({ children }) => <>{children}</>,

  div: ({ children }) => <>{children}</>,

  h1: ({ children }) => (
    <strong className="font-semibold">
      {children}
    </strong>
  ),

  h2: ({ children }) => (
    <strong className="font-semibold">
      {children}
    </strong>
  ),

  h3: ({ children }) => (
    <strong className="font-semibold">
      {children}
    </strong>
  ),

  h4: ({ children }) => (
    <strong className="font-semibold">
      {children}
    </strong>
  ),

  blockquote: ({ children }) => (
    <em>{children}</em>
  ),

  ul: ({ children }) => (
    <span>{children}</span>
  ),

  ol: ({ children }) => (
    <span>{children}</span>
  ),

  li: ({ children }) => (
    <span>• {children}</span>
  ),

  img: () => null,

  a: ({
    href,
    children,
    ...props
  }) => (
    <a
      href={href}
      {...props}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),

  code: ({
    children,
    className,
  }) => {
    const match =
      /language-(\w+)/.exec(className || "");

    if (!match) {
      return (
        <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[13px] text-slate-800 ring-1 ring-slate-200">
          {children}
        </code>
      );
    }

    return (
      <code className="font-mono text-sm">
        {children}
      </code>
    );
  },

  pre: ({ children }) => (
    <>{children}</>
  ),

  table: ({ children }) => (
    <>{children}</>
  ),

  thead: ({ children }) => (
    <>{children}</>
  ),

  tbody: ({ children }) => (
    <>{children}</>
  ),

  tr: ({ children }) => (
    <>{children}</>
  ),

  th: ({ children }) => (
    <strong>{children}</strong>
  ),

  td: ({ children }) => (
    <>{children}</>
  ),

  hr: () => null,

  br: () => <br />,

  // Inline rejimda savol/masala embed qilinmaydi — faqat block rejimda
  question: () => null,
  problem: () => null,
};

/* ============================================================
   MAIN
============================================================ */

export function MarkdownRenderer({
  content,
  className = "",
  inline = false,
}: MarkdownRendererProps) {
  const params = useParams();
  const slug = (params?.slug as string) || "";

  const parsedContent = useMemo(() => {
    if (!content) return "";

    return content
      .replace(
        /\{\{savol:([a-zA-Z0-9_-]+)\}\}/g,
        '<question id="$1"></question>'
      )
      .replace(
        /\{\{problem:([a-zA-Z0-9_-]+)\}\}/g,
        '<problem slug="$1"></problem>'
      );
  }, [content]);

  const blockComponents: Components = useMemo(
    () => ({
      p: MarkdownParagraph,

      img: MarkdownImgRenderer,

      a: MarkdownLink,

      code: CodeBlock,

      question: ({ id }: any) => {
        if (!id) return null;
        return <QuestionLoader slug={slug} questionId={id} />;
      },

      // {{problem:slug}} → <EmbeddableViews slug="..." />
      // Bu yerda destructuring paytida HTML atributi "slug"ni
      // mahalliy o'zgaruvchiga problemSlug deb qayta nomlaymiz,
      // aks holda yuqoridagi sahifa slug'i (useParams) bilan
      // nom to'qnashuvi (shadowing) yuzaga keladi.
      problem: ({ slug: problemSlug }: any) => {
        if (!problemSlug) return null;
        return <EmbeddableViews slug={problemSlug} />;
      },
    }),
    [slug]
  );

  if (!content) {
    return null;
  }

  /* ==========================================================
     INLINE
  ========================================================== */

  if (inline) {
    return (
      <span
        className={`inline-markdown ${className}`}
      >
        <ReactMarkdown
          remarkPlugins={[
            remarkMath,
            remarkGfm,
          ]}
          rehypePlugins={[
            rehypeKatex,
            rehypeRaw,
          ]}
          components={inlineComponents}
        >
          {parsedContent}
        </ReactMarkdown>
      </span>
    );
  }

  /* ==========================================================
     BLOCK
  ========================================================== */

  return (
    <article
      className={`
        prose prose-slate max-w-none
        text-[15px] leading-7 text-slate-700
        sm:text-[15.5px]

        [&_h1]:mb-4
        [&_h1]:mt-8
        [&_h1]:text-xl
        [&_h1]:font-bold
        [&_h1]:tracking-tight
        [&_h1]:text-slate-900
        sm:[&_h1]:text-2xl

        [&_h2]:mb-3
        [&_h2]:mt-7
        [&_h2]:text-lg
        [&_h2]:font-bold
        [&_h2]:tracking-tight
        [&_h2]:text-slate-900
        sm:[&_h2]:text-xl

        [&_h3]:mb-3
        [&_h3]:mt-6
        [&_h3]:text-base
        [&_h3]:font-semibold
        [&_h3]:text-slate-900
        sm:[&_h3]:text-lg

        [&_h4]:mb-2
        [&_h4]:mt-5
        [&_h4]:text-base
        [&_h4]:font-semibold
        [&_h4]:text-slate-800

        [&_p]:mb-4
        [&_p]:leading-7

        [&_ul]:my-4
        [&_ul]:ml-5
        [&_ul]:list-disc
        [&_ul]:space-y-1.5
        sm:[&_ul]:ml-6

        [&_ol]:my-4
        [&_ol]:ml-5
        [&_ol]:list-decimal
        [&_ol]:space-y-1.5
        sm:[&_ol]:ml-6

        [&_li]:pl-1
        [&_li::marker]:text-slate-400

        [&_strong]:font-semibold
        [&_strong]:text-slate-900

        [&_em]:italic
        [&_em]:text-slate-600

        [&_blockquote]:my-5
        [&_blockquote]:rounded-r-xl
        [&_blockquote]:border-l-4
        [&_blockquote]:border-blue-500
        [&_blockquote]:bg-blue-50/60
        [&_blockquote]:px-4
        [&_blockquote]:py-3
        [&_blockquote]:text-slate-600
        sm:[&_blockquote]:px-5
        sm:[&_blockquote]:py-3.5

        [&_a]:font-medium
        [&_a]:text-blue-600
        [&_a]:underline-offset-2
        [&_a]:break-words
        hover:[&_a]:text-blue-700

        [&_table]:my-5
        [&_table]:w-full
        [&_table]:overflow-hidden
        [&_table]:rounded-xl
        [&_table]:border
        [&_table]:border-slate-200
        [&_table]:text-sm
        [&_table]:shadow-sm

        [&_thead]:bg-slate-50

        [&_th]:border-b
        [&_th]:border-slate-200
        [&_th]:px-3
        [&_th]:py-2.5
        [&_th]:text-left
        [&_th]:font-semibold
        [&_th]:text-slate-700
        sm:[&_th]:px-4
        sm:[&_th]:py-3

        [&_td]:border-b
        [&_td]:border-slate-100
        [&_td]:px-3
        [&_td]:py-2.5
        [&_td]:text-slate-600
        sm:[&_td]:px-4
        sm:[&_td]:py-3

        [&_tr:last-child_td]:border-b-0
        [&_tr:hover]:bg-slate-50/50

        [&_hr]:my-8
        [&_hr]:border-slate-200

        [&_.katex]:text-[1em]
        sm:[&_.katex]:text-[1.05em]

        [&_.katex-display]:my-4
        [&_.katex-display]:overflow-x-auto
        [&_.katex-display]:rounded-lg
        [&_.katex-display]:bg-slate-50
        [&_.katex-display]:p-3
        sm:[&_.katex-display]:p-4

        ${className}
      `}
    >
      <ReactMarkdown
        remarkPlugins={[
          remarkUnwrapImages,
          remarkMath,
          remarkGfm,
        ]}
        rehypePlugins={[
          rehypeUnwrapEmbeddable, // <-- rehypeRaw DAN OLDIN!
          rehypeKatex,
          rehypeRaw,
        ]}
        components={blockComponents}
      >
        {parsedContent}
      </ReactMarkdown>
    </article>
  );
}