import type {
  CourseDetail,
  CourseListItem,
} from "../types/courses";

import {
  SITE_NAME,
  SITE_URL,
  DEFAULT_OG_IMAGE,
  absoluteUrl,
  cleanDescription,
} from "./config";

// ==========================================================
// ORGANIZATION
// ==========================================================

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/cfm_logo.webp"),
  };
}

// ==========================================================
// WEBSITE
// ==========================================================

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description:
      "Algoritmik masalalar, dasturlash kurslari, testlar va musobaqalar platformasi.",
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: DEFAULT_OG_IMAGE,
      },
    },
  };
}

// ==========================================================
// BREADCRUMB
// ==========================================================

export function breadcrumbJsonLd(
  items: {
    name: string;
    url: string;
  }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}

// ==========================================================
// COURSE
// ==========================================================

export function courseJsonLd(course: CourseDetail) {
  const description =
    cleanDescription(course.description, 500) ||
    `${course.title} — CFM platformasidagi onlayn kurs.`;

  const price = course.discount_price ?? course.price;

  const hasPrice =
    typeof price === "number" ||
    typeof price === "string";

  return {
    "@context": "https://schema.org",
    "@type": "Course",

    name: course.title,

    description,

    url: absoluteUrl(`/courses/${course.slug}`),

    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },

    ...(course.video?.thumbnail
      ? {
          image: absoluteUrl(course.video.thumbnail),
        }
      : {}),

    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
    },

    ...(hasPrice
      ? {
          offers: {
            "@type": "Offer",
            price: String(price),
            priceCurrency: "UZS",
            availability: "https://schema.org/InStock",
            url: absoluteUrl(`/courses/${course.slug}`),
          },
        }
      : {}),
  };
}

// ==========================================================
// COURSE LIST
// ==========================================================

export function courseListJsonLd(
  courses: CourseListItem[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",

    numberOfItems: courses.length,

    itemListElement: courses.map((course, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: course.title,
      url: absoluteUrl(`/courses/${course.slug}`),
    })),
  };
}

// ==========================================================
// EDUCATIONAL ORGANIZATION
// ==========================================================

export function educationalOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/cfm_logo.webp"),
    description:
      "O‘zbekiston o‘quvchilari, abituriyentlari va pedagoglari uchun milliy sertifikat, attestatsiya testlari, fan olimpiadalari va onlayn kurslar ta'lim platformasi.",
    sameAs: [
      "https://t.me/cfm_contest",
      "https://www.youtube.com/@cfm_contest",
      "https://instagram.com/cfm_contest",
    ],
  };
}

// ==========================================================
// FAQ PAGE
// ==========================================================

export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}