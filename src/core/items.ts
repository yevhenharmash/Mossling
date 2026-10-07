import type { Destination, ItemKind, Season, Weather } from './types'
import { DESTINATION_INFO } from './tuning'
import { seededRandom, weightedPick } from './random'

export const ITEMS: Record<ItemKind, { label: string; icon: string }> = {
  berries: { label: 'Berries', icon: '🫐' },
  mushroom: { label: 'Mushroom', icon: '🍄‍🟫' },
  pineNeedles: { label: 'Pine needles', icon: '🌿' },
  pebble: { label: 'Smooth pebble', icon: '🪨' },
  feather: { label: 'Feather', icon: '🪶' },
  acorn: { label: 'Acorn', icon: '🌰' },
  pinecone: { label: 'Pinecone', icon: '🌲' },
  snailShell: { label: 'Snail shell', icon: '🐚' },
  bluebell: { label: 'Bluebell', icon: '🪻' },
  lichen: { label: 'Curly lichen', icon: '🪸' },
  glowcap: { label: 'Glowcap', icon: '🍄' },
  icicle: { label: 'Icicle', icon: '🧊' },
  mapleLeaf: { label: 'Maple leaf', icon: '🍁' },
}

type Weights = Partial<Record<ItemKind, number>>

const BASE: Record<Destination, Weights> = {
  meadow: { berries: 4, pebble: 4, feather: 3, bluebell: 2, acorn: 2, pineNeedles: 2, lichen: 1 },
  stream: { pebble: 4, snailShell: 3, mushroom: 3, feather: 2, lichen: 2, pineNeedles: 2, berries: 2 },
  oldWoods: { mushroom: 4, pinecone: 3, pineNeedles: 3, lichen: 3, acorn: 2, glowcap: 1, feather: 1 },
}

/** Multipliers per season; `add` brings in seasonal-only items. */
const SEASONAL: Record<Season, { mul: Weights; add: Weights }> = {
  spring: { mul: { bluebell: 3, berries: 0.5, mushroom: 0.5 }, add: {} },
  summer: { mul: { berries: 2, bluebell: 0.5 }, add: {} },
  autumn: { mul: { mushroom: 2, acorn: 2, bluebell: 0 }, add: { mapleLeaf: 3 } },
  winter: { mul: { berries: 0, bluebell: 0, mushroom: 0.3, pineNeedles: 1.5 }, add: { icicle: 3 } },
}

const WEATHER: Record<Weather, { mul: Weights; add: Weights }> = {
  sunny: { mul: {}, add: {} },
  cloudy: { mul: {}, add: {} },
  rain: { mul: { snailShell: 2, mushroom: 1.5 }, add: { snailShell: 1 } },
  fog: { mul: { glowcap: 4 }, add: { glowcap: 0.5 } },
  snow: { mul: { icicle: 2 }, add: {} },
}

/** The loot table for one walk: destination × season × weather. */
export function lootTable(destination: Destination, season: Season, weather: Weather): Weights {
  const table: Weights = { ...BASE[destination] }
  for (const mod of [SEASONAL[season], WEATHER[weather]]) {
    for (const [k, w] of Object.entries(mod.add) as [ItemKind, number][]) table[k] = (table[k] ?? 0) + w
    for (const [k, m] of Object.entries(mod.mul) as [ItemKind, number][]) {
      if (table[k] !== undefined) table[k] = table[k]! * m
    }
  }
  return table
}

export function rollFinds(seed: number, destination: Destination, season: Season, weather: Weather, extra = 0): ItemKind[] {
  const rand = seededRandom(seed)
  const [min, max] = DESTINATION_INFO[destination].finds
  const count = min + Math.floor(rand() * (max - min + 1)) + extra
  const table = lootTable(destination, season, weather)
  return Array.from({ length: count }, () => weightedPick(table, rand))
}
