// Pure data types for the pet simulation. Nothing in src/core may touch the
// DOM, storage, React or the real clock — callers always pass `now`.

export const NEED_KEYS = ['fullness', 'warmth', 'rest', 'companionship'] as const
export type NeedKey = (typeof NEED_KEYS)[number]
export type Needs = Record<NeedKey, number>

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const
export type Season = (typeof SEASONS)[number]

export const WEATHERS = ['sunny', 'cloudy', 'rain', 'fog', 'snow'] as const
export type Weather = (typeof WEATHERS)[number]

export type Hemisphere = 'north' | 'south'

export const STAGES = ['sprout', 'young', 'grown', 'elder'] as const
export type Stage = (typeof STAGES)[number]

export const FORMS = ['wanderer', 'dreamer', 'foodie', 'homebody'] as const
export type Form = (typeof FORMS)[number]

export const DESTINATIONS = ['meadow', 'stream', 'oldWoods'] as const
export type Destination = (typeof DESTINATIONS)[number]

export const PANTRY_ITEMS = ['berries', 'mushroom', 'pineNeedles'] as const
export type PantryItem = (typeof PANTRY_ITEMS)[number]

export const COLLECTIBLES = [
  'pebble',
  'feather',
  'acorn',
  'pinecone',
  'snailShell',
  'bluebell',
  'lichen',
  'glowcap',
  'icicle',
  'mapleLeaf',
] as const
export type Collectible = (typeof COLLECTIBLES)[number]

export type ItemKind = PantryItem | Collectible
export type Inventory = Partial<Record<ItemKind, number>>

export const FOOD_KINDS = ['porridge', 'berries', 'soup', 'tea'] as const
export type Food = (typeof FOOD_KINDS)[number]

export type SleepReason = 'night' | 'tired' | 'tucked'

export type Walk = {
  kind: 'walk'
  destination: Destination
  startedAt: number
  /** When the Mossling arrives back at the burrow door. */
  endsAt: number
  /** Rolled at the start so the result is deterministic. */
  finds: ItemKind[]
}

export const WISH_KINDS = ['story', 'hug', 'gift', 'food', 'walk'] as const
export type WishKind = (typeof WISH_KINDS)[number]

export type Wish = {
  /** Local day index the wish belongs to. */
  day: number
  kind: WishKind
  food?: Food
  destination?: Destination
  done: boolean
}

export const DISCOVERIES = ['favoriteFood', 'dislikedFood', 'favoriteStory', 'favoriteItem'] as const
export type Discovery = (typeof DISCOVERIES)[number]

export type JournalKind =
  | 'hatched'
  | 'stage'
  | 'form'
  | 'firstWalk'
  | 'discovered'
  | 'sniffles'
  | 'healed'
  | 'wandered'
  | 'found'
  | 'season'
  | 'firstSnow'
  | 'bond'

export type JournalEntry = { at: number; kind: JournalKind; detail?: string }

/** Per-day caps so progression can't be farmed. Reset when the local day changes. */
export type Daily = {
  day: number
  goodDay: boolean
  walkBonds: number
  favorites: Discovery[]
}

export type Pet = {
  id: string
  name: string
  bornAt: number
  hemisphere: Hemisphere
  needs: Needs
  asleep: SleepReason | null
  activity: Walk | null
  /** Last time the player did something with it (used for bedtime). */
  lastInteractionAt: number
  /** When companionship first hit the floor in the current lonely streak. */
  lonelySince: number | null
  /** Set when it wanders off; cleared when the player finds it. */
  wanderedOffAt: number | null
  inventory: Inventory
  stage: Stage
  form: Form | null
  /** Accumulated play-style points; the top one decides the form. */
  traits: Record<Form, number>
  bond: number
  sniffles: { since: number } | null
  /** Can't catch the sniffles again before this (after getting better). */
  immuneUntil: number
  /** Hours spent at or below the chill line in the current cold spell. */
  chillHours: number
  delightUntil: number
  known: Partial<Record<Discovery, true>>
  wish: Wish | null
  daily: Daily
  /** Season as of `simulatedTo`, to journal season changes. */
  season: Season
  seenSnow: boolean
  walks: number
  journal: JournalEntry[]
  /** Simulation is up to date as of this timestamp. */
  simulatedTo: number
}

export type Save = {
  version: 2
  pets: Pet[]
  activePetId: string
}
