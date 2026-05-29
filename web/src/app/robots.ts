import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://18thman.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/drills', '/profile/'],
        disallow: [
          '/dashboard',
          '/sessions',
          '/groups',
          '/chat',
          '/clubs',
          '/notifications',
          '/settings',
          '/admin',
          '/drills/new',
          '/drills/*/edit',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
