import type { Pet } from './types'
import { clonePet, comeHome, dayIndex, getSick, openCall, simulate } from './sim'
import { hashString, rollAt, seededRandom } from './random'
import {
  CHARACTER_STATS,
  DISCIPLINE_STEP,
  FUSS_CHANCE,
  GAME_ROUNDS,
  GAME_WIN_AT,
  LIGHTS_EARLY,
  MAX_HEARTS,
  MEAL_REFUSE_AT,
  SLEEPOVER_COOLDOWN,
  SLEEPOVER_MAX,
  SNACKS_PER_DAY,
  VISIT_GAP,
} from './tuning'

export type Refusal =
  | 'gone'
  | 'unhatched'
  | 'asleep'
  | 'fussing'
  | 'full'
  | 'nothingToClean'
  | 'notSick'
  | 'notBedtime'
  | 'away'
  | 'tooYoung'
  | 'sick'
  | 'calling'
  | 'tooSoon'
  | 'home'

export type Note = 'tummyAche' | 'unfair' | 'cured' | 'lostGame' | 'wonGame'

export type ActionResult = { ok: true; pet: Pet; notes: Note[] } | { ok: false; pet: Pet; refusal: Refusal }

const ROLL_FUSS = 2

export type Side = 'left' | 'right'

/** Where it will peek out in each round of a game started at `startedAt`. Fixed up front so the result can be checked. */
export function gameSides(petId: string, startedAt: number): Side[] {
  const rand = seededRandom(hashString(petId) ^ Math.floor(startedAt / 1000))
  return Array.from({ length: GAME_ROUNDS }, () => (rand() < 0.5 ? 'left' : 'right'))
}

/**
 * Whether the lights can go off now: it's asleep, or bedtime is close. Before it
 * grows into a Sprig, the Sprig's bedtime counts, so an evening planting can end
 * with the lights already off.
 */
export function canLightsOff(p: Pet, now: number): boolean {
  if (p.asleep) return true
  const young = p.character === 'spore' || p.character === 'speck'
  const { sleep } = CHARACTER_STATS[young ? 'sprig' : p.character]
  if (sleep === null) return false
  const bed = new Date(now)
  bed.setHours(sleep, 0, 0, 0)
  return now >= bed.getTime() - LIGHTS_EARLY
}

/** Whether a sleepover can start now, or why not. */
export function sleepoverBlocker(p: Pet, now: number): Refusal | null {
  if (p.died) return 'gone'
  if (p.sleepover) return 'away'
  if (p.stage === 'spore' || p.stage === 'baby') return 'tooYoung'
  if (p.sick) return 'sick'
  if (p.call) return 'calling'
  if (p.lastSleepoverEnd !== null && now < p.lastSleepoverEnd + SLEEPOVER_COOLDOWN) return 'tooSoon'
  return null
}

/**
 * You open the app or tap something: bring it up to date, and if you've been
 * away a while, this is a new visit, which is when it might fuss (P1's false call).
 * Fussing only while you're there fixes the original's need for constant watching.
 */
export function arrive(pet: Pet, now: number): Pet {
  const p = clonePet(simulate(pet, now))
  if (p.died || p.sleepover) return p
  const newVisit = now - p.lastSeenAt >= VISIT_GAP
  p.lastSeenAt = now
  const canFuss = !p.asleep && !p.call && !p.sick && p.discipline < 100 && (p.stage === 'child' || p.stage === 'teen' || p.stage === 'adult')
  if (newVisit && canFuss && rollAt(p.id, now, ROLL_FUSS) < FUSS_CHANCE) openCall(p, 'fuss', now)
  return p
}

type Rule = (p: Pet, now: number) => Refusal | null

const alive: Rule = (p) => (p.died ? 'gone' : p.sleepover ? 'away' : p.stage === 'spore' ? 'unhatched' : null)
const awake: Rule = (p, now) => alive(p, now) ?? (p.asleep ? 'asleep' : null)
const behaving: Rule = (p, now) => awake(p, now) ?? (p.call?.kind === 'fuss' ? 'fussing' : null)

/** Shared shape of every action: catch up, check the rules, then change a copy. */
function act(pet: Pet, now: number, rule: Rule, change: (p: Pet, notes: Note[]) => Refusal | void): ActionResult {
  const p = arrive(pet, now)
  const blocked = rule(p, now)
  if (blocked) return { ok: false, pet: p, refusal: blocked }
  const notes: Note[] = []
  const refused = change(p, notes)
  if (refused) return { ok: false, pet: p, refusal: refused }
  answerMeterCalls(p)
  return { ok: true, pet: p, notes }
}

