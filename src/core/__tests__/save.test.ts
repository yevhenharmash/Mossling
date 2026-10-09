import { describe, expect, it } from 'vitest'
import { createPet, newSave, parseSave, plantAgain } from '../index'
import { at, petAs } from './helpers'

describe('saves', () => {
  it('round-trips through JSON', () => {
    const save = newSave(createPet('moss-1', 'Moss', at(3, 2, 8)))
    expect(parseSave(JSON.stringify(save))).toEqual(save)
  })

  it('reads anything else as no save, including the old prototype’s saves', () => {
    expect(parseSave(null)).toBeNull()
    expect(parseSave('not json')).toBeNull()
    expect(parseSave(JSON.stringify({ version: 3, pets: [], activePetId: 'x' }))).toBeNull()
    expect(parseSave(JSON.stringify({ version: 1, pet: { id: 'x', character: 'troll', simulatedTo: 0 }, graves: [] }))).toBeNull()
  })

  it('after a death, the old one gets a gravestone and a new generation is planted', () => {
    const t = at(3, 2, 8)
    const dead = petAs('thistle', t, { age: 12, died: { at: t, cause: 'sickness' } })
    const next = plantAgain(newSave(dead), 'moss-2', 'Pip', t + 60_000)
    expect(next.graves).toEqual([
      { name: 'Moss', generation: 1, character: 'thistle', age: 12, cause: 'sickness', plantedAt: dead.plantedAt, diedAt: t },
    ])
    expect(next.pet).toMatchObject({ id: 'moss-2', name: 'Pip', generation: 2, character: 'spore' })
  })
})
