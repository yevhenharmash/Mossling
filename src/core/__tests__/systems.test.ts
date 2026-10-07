import { describe, expect, it } from 'vitest'
import {
  BOND,
  BOND_LEVELS,
  COLLECTIBLES,
  DAY,
  DESTINATIONS,
  FOODS,
  HOUR,
  MINUTE,
  SEASONS,
  STARTING_PANTRY,
  STORIES,
  WALK_WAIT,
  WEATHERS,
  bondLevel,
  collectFinds,
  dayIndex,
  feed,
  give,
  hug,
  lootTable,
  moodOf,
  preferencesOf,
  reachableDestinations,
  rollFinds,
  simulate,
  startWalk,
  storyCards,
  tellStory,
  walkBlocker,
  type Destination,
  type Food,
  type Pet,
  type Wish,
} from '../index'
import { at, basicVisit, itemCount, petAt } from './helpers'

const NOON = at(10, 6, 12)
const fresh = (stage: Pet['stage'] = 'young', id = 'moss-1') => basicVisit(petAt(NOON - HOUR, stage, id), NOON)
const hungry = (p: Pet): Pet => ({ ...p, needs: { ...p.needs, fullness: 40 } })

describe('pantry and porridge', () => {
  it('starts with a small pantry', () => {
    const p = petAt(NOON)
    expect(p.inventory).toMatchObject(STARTING_PANTRY)
  })

  it('pantry food uses exactly one item; porridge uses none', () => {
    const p = hungry(fresh())
    const prefs = preferencesOf(p.id)
    const food = (['berries', 'soup', 'tea'] as Food[]).find((f) => f !== prefs.dislikedFood)!
    const item = FOODS[food].uses!
    const r = feed(p, food, NOON)
    expect(r.ok).toBe(true)
    expect(r.pet.inventory[item]).toBe(p.inventory[item]! - 1)
    const porridge = feed(p, 'porridge', NOON)
    expect(porridge.ok && itemCount(porridge.pet)).toBe(itemCount(p))
  })

  it('refuses pantry food it has run out of, but porridge always works', () => {
    const p: Pet = { ...hungry(fresh()), inventory: {} }
    for (const f of ['berries', 'soup', 'tea'] as Food[]) {
      const r = feed(p, f, NOON)
      expect(r.ok).toBe(false)
    }
    expect(feed(p, 'porridge', NOON).ok).toBe(true)
  })

  it('foodies get more out of every meal', () => {
    const p = hungry(fresh())
    const plain = feed(p, 'porridge', NOON).pet.needs.fullness
    const foodie = feed({ ...p, form: 'foodie' }, 'porridge', NOON).pet.needs.fullness
    expect(foodie).toBeGreaterThan(plain)
  })
})

describe('preferences and discovery', () => {
  it('are fixed per Mossling and differ between Mosslings', () => {
    expect(preferencesOf('moss-1')).toEqual(preferencesOf('moss-1'))
    const all = Array.from({ length: 30 }, (_, i) => JSON.stringify(preferencesOf(`pet-${i}`)))
    expect(new Set(all).size).toBeGreaterThan(10)
    for (let i = 0; i < 30; i++) {
      const prefs = preferencesOf(`pet-${i}`)
      expect(prefs.favoriteFood).not.toBe(prefs.dislikedFood)
      expect(prefs.favoriteItem).not.toBe('glowcap')
    }
  })

  it('refuses the disliked food without using it up, and you learn it', () => {
    const p = hungry(fresh())
    const { dislikedFood } = preferencesOf(p.id)
    const r = feed(p, dislikedFood, NOON)
    expect(r).toMatchObject({ ok: false, refusal: 'dislikes' })
    expect(r.pet.inventory).toEqual(p.inventory)
    expect(r.pet.known.dislikedFood).toBe(true)
    expect(r.pet.journal.at(-1)).toMatchObject({ kind: 'discovered', detail: `dislikedFood:${dislikedFood}` })
  })

  it('the favourite food delights it and adds bond, at most once a day', () => {
    const p = { ...hungry(fresh()), inventory: { berries: 9, mushroom: 9, pineNeedles: 9 } }
    const { favoriteFood } = preferencesOf(p.id)
    const first = feed(p, favoriteFood, NOON)
    expect(first.ok && first.highlights).toContain('favorite')
    expect(moodOf(first.pet, NOON)).toBe('delighted')
    expect(first.pet.known.favoriteFood).toBe(true)
    const second = feed(hungry(first.pet), favoriteFood, NOON + MINUTE)
    expect(second.pet.bond).toBe(first.pet.bond)
    const tomorrow = feed(hungry(simulate(second.pet, NOON + DAY)), favoriteFood, NOON + DAY)
    expect(tomorrow.pet.bond).toBeGreaterThan(second.pet.bond)
  })

  it('the favourite story and favourite present delight it too', () => {
    const p = fresh()
    const { favoriteStory, favoriteItem } = preferencesOf(p.id)
    const told = tellStory(p, favoriteStory, NOON)
    expect(told.ok && told.highlights).toContain('favorite')
    const other = tellStory(p, (favoriteStory + 1) % STORIES.length, NOON)
    expect(other.ok && other.highlights).not.toContain('favorite')

    const gifted = give({ ...p, inventory: { [favoriteItem]: 1 } }, favoriteItem, NOON)
    expect(gifted.ok && gifted.highlights).toContain('favorite')
    expect(gifted.pet.inventory[favoriteItem]).toBe(0)
  })

  it('only found things can be given, and only ones you have', () => {
    const p = fresh()
    expect(give(p, 'berries', NOON)).toMatchObject({ ok: false, refusal: 'notGift' })
    expect(give({ ...p, inventory: {} }, 'pebble', NOON)).toMatchObject({ ok: false, refusal: 'noItem' })
  })

  it('story cards: 3 distinct, stable for 6 hours, then they change', () => {
    const day = dayIndex(NOON)
    const cards = storyCards('moss-1', day, 12)
    expect(new Set(cards).size).toBe(3)
    expect(storyCards('moss-1', day, 17)).toEqual(cards)
    const later = [0, 6, 18].map((h) => storyCards('moss-1', day, h).join())
    expect(new Set([...later, cards.join()]).size).toBeGreaterThan(1)
  })
})

