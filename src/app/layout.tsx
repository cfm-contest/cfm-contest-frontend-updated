import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";

import { AuthProvider } from "@/context/AuthContext";
import { ConditionalNavbar } from "@/components/ConditionalNavbar";

import {
  SITE_NAME,
  SITE_URL,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_LOCALE,
  TWITTER_HANDLE,
} from "@/lib/seo/config";
import { SSEProvider } from "@/context/SSEContext";
import { XPListener } from "@/components/system/xp/XPListener";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export function ToastProvider() {
    return (
        <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnHover
            theme="light"
        />
    );
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },

  description: DEFAULT_DESCRIPTION,

  applicationName: SITE_NAME,
  manifest: "/site.webmanifest",

  alternates: {
    canonical: "/",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },

  openGraph: {
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: DEFAULT_LOCALE,
    type: "website",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — algoritmik masalalar va dasturlash platformasi`,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    creator: TWITTER_HANDLE,
    images: [DEFAULT_OG_IMAGE],
  },
  icons: {
  icon: [
    {
      url: "/favicon.ico",
      sizes: "48x48",
      type: "image/x-icon",
    },
    {
      url: "/favicon-32x32.png",
      sizes: "32x32",
      type: "image/png",
    },
    {
      url: "/favicon-16x16.png",
      sizes: "16x16",
      type: "image/png",
    },
    {
      url: "/android-chrome-192x192.png",
      sizes: "192x192",
      type: "image/png",
    },
    {
      url: "/android-chrome-512x512.png",
      sizes: "512x512",
      type: "image/png",
    },
  ],
  apple: [
    {
      url: "/apple-touch-icon.png",
      sizes: "180x180",
      type: "image/png",
    },
  ],
},
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="uz"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-screen flex-col bg-white text-black antialiased">
        <Suspense fallback={null}>
            <AuthProvider>
              <SSEProvider>
                <ConditionalNavbar />
                  <ToastProvider />
                  <XPListener />
                  {children}
              </SSEProvider>
          </AuthProvider>
        </Suspense>
      </body>
    </html>
  );
}
