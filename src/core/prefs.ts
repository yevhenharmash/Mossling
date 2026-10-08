import type { Collectible, Destination, Food, HideSpot, Pet, Wish, WishKind } from './types'
import { COLLECTIBLES, DESTINATIONS, HIDE_SPOTS, WISH_KINDS } from './types'
import { DESTINATION_INFO } from './tuning'
import { STORIES } from './stories'
import { hashString, seededRandom } from './random'
import { bondLevel } from './growth'

const PANTRY_FOODS: Food[] = ['berries', 'soup', 'tea']

export type Preferences = {
  favoriteFood: Food
  dislikedFood: Food
  favoriteStory: number
  favoriteItem: Collectible
  /** Where it likes to hide; a player who notices wins hide-and-seek more often. */
  favoriteSpot: HideSpot
}

/** Born with these; seeded from the id so every Mossling differs but never changes. */
export function preferencesOf(petId: string): Preferences {
  const rand = seededRandom(hashString(petId))
  const favoriteFood = PANTRY_FOODS[Math.floor(rand() * PANTRY_FOODS.length)]
  const others = PANTRY_FOODS.filter((f) => f !== favoriteFood)
  const dislikedFood = others[Math.floor(rand() * others.length)]
  const favoriteStory = Math.floor(rand() * STORIES.length)
  // Glowcaps are rare; don't make one the thing it longs for most.
  const giftable = COLLECTIBLES.filter((c) => c !== 'glowcap')
  const favoriteItem = giftable[Math.floor(rand() * giftable.length)]
  const favoriteSpot = HIDE_SPOTS[Math.floor(rand() * HIDE_SPOTS.length)]
  return { favoriteFood, dislikedFood, favoriteStory, favoriteItem, favoriteSpot }
}

/** Three story cards on offer; they change every 6 hours. */
export function storyCards(petId: string, day: number, hour: number): number[] {
  const rand = seededRandom(hashString(petId) ^ (day * 4 + Math.floor(hour / 6)))
  const ids = STORIES.map((_, i) => i)
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }
  return ids.slice(0, 3)
}

export function reachableDestinations(pet: Pet): Destination[] {
  const level = bondLevel(pet.bond)
  return DESTINATIONS.filter(
    (d) => DESTINATION_INFO[d].bondLevel <= level && (pet.stage !== 'sprout' || d === 'meadow'),
  )
}

/** One small wish per day, rolled when the day starts. */
export function rollWish(pet: Pet, day: number): Wish {
  const rand = seededRandom(hashString(pet.id) ^ (day * 2654435761))
  // Only wish for a present when there is something in the collection to give.
  const hasGift = COLLECTIBLES.some((c) => (pet.inventory[c] ?? 0) > 0)
  const kinds = WISH_KINDS.filter((k) => k !== 'gift' || hasGift)
  const kind: WishKind = kinds[Math.floor(rand() * kinds.length)]
  const wish: Wish = { day, kind, done: false }
  if (kind === 'food') {
    const disliked = preferencesOf(pet.id).dislikedFood
    const options = PANTRY_FOODS.filter((f) => f !== disliked)
    wish.food = options[Math.floor(rand() * options.length)]
  }
  if (kind === 'walk') {
    const options = reachableDestinations(pet)
    wish.destination = options[Math.floor(rand() * options.length)]
  }
  return wish
}
