# Mossling — Game Design Doc (v0.5)

> Mossling is the original 1996 Tamagotchi (P1) with a new hero and with the original's known downsides fixed. Rules are copied, not invented. Every place we differ from P1 names the downside it fixes. All numbers live in `src/core/tuning.ts`. The tests in `src/core/__tests__/` are the executable version of this doc.

## 1. Pitch

A glowing spore hatches into a tiny moss troll that lives in real time. Feed it, play with it, clean up after it, put it to bed, teach it manners and nurse it when it's sick. How well you do decides what it grows into, and how long it lives. It can die. When it does, you plant the next spore and try for a better one.

## 2. Pillars

1. **Real stakes, copied from the original.** Care mistakes, discipline, sickness, a branching evolution chart, a natural lifespan and real death.
2. **Fits into a normal day.** Two visits a day (morning and evening) are enough for perfect care. The original needed you every 15 minutes.
3. **Nothing hidden.** The meters, mistakes, discipline, what it's on track to become, its expected lifespan and how long until it dies are always on screen. The original hid all of this.
4. **Its own creature.** Same rules, different hero: a Nordic-folklore moss troll, not a Bandai character.

## 3. Originality guardrail

- **Rules are copied from the P1; nothing else is.** No Bandai character names, sprites, egg-shaped device or "Tamagotchi" trademark. Game rules can't be copyrighted; names and art can.
- **Moomin-inspired mood only.** No Moomin, Snufkin, Little My, Moominvalley or other franchise names. No white, rounded, hippo-snouted silhouette. Inspiration comes from Scandinavian folk art, mushrooms, lichen and forest floors.

## 4. The toy

The screen sits in a toy you hold, so the app feels like a pocket pet rather than a web page (`src/ui/Device.tsx`):

- **The shell** is a smooth river pebble with moss growing over the top, a sprout, a toadstool and a fern. It is our own shape, not the egg.
- **The screen** is set into a carved hollow behind glass. It shows the painted scene, the clock, and any menu that is open.
- **The icon ring:** 8 hand-drawn icons are painted on the stone (`src/ui/icons.tsx`), 4 above the screen and 4 below. Above: Feed, Lights, Play, Medicine. Below: Clean, Status, Not now, and a bell. The icon under the cursor lights up. The bell can't be pressed; it lights up and rings when it calls you, like P1's attention icon.
- **Three wooden buttons**, as on P1: A moves the cursor, B chooses, C backs out. The keys a, b and c work as the buttons. On a touchscreen you can also tap an icon directly.
- **Screen menus**, as on P1:
  - Feed opens a two-item menu, Meal and Snack.
  - Status flips through pages: hunger hearts, happy hearts, the discipline gauge, then age and what it's becoming.
  - The peek game is played on the screen, around a stump.
- **The paper tag** tied to the toy shows its words: calls, refusals and reactions. P1 had no text; we keep it because pillar 3 needs words.
- **Field notes** under the tag keep every stake in view: hearts, discipline, mistakes, what it's on track to become, and its lifespan. The warnings (sick or starving, the hours left) sit above the notes. The Sleepover button is in the notes too.

## 5. The creature and its forms

Storybook look: hand-inked outlines, soft washes, paper grain.

- An upright, pale little forest troll with a soft pear-shaped body, stubby legs and short arms.
- What makes it a Mossling: **leaf ears** (they droop when it's sad, sick or asleep, and wiggle when it's happy), a **mossy cap with a sprout**, and a thin tail ending in a **moss tuft**.
- Deliberately not Moomin: no snout. Deliberately not Totoro: no pointy ears, no belly chevrons.

Every form is the same troll with a different body wash and extras (`src/ui/Creature.tsx`):

| Stage | Mossling | P1 original | Look |
|---|---|---|---|
| Egg | Spore | Egg | A glowing spore in a nest of moss |
| Baby | Speck | Babytchi | Tiny, no limbs yet |
| Child | Sprig | Marutchi | The plain troll |
| Teen (good care) | Fernlet | Tamatchi | Shine, extra leaf |
| Teen (poor care) | Burrlet | Kuchitamatchi | Scruffy tufts and burrs |
| Adult | Glowcap | Mametchi | Glowing mushroom: the best one |
| Adult | Fernwhisk | Ginjirotchi | A flower |
| Adult | Hoodle | Maskutchi | Lavender, a scarf; sleeps late |
| Adult | Puddock | Kuchipatchi | Round and warm, a satchel |
| Adult | Slinkweed | Nyorotchi | Green, long tail |
| Adult | Thistle | Tarakotchi | Burrs and a thistle flower |
| Secret | Old Lichen | Oyajitchi / Bill | Grey, a lichen beard |