describe('daily wish', () => {
  it('is rolled once per day: the same after reloads, different over the days', () => {
    let p = fresh()
    const today = p.wish
    expect(simulate(p, NOON + 5 * HOUR).wish).toEqual(today)
    const wishes: Wish[] = []
    for (let d = 1; d <= 14; d++) {
      p = basicVisit(simulate(p, NOON + d * DAY), NOON + d * DAY)
      wishes.push(p.wish!)
      expect(p.wish!.day).toBe(dayIndex(NOON + d * DAY))
    }
    expect(new Set(wishes.map((w) => w.kind)).size).toBeGreaterThan(2)
  })

  const grant: Record<Wish['kind'], (p: Pet, w: Wish) => ReturnType<typeof hug>> = {
    story: (p) => tellStory(p, 0, NOON),
    hug: (p) => hug(p, NOON),
    gift: (p) => give({ ...p, inventory: { ...p.inventory, pebble: 1 } }, 'pebble', NOON),
    food: (p, w) => feed({ ...hungry(p), inventory: { berries: 3, mushroom: 3, pineNeedles: 3 } }, w.food!, NOON),
    walk: (p, w) => startWalk(p, w.destination!, NOON),
  }

  it.each(Object.keys(grant) as Wish['kind'][])('a %s wish, granted, gives bond + delight once', (kind) => {
    const base = fresh('grown')
    const wish: Wish = { day: dayIndex(NOON), kind, done: false }
    if (kind === 'food') wish.food = (['berries', 'soup', 'tea'] as Food[]).find((f) => f !== preferencesOf(base.id).dislikedFood)
    if (kind === 'walk') wish.destination = 'meadow'
    const p: Pet = { ...base, wish, daily: { ...base.daily, goodDay: true } }
    const r = grant[kind](p, wish)
    expect(r.ok).toBe(true)
    expect(r.ok && r.highlights).toContain('wish')
    expect(r.pet.wish!.done).toBe(true)
    expect(r.pet.bond - p.bond).toBeGreaterThanOrEqual(BOND.wish)
    const again = grant[kind]({ ...r.pet, delightUntil: 0, activity: null }, wish)
    expect(again.ok && again.highlights).not.toContain('wish')
  })

  it('never wishes for a present while the collection is empty (e.g. a brand-new Mossling)', () => {
    for (let i = 0; i < 60; i++) {
      const p = petAt(NOON + i * DAY, 'sprout', `pet-${i}`)
      expect(p.wish!.kind, `pet-${i}`).not.toBe('gift')
    }
  })

  it('a food wish never asks for the food it dislikes; a walk wish only names places it can reach', () => {
    for (let i = 0; i < 40; i++) {
      let p = petAt(NOON, 'sprout', `pet-${i}`)
      for (let d = 0; d < 10; d++) {
        p = simulate(p, NOON + d * DAY)
        if (p.wish?.kind === 'food') expect(p.wish.food).not.toBe(preferencesOf(p.id).dislikedFood)
        if (p.wish?.kind === 'walk') expect(reachableDestinations(p)).toContain(p.wish.destination)
      }
    }
  })
})

