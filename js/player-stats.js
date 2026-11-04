import { G } from "./state.js";
import { buildStats } from "./loot.js";

export function recalcStats() {
  const oldMax = G.stats?.maxHp ?? G.player?.hp ?? 100;
  const wasHp = G.player?.hp ?? oldMax;
  G.stats = buildStats(G.equipment, G.boons);
  if (G.player) {
    if (G.stats.maxHp > oldMax) {
      G.player.hp = Math.min(G.stats.maxHp, wasHp + (G.stats.maxHp - oldMax));
    } else {
      G.player.hp = Math.min(wasHp, G.stats.maxHp);
    }
  }
  if (G.player && G.equipment.weapon?.weapon) {
    G.player.weaponStyle = G.equipment.weapon.weapon.style;
  }
  return G.stats;
}
