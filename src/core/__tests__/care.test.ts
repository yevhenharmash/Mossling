import { describe, expect, it } from 'vitest'
import {
  BOND,
  CALL_WINDOW,
  COAT_RULES,
  DAY,
  FAVORITE_SPOT_CHANCE,
  FUSS_CHANCE,
  FUSS_FOR,
  FUSS_PER_DAY,
  HIDE_SPOTS,
  HOUR,
  MESS_EVERY,
  MESS_GRACE,
  MESS_MAX,
  MINUTE,
  PLAY_MAX,
  coatFor,
  feed,
  hidingSpots,
  hug,
  moodOf,
  playHideAndSeek,
  preferencesOf,
  settle,
  simulate,
  startWalk,
  tidy,
  tuckIn,
  type Call,
  type HideSpot,
  type Pet,
} from '../index'
import { at, basicVisit, petAt } from './helpers'

// DESIGN.md §6.9–§6.10: calls, messes, manners, coats and hide-and-seek.

const NOON = at(10, 6, 12)
const fresh = (stage: Pet['stage'] = 'young', id = 'moss-1') => basicVisit(petAt(NOON - HOUR, stage, id), NOON)
const quiet = (p: Pet): Pet => ({ ...p, call: null, messes: [], messClock: 0, fussRolled: true, wish: null })
const withNeeds = (p: Pet, needs: Partial<Pet['needs']>): Pet => ({ ...p, needs: { ...p.needs, ...needs } })
const fuss = (want: 'treat' | 'play' | 'walk', t = NOON): Call => ({ kind: 'fuss', want, since: t, until: t + FUSS_FOR })

describe('calls', () => {
  it('a need in distress calls you; answering it in time is not a mistake', () => {
    const p = simulate(withNeeds(quiet(fresh()), { fullness: 32 }), NOON + HOUR)
    expect(p.call).toMatchObject({ kind: 'need', need: 'fullness' })
    expect(moodOf(p, NOON + HOUR)).toBe('hungry')
    const r = feed(p, 'porridge', NOON + HOUR + 10 * MINUTE)
    expect(r.ok && r.highlights).toContain('answered')
    expect(r.pet.call?.kind).not.toBe('need')
    expect(r.pet.care.mistakes).toBe(0)
  })

  it('a missed call is one care mistake, and that need does not call again until it recovers', () => {
    const p = simulate(withNeeds(quiet(fresh()), { fullness: 29 }), NOON + 5 * MINUTE)
    expect(p.call?.kind).toBe('need')
    const missed = simulate(p, NOON + CALL_WINDOW + 10 * MINUTE)
    expect(missed.care.mistakes).toBe(1)
    expect(missed.daily.mistakes).toBe(1)
    expect(missed.missedNeeds).toContain('fullness')
    expect(simulate(missed, NOON + 4 * CALL_WINDOW).care.mistakes).toBe(1)
    // Fed back up, it may call again next time it gets hungry.
    const fed = feed(missed, 'porridge', NOON + CALL_WINDOW + 15 * MINUTE).pet
    expect(fed.missedNeeds).not.toContain('fullness')
  })

  it('an unanswered sleepy call is no mistake: it dozes off by itself', () => {
    const p = simulate(withNeeds(quiet(fresh()), { rest: 29 }), NOON + 5 * MINUTE)
    expect(p.call).toMatchObject({ need: 'rest' })
    const later = simulate(p, NOON + CALL_WINDOW + 10 * MINUTE)
    expect(later.asleep).toBe('tired')
    expect(later.care.mistakes).toBe(0)
  })

  it('never calls while asleep, out on a walk or away; falling asleep ends a call without a mistake', () => {
    const base = withNeeds(quiet(fresh()), { fullness: 25 })
    expect(simulate({ ...base, asleep: 'tucked' }, NOON + HOUR).call).toBeNull()
    expect(simulate({ ...base, wanderedOffAt: NOON - MINUTE }, NOON + HOUR).call).toBeNull()
    const walking = startWalk(withNeeds(quiet(fresh()), { fullness: 60 }), 'meadow', NOON).pet
    expect(simulate(withNeeds(walking, { fullness: 25 }), NOON + 10 * MINUTE).call).toBeNull()

    const calling = simulate(base, NOON + 5 * MINUTE)
    const tucked = tuckIn(withNeeds(calling, { rest: 50 }), NOON + 10 * MINUTE).pet
    expect(tucked.call).toBeNull()
    expect(simulate(tucked, NOON + 3 * HOUR).care.mistakes).toBe(0)
  })

  it('a real need pushes a fuss aside', () => {
    const p = simulate({ ...withNeeds(quiet(fresh()), { warmth: 25 }), call: fuss('treat') }, NOON + 5 * MINUTE)
    expect(p.call).toMatchObject({ kind: 'need', need: 'warmth' })
  })
})