describe('bond', () => {
  it('levels at the documented thresholds', () => {
    BOND_LEVELS.forEach((points, level) => {
      expect(bondLevel(points)).toBe(level)
      if (points > 0) expect(bondLevel(points - 1)).toBe(level - 1)
    })
  })

  it('cannot be farmed: 50 hugs in a day give no more bond than one', () => {
    const p: Pet = { ...fresh(), wish: null }
    const once = hug(p, NOON).pet.bond
    let q = p
    for (let i = 0; i < 50; i++) q = hug(q, NOON + i * MINUTE).pet
    expect(q.bond).toBe(once)
  })

  it('walk bond is capped at two walks a day', () => {
    let p: Pet = { ...fresh('young'), wish: null }
    const before = p.bond
    for (let i = 0; i < 4; i++) {
      const t = NOON + i * HOUR
      p = { ...simulate(p, t), needs: { fullness: 90, warmth: 90, rest: 90, companionship: 90 } }
      p = startWalk(p, 'meadow', t).pet
      p = collectFinds(p, t + 25 * MINUTE).pet
    }
    expect(p.bond - before).toBe(BOND.walk * BOND.walkDailyCap)
  })

  it('a level up is written in the journal', () => {
    const p: Pet = { ...fresh(), bond: BOND_LEVELS[1] - 1, daily: { ...fresh().daily, goodDay: false } }
    const r = hug(p, NOON)
    expect(r.pet.journal.some((e) => e.kind === 'bond' && e.detail === '1')).toBe(true)
  })
})

describe('walks and destinations', () => {
  const rested = (p: Pet): Pet => ({ ...p, needs: { ...p.needs, rest: 90 } })

  it('sprouts only go to the meadow', () => {
    const p = rested({ ...fresh('sprout'), bond: 999 })
    expect(walkBlocker(p, 'meadow', NOON)).toBeNull()
    expect(walkBlocker(p, 'stream', NOON)).toBe('tooYoung')
    expect(walkBlocker(p, 'oldWoods', NOON)).toBe('tooYoung')
  })

  it('bond unlocks the stream (♥1) and the old woods (♥3)', () => {
    const at = (bond: number) => DESTINATIONS.filter((d) => walkBlocker(rested({ ...fresh('grown'), bond }), d, NOON) === null)
    expect(at(0)).toEqual(['meadow'])
    expect(at(BOND_LEVELS[1])).toEqual(['meadow', 'stream'])
    expect(at(BOND_LEVELS[3])).toEqual(['meadow', 'stream', 'oldWoods'])
  })

  it('too dark at night, too tired when rest is low, only the meadow with the sniffles', () => {
    const p = rested({ ...fresh('grown'), bond: BOND_LEVELS[3] })
    expect(walkBlocker(p, 'meadow', at(10, 6, 22))).toBe('tooDark')
    expect(walkBlocker({ ...p, needs: { ...p.needs, rest: 40 } }, 'oldWoods', NOON)).toBe('tooTired')
    const sniffly = { ...p, sniffles: { since: NOON } }
    expect(walkBlocker(sniffly, 'meadow', NOON)).toBeNull()
    expect(walkBlocker(sniffly, 'stream', NOON)).toBe('sniffly')
  })

  it('finds are reproducible and sized by destination', () => {
    for (const d of DESTINATIONS) {
      expect(rollFinds(42, d, 'autumn', 'rain')).toEqual(rollFinds(42, d, 'autumn', 'rain'))
    }
    expect(rollFinds(1, 'meadow', 'summer', 'sunny').length).toBeLessThanOrEqual(3)
    expect(rollFinds(1, 'oldWoods', 'summer', 'sunny').length).toBeGreaterThanOrEqual(4)
  })

  it('seasons and weather change what is out there', () => {
    for (const d of DESTINATIONS) {
      expect(lootTable(d, 'winter', 'snow').berries ?? 0, d).toBe(0)
      expect(lootTable(d, 'winter', 'cloudy').icicle, d).toBeGreaterThan(0)
      expect(lootTable(d, 'summer', 'sunny').icicle ?? 0).toBe(0)
      expect(lootTable(d, 'autumn', 'cloudy').mapleLeaf, d).toBeGreaterThan(0)
      expect(lootTable(d, 'spring', 'sunny').mapleLeaf ?? 0).toBe(0)
      expect(lootTable(d, 'autumn', 'fog').glowcap ?? 0).toBeGreaterThan(lootTable(d, 'autumn', 'sunny').glowcap ?? 0)
    }
  })

  it('every season × weather × destination table has something in it', () => {
    for (const s of SEASONS) for (const w of WEATHERS) for (const d of DESTINATIONS) {
      const total = Object.values(lootTable(d, s, w)).reduce((a, b) => a + (b ?? 0), 0)
      expect(total, `${s} ${w} ${d}`).toBeGreaterThan(0)
    }
  })

  it('wanderers and a ♥2 bond each bring back one more find', () => {
    const p = rested(fresh('grown'))
    const count = (q: Pet) => startWalk(q, 'meadow', NOON).pet.activity!.finds.length
    expect(count({ ...p, form: 'wanderer' })).toBe(count(p) + 1)
    expect(count({ ...p, bond: BOND_LEVELS[2] })).toBe(count(p) + 1)
  })

  it('collected in time: all finds; left at the door: half, resolved at that moment', () => {
    const p = startWalk(rested(fresh()), 'meadow', NOON).pet
    const finds = p.activity!.finds
    const collected = collectFinds(p, p.activity!.endsAt + MINUTE)
    expect(itemCount(collected.pet) - itemCount(p)).toBe(finds.length)
    const left = simulate(p, p.activity!.endsAt + WALK_WAIT + HOUR)
    expect(left.activity).toBeNull()
    expect(itemCount(left) - itemCount(p)).toBe(Math.max(1, Math.floor(finds.length / 2)))
  })

  it('the first walk is a journal moment', () => {
    const r = startWalk(rested(fresh()), 'meadow', NOON)
    expect(r.ok && r.highlights).toContain('firstWalk')
    expect(r.pet.journal.at(-1)).toMatchObject({ kind: 'firstWalk', detail: 'meadow' })
    const again = startWalk(collectFinds(r.pet, NOON + HOUR).pet, 'meadow', NOON + HOUR)
    expect(again.ok && again.highlights).not.toContain('firstWalk')
  })

  it.each([...DESTINATIONS])('%s walks take their documented time', (d: Destination) => {
    const p = rested({ ...fresh('grown'), bond: BOND_LEVELS[3] })
    const r = startWalk(p, d, NOON)
    expect(r.ok).toBe(true)
    expect(moodOf(r.pet, r.pet.activity!.endsAt - 1)).toBe('walking')
    expect(moodOf(r.pet, r.pet.activity!.endsAt)).toBe('atDoor')
  })
})

