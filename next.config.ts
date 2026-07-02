import type { NextConfig } from "next";
const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL ? "https://www.the-sfm.com" : "*");
const PROJECT_ROOT = process.cwd();
const skipVerifiedBuildChecks = process.env.NEXT_BUILD_SKIP_CHECKS === "1";
const nextConfig: NextConfig = {
  outputFileTracingRoot: PROJECT_ROOT,
  generateBuildId: async () => (
    process.env.NEXT_BUILD_ID ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    'local-build'
  ),
  turbopack: {
    root: PROJECT_ROOT,
  },
  webpack(config, { dev }) {
    if (!dev && process.platform === "win32") {
      config.cache = false;
    }
    return config;
  },
  eslint: {
    ignoreDuringBuilds: skipVerifiedBuildChecks,
  },
  typescript: {
    ignoreBuildErrors: skipVerifiedBuildChecks,
  },
  async headers() {
    return [
      {
        source: "/icons/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: ALLOWED_ORIGIN,
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
          {
            key: "Access-Control-Max-Age",
            value: "86400",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self'",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        hostname: "images.pexels.com",
      },
      {
        hostname: "images.unsplash.com",
      },
      {
        hostname: "chat2db-cdn.oss-us-west-1.aliyuncs.com",
      },
      {
        hostname: "cdn.chat2db-ai.com",
      },
      {
        hostname: "assets.coingecko.com",
      },
      {
        hostname: "coin-images.coingecko.com",
      },
    ],
  },
};

export default nextConfig;
