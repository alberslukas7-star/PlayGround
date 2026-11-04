# The Ironwood Hunt

A complete, playable dual-blades monster hunt for the browser. It is a stylized top-down forest arena inspired by the pacing and weapon fantasy of *Monster Hunter*, built entirely with HTML, CSS, Canvas 2D, and Web Audio. No build step or external runtime is required.

The game is an original work: the monster, hunter, forest, UI, artwork, and audio are procedural or hand-authored for this project. It does not use Capcom assets.

## Play

```bash
python3 -m http.server 3002 --bind 0.0.0.0
```

Open `http://localhost:3002`.

The game starts immediately. A local static server is recommended because the custom fonts are loaded as local assets.

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Move | `WASD` / arrow keys | Virtual joystick |
| Dual slash combo | Left click / `J` / `F` | **Slash** |
| Blade Dance | Right click / `K` | **Dance** |
| Evade with i-frames | `Shift` / `Space` | **Evade** |
| Demon Mode | `Q` | **Demon** |
| Mega Potion | `E` | **Potion** |
| Sharpen | `R` | **Hone** |
| Field guide | `H` | Pause → Field guide |
| Pause | `Esc` / `P` | Pause button |
| Toggle sound | Speaker button | Speaker button |

## Hunt

- **Thornscale Tyrant** has a full attack loop: roar, charge, tail sweep, bite, acid volleys, enrage, stagger, wounded/limping state, and death.
- The hunter manages health, stamina, sharpness, potions, combo timing, Demon Mode drain, and dodge invulnerability.
- Red ground telegraphs mark heavy attacks. Dodge through them for i-frames.
- Keep blades sharp. White sharpness deals more damage; low sharpness cuts damage significantly.
- The 12-minute quest timer, monster health bar, minimap, HUD, field guide, pause menu, victory screen, defeat screen, and retry flow are all implemented.
- Rendering includes procedural ground, foliage, water, atmospheric effects, hit particles, damage numbers, screen shake, hit-stop, and a dynamic camera.

## Project Files

- `index.html` — game shell, HUD, menus, touch controls.
- `style.css` — visual design, responsive layout, animations, mobile controls.
- `game.js` — engine, combat, monster AI, rendering, audio, UI state.
- `assets/fonts/` — local Cinzel and Barlow Condensed fonts.
- `assets/favicon.svg` — site icon.

## Notes

- Desktop and mobile layouts are supported, including a dedicated touch control set with Hone and pause access.
- The game is tuned for a modern browser with Canvas 2D and Web Audio support.
- For the most reliable headless capture, use Chromium with `--disable-gpu`; the canvas context uses `willReadFrequently` so software capture reads the scene correctly.

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Created using [OMGithub.com](https://go.ondev.store/).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://go.ondev.store/alberslukas7-star/PlayGround)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/alberslukas7-star/PlayGround)

- 🎮 [Open the project](https://go.ondev.store/alberslukas7-star/PlayGround).
- ✨ [Remix this project](https://go.ondev.store/alberslukas7-star/PlayGround?remix=1).
- 💻 [Explore the source](https://github.com/alberslukas7-star/PlayGround).
- 🛠️ [Check build runs](https://github.com/alberslukas7-star/PlayGround/actions).
- 🐛 [Report an issue](https://github.com/alberslukas7-star/PlayGround/issues).
- 👤 [Explore the creator's projects](https://go.ondev.store/alberslukas7-star).
- 🌍 [Create with OMGithub](https://go.ondev.store/).
<!-- omgithub:readme:end -->
