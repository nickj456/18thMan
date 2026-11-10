import type { MetadataRoute } from 'next'

// Also the source for the Android app (PWABuilder / Bubblewrap read it) — see
// docs/android-release.md. Keep `id` stable: it's how browsers recognise an
// already-installed copy of the app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: '18th Man — Rugby League Coaching',
    short_name: '18th Man',
    description: 'Drill designer, session planner, AI coach, and community for rugby league coaches.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#e8560a',
    orientation: 'portrait',
    categories: ['sports', 'education', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
