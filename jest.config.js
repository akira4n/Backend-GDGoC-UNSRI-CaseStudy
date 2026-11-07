export default {
  testEnvironment: 'node',
  transform: {},
  setupFiles: ['dotenv/config'],
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
  testTimeout: 20000,
  forceExit: true,
};
