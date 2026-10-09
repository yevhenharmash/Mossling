import type { CallKind, CharacterId, DeathCause, Meter, Pet } from './types'
import { METERS } from './types'
import { CHARACTER_STAGE, nextCharacter, nextStepAge, UNRULY_AT } from './characters'
import { rollAt } from './random'
import {
  BABY_GROWS_AFTER,
  CALL_WINDOW,
  CHARACTER_STATS,
  DAY,
  HOUR,
  LIFESPAN,
  MAX_POOPS,
  MIN_LIFESPAN,
  MISTAKES_PER_YEAR,
  POOP_EVERY,
  POOP_SICK_AFTER,
  RANDOM_SICK_PER_HOUR,
  SICK_DEATH_AFTER,
  SPORE_HATCHES_AFTER,
  STARVE_DEATH_AFTER,
  STEP,
} from './tuning'

const ROLL_SICK = 1

export function createPet(id: string, name: string, now: number, generation = 1): Pet {
  return {
    id,
    name,
    generation,
    plantedAt: now,
    stage: 'spore',
    character: 'spore',
    unruly: false,
    age: 0,
    hunger: 0,
    happy: 0,
    discipline: 0,
    careMistakes: 0,
    lifeMistakes: 0,
    disciplineMistakes: 0,
    asleep: false,
    lightsOff: false,
    call: null,
    missed: [],
    poops: 0,
    poopIn: POOP_EVERY.baby,
    dirtyFor: 0,
    sick: null,
    stageSickDone: false,
    starvingFor: 0,
    snacks: { day: dayIndex(now), count: 0 },
    lastSeenAt: now,
    sleepover: null,
    lastSleepoverEnd: null,
    died: null,
    simulatedTo: now,
  }
}

/** Deep enough copy that no nested field is shared with the original. */
export function clonePet(p: Pet): Pet {
  return {
    ...p,
    call: p.call ? { ...p.call } : null,
    missed: [...p.missed],
    sick: p.sick ? { ...p.sick } : null,
    snacks: { ...p.snacks },
    sleepover: p.sleepover ? { ...p.sleepover } : null,
    died: p.died ? { ...p.died } : null,
  }
}

/** Local calendar day number, for "per day" limits. */
export function dayIndex(t: number): number {
  const d = new Date(t)
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY
}

/** Whether its schedule has it asleep at `t` (local time). Spores and babies never sleep. */
export function sleepTime(character: CharacterId, t: number): boolean {
  const { wake, sleep } = CHARACTER_STATS[character]
  if (wake === null || sleep === null) return false
  const d = new Date(t)
  const h = d.getHours() + d.getMinutes() / 60
  return h >= sleep || h < wake
}

/** Its natural lifespan in years of age. Every 2 care mistakes cost one. */
export function lifespan(pet: Pick<Pet, 'lifeMistakes'>): number {
  return Math.max(MIN_LIFESPAN, LIFESPAN - Math.floor(pet.lifeMistakes / MISTAKES_PER_YEAR))
}

export function openCall(p: Pet, kind: CallKind, t: number) {
  p.call = { kind, since: t, until: t + CALL_WINDOW }
}

export function getSick(p: Pet) {
  if (!p.sick) p.sick = { dosesLeft: CHARACTER_STATS[p.character].doses, untreatedFor: 0 }
}

function die(p: Pet, cause: DeathCause, t: number) {
  p.died = { at: t, cause }
  p.call = null
  p.asleep = false
}

function becomes(p: Pet, character: CharacterId) {
  const stage = CHARACTER_STAGE[character]
  if (p.stage === 'child' && stage === 'teen') p.unruly = p.disciplineMistakes >= UNRULY_AT
  // Care mistakes count per stage; the baby's count carries into childhood.
  if (p.stage !== 'baby') p.careMistakes = 0
  p.character = character
  p.stage = stage
  p.stageSickDone = false
}

function wakeUp(p: Pet, t: number) {
  p.age += 1
  if (p.age >= lifespan(p)) return die(p, 'oldAge', t)
  p.asleep = false
  p.lightsOff = false
  const stepAge = nextStepAge(p.character)
  if (stepAge !== null && p.age >= stepAge) {
    const next = nextCharacter(p)
    if (next) becomes(p, next)
  }
}

