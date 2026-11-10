import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Offline',
  robots: { index: false, follow: false },
}

/**
 * Served by public/sw.js when a navigation fails offline. It's cached once at
 * service-worker install, so the build's CSS chunks may not be available when it
 * shows — every style is inline, and there's no client JS.
 */
export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '32px 16px',
        background: '#0a0a0a',
        color: '#e4e4e7',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        textAlign: 'center',
      }}
    >
      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#e8560a' }}>
        18th Man
      </p>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#fff' }}>You&rsquo;re offline</h1>
      <p style={{ margin: 0, maxWidth: 360, fontSize: 15, lineHeight: 1.6, color: '#a1a1aa' }}>
        Check your signal and try again. Nothing you&rsquo;ve saved has been lost.
      </p>
      {/* A plain link, not next/link: a full navigation is what retries the network. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        id="offline-retry"
        href="/"
        style={{ marginTop: 8, padding: '10px 20px', borderRadius: 8, background: '#e8560a', color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
      >
        Try again
      </a>
      {/* sw.js serves this page at the URL that failed, so retry that URL, not a fixed one.
          Inline because this page's JS chunks aren't cached offline. */}
      <script dangerouslySetInnerHTML={{ __html: "document.getElementById('offline-retry').href=location.href" }} />
    </main>
  )
}
