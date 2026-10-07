// Pure data types for the pet simulation. Nothing in src/core may touch the
// DOM, storage, React or the real clock — callers always pass `now`.

export type NeedKey = 'fullness' | 'warmth' | 'rest' | 'companionship'

export type Needs = Record<NeedKey, number>

export type ItemKind =
  | 'pebble'
  | 'feather'
  | 'acorn'
  | 'pinecone'
  | 'snailShell'
  | 'bluebell'
  | 'lichen'
  | 'glowcap'

export type Inventory = Partial<Record<ItemKind, number>>

export type SleepReason = 'night' | 'tired' | 'tucked'

export type Walk = {
  kind: 'walk'
  startedAt: number
  /** When the Mossling arrives back at the burrow door. */
  endsAt: number
  /** Rolled at the start so the result is deterministic. */
  finds: ItemKind[]
}

export type Pet = {
  id: string
  name: string
  bornAt: number
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
  /** Simulation is up to date as of this timestamp. */
  simulatedTo: number
}

export type Save = {
  version: 1
  pets: Pet[]
  activePetId: string
}
