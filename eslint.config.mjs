import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "artifacts/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Existing warnings are ratcheted by package.json's max-warnings limit.
      // Keep them enabled so editors and CI reject growth without forcing an
      // unsafe repository-wide mechanical rewrite in one release.
      "@typescript-eslint/no-unused-vars": "warn",
      "react/no-unescaped-entities": "off",
      "prefer-const": "error",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];

export default eslintConfig;