describe('messes', () => {
  it(`appear every ${MESS_EVERY} hours awake at home, at most ${MESS_MAX} at a time`, () => {
    const p = withNeeds(quiet(fresh()), { fullness: 100, warmth: 100, rest: 100, companionship: 100 })
    expect(simulate(p, NOON + (MESS_EVERY - 0.5) * HOUR).messes).toHaveLength(0)
    expect(simulate(p, NOON + (MESS_EVERY + 0.5) * HOUR).messes).toHaveLength(1)
    // A full pile stops growing.
    const mess = { at: NOON, late: false }
    const almost = { ...p, messes: Array(MESS_MAX - 1).fill(mess), messClock: MESS_EVERY - 0.1 }
    expect(simulate(almost, NOON + HOUR).messes).toHaveLength(MESS_MAX)
    expect(simulate({ ...almost, messes: Array(MESS_MAX).fill(mess) }, NOON + HOUR).messes).toHaveLength(MESS_MAX)
  })

  it('none while asleep', () => {
    const p = { ...quiet(fresh()), asleep: 'tucked' as const, needs: { fullness: 100, warmth: 100, rest: 20, companionship: 100 } }
    expect(simulate(p, NOON + (MESS_EVERY + 0.5) * HOUR).messes).toHaveLength(0)
  })

  it('tidying takes one away; it works around a sleeping Mossling without waking it', () => {
    const p: Pet = { ...quiet(fresh()), messes: [{ at: NOON, late: false }, { at: NOON, late: false }] }
    const once = tidy(p, NOON)
    expect(once.ok && once.pet.messes).toHaveLength(1)
    const asleep = tidy({ ...p, asleep: 'tucked' }, NOON)
    expect(asleep.ok && asleep.pet.asleep).toBe('tucked')
    expect(tidy(quiet(fresh()), NOON)).toMatchObject({ ok: false, refusal: 'noMess' })
  })

  it(`a mess left ${MESS_GRACE / HOUR} hours is one mistake, counted once`, () => {
    const p: Pet = { ...quiet(fresh()), messes: [{ at: NOON, late: false }] }
    expect(simulate(p, NOON + MESS_GRACE - HOUR).care.mistakes).toBe(0)
    const late = simulate(p, NOON + MESS_GRACE + 10 * MINUTE)
    const mistakes = late.care.mistakes
    expect(mistakes).toBeGreaterThanOrEqual(1)
    expect(late.messes[0].late).toBe(true)
    // The same mess is never counted again (other mistakes may pile up meanwhile).
    const tidied = tidy(late, NOON + MESS_GRACE + 15 * MINUTE).pet
    expect(tidied.care.mistakes).toBe(mistakes)
  })
})

