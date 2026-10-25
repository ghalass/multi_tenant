// eslint.config.mjs
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/explicit-function-return-type": "warn",

      // Règles React : avertissements plutôt qu'erreurs bloquantes
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",

      // Apostrophes et guillemets dans le JSX
      "react/no-unescaped-entities": "warn",

      // Règles de style TypeScript et JavaScript
      "@typescript-eslint/ban-ts-comment": "warn",
      "prefer-const": "warn",
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
