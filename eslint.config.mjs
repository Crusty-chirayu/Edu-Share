import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
/** M3 ESLint config (flat): Next.js rules + strict TypeScript rules. */
const config = [
  {
    name: "next/recommended",
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { projectService: true },
    },
    plugins: { "@typescript-eslint": tseslint },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "no-console": ["error", { allow: ["log", "warn", "error"] }],
      /**
       * SG-4: zero hardcoded colour values outside the token file
       * (`src/app/globals.css`). Hex and `rgb()`/`hsl()` literals in strings and
       * template quasis are caught here; `src/app/global-error.tsx` is the one
       * documented exception — see the override below.
       */
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/^#[0-9a-fA-F]{3,8}$/]",
          message:
            "Hardcoded colour: use a design token from src/app/globals.css instead (SG-4).",
        },
        {
          selector: "Literal[value=/\\b(rgb|hsl)a?\\(/]",
          message:
            "Hardcoded colour: use a design token from src/app/globals.css instead (SG-4).",
        },
        {
          selector: "TemplateElement[value.raw=/^#[0-9a-fA-F]{3,8}$|\\b(rgb|hsl)a?\\(/]",
          message:
            "Hardcoded colour: use a design token from src/app/globals.css instead (SG-4).",
        },
      ],
    },
  },
  {
    files: ["src/app/global-error.tsx"],
    rules: {
      /**
       * The one documented exception to SG-4: this boundary must render when
       * the global stylesheet may be the very thing that failed to load, so its
       * palette has to live inline. No other file is allowed to do so.
       */
      "no-restricted-syntax": "off",
    },
  },
  {
    ignores: [".next/**", "out/**", "coverage/**", "node_modules/**", ".kilo/**"],
  },
];

export default config;

