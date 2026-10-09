import type { Grave, Pet, Save } from './types'
import { CHARACTERS } from './types'
import { createPet } from './sim'

export const SAVE_VERSION = 1

export function newSave(pet: Pet): Save {
  return { version: SAVE_VERSION, pet, graves: [] }
}

/** Reads a stored save. Anything that isn't a current save (including old prototypes) reads as no save. */
export function parseSave(raw: string | null): Save | null {
  if (!raw) return null
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof data !== 'object' || data === null) return null
  const save = data as Partial<Save>
  if (save.version !== SAVE_VERSION || !Array.isArray(save.graves)) return null
  const pet = save.pet as Partial<Pet> | undefined
  if (!pet || typeof pet.id !== 'string' || typeof pet.simulatedTo !== 'number' || !CHARACTERS.includes(pet.character as never)) return null
  return save as Save
}

export function graveOf(p: Pet): Grave | null {
  if (!p.died) return null
  return {
    name: p.name,
    generation: p.generation,
    character: p.character,
    age: p.age,
    cause: p.died.cause,
    plantedAt: p.plantedAt,
    diedAt: p.died.at,
  }
}

/** After a death: the old one gets a gravestone and a new spore is planted. */
export function plantAgain(save: Save, id: string, name: string, now: number): Save {
  const grave = graveOf(save.pet)
  return {
    ...save,
    pet: createPet(id, name, now, save.pet.generation + 1),
    graves: grave ? [...save.graves, grave] : save.graves,
  }
}