describe('fussing and manners', () => {
  const content = (id: string) => quiet({ ...fresh('young', id), fussRolled: false })

  it('fusses at most once a visit, only when content, and in about the right share of visits', () => {
    let fusses = 0
    const n = 300
    for (let i = 0; i < n; i++) {
      const p = { ...content(`pet-${i}`), lastInteractionAt: NOON - 3 * HOUR }
      const r = hug(p, NOON)
      if (r.pet.call?.kind === 'fuss') {
        fusses++
        expect(moodOf(r.pet, NOON)).toBe('fussy')
        expect(r.ok && r.highlights).toContain('fussing')
      }
      // Same visit: no second roll.
      const again = hug({ ...r.pet, call: null }, NOON + MINUTE)
      expect(again.pet.call).toBeNull()
    }
    expect(fusses / n).toBeGreaterThan(FUSS_CHANCE - 0.1)
    expect(fusses / n).toBeLessThan(FUSS_CHANCE + 0.1)
  })

  it('never fusses when something is really wrong', () => {
    for (let i = 0; i < 50; i++) {
      const p = withNeeds({ ...content(`pet-${i}`), lastInteractionAt: NOON - 3 * HOUR }, { fullness: 35 })
      expect(hug(p, NOON).pet.call?.kind).not.toBe('fuss')
    }
  })

  it(`at most ${FUSS_PER_DAY} fusses a day`, () => {
    let p = content('moss-1')
    for (let v = 0; v < 12; v++) {
      const t = NOON - 6 * HOUR + v * (VISIT + MINUTE)
      p = settleIfFussing(hug({ ...p, needs: { fullness: 90, warmth: 90, rest: 90, companionship: 90 } }, t).pet, t)
    }
    expect(p.daily.fusses).toBeLessThanOrEqual(FUSS_PER_DAY)
  })

  it('"not now" teaches manners; giving in un-teaches them', () => {
    const p: Pet = { ...quiet(fresh()), call: fuss('treat') }
    const settled = settle(p, NOON + MINUTE)
    expect(settled.ok && settled.highlights).toContain('settled')
    expect(settled.pet.care.manners).toBe(1)
    expect(settled.pet.call).toBeNull()
    // Even at the start of a new visit, settling never sets off a fresh fuss.
    const fresh2 = settle({ ...p, fussRolled: false, lastInteractionAt: NOON - 3 * HOUR }, NOON + MINUTE)
    expect(fresh2.pet.call).toBeNull()

    const treat = (['berries', 'soup', 'tea'] as const).find((f) => f !== preferencesOf(p.id).dislikedFood)!
    const spoiled = feed(withNeeds(p, { fullness: 60 }), treat, NOON + MINUTE)
    expect(spoiled.ok && spoiled.highlights).toContain('gaveIn')
    expect(spoiled.pet.care.manners).toBe(-1)
    // Porridge isn't a treat.
    expect(feed(withNeeds(p, { fullness: 60 }), 'porridge', NOON + MINUTE).pet.care.manners).toBe(0)

    const walked = startWalk(withNeeds({ ...p, call: fuss('walk') }, { rest: 90 }), 'meadow', NOON + MINUTE)
    expect(walked.pet.care.manners).toBe(-1)
    const played = playHideAndSeek({ ...p, call: fuss('play') }, NOON, ['stump', 'fern', 'mushroom'], NOON + MINUTE)
    expect(played.pet.care.manners).toBe(-1)
  })

  it('a real need cannot be settled — it is refused, with no harm done', () => {
    const p = simulate(withNeeds(quiet(fresh()), { fullness: 25 }), NOON + 5 * MINUTE)
    const r = settle(p, NOON + 5 * MINUTE)
    expect(r).toMatchObject({ ok: false, refusal: 'reallyNeeds' })
    expect(r.pet.care).toEqual(p.care)
    expect(settle(quiet(fresh()), NOON)).toMatchObject({ ok: false, refusal: 'noCall' })
  })

  it('an ignored fuss just fades away — no mistake', () => {
    const p = simulate({ ...quiet(fresh()), call: fuss('treat') }, NOON + FUSS_FOR + 5 * MINUTE)
    expect(p.call).toBeNull()
    expect(p.care).toEqual({ mistakes: 0, manners: 0 })
  })
})

