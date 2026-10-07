import { useCallback, useEffect, useRef, useState } from 'react'
import { activePet, createPet, newSave, simulate, withPet, type ActionResult, type Pet, type Save } from '../core'
import { clock } from './clock'
import { localStore } from './storage'

const TICK_MS = 30_000

const advance = (save: Save, now: number) => withPet(save, simulate(activePet(save), now))

export function useGame() {
  const [loaded, setLoaded] = useState(false)
  const [save, setSave] = useState<Save | null>(null)
  const [now, setNow] = useState(() => clock.now())
  const saveRef = useRef(save)
  saveRef.current = save

  useEffect(() => {
    void localStore.load().then((stored) => {
      const t = clock.now()
      setNow(t)
      setSave(stored ? advance(stored, t) : null)
      setLoaded(true)
    })
  }, [])

  const tick = useCallback(() => {
    const t = clock.now()
    setNow(t)
    setSave((s) => (s ? advance(s, t) : s))
  }, [])

  // Keep the simulation moving while visible; save whenever state changes and when hidden.
  useEffect(() => {
    const persist = () => {
      if (saveRef.current) void localStore.save(saveRef.current)
    }
    const onVisibility = () => (document.visibilityState === 'visible' ? tick() : persist())
    const id = setInterval(() => document.visibilityState === 'visible' && tick(), TICK_MS)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', persist)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', persist)
    }
  }, [tick])

  useEffect(() => {
    if (save) void localStore.save(save)
  }, [save])

  const act = useCallback((fn: (pet: Pet, now: number) => ActionResult): ActionResult | null => {
    const current = saveRef.current
    if (!current) return null
    const t = clock.now()
    const result = fn(activePet(current), t)
    const next = withPet(current, result.pet)
    saveRef.current = next
    setSave(next)
    setNow(t)
    return result
  }, [])

  const create = useCallback((name: string) => {
    const t = clock.now()
    setNow(t)
    setSave(newSave(createPet(crypto.randomUUID(), name, t)))
  }, [])

  const skip = useCallback(
    (ms: number) => {
      clock.skip(ms)
      tick()
    },
    [tick],
  )

  const reset = useCallback(async () => {
    await localStore.clear()
    clock.reset()
    saveRef.current = null
    setSave(null)
    setNow(clock.now())
  }, [])

  return { loaded, pet: save ? activePet(save) : null, now, act, create, skip, reset }
}