## 6. Rules: the original, and what we changed

| P1 rule | Mossling | Fixes |
|---|---|---|
| **Hunger and Happy**, 4 hearts each | Same | — |
| Hearts drop every 45–91 min by character | Same order, compressed into **2.6–3.15 h per heart** (`p1Hours`): 4 hearts plus the call window outlast a 12-hour day between two visits | Constant attention |
| **Meal** +1 hunger; refused when full | Same | — |
| **Snack** +1 happy, +2 weight | +1 happy; more than **4 a day** gives a tummy ache (it gets sick) | Weight had no stakes; this gives snacks a cost |
| **Game**: guess left/right 5 times, 3 right = +1 happy | Same ("which side will it peek out?") | — |
| **Poop** every few hours (more often when young), up to 4; leaving it causes sickness | Same, up to 4; sick after **12 awake hours** with poop around | — |
| **Sickness**: once per stage at random, plus from poop; medicine 1–3 doses by character | Same, with P1's doses per character | — |
| Sick too often or too long → dies | Untreated for **36 h** → dies. P1's "3 sicknesses in one stage" is **not** copied: it punished bad luck as much as neglect | Sudden death |
| Hunger at zero → dies | Hunger at zero for **36 h** → dies | Sudden death |
| **Calls**: an empty meter or bedtime beeps; not answered in **15 min** = a care mistake | Window is **2 h**. A missed meter doesn't call again until refilled | Constant attention |
| **Lights**: it falls asleep and you turn the lights off | Same, but you may turn them off up to **4 h before bedtime** (before it hatches, the Sprig's bedtime counts), so an evening visit, or an evening planting, covers it | Constant attention |
| **Sleep** 8–11 pm until 9–11 am, by character | P1 bedtimes; wake-up moved to **7 am** so a morning visit finds it awake. Hoodle (P1's Maskutchi) still lies in until 8 | Fits a school/work day |
| Meters don't drop and nothing happens while asleep | Same | — |
| **False calls**: it calls with nothing wrong; scold = +25% discipline; ignoring = a discipline mistake | Same, but a fuss only starts **when you arrive for a visit** (40% chance while discipline < 100%) | Constant attention |
| Scolding when it didn't misbehave | −1 happy | — |
| **Age** +1 every time it wakes | Same | — |
| **Growth**: egg 5 min, baby 65 min, teen at age 3, adult at age 6, secret between 8 and 12 | Same; secret at 10 | — |
| **Evolution chart** by care mistakes per stage and lifetime discipline mistakes | Same table (§7) | — |
| **Lifespan** ~12 days on average; mistakes shorten it | **30** with perfect care, **a year less per 2 care mistakes**, never below 8. One visit a day ends around age 17–21 | — |
| Hidden stats; death without warning | Everything on screen (pillar 3). **Fading** in the last 12 h before death: pale, droopy, a red warning with the hours left. Old age: a warning on its last day | Hidden rules, sudden death |
| Ghost or angel, then a new egg | A **mossy gravestone** with its name, form, age and cause. Plant a new spore; the gallery keeps every Mossling you raised | Shallow replay |
| No pause | **Sleepover**: time stands still for up to **3 days**, then it comes home by itself. Not while sick or calling, and not again for a day after it's back | No pause |

## 7. Evolution chart

From the datamined P1 ROM conditions. "Care" counts care mistakes **in the current stage** (the baby's count carries into childhood). "Discipline" counts discipline mistakes over its **whole life**. An **unruly** teen (P1's hidden "type 2") had 3+ discipline mistakes when it stopped being a child. Code: `EVOLUTION_CHART` in `src/core/characters.ts`, one test per row.

| From | Condition | Becomes |
|---|---|---|
| Sprig | care 0–2 | Fernlet |
| Sprig | care 3+ | Burrlet |
| Fernlet | care 0–2, discipline 0 | **Glowcap** |
| Fernlet | care 0–2, discipline 1 | Fernwhisk |
| Fernlet | care 0–2, discipline 2+ | Hoodle |
| Fernlet | care 3+, discipline 0–1 / 2–3 / 4+ | Puddock / Slinkweed / Thistle |
| Unruly Fernlet | care 0–3, discipline 0–1 / 2+ | Fernwhisk / Hoodle |
| Unruly Fernlet | care 4+, discipline 0–7 / 8+ | Slinkweed / Thistle |
| Burrlet | discipline 0–1 / 2 / 3+ | Puddock / Slinkweed / Thistle |
| Unruly Burrlet | discipline 0–1 / 2–5 / 6+ | Puddock / Slinkweed / Thistle |
| Unruly Hoodle | wakes at age 10 | **Old Lichen** (secret) |

## 8. The pacing contract (tested in `pacing.test.ts`)

- **2 visits a day** (tested at 8/19, 7/19, 8/20, 9/18 and 7:30/18:30, lights off at the evening visit) → no care or discipline mistakes, never sick from neglect, becomes **Glowcap**, dies of old age at **30**. Planting in the evening and turning the lights off straight away costs nothing. A child may call for food shortly before the evening visit; it's answered in time.
- **1 visit a day** → care mistakes most days, **Burrlet → Puddock**, dies of old age around **age 17–21**. It never dies of neglect, and sickness that starts right after a visit can still be treated at the next one.
- **No visits** → it fades for at least 11 hours, then dies **2–3 days** after the last visit.

## 9. Time model

- The simulation is pure TypeScript in `src/core/`. It never reads the clock; every function takes `now`.
- Time away is replayed in **5-minute steps** (`simulate`), so the pet keeps living while the app is closed.
- Every random event (sickness, fusses, the game's peeks) is a roll seeded by the pet's id and the moment. The same history always gives the same result.
- A **visit** is opening the app or tapping something after an hour away (`arrive`). Only a visit can start a fuss.

## 10. Tech

- **Stack:** Vite + React + TypeScript, Vitest for the rules.
- **Layout:** `src/core/` is the simulation (no DOM, storage or React). `src/ui/` is the React app. `clock.ts` is the only place that reads the real clock. `storage.ts` is the save adapter (localStorage today).
- **Phone:** it's an installable **PWA** (`public/manifest.webmanifest`) and works offline (`public/sw.js`).
- **Next:** wrap the same build with **Capacitor** for the App Store and Play Store. The main reason is **local notifications** for calls ("Pip is calling you"), which are what make the call window meaningful when the app is closed. Web push on iOS only reaches an installed PWA. Swap `storage.ts` for Capacitor Preferences at the same time.

## 11. Decisions

1. **2026-10-07, art:** good-looking but not fancy. Soft SVG shapes, gentle gradients, simple CSS animation. No pixel art.
2. **2026-10-07, platform:** web first; Capacitor for native later, with no rewrite.
3. **2026-10-08, stakes:** copy the original Tamagotchi's rules, including real death, rather than inventing our own. Fix each of its downsides, and name the downside for every change.
4. **2026-10-09, rewrite:** the earlier prototype's invented systems (seasons, weather, foraging, pantry, wishes, bond, walks, wandering off, journal, coats) were removed, and the core was rewritten as a straight P1 copy. Defaults chosen: P1's 2 hearts (not 4 needs), no weight (a snack limit instead), a 2 h call window, and a capped pause.
5. **2026-10-09, one pet at a time:** the save holds the current Mossling plus the gravestones of earlier ones.
6. **2026-10-09, the toy:** the UI became a handheld toy: a mossy pebble with an icon ring, three buttons and a paper tag. It keeps the storybook art inside the screen; pixel art was considered and turned down.

## 12. Open questions

- Tuning after real playtesting, especially the snack limit, fuss chance and the 2 h window.
- Notifications: which calls notify, and whether a fuss should (it's a fib, so probably not).
- Whether the gallery should become a collection screen ("forms you've raised: 4 of 9").
- Art: each adult deserves more of its own silhouette than an accessory.
- Sound.

Sources for the P1 rules:
- [Thaao's P1 care guide](https://thaao.net/tama/p1/)
- [TamaTalk P1/P2 evolution guide (datamined conditions and stats)](https://www.tamatalk.com/threads/tamagotchi-p1-p2-evolution-guide.200023/)
- [Wikipedia: Tamagotchi](https://en.wikipedia.org/wiki/Tamagotchi)
