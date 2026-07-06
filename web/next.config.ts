import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      { hostname: 'img.youtube.com' },
      { hostname: 'i.ytimg.com' },
      { hostname: 'khslkwspsqyopicxufun.supabase.co' },
    ],
  },
  serverExternalPackages: ['@remotion/bundler', '@remotion/renderer', '@remotion/compositor-win32-x64-msvc'],
  async headers() {
    return [
      {
        // Apply security headers to every route.
        source: '/:path*',
        headers: [
          // Force HTTPS for two years, including subdomains.
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // Clickjacking protection. SAMEORIGIN (not DENY) so same-origin
          // iframes (e.g. PDF/session previews) still work.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Stop MIME sniffing.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Don't leak full URLs to third parties.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Keep camera/microphone available (video annotator, voice input);
          // deny the rest.
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(), browsing-topics=()' },
        ],
      },
    ]
  },
};

export default nextConfig;
