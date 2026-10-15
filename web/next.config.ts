import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // `STATIC_EXPORT=1 npm run build` writes a plain static site to out/ (the app has no server code).
  ...(process.env.STATIC_EXPORT ? { output: 'export', trailingSlash: true, images: { unoptimized: true }, assetPrefix: '/static' } : {}),
};

export default nextConfig;
