import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";

const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL ? "https://www.the-sfm.com" : "*");
const PROJECT_ROOT = process.cwd();
const skipVerifiedBuildChecks = process.env.NEXT_BUILD_SKIP_CHECKS === "1";
const IS_WINDOWS_BUILD = process.platform === "win32";
const WINDOWS_BUILD_EXPERIMENTS = IS_WINDOWS_BUILD
  ? {
      cpus: 1,
      webpackBuildWorker: false,
    }
  : {};

function writeTextIfMissing(filePath: string, content: string) {
  if (fs.existsSync(filePath)) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function writeJsonIfMissing(filePath: string, value: unknown) {
  writeTextIfMissing(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function ensureWindowsServerManifests() {
  const serverDir = path.join(PROJECT_ROOT, ".next", "server");

  writeJsonIfMissing(path.join(serverDir, "pages-manifest.json"), {
    "/_app": "pages/_app.js",
    "/_document": "pages/_document.js",
    "/_error": "pages/_error.js",
    "/404": "pages/404.js",
    "/500": "pages/500.js",
  });
  writeJsonIfMissing(path.join(serverDir, "middleware-manifest.json"), {
    version: 3,
    sortedMiddleware: [],
    middleware: {},
    functions: {},
  });
  writeJsonIfMissing(path.join(serverDir, "functions-config-manifest.json"), {
    version: 1,
    functions: {},
  });
  writeTextIfMissing(
    path.join(serverDir, "middleware-build-manifest.js"),
    "self.__BUILD_MANIFEST={};self.__BUILD_MANIFEST_CB&&self.__BUILD_MANIFEST_CB();\n",
  );
  writeTextIfMissing(
    path.join(serverDir, "middleware-react-loadable-manifest.js"),
    "self.__REACT_LOADABLE_MANIFEST={};\n",
  );
}

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
  experimental: WINDOWS_BUILD_EXPERIMENTS,
  webpack(config, { dev }) {
    if (!dev && IS_WINDOWS_BUILD) {
      config.cache = false;
      config.plugins ??= [];
      config.plugins.push({
        apply(compiler: { hooks: { done: { tap: (name: string, callback: () => void) => void } } }) {
          compiler.hooks.done.tap("EnsureWindowsServerManifests", ensureWindowsServerManifests);
        },
      });
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
