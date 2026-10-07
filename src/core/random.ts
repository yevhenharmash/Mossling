/** mulberry32: tiny seeded PRNG so every roll is reproducible. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** FNV-1a: turns a pet id into a stable seed. */
export function hashString(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Picks a key with probability proportional to its weight (zero weights never win). */
export function weightedPick<K extends string>(weights: Partial<Record<K, number>>, rand: () => number): K {
  const entries = (Object.entries(weights) as [K, number][]).filter(([, w]) => w > 0)
  const total = entries.reduce((sum, [, w]) => sum + w, 0)
  let roll = rand() * total
  for (const [key, w] of entries) {
    roll -= w
    if (roll < 0) return key
  }
  return entries[entries.length - 1][0]
}
