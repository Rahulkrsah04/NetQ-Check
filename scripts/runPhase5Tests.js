// Node.js runner for Phase 5 Visual Intelligence Unit Tests

if (typeof localStorage === 'undefined' || localStorage === null) {
  const store = {};
  global.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };
}

if (typeof sessionStorage === 'undefined' || sessionStorage === null) {
  const store = {};
  global.sessionStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };
}

import { runPhase5TestSuite } from '../src/services/__tests__/phase5.test.js';

runPhase5TestSuite().then(({ passed, failed }) => {
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}).catch(err => {
  console.error('Phase 5 Test execution error:', err);
  process.exit(1);
});
