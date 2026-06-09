import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import eslintConfigPrettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Generated test artifacts (also gitignored).
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    // k6 load-test scripts use k6-specific globals, not Node/browser.
    'load/**',
  ]),
  // CommonJS tooling config (jest.config.js uses next/jest, which requires CJS).
  {
    files: ['**/*.config.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  // Disable ESLint formatting rules that conflict with Prettier. Must be last.
  eslintConfigPrettier,
]);

export default eslintConfig;