function fallAsleep(p: Pet, t: number) {
  p.asleep = true
  // Whatever it wanted can wait until morning; the lights can't.
  p.call = null
  if (!p.lightsOff) openCall(p, 'lights', t)
}

function expireCall(p: Pet, t: number) {
  if (!p.call || t < p.call.until) return
  const { kind } = p.call
  p.call = null
  if (kind === 'fuss') {
    p.disciplineMistakes += 1
    return
  }
  p.careMistakes += 1
  p.lifeMistakes += 1
  if (kind !== 'lights') p.missed.push(kind)
}

/** One step of `dt` ms ending at `t`. Mutates `p`. */
function step(p: Pet, t: number, dt: number) {
  if (p.character === 'spore') {
    if (t - p.plantedAt >= SPORE_HATCHES_AFTER) becomes(p, 'speck')
    return
  }
  if (p.character === 'speck' && t - p.plantedAt >= SPORE_HATCHES_AFTER + BABY_GROWS_AFTER) becomes(p, 'sprig')

  const shouldSleep = sleepTime(p.character, t)
  if (p.asleep && !shouldSleep) wakeUp(p, t)
  else if (!p.asleep && shouldSleep) fallAsleep(p, t)
  if (p.died) return

  const stats = CHARACTER_STATS[p.character]
  if (!p.asleep) {
    p.hunger = Math.max(0, p.hunger - dt / (stats.hungerHours * HOUR))
    p.happy = Math.max(0, p.happy - dt / (stats.happyHours * HOUR))

    p.poopIn -= dt
    if (p.poopIn <= 0) {
      p.poops = Math.min(MAX_POOPS, p.poops + 1)
      p.poopIn += POOP_EVERY[p.stage]
    }
    if (p.poops > 0) p.dirtyFor += dt
    if (p.dirtyFor >= POOP_SICK_AFTER && !p.sick) {
      getSick(p)
      p.dirtyFor = 0
    }
    if (!p.stageSickDone && !p.sick && rollAt(p.id, t, ROLL_SICK) < (RANDOM_SICK_PER_HOUR[p.stage] * dt) / HOUR) {
      getSick(p)
      p.stageSickDone = true
    }
  }

  p.missed = p.missed.filter((m) => p[m] <= 0)
  expireCall(p, t)
  if (!p.asleep && (!p.call || p.call.kind === 'fuss')) {
    // A real need replaces a fuss: it stops fibbing when it's actually hungry.
    const empty = METERS.find((m: Meter) => p[m] <= 0 && !p.missed.includes(m))
    if (empty) openCall(p, empty, t)
  }

  if (p.sick) {
    p.sick.untreatedFor += dt
    if (p.sick.untreatedFor >= SICK_DEATH_AFTER) return die(p, 'sickness', t)
  }
  p.starvingFor = p.hunger <= 0 ? p.starvingFor + dt : 0
  if (p.starvingFor >= STARVE_DEATH_AFTER) die(p, 'starvation', t)
}

/** Back from a sleepover at `t`: time stood still while it was away, and it comes home ready for bed if it's night. Mutates `p`. */
export function comeHome(p: Pet, t: number) {
  p.sleepover = null
  p.lastSleepoverEnd = t
  p.simulatedTo = t
  p.asleep = sleepTime(p.character, t)
  p.lightsOff = p.asleep
}

/** Brings the pet up to `now`, replaying any time it spent alone. */
export function simulate(pet: Pet, now: number): Pet {
  if (pet.died || now <= pet.simulatedTo) return pet
  const p = clonePet(pet)

  if (p.sleepover) {
    if (now < p.sleepover.until) {
      p.simulatedTo = now
      return p
    }
    comeHome(p, p.sleepover.until)
  }

  let t = p.simulatedTo
  while (t < now && !p.died) {
    const dt = Math.min(STEP, now - t)
    t += dt
    step(p, t, dt)
  }
  p.simulatedTo = now
  return p
}
