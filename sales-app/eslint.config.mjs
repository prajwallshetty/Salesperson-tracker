import nextConfig from "eslint-config-next";

// eslint-config-next 16.x ships its rules as a native ESLint flat-config array
// (see node_modules/eslint-config-next/dist/index.js). Using it directly avoids
// routing "next/core-web-vitals"/"next/typescript" through @eslint/eslintrc's
// FlatCompat legacy shim, which crashes in this eslint-config-next + ESLint 9
// combination (eslint-plugin-react's flat-config plugin object is self-referencing,
// and FlatCompat's legacy config-validator throws "Converting circular structure to
// JSON" trying to format an error around it). This is the same underlying issue as
// admin-web's identical `compat.extends(...)` setup, out of scope to fix here.
const eslintConfig = [
  ...nextConfig,
  {
    // src/** is the old Vite source (src/legacy-pages, src/components, src/store, src/lib,
    // src/types) kept only as a read-only migration reference — it is deleted once the
    // Next.js App Router migration below is fully verified, so it isn't linted as live code.
    ignores: [".next/**", "node_modules/**", "public/sw.js", "public/workbox-*.js", "src/**"],
  },
  {
    rules: {
      // These two rules come from eslint-plugin-react-hooks v7's new React Compiler
      // readiness checks (bundled by eslint-config-next 16). They flag the app's
      // "setLoading(true); api.get(...).then(setData).finally(...)" fetch-on-mount
      // effect pattern — used verbatim, unchanged, on every list/detail page carried
      // over from the original Vite app — as non-idiomatic for a future React Compiler
      // pass. It isn't a correctness bug (this app doesn't opt into the Compiler), and
      // rewriting ~20 call sites' effect architecture to satisfy it would risk changing
      // real fetch/loading behavior, which this migration must not do.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
];

export default eslintConfig;
