# Fort Artillery

A playable 2D browser game that mashes up **Fortnite-style quick building** with a **Worms-style turn-based artillery duel**. Two squads of worms trade shots across a destructible battlefield while wind, terrain, and player-built forts decide who survives.

Built with plain HTML, CSS, Canvas 2D, and ES modules. No dependencies, no build step, no external assets.

## Play

Open `index.html` through any static web server:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

The game also works when hosted from a static path such as GitHub Pages.

## How to play

- **2v2, alternating turns.** Each squad has two worms. Eliminate both rivals to win.
- **Move** with `A` / `D` or the on-screen arrows. Each turn has a 140 px movement budget.
- **Jump** with `Space` or the **JUMP** button.
- **Aim** with `↑` / `↓`, drag directly on the battlefield, or use the direction buttons.
- **Fire** with `Enter`, the **FIRE!** button, or by releasing a drag.
- **Build** with `B`, then tap/click the map. Choose **Wall**, **Floor**, or **Ramp**.
  - Up to 4 pieces per turn, placed on a 72 px grid near the active worm.
  - Walls and ramps cost 20/25 wood, floors cost 15. Each team starts with 100 wood and gains 28 at the start of its turn (cap 180).
- **Loot llamas** by destroying them for +50 wood.
- **Wind** pushes projectiles sideways and changes every turn. Watch the arrow in the top bar.

### Weapons

| Weapon | Ammo | Behavior |
| --- | --- | --- |
| RPG | Infinite | Fast, reliable arc. Good for direct hits. |
| Grenade | 3 per worm | Bounces off terrain and buildings, then explodes on its fuse. |
| Cluster | 2 per worm | Splits into three bomblets on impact. |

### Touch and mobile

- Every action has an on-screen control; keyboard shortcuts are optional.
- The HUD, weapon dock, and safe areas adapt to phones and tablets in portrait and landscape.
- In portrait the camera follows the active worm. A target chip points toward an off-screen rival.
- A dismissible rotate hint suggests landscape for the widest view.

## Features

- Procedurally generated destructible terrain with explosion craters.
- Destructible player and AI buildings, with debris and hit feedback.
- Projectile physics with wind, gravity, bouncing, fuses, and cluster splits.
- AI opponents that build defensively, simulate trajectories, account for wind and cover, and aim with a human-like error margin.
- Camera that frames the whole battlefield in landscape and follows the action in portrait.
- Procedural WebAudio sound effects and a mute toggle.
- Captured with headless Chromium on desktop and mobile viewports as part of the development checks.

## Project layout

```
index.html          markup, HUD, start/result screens
css/style.css       responsive layout, HUD, dock, overlays
js/main.js          boot and diagnostics hook
js/game.js          main loop, turns, camera, input, HUD, render caches
js/config.js        weapons, builds, teams, tuning constants
js/terrain.js       destructible terrain and collision mask
js/physics.js       movement, collision, placement, trajectory preview
js/actions.js       firing, projectiles, explosions, damage, loot
js/build.js         quick-build placement and material costs
js/ai.js            rival building and shot planning
js/visuals.js       world, worms, buildings, llamas, aim rendering
js/effects.js       particles and floating combat text
js/audio.js         procedural sound
```

## Assumptions

- Single-player local match: one human squad versus one AI squad.
- Fixed 2v2 rosters and three weapons keep matches short and readable on phones.
- Quick-build is intentionally limited to four grid-snapped pieces per turn near the active worm, so it complements artillery instead of replacing it.
- No persistence or networking; every match starts with a fresh battlefield, wind, and full health/ammo.
