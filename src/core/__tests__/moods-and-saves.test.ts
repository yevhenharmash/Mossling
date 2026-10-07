import { describe, expect, it } from 'vitest'
import {
  MINUTE,
  MOODS,
  collectFinds,
  feed,
  findMossling,
  give,
  hug,
  moodOf,
  newSave,
  parseSave,
  setHemisphere,
  simulate,
  startWalk,
  tellStory,
  tuckIn,
  wake,
  type Mood,
  type Pet,
} from '../index'
import { at, basicVisit, petAt } from './helpers'

const NOW = at(10, 6, 12)
const base = (): Pet => basicVisit(petAt(NOW - MINUTE, 'young'), NOW)
const needs = (v: Partial<Pet['needs']>) => (p: Pet): Pet => ({ ...p, needs: { ...p.needs, ...v } })

// One scenario per mood. `satisfies Record<Mood, …>` makes the typecheck fail
// if a mood is added without a test.
const SCENARIOS = {
  away: (p) => ({ ...p, wanderedOffAt: NOW - MINUTE }),
  walking: (p) => ({ ...p, activity: { kind: 'walk', destination: 'meadow', startedAt: NOW - MINUTE, endsAt: NOW + MINUTE, finds: [] } }),
  atDoor: (p) => ({ ...p, activity: { kind: 'walk', destination: 'meadow', startedAt: NOW - 30 * MINUTE, endsAt: NOW - MINUTE, finds: [] } }),
  asleep: (p) => ({ ...p, asleep: 'tucked' }),
  sniffly: (p) => ({ ...p, sniffles: { since: NOW } }),
  delighted: (p) => ({ ...p, delightUntil: NOW + MINUTE }),
  hungry: needs({ fullness: 20 }),
  cold: needs({ warmth: 20 }),
  sleepy: needs({ rest: 20 }),
  lonely: needs({ companionship: 20 }),
  restless: needs({ fullness: 45 }),
  content: (p) => p,
} satisfies Record<Mood, (p: Pet) => Pet>

describe('moods', () => {
  it.each([...MOODS])('%s', (mood) => {
    expect(moodOf(SCENARIOS[mood](base()), NOW)).toBe(mood)
  })

  it('priority: each mood beats every mood listed after it', () => {
    for (let i = 0; i < MOODS.length; i++) {
      for (let j = i + 1; j < MOODS.length; j++) {
        // Apply the lower-priority state first, then the higher one on top.
        const p = SCENARIOS[MOODS[i]](SCENARIOS[MOODS[j]](base()))
        expect(moodOf(p, NOW), `${MOODS[i]} over ${MOODS[j]}`).toBe(MOODS[i])
      }
    }
  })
})

describe('actions never mutate the pet you pass in', () => {
  const actions: Record<string, (p: Pet) => unknown> = {
    simulate: (p) => simulate(p, NOW + 3 * 24 * 60 * MINUTE),
    feed: (p) => feed({ ...p }, 'soup', NOW),
    hug: (p) => hug(p, NOW),
    story: (p) => tellStory(p, 1, NOW),
    tuckIn: (p) => tuckIn(p, NOW),
    wake: (p) => wake({ ...p }, NOW),
    give: (p) => give(p, 'pebble', NOW),
    walk: (p) => startWalk(p, 'meadow', NOW),
    collect: (p) => collectFinds(p, NOW + 60 * MINUTE),
    find: (p) => findMossling(p, NOW),
    hemisphere: (p) => setHemisphere(p, 'south', NOW),
  }
  it.each(Object.keys(actions))('%s', (name) => {
    const p: Pet = { ...base(), inventory: { ...base().inventory, pebble: 2 } }
    const walking = startWalk(p, 'meadow', NOW).pet
    for (const subject of [p, walking, SCENARIOS.away(p)]) {
      const snapshot = JSON.stringify(subject)
      actions[name](subject)
      expect(JSON.stringify(subject)).toBe(snapshot)
    }
  })
})

describe('hemisphere setting', () => {
  it('switching hemispheres changes the season without journaling a "new season"', () => {
    const p = base()
    const south = setHemisphere(p, 'south', NOW)
    expect(south.season).toBe('spring')
    expect(south.journal.filter((e) => e.kind === 'season')).toEqual(p.journal.filter((e) => e.kind === 'season'))
  })
})

describe('saves', () => {
  it('round-trips v2 and rejects garbage', () => {
    const save = newSave(base())
    expect(parseSave(JSON.stringify(save))).toEqual(save)
    expect(parseSave(null)).toBeNull()
    expect(parseSave('{nope')).toBeNull()
    expect(parseSave(JSON.stringify({ version: 99, pets: [base()] }))).toBeNull()
    expect(parseSave(JSON.stringify({ version: 2, pets: [] }))).toBeNull()
  })

  it('migrates a literal v1 (MVP) save without losing the Mossling', () => {
    const born = at(10, 1, 10)
    const v1 = {
      version: 1,
      activePetId: 'old-1',
      pets: [
        {
          id: 'old-1',
          name: 'Pip',
          bornAt: born,
          needs: { fullness: 61, warmth: 55, rest: 70, companionship: 48 },
          asleep: null,
          activity: { kind: 'walk', startedAt: born + 3 * 24 * 60 * MINUTE, endsAt: born + 3 * 24 * 60 * MINUTE + 20 * MINUTE, finds: ['pebble', 'feather'] },
          lastInteractionAt: born + 3 * 24 * 60 * MINUTE,
          lonelySince: null,
          wanderedOffAt: null,
          inventory: { pebble: 2, glowcap: 1 },
          simulatedTo: born + 3 * 24 * 60 * MINUTE,
        },
      ],
    }
    const save = parseSave(JSON.stringify(v1))!
    expect(save.version).toBe(2)
    const pet = save.pets[0]
    expect(pet).toMatchObject({ id: 'old-1', name: 'Pip', bornAt: born, stage: 'young', form: 'homebody' })
    expect(pet.needs).toEqual(v1.pets[0].needs)
    expect(pet.inventory).toMatchObject({ pebble: 2, glowcap: 1, berries: 3 })
    expect(pet.activity).toMatchObject({ destination: 'meadow', finds: ['pebble', 'feather'] })
    expect(pet.wish).not.toBeNull()
    // And it keeps working.
    const later = simulate(pet, pet.simulatedTo + 6 * 60 * MINUTE)
    expect(later.activity).toBeNull()
    expect(later.inventory.pebble).toBe(3)
  })
})
