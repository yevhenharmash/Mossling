import type { CallKind, CharacterId, DeathCause, Note, Refusal } from '../core'

export const CHARACTER_INFO: Record<CharacterId, { name: string; blurb: string }> = {
  spore: { name: 'Spore', blurb: 'A glowing spore, nestled in moss.' },
  speck: { name: 'Speck', blurb: 'Just hatched, and hungry for everything.' },
  sprig: { name: 'Sprig', blurb: 'A little sprout on stubby legs.' },
  fernlet: { name: 'Fernlet', blurb: 'Well looked after: neat leaf ears and a shiny cap.' },
  burrlet: { name: 'Burrlet', blurb: 'A bit scruffy, with burrs in its moss.' },
  glowcap: { name: 'Glowcap', blurb: 'The best of them: a glowing mushroom and not a fib in it.' },
  fernwhisk: { name: 'Fernwhisk', blurb: 'Gentle and well cared for, but it has a cheeky streak.' },
  hoodle: { name: 'Hoodle', blurb: 'Sleeps late, wraps itself up, does what it likes.' },
  puddock: { name: 'Puddock', blurb: 'Round, easy-going, always peckish.' },
  slinkweed: { name: 'Slinkweed', blurb: 'Long and green and hard to pin down.' },
  thistle: { name: 'Thistle', blurb: 'Prickly. Nobody quite taught it manners.' },
  oldLichen: { name: 'Old Lichen', blurb: 'The secret one: a wise old elder with a lichen beard.' },
}

import type { IconId } from './icons'

/** Shown on the tag when the A button moves the cursor onto an icon. */
export const ICON_HINTS: Record<Exclude<IconId, 'attention'>, string> = {
  feed: 'Feed: a meal fills a heart of hunger, a snack a heart of happy.',
  lights: 'Lights: turn them off when it falls asleep.',
  play: 'Play: guess which side it peeks out. 3 of 5 right gives a heart of happy.',
  medicine: 'Medicine: only when it’s sick.',
  clean: 'Clean: sweep up its mess before it makes it sick.',
  status: 'Status: its hearts, discipline and age, page by page.',
  scold: '“Not now”: only when it calls with nothing wrong. Scolding it otherwise hurts its feelings.',
}

export const CALL_LINES: Record<CallKind, string> = {
  hunger: 'is calling: its tummy is empty!',
  happy: 'is calling: it’s miserable and wants attention!',
  lights: 'fell asleep with the lights on. Turn them off!',
  fuss: 'is calling… but everything looks fine. Is it fibbing?',
}

export const REFUSAL_LINES: Record<Refusal, string> = {
  gone: 'It’s gone.',
  unhatched: 'The spore hasn’t hatched yet. Wait a few minutes.',
  asleep: 'Shh, it’s asleep.',
  fussing: 'It turns its nose up. It’s fussing, not hungry. Tell it “not now”.',
  full: 'It shakes its head. It’s full.',
  nothingToClean: 'Nothing to clean up.',
  notSick: 'It isn’t sick.',
  notBedtime: 'Too early for lights out (up to 4 hours before bedtime).',
  away: 'It’s away on a sleepover.',
  tooYoung: 'Too little for a sleepover.',
  sick: 'Not while it’s sick.',
  calling: 'Answer its call first.',
  tooSoon: 'It only just got back. Give it a day at home.',
  home: 'It’s already home.',
}

export const NOTE_LINES: Record<Note, string> = {
  tummyAche: 'Too many snacks: it has a tummy ache. Give it medicine.',
  unfair: 'It wasn’t misbehaving. It looks hurt.',
  cured: 'All better!',
  wonGame: 'You won! It’s delighted.',
  lostGame: 'It got away from you. Try again?',
}

export const DEATH_LINES: Record<DeathCause, string> = {
  oldAge: 'lived a long life and fell asleep for the last time.',
  sickness: 'was sick for too long without medicine.',
  starvation: 'went too long without food.',
}

export const RISK_LINES: Record<Exclude<DeathCause, 'oldAge'>, string> = {
  sickness: 'It’s fading from sickness. Give it medicine.',
  starvation: 'It’s fading from hunger. Feed it.',
}

export function withName(name: string, line: string): string {
  return `${name} ${line}`
}

export function duration(ms: number): string {
  const h = Math.max(0, Math.round(ms / 3_600_000))
  return h < 1 ? 'under an hour' : h === 1 ? '1 hour' : `${h} hours`
}
