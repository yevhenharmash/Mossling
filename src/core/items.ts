import type { ItemKind } from './types'

export const ITEMS: Record<ItemKind, { label: string; icon: string; weight: number }> = {
  pebble: { label: 'Smooth pebble', icon: '🪨', weight: 5 },
  feather: { label: 'Feather', icon: '🪶', weight: 4 },
  acorn: { label: 'Acorn', icon: '🌰', weight: 4 },
  pinecone: { label: 'Pinecone', icon: '🌲', weight: 4 },
  snailShell: { label: 'Snail shell', icon: '🐚', weight: 2 },
  bluebell: { label: 'Bluebell', icon: '🔔', weight: 2 },
  lichen: { label: 'Curly lichen', icon: '🌿', weight: 3 },
  glowcap: { label: 'Glowcap mushroom', icon: '🍄', weight: 1 },
}

const KINDS = Object.keys(ITEMS) as ItemKind[]
const TOTAL_WEIGHT = KINDS.reduce((sum, k) => sum + ITEMS[k].weight, 0)

/** mulberry32 — tiny seeded PRNG so walk finds are reproducible. */
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

export function pickItem(rand: () => number): ItemKind {
  let roll = rand() * TOTAL_WEIGHT
  for (const kind of KINDS) {
    roll -= ITEMS[kind].weight
    if (roll < 0) return kind
  }
  return KINDS[KINDS.length - 1]
}

export function rollFinds(seed: number, min: number, max: number): ItemKind[] {
  const rand = seededRandom(seed)
  const count = min + Math.floor(rand() * (max - min + 1))
  return Array.from({ length: count }, () => pickItem(rand))
}
