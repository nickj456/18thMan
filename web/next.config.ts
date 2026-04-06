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
  // Keep Remotion's Node.js-only packages out of the client/edge bundle
  serverExternalPackages: ['@remotion/bundler', '@remotion/renderer', '@remotion/compositor-win32-x64-msvc'],
};

export default nextConfig;
