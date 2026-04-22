// Global test setup — runs before every test file
// Add env vars, global mocks, or DB teardown hooks here

// NODE_ENV is set by the test runner; no assignment needed

// Node 18 is missing the File global that undici v7 requires
if (typeof globalThis.File === 'undefined') {
  const { File } = require('buffer')
  globalThis.File = File
}
