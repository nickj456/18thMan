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
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: '18th Man — Rugby League Coaching' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '18th Man — Rugby League Coaching Platform',
    description: 'Free rugby league coaching tools — drill designer, session planner, AI coaching assistant, and a community of coaches.',
    images: ['/og-image.png'],
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

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${barlowCondensed.variable} h-full antialiased ${defaultTheme === 'dark' ? 'dark' : ''}`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
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
