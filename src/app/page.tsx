import type { Metadata } from "next";
import ApiProxy from "@/lib/api/django/backend.server";
import { HomeView } from "@/components/HomeView";
import { HomePageData } from "@/lib/types/home";
import { educationalOrganizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";
import { SITE_NAME, DEFAULT_OG_IMAGE, absoluteUrl } from "@/lib/seo/config";

export const metadata: Metadata = {
  title: "CFM Contest — Milliy Sertifikat, Attestatsiya, Fan Olimpiadalari va Online Kurslar",
  description:
    "O‘zbekistonda milliy sertifikat va attestatsiyaga tayyorgarlik, matematika, fizika, informatika olimpiadalari, online testlar va zamonaviy video darslar ta'lim platformasi.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "CFM Contest — Zamonaviy Ta'lim, Testlar va Fan Olimpiadalari Platformasi",
    description:
      "Milliy sertifikat, attestatsiya testlari, fan olimpiadalari va professional online kurslar. Bilimingizni sinang va yuqori natijalarga erishing.",
    url: absoluteUrl("/"),
    siteName: SITE_NAME,
    locale: "uz_UZ",
    type: "website",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "CFM Contest ta'lim platformasi",
      },
    ],
  },
};

export default async function Page() {
  const { data } = await ApiProxy.get<HomePageData>("/center/home", {
    cache: "force-cache",
    next: { revalidate: 600, tags: ["home-page"] },
  });

  const structuredData = [websiteJsonLd(), educationalOrganizationJsonLd()];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />
      <HomeView
        courses={data?.hero ?? []}
        teachers={data?.teachers ?? []}
        stats={data?.stats ?? { s: 0, l: 0, p: 0 }}
      />
    </>
  );
}
