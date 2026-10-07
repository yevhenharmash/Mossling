import type { Food, Mood, Refusal } from '../core'

/** Each line follows the pet's name: "Moss hums a small mossy tune." */
export const MOOD_LINES: Record<Mood, string[]> = {
  content: [
    'Hums a small mossy tune.',
    'Watches a beetle walk by, very seriously.',
    'Is perfectly, quietly happy.',
    'Counts the clouds. Loses count. Starts again.',
  ],
  restless: [
    'Shuffles its root-feet. Something is missing.',
    'Looks at you, then at the door, then at you.',
    'Fidgets with a bit of lichen.',
  ],
  hungry: ['Has a tummy rumbling like distant thunder.', 'Sniffs the air for berries.'],
  cold: ['Shivers until its moss stands on end.', 'Huddles into a smaller, rounder shape.'],
  sleepy: ['Yawns so wide it nearly tips over.', 'Can barely keep its eyes open.'],
  lonely: ['Sits very still, looking at the path.', 'Wonders where everyone has gone.'],
  asleep: ['Is fast asleep. Tiny moss-snores.', 'Dreams of rain on leaves.'],
  walking: ['Is out exploring the forest.'],
  atDoor: ['Is back, holding a bundle of treasures for you!'],
  away: ['Has wandered off. A faint trail of glowing spores leads into the woods…'],
}

export const FOOD_LINES: Record<Food, string> = {
  berries: 'Munches the berries, cheeks stained purple.',
  soup: 'Slurps the mushroom soup and sighs happily.',
  tea: 'Holds the warm cup with both hands. Toasty.',
}

export const STORIES = [
  'the fox who borrowed the moon',
  'the stone that wanted to be a river',
  'the lighthouse keeper’s lost mitten',
  'the snail who was late for spring',
  'the island that only appears in fog',
  'the owl who forgot how to whoo',
]

export const REFUSAL_LINES: Record<Refusal, string> = {
  away: 'It isn’t here…',
  notAway: 'It’s right here!',
  walking: 'It’s still out on its walk.',
  atDoor: 'It’s waiting at the door with its finds.',
  asleep: 'Shh — it’s sleeping.',
  awake: 'It’s already awake.',
  full: 'It pats its round tummy. Too full!',
  notSleepy: 'It wriggles out of the blanket. Not sleepy!',
  tooTired: 'Too tired for a walk right now.',
  tooDark: 'Too dark for walks. The forest is asleep.',
  noWalk: 'Nothing to collect.',
}

/** Stable pick that changes every few minutes rather than on every render. */
export function pick<T>(list: T[], now: number, salt = 0): T {
  return list[(Math.floor(now / (7 * 60 * 1000)) + salt) % list.length]
}

export function withName(name: string, line: string): string {
  return `${name} ${line[0].toLowerCase()}${line.slice(1)}`
}
