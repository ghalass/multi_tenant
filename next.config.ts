// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {}, // Configuration pour les fichiers statiques
  async headers() {
    return [
      {
        source: "/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
          // Note: Ne spécifiez pas Content-Type ici pour tous les fichiers
          // Car tous les fichiers dans uploads/ ne sont pas des .xlsx
        ],
      },
    ];
  }, experimental: {
    serverActions: {
      // Adaptez la valeur à la taille maximale de vos fichiers Excel
      bodySizeLimit: '10mb', // ou '50mb', '100mb'...
    },// Nécessaire si vous êtes en standalone/Docker (Next.js 15.5+)
    proxyClientMaxBodySize: '10mb',
  },
};

export default nextConfig;
