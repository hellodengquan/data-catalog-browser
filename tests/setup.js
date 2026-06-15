import { vi } from 'vitest'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

global.URL.createObjectURL = vi.fn(() => 'blob:test-url')
global.URL.revokeObjectURL = vi.fn()

const mockLink = {
  href: '',
  download: '',
  click: vi.fn(),
  style: {},
  setAttribute: vi.fn(),
}

global.document.createElement = vi.fn().mockImplementation((tag) => {
  if (tag === 'a') return mockLink
  return global.document.constructor.prototype.createElement.call(global.document, tag)
})

if (!global.document.body.appendChild) {
  global.document.body.appendChild = vi.fn()
}
