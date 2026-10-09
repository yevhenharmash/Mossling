import { CHARACTER_STAGE, createPet, type CharacterId, type Pet } from '../index'

// Tests run with TZ=UTC (see package.json), so local time == UTC.
/** Local timestamp in 2026; month is 1-based. */
export const at = (month: number, day: number, hour = 0, minute = 0) => Date.UTC(2026, month - 1, day, hour, minute)

/**
 * A healthy, full, awake pet of the given form at `t`, with nothing random left
 * to happen (this stage's sickness is done, discipline is full so it won't fuss).
 * Pass overrides to set up a situation.
 */
export function petAs(character: CharacterId, t: number, overrides: Partial<Pet> = {}): Pet {
  const p = createPet('moss-1', 'Moss', t - 3 * 86_400_000)
  return {
    ...p,
    character,
    stage: CHARACTER_STAGE[character],
    age: { spore: 0, baby: 0, child: 1, teen: 4, adult: 7 }[CHARACTER_STAGE[character]],
    hunger: 4,
    happy: 4,
    discipline: 100,
    stageSickDone: true,
    poopIn: 1e12,
    lastSeenAt: t,
    simulatedTo: t,
    ...overrides,
  }
}
