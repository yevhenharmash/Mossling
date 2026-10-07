// The only place the UI reads the real clock. In dev builds a persisted offset
// lets you fast-forward time; it goes through the same simulate() path.

const OFFSET_KEY = 'mossling.debugOffset'

function readOffset(): number {
  if (!import.meta.env.DEV) return 0
  try {
    return Number(localStorage.getItem(OFFSET_KEY)) || 0
  } catch {
    return 0
  }
}

let offset = readOffset()

function writeOffset(value: number) {
  offset = value
  try {
    localStorage.setItem(OFFSET_KEY, String(value))
  } catch {
    // ignore
  }
}

export const clock = {
  now: () => Date.now() + offset,
  offset: () => offset,
  skip: (ms: number) => writeOffset(offset + ms),
  reset: () => writeOffset(0),
}
