// eslint.config.mjs
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "@typescript-eslint/eslint-plugin";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Configuration supplémentaire pour les règles spécifiques
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      // Changer la sévérité de no-explicit-any
      "@typescript-eslint/no-explicit-any": "warn", // ou "error", "off"

      // Vous pouvez aussi ajouter d'autres règles TypeScript ici
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/explicit-function-return-type": "warn",
    },
  },
  // Remplace les exclusions par défaut de eslint-config-next.
  globalIgnores([
    // Exclusions par défaut de eslint-config-next :
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