describe('sniffles', () => {
  const chilly = (p: Pet): Pet => ({ ...p, needs: { ...p.needs, warmth: 15 }, lastInteractionAt: NOON })

  it('a long cold spell (3h at warmth ≤ 20) brings them on, and it shows', () => {
    const p = chilly(fresh())
    expect(simulate(p, NOON + 2 * HOUR).sniffles).toBeNull()
    const s = simulate(p, NOON + 3 * HOUR + 10 * MINUTE)
    expect(s.sniffles).not.toBeNull()
    expect(moodOf(s, NOON + 3 * HOUR + 10 * MINUTE)).toBe('sniffly')
    expect(s.journal.some((e) => e.kind === 'sniffles')).toBe(true)
  })

  it('pine tea cures them at once', () => {
    // Pick a Mossling that doesn't dislike tea (one that does is covered by the self-heal test).
    const id = Array.from({ length: 20 }, (_, i) => `pet-${i}`).find((x) => preferencesOf(x).dislikedFood !== 'tea')!
    const s = simulate(chilly(fresh('young', id)), NOON + 4 * HOUR)
    expect(s.sniffles).not.toBeNull()
    const r = feed(s, 'tea', NOON + 4 * HOUR)
    expect(r.ok && r.highlights).toContain('cured')
    expect(r.pet.sniffles).toBeNull()
  })

  it('they always clear by themselves within 24 hours, even if nothing is done', () => {
    const s = simulate(chilly(fresh()), NOON + 4 * HOUR)
    const since = s.sniffles!.since
    const later = simulate(s, since + 24 * HOUR + 10 * MINUTE)
    expect(later.sniffles).toBeNull()
    expect(later.journal.some((e) => e.kind === 'healed')).toBe(true)
    // Still cold, but it doesn't catch them straight back.
    expect(later.needs.warmth).toBeLessThanOrEqual(20)
    expect(simulate(later, since + 30 * HOUR).sniffles).toBeNull()
  })
})

it('every collectible can turn up somewhere, some time', () => {
  const seen = new Set<string>()
  for (const s of SEASONS) for (const w of WEATHERS) for (const d of DESTINATIONS) {
    for (const [k, v] of Object.entries(lootTable(d, s, w))) if ((v ?? 0) > 0) seen.add(k)
  }
  for (const c of COLLECTIBLES) expect(seen.has(c), c).toBe(true)
})
