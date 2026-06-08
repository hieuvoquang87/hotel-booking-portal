const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const baseConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // jest-fixed-jsdom keeps Node's real fetch/Request/Response/streams (stock
  // jest-environment-jsdom strips them, which breaks MSW v2 under Jest). See
  // MSW docs "Jest missing globals".
  testEnvironment: 'jest-fixed-jsdom',
  testEnvironmentOptions: { customExportConditions: [''] },
  testMatch: ['**/?(*.)+(test).[jt]s?(x)'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/e2e/'],
  // Non-blocking in M0: collect but do NOT enforce a threshold (gate activates in M1/M7).
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'services/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
  ],
};

// next/jest forces its own transformIgnorePatterns (ignoring everything in
// node_modules except next/geist) and *appends* any we pass — which can't widen
// the set. MSW v2 ships only ESM, so it must be transformed by next/jest's SWC.
// Post-process the resolved config to REPLACE transformIgnorePatterns so MSW and
// its ESM-only deps are transformed instead of loaded raw.
const transformEsmDeps = [
  'msw',
  '@mswjs',
  '@bundled-es-modules',
  '@open-draft',
  'until-async',
  'strict-event-emitter',
  'outvariant',
  'headers-polyfill',
  'set-cookie-parser',
  'rettime',
].join('|');

module.exports = async () => {
  const config = await createJestConfig(baseConfig)();
  config.transformIgnorePatterns = [
    `/node_modules/(?!(?:.pnpm/)?(?:${transformEsmDeps})/)`,
    '^.+\\.module\\.(css|sass|scss)$',
  ];
  return config;
};
