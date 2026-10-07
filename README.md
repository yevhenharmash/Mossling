# Mossling

A cozy, Moomin-*inspired* virtual pet: a tiny moss spirit that lives on real time. See [DESIGN.md](DESIGN.md).

```sh
npm install
npm run dev      # http://localhost:5173 — dev builds show a "time travel" panel
npm test         # simulation tests (pacing, absence, walks, saves)
npm run build    # typecheck + production build into dist/
```

## Layout

- `src/core/`: the pet simulation as pure TypeScript. No DOM, storage, React or `Date.now()`; every function takes `now`. Balance numbers are in `tuning.ts`.
- `src/ui/`: the React UI. `clock.ts` is the only place the real clock is read. `storage.ts` is the save adapter (swap it for Capacitor Preferences later).

Native apps later: add Capacitor on top of `dist/`. No rewrite needed.
