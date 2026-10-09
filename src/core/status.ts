import type { DeathCause, Pet } from './types'
import { lifespan } from './sim'
import { FADING_WARNING, MAX_HEARTS, SICK_DEATH_AFTER, STARVE_DEATH_AFTER } from './tuning'

/** Whole hearts to show for a meter: any part of a heart counts. */
export function hearts(value: number): number {
  return Math.min(MAX_HEARTS, Math.max(0, Math.ceil(value - 1e-6)))
}

/** The nearest way it could die soon, and how long is left. Null when nothing is threatening it. */
export function deathRisk(p: Pet): { cause: Exclude<DeathCause, 'oldAge'>; in: number } | null {
  if (p.stage === 'spore') return null
  const risks: { cause: Exclude<DeathCause, 'oldAge'>; in: number }[] = []
  if (p.sick) risks.push({ cause: 'sickness', in: SICK_DEATH_AFTER - p.sick.untreatedFor })
  if (p.hunger <= 0) risks.push({ cause: 'starvation', in: STARVE_DEATH_AFTER - p.starvingFor })
  return risks.sort((a, b) => a.in - b.in)[0] ?? null
}

/** Close to death: it looks pale and says so, but can still be saved. */
export function isFading(p: Pet): boolean {
  const risk = deathRisk(p)
  return risk !== null && risk.in <= FADING_WARNING
}

/** Its last day: it won't wake up again. */
export function isLastDay(p: Pet): boolean {
  return p.stage === 'adult' && p.age + 1 >= lifespan(p)
}
