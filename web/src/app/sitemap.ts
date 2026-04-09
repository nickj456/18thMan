import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://18thman.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  const [drillsResult, profilesResult] = await Promise.all([
    supabase
      .from('drills')
      .select('id, updated_at')
      .eq('is_public', true)
      .order('updated_at', { ascending: false })
      .limit(1000),
    supabase
      .from('profiles')
      .select('username, updated_at')
      .not('username', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(500),
  ])

  const drillUrls: MetadataRoute.Sitemap = (drillsResult.data ?? []).map(drill => ({
    url: `${siteUrl}/drills/${drill.id}`,
    lastModified: drill.updated_at ? new Date(drill.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const profileUrls: MetadataRoute.Sitemap = (profilesResult.data ?? [])
    .filter(p => p.username)
    .map(profile => ({
      url: `${siteUrl}/profile/${profile.username}`,
      lastModified: profile.updated_at ? new Date(profile.updated_at) : new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    }))

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${siteUrl}/drills`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/positions`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${siteUrl}/age-groups`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${siteUrl}/skills`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...drillUrls,
    ...profileUrls,
  ]
}
