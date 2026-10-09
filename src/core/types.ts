// Pure data types for the pet simulation. Nothing in src/core may touch the
// DOM, storage, React or the real clock — callers always pass `now`.

export const STAGES = ['spore', 'baby', 'child', 'teen', 'adult'] as const
export type Stage = (typeof STAGES)[number]

/**
 * Every form it can take, in the shape of the original P1 chart (DESIGN.md §7).
 * Comments name the P1 character each one copies.
 */
export const CHARACTERS = [
  'spore', // egg
  'speck', // Babytchi
  'sprig', // Marutchi
  'fernlet', // Tamatchi
  'burrlet', // Kuchitamatchi
  'glowcap', // Mametchi
  'fernwhisk', // Ginjirotchi
  'hoodle', // Maskutchi
  'puddock', // Kuchipatchi
  'slinkweed', // Nyorotchi
  'thistle', // Tarakotchi
  'oldLichen', // Oyajitchi / Bill (secret)
] as const
export type CharacterId = (typeof CHARACTERS)[number]

export const METERS = ['hunger', 'happy'] as const
export type Meter = (typeof METERS)[number]

/**
 * It calls you, like the original's attention icon. Meter and lights calls are
 * real and must be answered in time (or it's a care mistake). A fuss is a false
 * call: the right answer is to scold it, and ignoring it is a discipline mistake.
 */
export type CallKind = Meter | 'lights' | 'fuss'
export type Call = { kind: CallKind; since: number; until: number }

export type DeathCause = 'oldAge' | 'sickness' | 'starvation'

export type Pet = {
  id: string
  name: string
  /** 1 for the first Mossling, +1 for each one planted after a death. */
  generation: number
  plantedAt: number
  stage: Stage
  character: CharacterId
  /** P1's hidden "type 2": 3+ discipline mistakes by the time it became a teen. */
  unruly: boolean
  /** +1 every time it wakes up, like the original. */
  age: number
  /** 0–4 hearts. Fractional inside; the UI rounds up. */
  hunger: number
  happy: number
  /** 0–100, in steps of 25. */
  discipline: number
  /** Missed real calls during the current stage (they pick the next form). */
  careMistakes: number
  /** Missed calls over its whole life (they shorten it). */
  lifeMistakes: number
  /** Ignored fusses over its whole life; never reset, like the original. */
  disciplineMistakes: number
  asleep: boolean
  lightsOff: boolean
  call: Call | null
  /** Meters whose call was missed; they don't call again until refilled. */
  missed: Meter[]
  poops: number
  /** Awake ms until the next poop. */
  poopIn: number
  /** Awake ms with poop lying around. Too long and it gets sick. */
  dirtyFor: number
  /** Null when well. Untreated for too long and it dies. */
  sick: { dosesLeft: number; untreatedFor: number } | null
  /** Whether this stage's one random sickness has happened. */
  stageSickDone: boolean
  /** Ms with hunger at zero. Too long and it starves. */
  starvingFor: number
  snacks: { day: number; count: number }
  /** Last time the player did anything (a new visit can bring a fuss). */
  lastSeenAt: number
  /** Paused while away on a sleepover. */
  sleepover: { since: number; until: number } | null
  lastSleepoverEnd: number | null
  died: { at: number; cause: DeathCause } | null
  /** Simulation is up to date as of this timestamp. */
  simulatedTo: number
}

export type Grave = {
  name: string
  generation: number
  character: CharacterId
  age: number
  cause: DeathCause
  plantedAt: number
  diedAt: number
}

export type Save = {
  version: 1
  pet: Pet
  graves: Grave[]
}
