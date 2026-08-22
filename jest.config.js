/** @type {import('jest').Config} */
module.exports = {
  rootDir: __dirname,
  // jsdom, not node: almost everything under packages/* eventually touches
  // `window`/`localStorage` (useLocalStorage, useSession) or renders a
  // component, and package-level tests live next to that code rather than
  // being split into a separate "web" project.
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/{packages,web}/**/*.(test|spec).[jt]s?(x)'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    // Playwright specs (web/e2e/*.spec.ts) — a different runner, different
    // globals (`test`/`expect` from @playwright/test, not Jest's).
    '<rootDir>/web/e2e/',
  ],
  moduleNameMapper: {
    // CSS Modules: map class names to themselves so `styles.foo === 'foo'`
    // is assertable without running real Sass compilation in tests.
    '\\.(css|scss|sass)$': 'identity-obj-proxy',
    // Static assets aren't meaningful in a test — map every import to the
    // same string stub (images, audio — see e.g. packages/audio-common).
    '\\.(png|jpg|jpeg|gif|svg|mp3|mp4|woff2?|ttf|eot)$': '<rootDir>/scripts/fileMock.js',
  },
};
