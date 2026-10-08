# Mossling — Game Design Doc (draft v0.4)

> Status: **draft v0.4**. Decisions are in §13; the game systems are in §5–§8. v0.4 adds the care loop borrowed from the original Tamagotchi (§6.9–§6.10). All numbers are tunable; they live in `src/core/tuning.ts`.

## 1. Pitch

A tiny forest spirit grows from a patch of moss and lives with you in real time. You don't keep it alive — you keep it company. It naps through winter, gets restless in spring, wanders in summer, and gathers things in autumn. A cozy, slightly melancholic virtual pet with a Nordic-folklore mood.

## 2. Pillars

1. **Gentle, but your care shows.** No death, no guilt-trip notifications. Neglect makes the Mossling lonely, not sick. How well you look after it shapes **what it grows into** (its coat, §6.9), never whether it survives. Every outcome is a nice one; some are just harder to get.
2. **Lives on real time.** Day/night and seasons follow the real clock and calendar.
3. **Small and quiet.** Short check-ins (30 seconds to 2 minutes) that feel like visiting a friend, not doing chores.
4. **It becomes yours.** How you treat it shapes its personality and appearance.

## 3. Originality guardrail

Mossling is inspired by the **mood** of Moomin-style stories: Nordic, seasonal, melancholic-cozy, odd gentle creatures. It does **not** use their characters. The Moomin IP is actively protected, so:

- No Moomin, Snufkin, Little My, Moominvalley, or other franchise names and references.
- No white, rounded, hippo-snouted silhouette. The Mossling must read as its own creature.
- No copied art style. Take inspiration from Scandinavian folk art, mushrooms, lichen, and forest floors instead.

## 4. The creature

Storybook look in the spirit of Nordic picture books: hand-inked outlines, soft washes, paper grain.

- An upright, pale-cream little forest troll: soft pear-shaped body on stubby legs, short arms, small dot eyes, a tiny soft nose and rosy cheeks.
- What makes it a *Mossling*: **leaf-shaped ears** that droop when it's sad or sleepy and wiggle when it's happy, a **mossy cap** with a sprout growing from it, and a thin tail ending in a **moss tuft**.
- Deliberately not Moomin: no snout, no hippo silhouette. Deliberately not Totoro: no pointy ears, no belly chevrons.
- Expressions use the eyes, mouth, ears, arms and small particles (frost, tear, sleepy "z"s).
- Later growth stages can change the cap, sprout and tail (flowers, a mushroom, frost in winter).

## 5. Needs and moods

Four needs, each 0–100, that drift over time. None of them ever drops below **10**.

| Need | Drops when | Restored by |
|---|---|---|
| **Fullness** | Time passes | Food (porridge is unlimited; pantry food is better) |
| **Warmth** | Time passes; faster at night and in winter | Hugs, tea, soup, porridge, a blanket |
| **Rest** | Being awake; walks | Sleep (it goes to bed by itself at night) |
| **Companionship** | Time without you | Hugs, stories, walks, gifts, any interaction |

**Moods**, in priority order (the first one that applies wins): away → walking → at the door → asleep → sniffly → fussy → delighted → hungry / cold / sleepy / lonely (a need under 30) → restless (a need under 50) → content.

## 6. Game systems

The goal is depth from systems that feed each other, not from more meters. Each system below says what it feeds into.

### 6.1 Calendar: seasons, day length and weather → decay, walks, wishes, visuals
- **Season** comes from the real month and a **hemisphere** setting (north by default; south is shifted 6 months).
- **Night hours:** winter 20–8, spring 22–6, summer 23–6, autumn 21–7. It goes to bed by itself at night.
- **Warmth decay by season:** winter ×1.25, autumn ×1.1, spring ×1, summer ×0.6.
- **Weather** is rolled once per day per season: sunny, cloudy, rain, fog or snow (snow only in winter). Weather only matters **outdoors**:
  - Rain chills it on walks and brings snails and mushrooms.
  - Fog makes rare glowcaps 4× likelier.
  - Snow brings icicles.

### 6.2 Foraging and the pantry → food, wishes, favourites
- **Porridge** is unlimited: always available, never distressing to rely on.
- **Pantry foods** come from walks:

  | Food | Uses | Effect |
  |---|---|---|
  | Berries | 1 berry | +25 Fullness, +5 Companionship |
  | Mushroom soup | 1 mushroom | +40 Fullness, +15 Warmth |
  | Pine tea | 1 pine needles | +35 Warmth; cures sniffles |

- A new Mossling starts with a small pantry: 3 berries, 2 mushrooms and 3 pine needles.
- **Walk destinations:**
  - **Meadow:** 20 min, always available.
  - **Stream:** 45 min. Needs bond ♥1, and it can't be a sprout.
  - **Old Woods:** 2 h. Needs bond ♥3 and Rest of at least 50.
