import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";

const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL ? "https://www.the-sfm.com" : "*");
const PROJECT_ROOT = process.cwd();
const skipVerifiedBuildChecks = process.env.NEXT_BUILD_SKIP_CHECKS === "1";
const IS_WINDOWS_BUILD = process.platform === "win32" && process.env.NEXT_DISABLE_WINDOWS_BUILD_SHIM !== "1";
const WINDOWS_BUILD_EXPERIMENTS = IS_WINDOWS_BUILD
  ? {
      cpus: 1,
      webpackBuildWorker: false,
    }
  : {};
const WINDOWS_MANIFEST_PLUGIN = "EnsureWindowsServerManifests";
let lastAppPathsManifestSync = 0;
type WebpackTapOptions = string | { name: string; stage?: number };
type WebpackSyncHook = {
  tap: (options: WebpackTapOptions, callback: (...args: unknown[]) => void) => void;
};

function writeTextIfMissing(filePath: string, content: string) {
  if (fs.existsSync(filePath)) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function writeJsonIfMissing(filePath: string, value: unknown) {
  writeTextIfMissing(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeJsonDefaults(filePath: string, defaults: Record<string, unknown>) {
  let current: Record<string, unknown> = {};
  if (fs.existsSync(filePath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        current = parsed as Record<string, unknown>;
      }
    } catch {
      current = {};
    }
  }
  const next = { ...current, ...defaults };
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

function collectAppPathsManifest(serverDir: string) {
  const appDir = path.join(serverDir, "app");
  const entries: Record<string, string> = {};
  if (!fs.existsSync(appDir)) return entries;

  const visit = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const filePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(filePath);
      } else if (entry.isFile() && (entry.name === "page.js" || entry.name === "route.js")) {
        const relativePath = path.relative(appDir, filePath).split(path.sep).join("/");
        entries[`/${relativePath.replace(/\.js$/, "")}`] = `app/${relativePath}`;
      }
    }
  };

  visit(appDir);
  return entries;
}

function syncAppPathsManifest(serverDir: string) {
  const now = Date.now();
  if (now - lastAppPathsManifestSync < 250) return;
  lastAppPathsManifestSync = now;

  const appPaths = collectAppPathsManifest(serverDir);
  if (Object.keys(appPaths).length > 0) {
    writeJsonDefaults(path.join(serverDir, "app-paths-manifest.json"), appPaths);
  }
}

function mirrorDirectory(sourceDir: string, targetDir: string) {
  if (!fs.existsSync(sourceDir)) return;
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      mirrorDirectory(sourcePath, targetPath);
    } else if (entry.isFile()) {
      const sourceStat = fs.statSync(sourcePath);
      const targetStat = fs.existsSync(targetPath) ? fs.statSync(targetPath) : null;
      if (!targetStat || targetStat.size !== sourceStat.size || targetStat.mtimeMs < sourceStat.mtimeMs) {
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
  }
}

function ensureWindowsServerManifests() {
  const serverDir = path.join(PROJECT_ROOT, ".next", "server");
  const pagesDir = path.join(serverDir, "pages");
  mirrorDirectory(path.join(serverDir, "chunks"), serverDir);
  mirrorDirectory(path.join(serverDir, "vendor-chunks"), path.join(serverDir, "chunks", "vendor-chunks"));
  syncAppPathsManifest(serverDir);

  writeJsonDefaults(path.join(serverDir, "pages-manifest.json"), {
    "/_app": "pages/_app.js",
    "/_document": "pages/_document.js",
    "/_error": "pages/_error.js",
    "/404": "pages/404.js",
    "/500": "pages/500.js",
  });
  writeTextIfMissing(
    path.join(pagesDir, "_app.js"),
    [
      'const React = require("react");',
      'function App({ Component, pageProps }) { return React.createElement(Component, pageProps); }',
      'module.exports = App;',
      'module.exports.default = App;',
      "",
    ].join("\n"),
  );
  writeTextIfMissing(
    path.join(pagesDir, "_document.js"),
    [
      'const Document = require("next/document").default;',
      'module.exports = Document;',
      'module.exports.default = Document;',
      "",
    ].join("\n"),
  );
  writeTextIfMissing(
    path.join(pagesDir, "_error.js"),
    [
      'const ErrorComponent = require("next/error").default;',
      'module.exports = ErrorComponent;',
      'module.exports.default = ErrorComponent;',
      "",
    ].join("\n"),
  );
  writeTextIfMissing(
    path.join(pagesDir, "404.js"),
    [
      'const React = require("react");',
      'const ErrorComponent = require("next/error").default;',
      'function NotFound() { return React.createElement(ErrorComponent, { statusCode: 404 }); }',
      'module.exports = NotFound;',
      'module.exports.default = NotFound;',
      "",
    ].join("\n"),
  );
  writeTextIfMissing(
    path.join(pagesDir, "500.js"),
    [
      'const React = require("react");',
      'const ErrorComponent = require("next/error").default;',
      'function ServerError() { return React.createElement(ErrorComponent, { statusCode: 500 }); }',
      'module.exports = ServerError;',
      'module.exports.default = ServerError;',
      "",
    ].join("\n"),
  );
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

function safeEnsureWindowsServerManifests() {
  try {
    ensureWindowsServerManifests();
  } catch {
    // Next can remove and recreate .next/server while the Windows build shim is keeping
    // manifests alive. A transient race should not take down the build process.
  }
}

function scheduleWindowsServerManifests() {
  safeEnsureWindowsServerManifests();
  const startedAt = Date.now();
  const interval = setInterval(() => {
    safeEnsureWindowsServerManifests();
    if (Date.now() - startedAt > 120_000) clearInterval(interval);
  }, 25);
  interval.unref?.();
}

const nextConfig: NextConfig = {
  outputFileTracingRoot: PROJECT_ROOT,
  // The Sharia research browser renderer is an opt-in Node-only fallback. Keep
  // Playwright outside the application bundle so normal HTTP research remains lean.
  serverExternalPackages: [
    '@napi-rs/canvas',
    '@playwright/test',
    'chromium-bidi',
    'pdf-parse',
    'playwright',
    'playwright-core',
  ],
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
        apply(compiler: {
          hooks: {
            afterEmit: WebpackSyncHook;
            done: WebpackSyncHook;
          };
        }) {
          const writeManifests = () => scheduleWindowsServerManifests();
          compiler.hooks.afterEmit.tap({ name: WINDOWS_MANIFEST_PLUGIN, stage: Number.MAX_SAFE_INTEGER }, writeManifests);
          compiler.hooks.done.tap({ name: WINDOWS_MANIFEST_PLUGIN, stage: Number.MAX_SAFE_INTEGER }, writeManifests);
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
