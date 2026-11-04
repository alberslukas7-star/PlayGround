const METAL = "#a9967c";
const METAL_DARK = "#443b35";
const WOOD = "#725b43";
const BONE = "#d8c8ab";

const itemSvgs = {
  scythe: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M19 57 43 14" stroke="${WOOD}" stroke-width="4.4" stroke-linecap="round"/>
    <path d="M20 56 39 19" stroke="#ad906b" stroke-width="1" opacity=".65"/>
    <path d="M41 14c8-5 16-2 19 6-7-1-12 1-17 5-2-4-2-7-2-11Z" fill="currentColor" opacity=".8" stroke="#ead6b2" stroke-width=".9"/>
    <path d="M43 14c5-2 10-1 14 2-6 1-10 3-14 6" fill="none" stroke="#f4e1bb" stroke-width=".8" opacity=".65"/>
    <path d="M19 56 37 21" stroke="#2b2522" stroke-width=".8" opacity=".5"/>
    <path d="M24 45 27 47M29 37l3 2M34 29l3 2" stroke="${BONE}" stroke-width="1" opacity=".5"/>
    <circle cx="42" cy="16" r="2.1" fill="currentColor"/>
    <path d="M16 59 21 54" stroke="#c1a674" stroke-width="2.2" stroke-linecap="round"/>
  </svg>`,
  crossbow: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <g transform="rotate(-12 32 32)">
      <path d="M32 9v45" stroke="${WOOD}" stroke-width="4.6" stroke-linecap="round"/>
      <path d="M32 11v41" stroke="#a88762" stroke-width="1" opacity=".7"/>
      <path d="M8 20C18 12 45 12 56 20" fill="none" stroke="#5d4a38" stroke-width="3.6" stroke-linecap="round"/>
      <path d="M9 20C19 14 45 14 55 20" fill="none" stroke="${METAL}" stroke-width=".8" opacity=".6"/>
      <path d="M9 21 32 37 55 21" fill="none" stroke="${BONE}" stroke-width=".8" opacity=".8"/>
      <path d="M27 9h10l-5-7Z" fill="currentColor" opacity=".8"/>
      <path d="M32 3v42" stroke="${BONE}" stroke-width="1" opacity=".7"/>
      <path d="M28 41h8l-4 10Z" fill="${METAL_DARK}" stroke="${METAL}" stroke-width=".7"/>
      <path d="M20 52c5 4 19 4 24 0" fill="none" stroke="#5d4a38" stroke-width="2.2"/>
      <path d="M19 23c-4 3-7 6-8 9M45 23c4 3 7 6 8 9" stroke="${BONE}" stroke-width="1" opacity=".4"/>
      <circle cx="32" cy="37" r="2.6" fill="currentColor"/>
    </g>
  </svg>`,
  wand: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M18 57 37 22" stroke="${WOOD}" stroke-width="4.2" stroke-linecap="round"/>
    <path d="M20 55 36 25" stroke="#c2a477" stroke-width=".9" opacity=".65"/>
    <path d="M34 23c-4-4-3-9 0-12M40 23c4-4 3-9 0-12M31 19c-5 0-8-2-9-5M43 19c5 0 8-2 9-5" fill="none" stroke="${METAL}" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="37" cy="16" r="8" fill="currentColor" opacity=".2"/>
    <circle cx="37" cy="16" r="5.1" fill="currentColor" opacity=".85" stroke="#f3ddb4" stroke-width=".8"/>
    <circle cx="35.5" cy="14" r="1.4" fill="#fff" opacity=".9"/>
    <path d="M33 17c2 1.4 5 1.5 7 0M34 19h5" stroke="#2b2029" stroke-width=".8" opacity=".55"/>
    <path d="M15 60 21 54" stroke="#c1a674" stroke-width="2.2" stroke-linecap="round"/>
  </svg>`,
  daggers: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <g transform="rotate(40 32 32)">
      <path d="M32 5 37 29 32 36 27 29Z" fill="${METAL}" stroke="#e2d0ad" stroke-width=".8"/>
      <path d="M32 8 34 29 32 33 30 29Z" fill="currentColor" opacity=".45"/>
      <path d="M23 35h18" stroke="#ba9a6a" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M32 36v11" stroke="${WOOD}" stroke-width="3.8" stroke-linecap="round"/>
      <path d="M28 48h8" stroke="#ba9a6a" stroke-width="2"/>
      <circle cx="32" cy="51.5" r="2.4" fill="currentColor"/>
    </g>
    <g transform="rotate(-40 32 32) translate(0 4)">
      <path d="M32 5 37 29 32 36 27 29Z" fill="${METAL}" stroke="#e2d0ad" stroke-width=".8"/>
      <path d="M32 8 34 29 32 33 30 29Z" fill="currentColor" opacity=".45"/>
      <path d="M23 35h18" stroke="#ba9a6a" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M32 36v11" stroke="${WOOD}" stroke-width="3.8" stroke-linecap="round"/>
      <path d="M28 48h8" stroke="#ba9a6a" stroke-width="2"/>
      <circle cx="32" cy="51.5" r="2.4" fill="currentColor"/>
    </g>
  </svg>`,
  helm: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M14 31c0-14 8-23 18-23s18 9 18 23v12H14Z" fill="${METAL_DARK}" stroke="${METAL}" stroke-width="1.1"/>
    <path d="M17 31c0-12 7-20 15-20s15 8 15 20" fill="none" stroke="#bca88a" stroke-width="1.2" opacity=".65"/>
    <path d="M17 32c0-10 7-17 15-17s15 7 15 17c-5-4-9-6-15-6s-10 2-15 6Z" fill="#6d5e50" opacity=".45"/>
    <path d="M22 31h20v4c-4 2-7 3-10 3s-6-1-10-3Z" fill="#130e0f"/>
    <path d="M25 33h6M34 33h6" stroke="currentColor" stroke-width="1.4"/>
    <path d="M30 38v10M34 38v10" stroke="${METAL}" stroke-width="1.1"/>
    <path d="M14 43h36v7H14Z" fill="#342c28" stroke="${METAL}" stroke-width=".8"/>
    <path d="M14 30c-4-3-6-7-5-12 4 1 7 4 9 8M50 30c4-3 6-7 5-12-4 1-7 4-9 8" fill="currentColor" opacity=".55" stroke="${METAL}" stroke-width=".8"/>
    <path d="M17 47v8M47 47v8" stroke="${METAL_DARK}" stroke-width="2.5"/>
  </svg>`,
  chest: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M17 18 27 13h10l10 5 9 9-8 9-3-4v20H19V32l-3 4-8-9Z" fill="${METAL_DARK}" stroke="${METAL}" stroke-width="1.2"/>
    <path d="M22 23c5 3 15 3 20 0l4 5v13c-5 3-7 5-14 5s-9-2-14-5V28Z" fill="#51453d" opacity=".6"/>
    <path d="M32 24v23M24 31c2 1 4 1 5 0M35 31c2 1 4 1 5 0M24 38c2 1 4 1 5 0M35 38c2 1 4 1 5 0" fill="none" stroke="#b8a68e" stroke-width="1"/>
    <path d="M27 13c1 5 9 5 10 0" fill="none" stroke="currentColor" stroke-width="1.2"/>
    <path d="M31 42h2l2 8h-6Z" fill="currentColor" opacity=".75"/>
    <path d="M15 30 7 35l9 5M49 30l8 5-9 5" fill="none" stroke="${METAL}" stroke-width="1"/>
    <path d="M19 48v8M45 48v8" stroke="${METAL_DARK}" stroke-width="3"/>
  </svg>`,
  boots: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M18 11h13v24c6 3 12 7 16 14 2 4-1 8-6 8H15c-4 0-6-3-5-6l4-13c1-4 2-8 2-14Z" fill="${METAL_DARK}" stroke="${METAL}" stroke-width="1.2"/>
    <path d="M20 16h9v20c7 3 11 7 14 12H18c-3 0-4-2-3-4l3-11c2-5 2-10 2-17Z" fill="#53463e" opacity=".6"/>
    <path d="M15 49h27M18 20c4 2 8 2 12 0M18 27c4 2 8 2 12 0" fill="none" stroke="#b9a58b" stroke-width=".9" opacity=".8"/>
    <path d="M14 52c-1 4 1 6 5 6h21c4 0 6-2 6-5H15Z" fill="#211a1a" stroke="${METAL}" stroke-width=".8"/>
    <path d="M31 12v22" stroke="currentColor" stroke-width="1" opacity=".7"/>
    <path d="M44 12c4 0 6 2 6 6l-8-1Z" fill="currentColor" opacity=".45"/>
  </svg>`,
  amulet: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M13 12c2 15 8 24 19 28 11-4 17-13 19-28" fill="none" stroke="#a98e65" stroke-width="1.1" stroke-dasharray="2 2"/>
    <path d="M10 10 14 14M54 10 50 14" stroke="${METAL}" stroke-width="2"/>
    <path d="M32 38c-8 5-11 11-7 16 3 4 10 4 14 0 4-5 1-11-7-16Z" fill="currentColor" opacity=".35" stroke="currentColor" stroke-width="1.2"/>
    <path d="M32 43c-4 3-5 7-3 10 2 2 5 2 7 0 2-3 1-7-4-10Z" fill="currentColor" opacity=".85"/>
    <path d="M24 43c-4-3-7-6-9-10M40 43c4-3 7-6 9-10" fill="none" stroke="${METAL}" stroke-width="1.2"/>
    <path d="M30 44c-1 3 0 5 2 6" fill="none" stroke="#fff" stroke-width=".8" opacity=".65"/>
  </svg>`,
  ring: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <ellipse cx="32" cy="39" rx="16" ry="17" fill="none" stroke="#b08f5d" stroke-width="4"/>
    <ellipse cx="32" cy="39" rx="16" ry="17" fill="none" stroke="#efcf92" stroke-width=".8" opacity=".75"/>
    <path d="M24 25 32 8l8 17-8 9Z" fill="currentColor" opacity=".6" stroke="#e4c68d" stroke-width="1"/>
    <path d="M27 22 32 12l5 10-5 5Z" fill="currentColor" opacity=".95"/>
    <path d="M25 24h14" stroke="#e4c68d" stroke-width="2"/>
    <path d="M29 22h6l-3 3Z" fill="#fff" opacity=".55"/>
    <path d="M20 50c3 4 7 6 12 6s9-2 12-6" fill="none" stroke="#d2b270" stroke-width=".8" opacity=".6"/>
  </svg>`
};

const boonSvgs = {
  sword: `<svg viewBox="0 0 32 32"><path d="M25 4 12 20l-3 4 4-1L28 8Z" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="m10 21-4 7 7-4M20 8l4 4" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M6 26 9 23" stroke="currentColor" stroke-width="1.5"/></svg>`,
  haste: `<svg viewBox="0 0 32 32"><path d="m17 3-9 15h7l-1 11 10-17h-7Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M4 10h5M3 16h5M5 22h4" stroke="currentColor" stroke-width="1.1"/></svg>`,
  eye: `<svg viewBox="0 0 32 32"><path d="M3 16s5-8 13-8 13 8 13 8-5 8-13 8S3 16 3 16Z" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="16" cy="16" r="4" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="16" cy="16" r="1.4" fill="currentColor"/><path d="M16 4v3M16 25v3M4 16h2M26 16h2" stroke="currentColor" stroke-width="1"/></svg>`,
  skull: `<svg viewBox="0 0 32 32"><path d="M8 15c0-6 3-10 8-10s8 4 8 10c0 4-2 6-4 8v4H12v-4c-2-2-4-4-4-8Z" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="12" cy="15" r="2" fill="currentColor"/><circle cx="20" cy="15" r="2" fill="currentColor"/><path d="m16 18-2 3h4ZM13 23v4M19 23v4" fill="none" stroke="currentColor" stroke-width="1"/></svg>`,
  drop: `<svg viewBox="0 0 32 32"><path d="M16 4C10 13 8 17 8 21a8 8 0 0 0 16 0c0-4-2-8-8-17Z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M12 21a4 4 0 0 0 4 4" fill="none" stroke="currentColor" stroke-width="1.1" opacity=".7"/></svg>`,
  arrows: `<svg viewBox="0 0 32 32"><path d="M5 24 25 8M18 7h8v8M5 11l16 12M15 22h7v-7" fill="none" stroke="currentColor" stroke-width="1.25"/></svg>`,
  nova: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="4" fill="currentColor"/><path d="M16 2v7M16 23v7M2 16h7M23 16h7M6 6l5 5M21 21l5 5M26 6l-5 5M11 21l-5 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  heart: `<svg viewBox="0 0 32 32"><path d="M16 27S5 20 5 12a6 6 0 0 1 11-3 6 6 0 0 1 11 3c0 8-11 15-11 15Z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M16 9v13M10 15h12" stroke="currentColor" stroke-width="1" opacity=".55"/></svg>`,
  shield: `<svg viewBox="0 0 32 32"><path d="M16 3 27 7v9c0 7-5 11-11 14C10 27 5 23 5 16V7Z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M16 8v13M11 14l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1" opacity=".7"/></svg>`,
  leaf: `<svg viewBox="0 0 32 32"><path d="M27 5C10 4 5 11 6 20c1 6 8 8 12 4 5-5 3-12 9-19Z" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M7 26c3-7 8-12 15-16" stroke="currentColor" stroke-width="1.1"/></svg>`,
  thorn: `<svg viewBox="0 0 32 32"><path d="M7 26C8 16 14 8 26 5M13 18l-5-1M17 13l-2-5M20 16l5 1M18 20l1 5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="26" cy="5" r="2" fill="currentColor" opacity=".6"/></svg>`,
  boot: `<svg viewBox="0 0 32 32"><path d="M9 4h7v11c4 2 7 4 9 8 1 2 0 4-3 4H7c-2 0-3-1-2-3l2-7c1-2 2-5 2-13Z" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M6 23h16M12 9h4" stroke="currentColor" stroke-width="1"/></svg>`,
  soul: `<svg viewBox="0 0 32 32"><path d="M16 3c-2 6-7 9-7 15a7 7 0 0 0 14 0c0-6-5-9-7-15Z" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="16" cy="17" r="3" fill="currentColor" opacity=".65"/><path d="M9 28c4-2 10-2 14 0" fill="none" stroke="currentColor" stroke-width="1" opacity=".6"/></svg>`,
  magnet: `<svg viewBox="0 0 32 32"><path d="M7 5v12a9 9 0 0 0 18 0V5h-6v12a3 3 0 0 1-6 0V5Z" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M7 10h6M19 10h6" stroke="currentColor" stroke-width="2"/><path d="M16 29v-3" stroke="currentColor" stroke-width="1" opacity=".5"/></svg>`,
  coin: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="16" cy="16" r="7" fill="none" stroke="currentColor" stroke-width=".8" opacity=".65"/><path d="M16 10v12M13 13c1-1 5-1 5 1s-5 2-5 4 4 2 5 1" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>`,
  wing: `<svg viewBox="0 0 32 32"><path d="M4 20C8 9 17 5 28 5c-5 6-7 12-8 20-4-5-8-6-16-5Z" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M9 18c4-4 9-7 14-9M13 21c3-3 6-5 10-6" fill="none" stroke="currentColor" stroke-width=".9" opacity=".6"/></svg>`,
  circle: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="16" cy="16" r="5" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".7"/><path d="M16 2v5M16 25v5M2 16h5M25 16h5" stroke="currentColor" stroke-width="1"/></svg>`
};

export function itemIcon(type, rarity, extraClass = "") {
  const svg = itemSvgs[type] || itemSvgs.ring;
  return `<div class="item-icon ${extraClass}" style="--rarity:${rarity.color}">${svg}</div>`;
}

export function boonIcon(name) {
  return boonSvgs[name] || boonSvgs.circle;
}

export { itemSvgs, boonSvgs };
