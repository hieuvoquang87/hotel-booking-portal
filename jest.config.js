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

// MSW v2 ships only ESM, so it must be transformed by next/jest's SWC instead of
// loaded raw. next/jest forces its own transformIgnorePatterns whose negative
// lookahead already *allows* its runtime + geist through the transform; passing
// our own pattern only appends (can't widen the ignore set). So inject MSW's deps
// into next's existing lookahead rather than replacing it — replacing would
// silently stop transforming next/geist, breaking later component tests (M3–M5).
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
  config.transformIgnorePatterns = config.transformIgnorePatterns.map((pattern) =>
    pattern.includes('(?!(geist|')
      ? pattern.replace('(?!(geist|', `(?!(${transformEsmDeps}|geist|`)
      : pattern,
  );
  return config;
};
