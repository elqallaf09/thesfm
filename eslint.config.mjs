import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import reactHooks from "eslint-plugin-react-hooks";

// Keep the repository's explicitly pinned Hooks policy during the Next upgrade.
// The new Next config bundles React Compiler diagnostics even when the compiler
// is not enabled. Adopt those in a separate migration; retain both existing
// rules-of-hooks and exhaustive-deps checks here.
const nextChecks = nextVitals.map(config => {
  if (!config.plugins?.["react-hooks"]) return config;
  const rules = Object.fromEntries(
    Object.entries(config.rules ?? {}).filter(([rule]) => !rule.startsWith("react-hooks/")),
  );
  return {
    ...config,
    plugins: { ...config.plugins, "react-hooks": reactHooks },
    rules: { ...rules, ...reactHooks.configs.recommended.rules },
  };
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".tv-build/**",
      "apps/markets-tv/android/app/src/main/assets/**",
      "apps/markets-tv/android/**/build/**",
      "artifacts/**",
      "next-env.d.ts",
    ],
  },
  ...nextChecks,
  ...nextTypescript,
  {
    // ADR 0001's standalone Vanilla iframe has no Next router. Its host rewrites
    // relative terminal destinations; retain that contract until native migration.
    files: ["src/trader-app/public/**/*.js"],
    rules: {
      "@next/next/no-location-assign-relative-destination": "off",
    },
  },
  {
    rules: {
      // Existing warnings are ratcheted by scripts/check-eslint.mjs.
      // Keep them enabled so editors and CI reject growth without forcing an
      // unsafe repository-wide mechanical rewrite in one release.
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-unused-expressions": "error",
      "react/no-unescaped-entities": "off",
      "prefer-const": "error",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];

export default eslintConfig;