- **What walks bring back:** finds come from loot tables per destination × season × weather, mixing pantry food and collectibles.
- **Collecting finds:** it waits at the door for 60 minutes. Collected in time, you get everything plus bond. After that it goes in by itself with half the finds.

### 6.3 Preferences and discovery → delight, bond, journal
- Every Mossling is born with a **favourite food**, a **disliked food**, a **favourite story** and a **favourite found item**. These are seeded from its id, so each one is different.
- **Favourites:** giving it a favourite **delights** it (a special mood for 30 min), adds Companionship and adds bond.
- **Dislikes:** it refuses the disliked food. A refusal never uses up the item.
- Whatever you discover is written in the **journal** ("Pip loves pine tea").
- **Stories:** you pick from 3 story cards that change through the day.

### 6.4 Daily wish → bond
- Each day it has one small **wish**: hear a story, eat a specific food, a hug, a present, a game of hide-and-seek, or a walk to a destination it can reach.
- The wish is rolled when the day starts and stays the same for the whole day.
- Granting it gives +5 bond, delight and Companionship.

### 6.5 Bond (0–5 ♥) → unlocks
- Bond grows only through **capped** sources, so it can't be farmed:
  - **Wish granted:** +5 a day.
  - **Favourites:** +3 each, at most once per favourite kind per day.
  - **Walks collected in time:** +2 each, at most 2 walks a day.
  - **A "good day":** +2, the first time you interact while it's content that day.
  - **Hide-and-seek win:** +2, once a day.
- **Levels:** 0, 12, 35, 70, 120, 190 points.
- **What each level unlocks:**
  - ♥1: the Stream.
  - ♥2: +1 find on every walk.
  - ♥3: the Old Woods.
  - ♥4: it trusts you'll come back, so it waits **4 days** instead of 3 before wandering off.

### 6.6 Growth and personality → visuals, small perks
- **Age** counts real days from birth:
  - **Sprout:** day 0–2. Tires faster (Rest ×1.2) and only walks to the Meadow.
  - **Young:** day 2–7.
  - **Grown:** day 7–30.
  - **Elder:** from day 30. Everything drains ×0.85 and it grows a lichen beard.
- **Elder is the final stage.** There is no death. (Later: an elder can plant a spore for a second Mossling.)
- **Personality form** is set when it becomes Young and set again when Grown. It follows how you mostly played:

  | Form | How you mostly played | Perk |
  |---|---|---|
  | **Wanderer** | Walks | +1 find per walk |
  | **Dreamer** | Stories | Stories give +50% Companionship |
  | **Foodie** | Pantry food | Food fills +25% |
  | **Homebody** | Hugs, tucking in | Warmth drains ×0.85, hugs +50% |

  A Mossling nobody shaped becomes a Homebody. Each form adds an accessory: a satchel, a flower, a mushroom or a scarf.
- **Perks are only ever positive.** Pacing never depends on the form.
- **Coat** is set at the same moments as the form, from how well you cared for it in the stage before (§6.9). Together they give 12 looks (4 forms × 3 coats), e.g. "Glossy Dreamer" or "Wild Wanderer".

### 6.7 Sniffles (gentle condition) → a reason to keep pine needles
- **Catching it:** 3 hours with Warmth at or below 20 gives it the sniffles.
- **While sniffly:** it tires faster (Rest ×1.5) and won't take long walks (Meadow is fine).
- **Getting better:** tea cures it at once. Otherwise it **gets better by itself within 24 h**. Nothing is permanent.
- **After getting better** it can't catch them again for 24 h, so a neglected Mossling never gets stuck in a loop of sniffles.

### 6.8 Journal → memories
- The journal keeps important moments in its life:
  - when it hatched
  - each stage and form
  - its first walk
  - favourites and dislikes discovered
  - sniffles caught and cured
  - wandering off and being found
  - each new season
  - its first snow
  - each bond level reached
- It keeps the latest 100 entries.

### 6.9 Calls, messes and coats (from the original Tamagotchi) → what it grows into
The original's hook was **care mistakes**: it called you, and how you answered decided which character it grew into. Mossling keeps that, minus the death and the beeping.

- **Need calls.** When a need drops under 30 while it's awake at home, it **calls you** (a "!" over its head). Answer within **2 h** by bringing that need back to 30 or more. A missed call is one **care mistake**. That need then won't call again until it recovers, so one bad afternoon can't pile up mistakes.
  - A sleepy call that nobody answers is never a mistake: it just dozes off by itself.
  - No calls while it's asleep, out on a walk or away. Falling asleep ends a call with no harm done.