const VISIT = HOUR
const wonGame = (r: ReturnType<typeof hug>) => r.ok && r.highlights.includes('won')
function settleIfFussing(p: Pet, t: number): Pet {
  return p.call?.kind === 'fuss' ? settle(p, t).pet : p
}

describe('coats', () => {
  it('follow the documented thresholds', () => {
    for (const stage of ['young', 'grown'] as const) {
      const rule = COAT_RULES[stage]
      expect(coatFor({ mistakes: rule.glossyMaxMistakes, manners: rule.glossyMinManners }, stage)).toBe('glossy')
      expect(coatFor({ mistakes: rule.glossyMaxMistakes, manners: rule.glossyMinManners - 1 }, stage)).toBe('mossy')
      expect(coatFor({ mistakes: rule.glossyMaxMistakes + 1, manners: 99 }, stage)).toBe('mossy')
      expect(coatFor({ mistakes: rule.wildFromMistakes, manners: 99 }, stage)).toBe('wild')
    }
  })

  it('are set (and journaled) on growing up, and care starts over for the next stage', () => {
    const born = NOON - 2 * DAY + HOUR
    const p: Pet = { ...quiet(fresh('sprout')), bornAt: born, care: { mistakes: 0, manners: 2 } }
    const young = simulate(p, NOON + 2 * HOUR)
    expect(young.stage).toBe('young')
    expect(young.coat).toBe('glossy')
    expect(young.journal.some((e) => e.kind === 'coat' && e.detail === 'glossy')).toBe(true)
    expect(young.care).toEqual({ mistakes: 0, manners: 0 })
  })

  it('a good day with no mistakes mends one from before', () => {
    const p: Pet = { ...quiet(fresh()), care: { mistakes: 2, manners: 0 } }
    const midnight = at(10, 7, 0, 5)
    const good = { ...p, daily: { ...p.daily, goodDay: true, mistakes: 0 } }
    expect(simulate(good, midnight).care.mistakes).toBe(1)
    const bad = { ...p, daily: { ...p.daily, goodDay: true, mistakes: 1 } }
    expect(simulate(bad, midnight).care.mistakes).toBe(2)
  })

  // The whole loop, as a player would live it: from a new sprout to young.
  function raise(hours: number[], id: string): Pet {
    const start = at(10, 6, 9)
    let p = basicVisit(petAt(start, 'sprout', id), start)
    for (let d = 0; d <= 2; d++) {
      for (const h of hours) {
        const t = at(10, 6 + d, h)
        if (t > start) p = basicVisit(p, t)
      }
    }
    return simulate(p, at(10, 9, 12))
  }

  it('one visit a day grows a wild coat', () => {
    for (let i = 0; i < 5; i++) expect(raise([12], `pet-${i}`).coat, `pet-${i}`).toBe('wild')
  })

  it('three caring visits a day never do — and usually earn a glossy one', () => {
    const coats = Array.from({ length: 20 }, (_, i) => raise([8, 13, 19], `pet-${i}`).coat)
    expect(coats).not.toContain('wild')
    expect(coats.filter((c) => c === 'glossy').length).toBeGreaterThan(coats.length / 2)
  })
})

