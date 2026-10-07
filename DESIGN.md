# Mossling — Game Design Doc (draft v0.2)

> Status: **draft v0.2**, decisions in §13. Anything not yet confirmed by the author is marked _(proposal)_.

## 1. Pitch

A tiny forest spirit grows from a patch of moss and lives with you in real time. You don't keep it alive — you keep it company. It naps through winter, gets restless in spring, wanders in summer, and gathers things in autumn. A cozy, slightly melancholic virtual pet with a Nordic-folklore mood.

## 2. Pillars

1. **Gentle, never punishing.** No death, no guilt-trip notifications. Neglect makes the Mossling lonely, not sick.
2. **Lives on real time.** Day/night and seasons follow the real clock and calendar.
3. **Small and quiet.** Short check-ins (30 seconds to 2 minutes) that feel like visiting a friend, not doing chores.
4. **It becomes yours.** How you treat it shapes its personality and appearance.

## 3. Originality guardrail

Mossling is inspired by the **mood** of Moomin-style stories: Nordic, seasonal, melancholic-cozy, odd gentle creatures. It does **not** use their characters. The Moomin IP is actively protected, so:

- No Moomin, Snufkin, Little My, Moominvalley, or other franchise names and references.
- No white, rounded, hippo-snouted silhouette. The Mossling must read as its own creature.
- No copied art style. Take inspiration from Scandinavian folk art, mushrooms, lichen, and forest floors instead.

## 4. The creature _(proposal)_

- A palm-sized, round, mossy spirit with a soft body of moss and lichen, two dark bead eyes, and tiny root-feet.
- It changes as it grows: sprouts, a mushroom cap, flowers, frost, and so on. These changes show its personality and the current season.
- Its expressions are mostly in the eyes, posture, and small particles (spores, dewdrops, sleepy "z"s).

## 5. Needs (MVP: 4) _(proposal)_

Each need is a value from 0 to 100 that drifts slowly. None of them can cause death.

| Need | Drops when | Restored by |
|---|---|---|
| **Fullness** | Time passes | Feeding |
| **Warmth** | Time passes; faster at night and in winter | Tea, blanket, bringing it inside |
| **Rest** | Being awake; play | Sleep (it naps on its own at night) |
| **Companionship** | Time without visits | Visiting, talking, telling stories, walks |

A derived **Mood** (content / restless / sad / lonely) comes from the needs. Mood drives the animations and dialogue.

## 6. Care actions (MVP) _(proposal)_

- **Feed**: berries, mushrooms, or tea (warms it too).
- **Tuck in**: puts it to sleep and restores Rest faster.
- **Tell a story**: adds Companionship. You pick from a few short story cards.
- **Walk**: a short real-time outing (e.g. 10 minutes) that returns small found items: pebbles, feathers, seeds.
- **Tidy the burrow**: a light cosmetic chore that gives a small mood bonus.

## 7. Time model

This is the core technical decision.

- **State is computed, not ticked.** Saved state is `{ needs, lastSeen, ... }`. On load: `elapsed = now - lastSeen`, then apply the decay rates over `elapsed`. Nothing has to run in the background.
- **Decay has a floor.** No need ever drops below 10, whether the app is open or not. Coming back after a month never shows a ruined pet.
- **Absence policy:** if Companionship sits at the floor (10) for 3 days in a row, the Mossling **wanders off**. Any interaction, even just feeding, resets that streak, so only a real absence of about 4 days triggers it. When you return, the burrow is empty. A short "find it" moment (following footprints or spores) brings it home with a small found gift. It is never lost forever. _(proposal)_
- **Notifications** are computed ahead from the same math, e.g. "it's getting chilly" when Warmth will cross a threshold. These can be scheduled as local notifications. Gentle tone, at most one or two a day. _(proposal)_
- **Seasons** follow the real calendar (hemisphere setting). Winter means more sleeping and faster Warmth decay. Spring speeds up growth. Summer allows longer walks. Autumn gives better finds.

## 8. Growth and personality _(proposal)_

- Hidden traits move with care patterns. Examples: many walks push toward *Wanderer*; many stories toward *Dreamer*; frequent short visits toward *Homebody*; rare visits toward *Shy*.
- Stages: **Spore → Sprout → Mossling → Elder Moss**, over weeks rather than hours.
- Each stage plus the dominant trait sets visual details and dialogue lines.

## 9. World _(later, not MVP)_

- A small valley you unlock over time: the burrow, a stream, a foggy hill, a lake.
- Original visiting characters, e.g. a travelling musician, a grumpy collector who trades for your found items, and a little creature that appears only in fog.
- A collection book of found items and visitor encounters.

## 10. Art and audio direction _(proposal, open)_

- A soft, textured 2D look: muted greens, ochres, and dusk blues; paper or watercolor grain.
- Day/night lighting and seasonal palettes give most of the atmosphere.
- Audio: quiet ambience (wind, birds, rain, crackling stove) and a sparse, kalimba- or music-box-like theme.

## 11. Tech approach _(proposal)_

Goal: build for the web first, then reuse the same code in native apps.

- **`core/`**: the pet simulation as pure TypeScript with no DOM or UI. It holds needs, decay, the time model, growth, and seasons. It is fully unit-testable and runs anywhere.
- **`web/`**: the UI on top of `core` (e.g. Vite + React with Canvas or SVG for the creature). Saves to IndexedDB or localStorage.
- **Native later:**
  - **Option A:** wrap the web app with **Capacitor** for iOS and Android, adding local notifications through a plugin.
  - **Option B:** ship it as an installable **PWA**.
  - **Option C:** if a native-first feel matters more, rebuild the UI in **Expo / React Native**, which also runs on web via react-native-web. `core/` is reused as-is.
- Home-screen **widgets** need native code (Swift/Kotlin) on any route. They would read the same saved state.

## 12. MVP scope

- [x] One Mossling at stage *Sprout*.
- [x] Four needs plus the derived mood, using the computed time model and capped offline decay.
- [x] Feed, Tuck in, Tell a story, Walk.
- [x] Day/night from the real clock.
- [x] Local save and load.
- [x] Simple animated creature showing mood states (idle, happy, sleepy, cold, lonely).
- [x] Wander-off and find-it-again event.
- [x] Dev-only time controls (fast-forward) for testing.
- Deferred: seasons, growth stages, the world, visitors, notifications, native wrapping.

## 13. Decisions (2026-10-07)

1. **Art style:** good-looking but not fancy. Soft vector/SVG shapes with gentle gradients and simple CSS/SVG animation. No pixel art, no heavy illustration.
2. **Losing the pet:** yes. It wanders off after long neglect and **always** comes back once you find it.
3. **Notifications:** gentle, at most one or two a day. Built after the MVP.
4. **Pace:** a normal day needs about **2–4 check-ins**. Supervised activities (e.g. a walk) invite extra visits, but missing them is never punished. The Mossling just comes home on its own with fewer finds.
5. **Pets:** one Mossling for now. The save format stores a list of pets so more can be added later.
6. **Platform:** web first (Vite + React + TypeScript). Capacitor wraps the same build for iOS/Android later with no rewrite. The pet simulation lives in `src/core/` as pure TypeScript, so a different UI layer could reuse it.

## 14. Open questions

- Exact decay tuning after playtesting.
- Hemisphere and season setup once seasons are added.
