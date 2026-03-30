import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: 'img.youtube.com' },
      { hostname: 'i.ytimg.com' },
      { hostname: 'khslkwspsqyopicxufun.supabase.co' },
    ],
  },
};

export default nextConfig;
