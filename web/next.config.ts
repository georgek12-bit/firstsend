import type { NextConfig } from 'next';

// Static export (the app has no server code):
//   STATIC_EXPORT=1 npm run build                         -> out/ served from a domain root
//   STATIC_EXPORT=1 BASE_PATH=/firstsend npm run build    -> out/ served from a sub-path (GitHub Pages)
const basePath = process.env.BASE_PATH || '';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  ...(process.env.STATIC_EXPORT
    ? {
        output: 'export',
        trailingSlash: true,
        images: { unoptimized: true },
        ...(basePath ? { basePath } : {}),
        ...(process.env.ASSET_PREFIX ? { assetPrefix: process.env.ASSET_PREFIX } : {}),
      }
    : {}),
};

export default nextConfig;
