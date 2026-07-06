import type { Metadata } from "next";
import { Geist, Geist_Mono, Barlow_Condensed } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Analytics } from "@vercel/analytics/react";
import { cookies } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  weight: ["700", "800"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-barlow",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://18thman.app'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: '18th Man — Rugby League Coaching Platform',
    template: '%s | 18th Man',
  },
  description: 'Free rugby league coaching tools — drill designer, session planner, AI coaching assistant, and a community of coaches. Plan better training sessions today.',
  keywords: ['rugby league', 'rugby league drills', 'coaching drills', 'training sessions', 'rugby league coaching', 'session planner', 'drill designer'],
  authors: [{ name: '18th Man', url: siteUrl }],
  creator: '18th Man',
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: siteUrl,
    siteName: '18th Man',
    title: '18th Man — Rugby League Coaching Platform',
    description: 'Free rugby league coaching tools — drill designer, session planner, AI coaching assistant, and a community of coaches.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: '18th Man — Rugby League Coaching' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '18th Man — Rugby League Coaching Platform',
    description: 'Free rugby league coaching tools — drill designer, session planner, AI coaching assistant, and a community of coaches.',
    images: ['/opengraph-image'],
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies()
  const themeCookie = cookieStore.get('theme')?.value
  const defaultTheme = themeCookie === 'light' ? 'light' : 'dark'

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: '18th Man',
      url: siteUrl,
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl}/drills?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: '18th Man',
      url: siteUrl,
      logo: `${siteUrl}/icons/icon-192.png`,
      description: 'Free rugby league coaching tools — drill designer, session planner, AI coaching assistant, and a community of coaches.',
    },
  ]

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${barlowCondensed.variable} h-full antialiased ${defaultTheme === 'dark' ? 'dark' : ''}`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026') }}
        />
        <ThemeProvider defaultTheme={defaultTheme}>
          <TooltipProvider>
            {children}
            <Toaster />
            <Analytics />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
