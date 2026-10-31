// next.config.ts

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  turbopack: {},

  async headers() {
    return [
      {
        source: "/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "110mb",
    },
    proxyClientMaxBodySize: "110mb",
  },
};

export default nextConfig;

