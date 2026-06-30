import type { NextConfig } from "next";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL ? "https://www.the-sfm.com" : "*");
const PROJECT_ROOT = process.cwd();
const PAGES_MANIFEST = {
  '/404': 'pages/404.js',
  '/500': 'pages/500.js',
  '/_app': 'pages/_app.js',
  '/_document': 'pages/_document.js',
  '/_error': 'pages/_error.js',
};

const ensurePagesManifest = () => {
  const serverDir = join(PROJECT_ROOT, '.next', 'server');
  const manifestPath = join(serverDir, 'pages-manifest.json');

  mkdirSync(serverDir, { recursive: true });

  if (!existsSync(manifestPath)) {
    writeFileSync(manifestPath, JSON.stringify(PAGES_MANIFEST));
  }
};

const nextConfig: NextConfig = {
  experimental: {
    webpackBuildWorker: false,
  },
  outputFileTracingRoot: PROJECT_ROOT,
  generateBuildId: async () => (
    process.env.NEXT_BUILD_ID ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    'local-build'
  ),
  turbopack: {
    root: PROJECT_ROOT,
  },
  webpack(config, { isServer, webpack }) {
    if (isServer) {
      config.plugins = config.plugins ?? [];
      config.plugins.push({
        apply(compiler: any) {
          compiler.hooks.beforeRun.tap('EnsureEmptyPagesManifestPlugin', ensurePagesManifest);
          compiler.hooks.done.tap('EnsureEmptyPagesManifestPlugin', ensurePagesManifest);
          compiler.hooks.thisCompilation.tap('EnsureEmptyPagesManifestPlugin', (compilation: any) => {
            compilation.hooks.processAssets.tap(
              {
                name: 'EnsureEmptyPagesManifestPlugin',
                stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
              },
              () => {
                if (!compilation.getAsset('pages-manifest.json')) {
                  compilation.emitAsset(
                    'pages-manifest.json',
                    new webpack.sources.RawSource(JSON.stringify(PAGES_MANIFEST)),
                  );
                }
              },
            );
          });
        },
      });
    }

    return config;
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