describe('hide-and-seek', () => {
  const rested = (p: Pet) => withNeeds(quiet(p), { rest: 80, fullness: 80 })

  it('hiding spots are fixed for a game, so the UI and the score agree', () => {
    expect(hidingSpots('moss-1', NOON)).toEqual(hidingSpots('moss-1', NOON))
    expect(hidingSpots('moss-1', NOON)).toHaveLength(3)
    for (const s of hidingSpots('moss-1', NOON)) expect(HIDE_SPOTS).toContain(s)
  })

  it(`it hides in its favourite spot about ${FAVORITE_SPOT_CHANCE * 100}% of the time`, () => {
    const fav = preferencesOf('moss-1').favoriteSpot
    let hits = 0
    const games = 2000
    for (let g = 0; g < games; g++) hits += hidingSpots('moss-1', NOON + g * 1000).filter((s) => s === fav).length
    expect(hits / (games * 3)).toBeGreaterThan(FAVORITE_SPOT_CHANCE - 0.04)
    expect(hits / (games * 3)).toBeLessThan(FAVORITE_SPOT_CHANCE + 0.04)
  })

  it('a player who learns its favourite spot wins far more often than one guessing blindly', () => {
    const fav = preferencesOf('moss-1').favoriteSpot
    const p = rested(fresh())
    let smart = 0
    let blind = 0
    for (let g = 0; g < 400; g++) {
      const t = NOON + g * 1000
      if (wonGame(playHideAndSeek(p, t, [fav, fav, fav], t))) smart++
      const guesses = [0, 1, 2].map((i) => HIDE_SPOTS[(g + i) % 3]) as HideSpot[]
      if (wonGame(playHideAndSeek(p, t, guesses, t))) blind++
    }
    expect(smart).toBeGreaterThan(blind * 1.8)
  })

  it('scores the rounds; a win delights it, gives bond once a day, and can reveal the favourite spot', () => {
    const p = rested(fresh())
    const spots = hidingSpots(p.id, NOON)
    const won = playHideAndSeek(p, NOON, spots, NOON + MINUTE)
    expect(won.ok && won.score).toBe(3)
    expect(won.ok && won.highlights).toContain('won')
    expect(won.pet.delightUntil).toBeGreaterThan(NOON)
    expect(won.pet.bond - p.bond).toBeGreaterThanOrEqual(BOND.playWin)
    if (spots.includes(preferencesOf(p.id).favoriteSpot)) expect(won.pet.known.favoriteSpot).toBe(true)

    const again = playHideAndSeek({ ...won.pet, delightUntil: 0 }, NOON + MINUTE, hidingSpots(p.id, NOON + MINUTE), NOON + 2 * MINUTE)
    expect(again.pet.bond).toBe(won.pet.bond)

    const miss = spots.map((s) => HIDE_SPOTS.find((o) => o !== s)!)
    const lost = playHideAndSeek(p, NOON, miss, NOON + MINUTE)
    expect(lost.ok && lost.score).toBe(0)
    expect(lost.ok && lost.highlights).not.toContain('won')
    expect(lost.pet.needs.companionship).toBeGreaterThan(p.needs.companionship)
    expect(lost.pet.needs.rest).toBeLessThan(p.needs.rest)
  })

  it('refuses stale or impossible games, and a tired Mossling', () => {
    const p = rested(fresh())
    expect(playHideAndSeek(p, NOON - PLAY_MAX - MINUTE, ['stump', 'stump', 'stump'], NOON)).toMatchObject({ refusal: 'noGame' })
    expect(playHideAndSeek(p, NOON + MINUTE, ['stump', 'stump', 'stump'], NOON)).toMatchObject({ refusal: 'noGame' })
    expect(playHideAndSeek(p, NOON, ['stump', 'stump'], NOON)).toMatchObject({ refusal: 'noGame' })
    expect(playHideAndSeek(p, NOON, ['stump', 'stump', 'sofa' as HideSpot], NOON)).toMatchObject({ refusal: 'noGame' })
    expect(playHideAndSeek(withNeeds(p, { rest: 20 }), NOON, ['stump', 'stump', 'stump'], NOON)).toMatchObject({ refusal: 'tooTired' })
    expect(playHideAndSeek({ ...p, asleep: 'tucked' }, NOON, ['stump', 'stump', 'stump'], NOON)).toMatchObject({ refusal: 'asleep' })
  })
})
