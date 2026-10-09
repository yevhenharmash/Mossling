import { useCallback, useEffect, useRef, useState } from 'react'
import { arrive, createPet, DAY, liveDays, newSave, plantAgain, simulate, type ActionResult, type Pet, type Save } from '../core'
import { clock } from './clock'
import { localStore } from './storage'

const TICK_MS = 30_000

const withPet = (save: Save, pet: Pet): Save => ({ ...save, pet })

export function useGame() {
  const [loaded, setLoaded] = useState(false)
  const [save, setSave] = useState<Save | null>(null)
  const [now, setNow] = useState(() => clock.now())
  const saveRef = useRef(save)
  saveRef.current = save

  const commit = useCallback((next: Save | null) => {
    saveRef.current = next
    setSave(next)
    // Read the clock again: dev tools may have moved it.
    setNow(clock.now())
  }, [])

  useEffect(() => {
    void localStore.load().then((stored) => {
      commit(stored ? withPet(stored, arrive(stored.pet, clock.now())) : null)
      setLoaded(true)
    })
  }, [commit])

  /** Keeps the clock moving while you watch. Not a visit: only opening the app or tapping is. */
  const tick = useCallback(() => {
    const t = clock.now()
    setNow(t)
    setSave((s) => (s ? withPet(s, simulate(s.pet, t)) : s))
  }, [])

  const visit = useCallback(() => {
    const current = saveRef.current
    if (current) commit(withPet(current, arrive(current.pet, clock.now())))
  }, [commit])

  // Save whenever state changes and when hidden; coming back to the app is a new visit.
  useEffect(() => {
    const persist = () => {
      if (saveRef.current) void localStore.save(saveRef.current)
    }
    const onVisibility = () => (document.visibilityState === 'visible' ? visit() : persist())
    const id = setInterval(() => document.visibilityState === 'visible' && tick(), TICK_MS)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', persist)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', persist)
    }
  }, [tick, visit])

  useEffect(() => {
    if (save) void localStore.save(save)
  }, [save])

  const act = useCallback(
    (fn: (pet: Pet, now: number) => ActionResult): ActionResult | null => {
      const current = saveRef.current
      if (!current) return null
      const result = fn(current.pet, clock.now())
      commit(withPet(current, result.pet))
      return result
    },
    [commit],
  )

  const plant = useCallback(
    (name: string) => {
      const current = saveRef.current
      const id = crypto.randomUUID()
      const t = clock.now()
      commit(current ? plantAgain(current, id, name, t) : newSave(createPet(id, name, t)))
    },
    [commit],
  )

  /** Dev: move the clock forward with nobody visiting. */
  const skip = useCallback(
    (ms: number) => {
      clock.skip(ms)
      tick()
    },
    [tick],
  )

  /** Dev: move the clock forward `days` days with a perfect player visiting at 8:00 and 19:00. */
  const careFor = useCallback(
    (days: number) => {
      const current = saveRef.current
      if (!current) return
      const from = clock.now()
      clock.skip(days * DAY)
      commit(withPet(current, liveDays(current.pet, from, days)))
    },
    [commit],
  )

  const reset = useCallback(async () => {
    await localStore.clear()
    clock.reset()
    commit(null)
  }, [commit])

  return { loaded, save, now, act, plant, skip, careFor, reset }
}