- **Fussing (the original's "discipline").** Once per visit, the first time it's content, there's a **50%** chance it starts fussing for a treat, a game or a walk it doesn't need (at most 2 a day). A fuss looks just like a real call, so the player has to **check the meters**.
  - "There, there. Not now." settles a fuss: **manners +1**.
  - Giving it exactly what it fussed for (pantry food, hide-and-seek, a walk): **manners −1**.
  - Trying to settle a real need is refused ("It really does need that!"), so it teaches without punishing.
  - An ignored fuss fades after 20 min. That's no mistake either way.
- **Messes.** It sheds **moss fluff** once per 5 h awake at home, up to 3 at once. Tap to tidy (fine while it sleeps). A mess left **16 h** is one care mistake.
- **Coats** are decided when it becomes Young and again when Grown, from care in the stage just finished:

  | Entering | Glossy | Wild | Otherwise |
  |---|---|---|---|
  | Young (after 2 sprout days) | 0 mistakes and manners ≥ 1 | 3+ mistakes | Mossy |
  | Grown (after 5 young days) | ≤ 1 mistake and manners ≥ 3 | 6+ mistakes | Mossy |

  - **Glossy:** a sheen and sparkles. **Mossy:** the plain soft look. **Wild:** tousled tufts and a twig, adventurous rather than sad.
  - **Forgiveness:** a good day with no new mistakes mends one earlier mistake. Care counters start fresh at each stage.
  - The UI shows the stakes plainly ("Grows up in 2 days, with a glossy coat so far"), because the audience includes kids.
- **The pacing contract (tested):** 2 visits a day (8:00 and 19:00) or 3 visits (7:00, 16:00, 21:00) cost **zero** mistakes in every season and stage. Only skipped visits do. One visit a day grows a Wild coat.

### 6.10 Hide-and-seek (the original's "play" game) → companionship, bond, discovery
- 3 rounds. It hides behind the **stump**, in the **ferns** or under the **mushroom**; you tap where to look. Finding it 2+ times wins.
- Every Mossling has a **favourite hiding spot** and picks it 60% of the time. A player who notices it wins about 65% of games instead of about 26%. That's a small, learnable skill, and it goes in the journal once discovered.
- Win: +20 Companionship, delight, +2 bond once a day. Loss: still +10 Companionship. Either way it costs a little Rest and Fullness. It needs Rest of at least 25.

## 7. Time model

- **State is computed, not ticked.** On load the simulation steps from `simulatedTo` to now in 5-minute steps. Each step also stops exactly at walk events. Steps check night and season at their own timestamp. A clock that went backwards changes nothing.
- **Floor:** no need ever drops below 10.
- **Absence:** if Companionship sits at the floor for 3 days in a row (4 days at ♥4+), it **wanders off**. Any interaction resets that streak. While it's away, needs freeze, but age, seasons and days keep moving, so it can come back older. Following the spore trail always brings it home with a glowcap.
- **Pace** (tested in every season): **2–4 visits a day** keep every need at 30 or above at each visit, even with porridge and hugs only. One visit a day leaves it needy but it never wanders off.
- **Notifications** _(later)_ are computed ahead from the same math. Gentle tone, one or two a day.

## 8. What's not built yet

- **Burrow:** tidying and decorating it (spend collectibles on a lantern, a shelf, a rug for small comfort perks).
- **World:** visitors and the wider valley (§9), and a collection book.
- **Legacy:** an elder plants a spore and you raise a second Mossling (the save already holds a list of pets).
- **Platform:** notifications, a PWA manifest and Capacitor wrapping.
- **Polish:** audio (§10).

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

## 12. Status

- [x] MVP: needs, moods, care actions, day/night, local save, wander-off, dev time travel.
- [x] v2 systems: seasons, weather, pantry and foraging, destinations, preferences, wishes, bond, growth stages, personality forms, sniffles, journal.
- [x] v0.4 care loop: need calls, fussing and manners, moss-fluff messes, coats, hide-and-seek.
- [ ] Later: see §8.

## 13. Decisions (2026-10-07)

1. **Art style:** good-looking but not fancy. Soft vector/SVG shapes with gentle gradients and simple CSS/SVG animation. No pixel art, no heavy illustration.
2. **Losing the pet:** yes. It wanders off after long neglect and **always** comes back once you find it.
3. **Notifications:** gentle, at most one or two a day. Built after the MVP.
4. **Pace:** a normal day needs about **2–4 check-ins**. Supervised activities (e.g. a walk) invite extra visits, but missing them is never punished. The Mossling just comes home on its own with fewer finds.
5. **Pets:** one Mossling for now. The save format stores a list of pets so more can be added later.
6. **Platform:** web first (Vite + React + TypeScript). Capacitor wraps the same build for iOS/Android later with no rewrite. The pet simulation lives in `src/core/` as pure TypeScript, so a different UI layer could reuse it.
7. **Challenge (2026-10-08):** borrow the original Tamagotchi's care loop (calls, false calls, droppings, a play mini-game, care-driven evolution). Consequences change what it **becomes**, never whether it lives. Not borrowed: death, sickness from droppings, weight, beeping.

## 14. Open questions

- Exact tuning after real playtesting (all numbers live in `tuning.ts`).
- Legacy (§8) would turn the 12 looks into a collection across generations ("which ones have you raised?"). That's the natural next hook.
- Notifications could say "Pip is calling you" for need calls only, never for fusses.
