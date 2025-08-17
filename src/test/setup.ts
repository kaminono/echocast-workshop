import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock IndexedDB for browser environment tests
const mockIndexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
  cmp: vi.fn()
}

// Only mock if in test environment
if (typeof window !== 'undefined') {
  // @ts-ignore
  global.indexedDB = mockIndexedDB
  // @ts-ignore
  global.IDBKeyRange = {}
}

// Mock crypto.randomUUID for Node environment
if (typeof crypto === 'undefined') {
  global.crypto = {
    // @ts-ignore
    randomUUID: () => Math.random().toString(36).substring(2, 15)
  }
}
