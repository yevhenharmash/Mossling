# Mossling

The original 1996 Tamagotchi's rules with a new hero, a tiny moss troll, and with the original's downsides fixed. See [DESIGN.md](DESIGN.md).

```sh
npm install
npm run dev      # http://localhost:5173 (dev builds show a "time travel" panel)
npm test         # the rules as tests: care, evolution chart, pacing contract, saves
npm run build    # typecheck + production build into dist/ (installable PWA, works offline)
```

## Layout

- `src/core/`: the pet simulation as pure TypeScript. No DOM, storage, React or `Date.now()`; every function takes `now`. Balance numbers are in `tuning.ts`, the evolution chart in `characters.ts`.
- `src/core/__tests__/`: one file per area. `pacing.test.ts` checks what 2 visits a day, 1 visit a day and no visits lead to.
- `src/ui/`: the React UI. `clock.ts` is the only place the real clock is read. `storage.ts` is the save adapter.
- `public/`: icons, the web manifest and the offline service worker.

Dev builds have a **Dev: time travel** panel. Skip hours or a day with nobody visiting, or fast-forward days with a perfect player visiting at 8:00 and 19:00 (the same player the pacing tests use, `liveDays` in `src/core/autoplay.ts`).
