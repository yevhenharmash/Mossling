import type { Form, Stage } from './types'
import { FORMS, STAGES } from './types'
import { BOND_LEVELS, DAY, STAGE_STARTS_AT_DAY } from './tuning'

/** Life stage from real age. Elder is final: there is no death. */
export function stageAt(bornAt: number, t: number): Stage {
  const days = (t - bornAt) / DAY
  let stage: Stage = 'sprout'
  for (const s of STAGES) if (days >= STAGE_STARTS_AT_DAY[s]) stage = s
  return stage
}

export function ageInDays(bornAt: number, t: number): number {
  return Math.max(0, Math.floor((t - bornAt) / DAY))
}

/** The play style you leaned on most. Nobody shaped it → Homebody. Ties go to FORMS order. */
export function dominantForm(traits: Record<Form, number>): Form {
  let best: Form = 'homebody'
  let bestScore = 0
  for (const f of FORMS) {
    if (traits[f] > bestScore) {
      best = f
      bestScore = traits[f]
    }
  }
  return best
}

export function bondLevel(points: number): number {
  let level = 0
  BOND_LEVELS.forEach((needed, i) => {
    if (points >= needed) level = i
  })
  return level
}

export function emptyTraits(): Record<Form, number> {
  return { wanderer: 0, dreamer: 0, foodie: 0, homebody: 0 }
}
