/**
 * Test setup for Vitest
 * Mocks browser APIs needed for encryption tests
 */

import { vi } from 'vitest';

// Mock Web Crypto API
if (!global.crypto) {
  global.crypto = {
    subtle: {
      generateKey: vi.fn(),
      exportKey: vi.fn(),
      importKey: vi.fn(),
      encrypt: vi.fn(),
      decrypt: vi.fn(),
      sign: vi.fn(),
      verify: vi.fn(),
      digest: vi.fn(),
    },
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }
  };
}

// Mock IndexedDB
let mockDBData = new Map();

global.indexedDB = {
  open: (name, version) => {
    const request = {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: {
        objectStoreNames: {
          contains: (storeName) => true
        },
        createObjectStore: (storeName) => ({}),
        transaction: (storeNames, mode) => ({
          objectStore: (storeName) => ({
            put: (value, key) => {
              const putRequest = {
                onsuccess: null,
                onerror: null,
                result: null
              };
              setTimeout(() => {
                mockDBData.set(key, value);
                if (putRequest.onsuccess) putRequest.onsuccess();
              }, 0);
              return putRequest;
            },
            get: (key) => {
              const getRequest = {
                onsuccess: null,
                onerror: null,
                result: mockDBData.get(key)
              };
              setTimeout(() => {
                if (getRequest.onsuccess) getRequest.onsuccess();
              }, 0);
              return getRequest;
            }
          })
        })
      }
    };

    setTimeout(() => {
      if (request.onupgradeneeded) {
        request.onupgradeneeded({ target: request });
      }
      if (request.onsuccess) {
        request.onsuccess();
      }
    }, 0);

    return request;
  }
};

// Mock btoa/atob for Node environment
if (typeof btoa === 'undefined') {
  global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
}

if (typeof atob === 'undefined') {
  global.atob = (str) => Buffer.from(str, 'base64').toString('binary');
}

// Mock File API
if (typeof File === 'undefined') {
  global.File = class File {
    constructor(parts, filename, options = {}) {
      this.parts = parts;
      this.name = filename;
      this.type = options.type || '';
    }

    async text() {
      return this.parts[0];
    }
  };
}

// Mock Blob API
if (typeof Blob === 'undefined') {
  global.Blob = class Blob {
    constructor(parts, options = {}) {
      this.parts = parts;
      this.type = options.type || '';
    }

    async text() {
      return this.parts.join('');
    }
  };
}

// Clear mock data before each test
beforeEach(() => {
  mockDBData.clear();
});
