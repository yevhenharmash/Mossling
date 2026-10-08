# Mossling

A cozy, Moomin-*inspired* virtual pet: a tiny moss spirit that lives on real time. See [DESIGN.md](DESIGN.md).

```sh
npm install
npm run dev      # http://localhost:5173 — dev builds show a "time travel" panel
npm test         # simulation tests: calendar, rate modifiers, pacing in every season × stage,
                 # growth & personality, absence, systems (pantry, wishes, bond, walks, sniffles),
                 # care (calls, fussing, messes, coats, hide-and-seek), moods, saves
npm run build    # typecheck + production build into dist/
```

## Layout

- `src/core/`: the pet simulation as pure TypeScript. No DOM, storage, React or `Date.now()`; every function takes `now`. Balance numbers are in `tuning.ts`.
- `src/core/__tests__/`: one file per area. Game rules (DESIGN.md §5–§7) are written as tests.
- `src/ui/`: the React UI. `clock.ts` is the only place the real clock is read. `storage.ts` is the save adapter (swap it for Capacitor Preferences later).

Dev builds have a **Dev: time travel** panel: skip hours or days, or fast-forward a week, a month or a season *with care* (two visits a day) to see later stages and other seasons without it wandering off. "Look" switches between the current creature and the original mound design.

Native apps later: add Capacitor on top of `dist/`. No rewrite needed.
