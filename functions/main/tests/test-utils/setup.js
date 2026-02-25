'use strict';

// Jest global setup — runs once before all test suites.
// Increase default timeout for integration / e2e tests.
jest.setTimeout(15000);

// Silence console.error output during tests (extraction-processor logs non-fatal errors).
// Tests that need to assert on console output should restore it in the test body.
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    // Allow test framework errors through; suppress application-level noise.
    const msg = String(args[0] || '');
    if (msg.includes('[extraction-processor]') || msg.includes('[conflict-detector]')) return;
    originalError.apply(console, args);
  };
});
afterAll(() => {
  console.error = originalError;
});
