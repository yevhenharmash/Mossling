import { describe, expect, it } from 'vitest'
import { EVOLUTION_CHART, nextCharacter, simulate, type CharacterId } from '../index'
import { at, petAs } from './helpers'

const record = (character: CharacterId, careMistakes: number, disciplineMistakes: number, unruly = false) => ({
  character,
  unruly,
  careMistakes,
  disciplineMistakes,
})

describe('the P1 chart, row by row', () => {
  // [from, unruly, care mistakes, discipline mistakes, expected]
  const cases: [CharacterId, boolean, number, number, CharacterId][] = [
    ['sprig', false, 2, 5, 'fernlet'],
    ['sprig', false, 3, 0, 'burrlet'],
    ['fernlet', false, 2, 0, 'glowcap'],
    ['fernlet', false, 0, 1, 'fernwhisk'],
    ['fernlet', false, 2, 2, 'hoodle'],
    ['fernlet', false, 3, 1, 'puddock'],
    ['fernlet', false, 3, 3, 'slinkweed'],
    ['fernlet', false, 3, 4, 'thistle'],
    ['fernlet', true, 3, 1, 'fernwhisk'],
    ['fernlet', true, 3, 3, 'hoodle'],
    ['fernlet', true, 4, 7, 'slinkweed'],
    ['fernlet', true, 4, 8, 'thistle'],
    ['burrlet', false, 9, 1, 'puddock'],
    ['burrlet', false, 0, 2, 'slinkweed'],
    ['burrlet', false, 0, 3, 'thistle'],
    ['burrlet', true, 0, 1, 'puddock'],
    ['burrlet', true, 9, 5, 'slinkweed'],
    ['burrlet', true, 0, 6, 'thistle'],
    ['hoodle', true, 9, 9, 'oldLichen'],
  ]
  it.each(cases)('%s (unruly %s) with %i care and %i discipline mistakes → %s', (from, unruly, care, discipline, to) => {
    expect(nextCharacter(record(from, care, discipline, unruly))).toBe(to)
  })

  it('every chart row is covered above', () => {
    const covered = new Set(cases.map(([from, unruly, , , to]) => `${from}/${unruly}/${to}`))
    for (const row of EVOLUTION_CHART) {
      const types = row.unruly === undefined ? [false, true] : [row.unruly]
      expect(types.some((u) => covered.has(`${row.from}/${u}/${row.to}`))).toBe(true)
    }
  })

  it('only an unruly Hoodle has a secret next step; the others are final', () => {
    expect(nextCharacter(record('hoodle', 0, 2))).toBeNull()
    expect(nextCharacter(record('glowcap', 0, 0))).toBeNull()
  })
})

describe('growing up on schedule', () => {
  it('a spore hatches after 5 minutes and the baby grows into a Sprig after 65 more', () => {
    const t = at(3, 2, 10)
    const spore = { ...petAs('spore', t), plantedAt: t, hunger: 0, happy: 0 }
    expect(simulate(spore, t + 4 * 60_000).character).toBe('spore')
    expect(simulate(spore, t + 6 * 60_000).character).toBe('speck')
    expect(simulate(spore, t + 71 * 60_000).character).toBe('sprig')
  })

  it('ages one year each time it wakes up, and becomes a teen on waking at age 3', () => {
    const t = at(3, 2, 19)
    const p = simulate(petAs('sprig', t, { age: 2, lightsOff: true }), at(3, 3, 7, 30))
    expect(p.age).toBe(3)
    expect(p.character).toBe('fernlet')
    expect(p.careMistakes).toBe(0)
  })

  it('3+ discipline mistakes as a child make an unruly teen', () => {
    const t = at(3, 2, 19)
    const p = simulate(petAs('sprig', t, { age: 2, lightsOff: true, disciplineMistakes: 3 }), at(3, 3, 7, 30))
    expect(p.unruly).toBe(true)
  })

  it('an unruly Hoodle becomes Old Lichen on waking at age 10', () => {
    const t = at(3, 2, 22, 30)
    const p = simulate(petAs('hoodle', t, { age: 9, unruly: true, lightsOff: true }), at(3, 3, 8, 30))
    expect(p.character).toBe('oldLichen')
  })
})
