import type { CharacterId, Pet, Stage } from './types'
import { ADULT_AT_AGE, SECRET_AT_AGE, TEEN_AT_AGE } from './tuning'

export const CHARACTER_STAGE: Record<CharacterId, Stage> = {
  spore: 'spore',
  speck: 'baby',
  sprig: 'child',
  fernlet: 'teen',
  burrlet: 'teen',
  glowcap: 'adult',
  fernwhisk: 'adult',
  hoodle: 'adult',
  puddock: 'adult',
  slinkweed: 'adult',
  thistle: 'adult',
  oldLichen: 'adult',
}

/** [min, max], both inclusive. */
type Range = readonly [number, number]
const ANY: Range = [0, Infinity]

type Row = {
  from: CharacterId
  /** Matches either type when omitted. */
  unruly?: boolean
  care: Range
  discipline: Range
  to: CharacterId
}

/**
 * The P1 evolution chart, from the datamined ROM conditions (TamaTalk P1/P2
 * guide), with Mossling names. `care` counts care mistakes made in the current
 * stage; `discipline` counts discipline mistakes over its whole life. The first
 * matching row wins. Some rows can't be reached (an unruly Fernlet already has
 * 3+ discipline mistakes); they are kept as in the original.
 */
export const EVOLUTION_CHART: readonly Row[] = [
  // Sprig (Marutchi) → teen. Being unruly is decided here, too.
  { from: 'sprig', care: [0, 2], discipline: ANY, to: 'fernlet' },
  { from: 'sprig', care: [3, Infinity], discipline: ANY, to: 'burrlet' },

  // Fernlet (Tamatchi type 1) → adult.
  { from: 'fernlet', unruly: false, care: [0, 2], discipline: [0, 0], to: 'glowcap' },
  { from: 'fernlet', unruly: false, care: [0, 2], discipline: [1, 1], to: 'fernwhisk' },
  { from: 'fernlet', unruly: false, care: [0, 2], discipline: [2, Infinity], to: 'hoodle' },
  { from: 'fernlet', unruly: false, care: [3, Infinity], discipline: [0, 1], to: 'puddock' },
  { from: 'fernlet', unruly: false, care: [3, Infinity], discipline: [2, 3], to: 'slinkweed' },
  { from: 'fernlet', unruly: false, care: [3, Infinity], discipline: [4, Infinity], to: 'thistle' },

  // Fernlet (Tamatchi type 2) → adult.
  { from: 'fernlet', unruly: true, care: [0, 3], discipline: [0, 1], to: 'fernwhisk' },
  { from: 'fernlet', unruly: true, care: [0, 3], discipline: [2, Infinity], to: 'hoodle' },
  { from: 'fernlet', unruly: true, care: [4, Infinity], discipline: [0, 7], to: 'slinkweed' },
  { from: 'fernlet', unruly: true, care: [4, Infinity], discipline: [8, Infinity], to: 'thistle' },

  // Burrlet (Kuchitamatchi) → adult. Care mistakes no longer matter.
  { from: 'burrlet', unruly: false, care: ANY, discipline: [0, 1], to: 'puddock' },
  { from: 'burrlet', unruly: false, care: ANY, discipline: [2, 2], to: 'slinkweed' },
  { from: 'burrlet', unruly: false, care: ANY, discipline: [3, Infinity], to: 'thistle' },
  { from: 'burrlet', unruly: true, care: ANY, discipline: [0, 1], to: 'puddock' },
  { from: 'burrlet', unruly: true, care: ANY, discipline: [2, 5], to: 'slinkweed' },
  { from: 'burrlet', unruly: true, care: ANY, discipline: [6, Infinity], to: 'thistle' },
]

/** P1 type 2: 3+ discipline mistakes when it stops being a child. */
export const UNRULY_AT = 3

const within = (v: number, [min, max]: Range) => v >= min && v <= max

/** What it becomes at its next growth step if its record stays as it is now. Null when it has no next step. */
export function nextCharacter(pet: Pick<Pet, 'character' | 'unruly' | 'careMistakes' | 'disciplineMistakes'>): CharacterId | null {
  if (pet.character === 'spore') return 'speck'
  if (pet.character === 'speck') return 'sprig'
  if (pet.character === 'hoodle') return pet.unruly ? 'oldLichen' : null
  const row = EVOLUTION_CHART.find(
    (r) =>
      r.from === pet.character &&
      (r.unruly === undefined || r.unruly === pet.unruly) &&
      within(pet.careMistakes, r.care) &&
      within(pet.disciplineMistakes, r.discipline),
  )
  return row?.to ?? null
}

/** Age at which it takes its next step, or null if the step isn't age-based. */
export function nextStepAge(character: CharacterId): number | null {
  const stage = CHARACTER_STAGE[character]
  if (stage === 'child') return TEEN_AT_AGE
  if (stage === 'teen') return ADULT_AT_AGE
  if (character === 'hoodle') return SECRET_AT_AGE
  return null
}
