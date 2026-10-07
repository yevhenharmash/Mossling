import type { Inventory, ItemKind, Pet, Save } from './types'
import { NEED_KEYS } from './types'
import { dayIndex, seasonAt } from './calendar'
import { emptyTraits, stageAt } from './growth'
import { rollWish } from './prefs'
import { STARTING_PANTRY } from './tuning'

export const SAVE_VERSION = 2

export function newSave(pet: Pet): Save {
  return { version: SAVE_VERSION, pets: [pet], activePetId: pet.id }
}

export function activePet(save: Save): Pet {
  return save.pets.find((p) => p.id === save.activePetId) ?? save.pets[0]
}

export function withPet(save: Save, pet: Pet): Save {
  return { ...save, pets: save.pets.map((p) => (p.id === pet.id ? pet : p)) }
}

type PetV1 = Pick<
  Pet,
  'id' | 'name' | 'bornAt' | 'needs' | 'asleep' | 'lastInteractionAt' | 'lonelySince' | 'wanderedOffAt' | 'simulatedTo'
> & {
  inventory: Record<string, number>
  activity: { kind: 'walk'; startedAt: number; endsAt: number; finds: string[] } | null
}

/** v1 (MVP) → v2: keep everything it had, fill in the new systems as if it was just met. */
export function migratePetV1(old: PetV1): Pet {
  const t = old.simulatedTo
  const pet: Pet = {
    id: old.id,
    name: old.name,
    bornAt: old.bornAt,
    hemisphere: 'north',
    needs: { ...old.needs },
    asleep: old.asleep,
    // v1 item kinds are all still valid v2 kinds.
    activity: old.activity ? { ...old.activity, destination: 'meadow', finds: old.activity.finds as ItemKind[] } : null,
    lastInteractionAt: old.lastInteractionAt,
    lonelySince: old.lonelySince,
    wanderedOffAt: old.wanderedOffAt,
    inventory: { ...STARTING_PANTRY, ...(old.inventory as Inventory) },
    stage: stageAt(old.bornAt, t),
    form: null,
    traits: emptyTraits(),
    bond: 0,
    sniffles: null,
    immuneUntil: 0,
    chillHours: 0,
    delightUntil: 0,
    known: {},
    wish: null,
    daily: { day: dayIndex(t), goodDay: false, walkBonds: 0, favorites: [] },
    season: seasonAt(t, 'north'),
    seenSnow: false,
    walks: 0,
    journal: [{ at: old.bornAt, kind: 'hatched' }],
    simulatedTo: t,
  }
  // Someone who already raised it past sprout gets a form from day one.
  if (pet.stage !== 'sprout') pet.form = 'homebody'
  pet.wish = rollWish(pet, pet.daily.day)
  return pet
}

function isPetLike(x: unknown): x is PetV1 {
  if (!x || typeof x !== 'object') return false
  const p = x as PetV1
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.bornAt === 'number' &&
    typeof p.simulatedTo === 'number' &&
    !!p.needs &&
    NEED_KEYS.every((k) => typeof p.needs[k] === 'number')
  )
}

/** Parses a stored save (migrating older versions); null for anything unrecognised. */
export function parseSave(raw: string | null): Save | null {
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as { version?: number; pets?: unknown[]; activePetId?: string }
    if (!Array.isArray(data?.pets) || data.pets.length === 0 || !data.pets.every(isPetLike)) return null
    if (data.version === 1) {
      const pets = (data.pets as PetV1[]).map(migratePetV1)
      return { version: SAVE_VERSION, pets, activePetId: data.activePetId ?? pets[0].id }
    }
    if (data.version !== SAVE_VERSION) return null
    return data as Save
  } catch {
    return null
  }
}
