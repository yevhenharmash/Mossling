import { parseSave, type Save } from '../core'

/**
 * Async storage boundary. localStorage today; swap for Capacitor Preferences
 * or IndexedDB later without touching the rest of the app.
 */
export interface SaveStore {
  load(): Promise<Save | null>
  save(save: Save): Promise<void>
  clear(): Promise<void>
}

const KEY = 'mossling.save.v1'

export const localStore: SaveStore = {
  async load() {
    try {
      return parseSave(localStorage.getItem(KEY))
    } catch {
      return null
    }
  },
  async save(save) {
    try {
      localStorage.setItem(KEY, JSON.stringify(save))
    } catch {
      // Storage full or blocked: the game keeps running in memory.
    }
  },
  async clear() {
    try {
      localStorage.removeItem(KEY)
    } catch {
      // ignore
    }
  },
}
