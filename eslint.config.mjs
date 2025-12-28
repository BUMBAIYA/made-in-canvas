import js from "@eslint/js";
import * as tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import solidPlugin from "eslint-plugin-solid";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "@typescript-eslint": tsPlugin,
      solid: solidPlugin,
    },
    languageOptions: {
      globals: globals.browser,
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: false,
        },
      ],
      // Solid.js specific rules
      ...solidPlugin.configs.recommended.rules,
    },
  },
  {
    ignores: [
      "node_modules",
      "dist",
      "public",
      ".vscode",
      "pnpm-lock.yaml",
      "package-lock.json",
      ".astro",
      ".husky",
      "*.config.js",
      "*.config.mjs",
      "*.config.ts",
    ],
  },
];
