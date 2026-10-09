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

/** One reproducible roll in [0, 1) for this pet at this moment. `salt` separates different rolls made at the same time. */
export function rollAt(petId: string, t: number, salt: number): number {
  return seededRandom(hashString(petId) ^ Math.floor(t / 1000) ^ Math.imul(salt + 1, 0x9e3779b1))()
}
