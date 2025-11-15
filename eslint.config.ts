import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";
import reactPlugin from "eslint-plugin-react";
import hooksPlugin from "eslint-plugin-react-hooks";
import importPlugin from "eslint-plugin-import";
import nPlugin from "eslint-plugin-n";
import promisePlugin from "eslint-plugin-promise";
import prettierConfig from "eslint-config-prettier";

export default [
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/node_modules/**",
      "**/.turbo/**",
      "eslint.config.ts",
      "vite.config.*",
      "frontend/vite.config.*",
    ],
  },
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      import: importPlugin,
      promise: promisePlugin,
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error"],
      "no-undef": "off",
      "no-console": "warn",
      "no-debugger": "error",
      "import/no-unresolved": "off",
      "import/no-duplicates": "error",
      "import/newline-after-import": "error",
      "promise/always-return": "warn",
      "promise/no-return-wrap": "error",
      "promise/no-nesting": "warn",
      "promise/no-new-statics": "error",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
      "@typescript-eslint/no-shadow": "error",
      "@typescript-eslint/return-await": "error",
      "no-param-reassign": "error",
      "prefer-const": "error",
      "prefer-template": "error",
      "object-shorthand": "error",
      "arrow-body-style": ["error", "as-needed"],
      ...prettierConfig.rules,
    },
  },
  {
    files: ["frontend/**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./frontend/tsconfig.app.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": hooksPlugin,
      "@typescript-eslint": tseslint,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "react/self-closing-comp": "error",
      "react/jsx-no-useless-fragment": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
  {
    files: ["backend/**/*.{ts,js}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./backend/tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      n: nPlugin,
      "@typescript-eslint": tseslint,
    },
    rules: {
      "n/no-unsupported-features/es-syntax": "off",
      "n/no-missing-import": "off",
      "no-var": "error",
      "no-new-require": "error",
      "n/no-deprecated-api": "warn",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
];
