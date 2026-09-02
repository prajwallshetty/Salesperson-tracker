import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // eslint-plugin-react-hooks v7 ships the React Compiler-era rule set, which flags the
      // standard "fetch on mount / on filter change" effect (setLoading(true) + api.get().then())
      // used consistently across every list/detail page in this dashboard (and in the original
      // Vite app it was migrated from). That pattern is a correct use of useEffect to synchronize
      // with an external system (the API) — this project does not opt into the React Compiler, so
      // the rule is kept as a warning rather than a hard error.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  globalIgnores([".next/**", "node_modules/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
