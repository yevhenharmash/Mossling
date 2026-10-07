import {
  ITEMS,
  STORIES,
  type Destination,
  type Food,
  type Form,
  type Highlight,
  type ItemKind,
  type JournalEntry,
  type Mood,
  type Refusal,
  type Season,
  type Stage,
  type Weather,
  type Wish,
} from '../core'

/** Each line follows the pet's name: "Moss hums a small mossy tune." */
export const MOOD_LINES: Record<Mood, string[]> = {
  content: [
    'Hums a small mossy tune.',
    'Watches a beetle walk by, very seriously.',
    'Is perfectly, quietly happy.',
    'Counts the clouds. Loses count. Starts again.',
  ],
  delighted: ['Is beaming. Its leaf-ears won’t stop wiggling.', 'Does a tiny happy shuffle.'],
  restless: [
    'Shuffles its root-feet. Something is missing.',
    'Looks at you, then at the door, then at you.',
    'Fidgets with a bit of lichen.',
  ],
  hungry: ['Has a tummy rumbling like distant thunder.', 'Sniffs the air for porridge.'],
  cold: ['Shivers until its moss stands on end.', 'Huddles into a smaller, rounder shape.'],
  sleepy: ['Yawns so wide it nearly tips over.', 'Can barely keep its eyes open.'],
  lonely: ['Sits very still, looking at the path.', 'Wonders where everyone has gone.'],
  sniffly: ['Sniffles. A cup of pine tea would help.', 'Sneezes a tiny cloud of spores.'],
  asleep: ['Is fast asleep. Tiny moss-snores.', 'Dreams of rain on leaves.'],
  walking: ['Is out exploring.'],
  atDoor: ['Is back, holding a bundle of treasures for you!'],
  away: ['Has wandered off. A faint trail of glowing spores leads into the woods…'],
}

export const FOOD_LABELS: Record<Food, string> = {
  porridge: 'Porridge',
  berries: 'Berries',
  soup: 'Mushroom soup',
  tea: 'Pine tea',
}

export const FOOD_LINES: Record<Food, string> = {
  porridge: 'Eats a bowl of warm porridge. Plain, but cosy.',
  berries: 'Munches the berries, cheeks stained purple.',
  soup: 'Slurps the mushroom soup and sighs happily.',
  tea: 'Holds the warm cup with both hands. Toasty.',
}

export const DESTINATION_LABELS: Record<Destination, string> = {
  meadow: 'Meadow',
  stream: 'Stream',
  oldWoods: 'Old Woods',
}

export const STAGE_LABELS: Record<Stage, string> = { sprout: 'Sprout', young: 'Young', grown: 'Grown', elder: 'Elder' }
export const FORM_LABELS: Record<Form, string> = { wanderer: 'Wanderer', dreamer: 'Dreamer', foodie: 'Foodie', homebody: 'Homebody' }
export const SEASON_LABELS: Record<Season, string> = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' }
export const SEASON_ICONS: Record<Season, string> = { spring: '🌱', summer: '🌻', autumn: '🍂', winter: '❄️' }
export const WEATHER_LABELS: Record<Weather, string> = { sunny: 'Sunny', cloudy: 'Cloudy', rain: 'Rain', fog: 'Fog', snow: 'Snow' }
export const WEATHER_ICONS: Record<Weather, string> = { sunny: '☀️', cloudy: '☁️', rain: '🌧️', fog: '🌫️', snow: '🌨️' }

export const REFUSAL_LINES: Record<Refusal, string> = {
  away: 'It isn’t here…',
  notAway: 'It’s right here!',
  walking: 'It’s still out on its walk.',
  atDoor: 'It’s waiting at the door with its finds.',
  asleep: 'Shh — it’s sleeping.',
  awake: 'It’s already awake.',
  full: 'It pats its round tummy. Too full!',
  notSleepy: 'It wriggles out of the blanket. Not sleepy!',
  tooTired: 'Too tired for that walk right now.',
  tooDark: 'Too dark for walks. The forest is asleep.',
  noWalk: 'Nothing to collect.',
  noFood: 'The pantry’s out of that. A walk might turn some up.',
  dislikes: 'It wrinkles its nose and pushes the bowl away. Not that!',
  locked: 'It doesn’t trust that path yet. Spend more time together.',
  tooYoung: 'Too little for that path yet.',
  sniffly: 'Too sniffly for a long walk. The meadow is fine.',
  noItem: 'You don’t have one of those.',
  notGift: 'That’s for the pantry, not a present.',
  noStory: 'You can’t remember that one.',
}

export const HIGHLIGHT_LINES: Record<Highlight, string> = {
  favorite: '✨ A favourite!',
  wish: '💭 Wish granted!',
  cured: 'No more sniffles.',
  firstWalk: 'Its very first walk!',
}

export function wishText(w: Wish): string {
  switch (w.kind) {
    case 'story':
      return 'a story'
    case 'hug':
      return 'a big hug'
    case 'gift':
      return 'a little present from your collection'
    case 'food':
      return FOOD_LABELS[w.food!].toLowerCase()
    case 'walk':
      return `a walk to the ${DESTINATION_LABELS[w.destination!]}`
  }
}

const itemName = (k: string) => ITEMS[k as ItemKind]?.label.toLowerCase() ?? k

export function journalText(e: JournalEntry, name: string): string {
  const d = e.detail ?? ''
  switch (e.kind) {
    case 'hatched':
      return `${name} hatched from a patch of moss.`
    case 'stage':
      if (d === 'young') return `${name} isn’t a sprout any more.`
      if (d === 'grown') return `${name} is all grown up.`
      return `${name} has become an elder. A lichen beard is coming in.`
    case 'form':
      return `${name} is turning into a ${FORM_LABELS[d as Form]}.`
    case 'firstWalk':
      return `First walk — to the ${DESTINATION_LABELS[d as Destination]}.`
    case 'discovered': {
      const [what, value] = d.split(':')
      if (what === 'favoriteFood') return `${name} loves ${FOOD_LABELS[value as Food].toLowerCase()}!`
      if (what === 'dislikedFood') return `${name} can’t stand ${FOOD_LABELS[value as Food].toLowerCase()}.`
      if (what === 'favoriteStory') return `Favourite story: ${STORIES[Number(value)]}.`
      return `${name} treasures every ${itemName(value)}.`
    }
    case 'sniffles':
      return `${name} caught the sniffles.`
    case 'healed':
      return `${name} is over the sniffles.`
    case 'wandered':
      return `${name} wandered off into the woods.`
    case 'found':
      return `You found ${name} again.`
    case 'season':
      return `${SEASON_LABELS[d as Season]} arrived.`
    case 'firstSnow':
      return `First snow! ${name} tried to catch a flake.`
    case 'bond':
      return `Your bond grew to ♥${d}.`
  }
}

/** Stable pick that changes every few minutes rather than on every render. */
export function pick<T>(list: readonly T[], now: number, salt = 0): T {
  return list[(Math.floor(now / (7 * 60 * 1000)) + salt) % list.length]
}

export function withName(name: string, line: string): string {
  return `${name} ${line[0].toLowerCase()}${line.slice(1)}`
}
