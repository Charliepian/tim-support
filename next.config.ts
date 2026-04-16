import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    minimumCacheTTL: 60 * 60 * 24 * 31,
    remotePatterns: [
      { protocol: "https", hostname: "tim-management.co" },
      { protocol: "https", hostname: "cms.tim-management.co" },
      { protocol: "https", hostname: "support-tim-management.co" },
    ],
  },
};

export default nextConfig;
