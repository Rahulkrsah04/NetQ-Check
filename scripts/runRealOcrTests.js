// Node.js runner for Real Image OCR Tests

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

import { runRealOcrTestSuite } from '../src/services/__tests__/realOcr.test.js';

runRealOcrTestSuite().then(({ passed, failed }) => {
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}).catch(err => {
  console.error('Real OCR Test execution error:', err);
  process.exit(1);
});