/** A meter call is answered as soon as that meter isn't empty any more. */
function answerMeterCalls(p: Pet) {
  if ((p.call?.kind === 'hunger' || p.call?.kind === 'happy') && p[p.call.kind] > 0) p.call = null
}

export function meal(pet: Pet, now: number): ActionResult {
  return act(pet, now, behaving, (p) => {
    if (p.hunger >= MEAL_REFUSE_AT) return 'full'
    p.hunger = Math.min(MAX_HEARTS, p.hunger + 1)
  })
}

/** +1 happy, like P1. More than a few a day gives it a tummy ache (this replaces P1's weight). */
export function snack(pet: Pet, now: number): ActionResult {
  return act(pet, now, behaving, (p, notes) => {
    const today = dayIndex(now)
    if (p.snacks.day !== today) p.snacks = { day: today, count: 0 }
    p.snacks.count += 1
    p.happy = Math.min(MAX_HEARTS, p.happy + 1)
    if (p.snacks.count > SNACKS_PER_DAY && !p.sick) {
      getSick(p)
      notes.push('tummyAche')
    }
  })
}

/** Snacks it can still have today without a tummy ache. */
export function snacksLeft(p: Pet, now: number): number {
  return p.snacks.day === dayIndex(now) ? Math.max(0, SNACKS_PER_DAY - p.snacks.count) : SNACKS_PER_DAY
}

/** The left/right game. `guesses` are checked against `gameSides`; 3 of 5 right gives +1 happy. */
export function play(pet: Pet, startedAt: number, guesses: Side[], now: number): ActionResult {
  return act(pet, now, behaving, (p, notes) => {
    const sides = gameSides(p.id, startedAt)
    const wins = sides.filter((s, i) => guesses[i] === s).length
    if (startedAt <= now && guesses.length === GAME_ROUNDS && wins >= GAME_WIN_AT) {
      p.happy = Math.min(MAX_HEARTS, p.happy + 1)
      notes.push('wonGame')
    } else notes.push('lostGame')
  })
}

export function clean(pet: Pet, now: number): ActionResult {
  return act(pet, now, alive, (p) => {
    if (p.poops === 0) return 'nothingToClean'
    p.poops = 0
    p.dirtyFor = 0
  })
}

export function medicine(pet: Pet, now: number): ActionResult {
  return act(pet, now, alive, (p, notes) => {
    if (!p.sick) return 'notSick'
    p.sick.dosesLeft -= 1
    if (p.sick.dosesLeft <= 0) {
      p.sick = null
      notes.push('cured')
    }
  })
}

export function lights(pet: Pet, now: number): ActionResult {
  return act(pet, now, alive, (p) => {
    if (p.lightsOff) {
      p.lightsOff = false
      return
    }
    if (!canLightsOff(p, now)) return 'notBedtime'
    p.lightsOff = true
    if (p.call?.kind === 'lights') p.call = null
  })
}

/** P1's discipline button: right during a fuss (+25%), unfair otherwise (−1 happy). */
export function scold(pet: Pet, now: number): ActionResult {
  return act(pet, now, awake, (p, notes) => {
    if (p.call?.kind === 'fuss') {
      p.discipline = Math.min(100, p.discipline + DISCIPLINE_STEP)
      p.call = null
      return
    }
    p.happy = Math.max(0, p.happy - 1)
    notes.push('unfair')
  })
}

/** The pause the original lacked: time stands still while it's away, for up to 3 days. */
export function startSleepover(pet: Pet, now: number): ActionResult {
  const p = arrive(pet, now)
  const blocked = sleepoverBlocker(p, now)
  if (blocked) return { ok: false, pet: p, refusal: blocked }
  p.sleepover = { since: now, until: now + SLEEPOVER_MAX }
  return { ok: true, pet: p, notes: [] }
}

export function endSleepover(pet: Pet, now: number): ActionResult {
  if (!pet.sleepover) return { ok: false, pet, refusal: 'home' }
  const p = clonePet(simulate(pet, now))
  if (p.sleepover) comeHome(p, now)
  return { ok: true, pet: arrive(p, now), notes: [] }
}
