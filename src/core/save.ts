import type { Pet, Save } from './types'

export const SAVE_VERSION = 1

export function newSave(pet: Pet): Save {
  return { version: SAVE_VERSION, pets: [pet], activePetId: pet.id }
}

export function activePet(save: Save): Pet {
  return save.pets.find((p) => p.id === save.activePetId) ?? save.pets[0]
}

export function withPet(save: Save, pet: Pet): Save {
  return { ...save, pets: save.pets.map((p) => (p.id === pet.id ? pet : p)) }
}

function isPet(x: unknown): x is Pet {
  if (!x || typeof x !== 'object') return false
  const p = x as Pet
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.simulatedTo === 'number' &&
    !!p.needs &&
    ['fullness', 'warmth', 'rest', 'companionship'].every(
      (k) => typeof p.needs[k as keyof Pet['needs']] === 'number',
    )
  )
}

/** Parses a stored save; returns null for anything missing or unrecognised. */
export function parseSave(raw: string | null): Save | null {
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as Save
    if (data?.version !== SAVE_VERSION || !Array.isArray(data.pets) || data.pets.length === 0) return null
    if (!data.pets.every(isPet)) return null
    return data
  } catch {
    return null
  }
}
