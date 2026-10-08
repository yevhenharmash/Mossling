import { DAY, HOUR, collectFinds, feed, hug, settle, simulate, tidy, wake, type Pet } from '../core'
import { clock } from './clock'

/**
 * Dev only: fast-forward `days` with a caring player (two visits a day, porridge
 * and hugs, tidying and settling fusses), so later stages and other seasons can
 * be seen without it wandering off or growing a wild coat.
 */
export function careFor(pet: Pet, days: number): Pet {
  let p = pet
  const start = clock.now()
  for (let d = 1; d <= days; d++) {
    for (const h of [8, 19]) {
      const day = new Date(start + d * DAY)
      day.setHours(h, 0, 0, 0)
      const t = day.getTime()
      p = simulate(p, t)
      if (p.asleep) p = wake(p, t).pet
      if (p.activity) p = collectFinds(p, t).pet
      for (let i = 0; i < 3 && p.messes.length > 0; i++) p = tidy(p, t).pet
      for (let i = 0; i < 4 && p.needs.fullness < 90; i++) p = feed(p, 'porridge', t).pet
      for (let i = 0; i < 6 && (p.needs.warmth < 90 || p.needs.companionship < 90); i++) p = hug(p, t).pet
      if (p.call?.kind === 'fuss') p = settle(p, t).pet
    }
  }
  const end = new Date(start + days * DAY)
  end.setHours(10, 0, 0, 0)
  clock.skip(end.getTime() - start)
  return simulate(p, end.getTime() + HOUR / 60)
}
