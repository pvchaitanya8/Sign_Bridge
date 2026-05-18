import '@testing-library/jest-dom'
import { vi } from 'vitest'

// jsdom does not implement scrollIntoView — mock it globally so any
// component that calls bottomRef.current?.scrollIntoView() doesn't throw.
window.HTMLElement.prototype.scrollIntoView = vi.fn()
