import { WORLD_W as W, WEAPONS } from './config.js';
import { clamp, dist, rand } from './utils.js';
import { simulateTrajectory, availableWeapons } from './physics.js';
import { placeBuild } from './build.js';

export function planAI(g) {
  const actor = g.active;
  if (!actor) return null;
  const enemies = g.worms.filter((w) => w.alive && w.team !== actor.team);
  if (!enemies.length) return null;
  const target = enemies.reduce((a, b) => (a.health < b.health ? a : b));

  // A little defensive building, Fortnite style.
  if (g.teams[actor.team].mats >= 20 && g.buildsUsed < 4 && Math.random() < 0.42) {
    const dir = Math.sign(target.x - actor.x) || 1;
    const built = placeBuild(g, 'wall', actor.x + dir * 92, actor.y - 22, actor.team, true);
    if (built) {
      g.addText(g, actor.x, actor.y - 70, 'RIVAL BUILDS!', '#ffb0a4', 15);
      g.showBanner('RIVAL BUILDS', 'coral', 900);
    }
  }

  const weapons = availableWeapons(actor);
  const facingRight = target.x >= actor.x;
  const minA = facingRight ? 14 : 102;
  const maxA = facingRight ? 78 : 166;
  let best = null;

  for (let wi = 0; wi < weapons.length; wi++) {
    const weapon = weapons[wi];
    for (let a = minA; a <= maxA; a += 6) {
      for (let power = 34; power <= 100; power += 7) {
        const sim = simulateTrajectory(g, actor, a, power, weapon, false);
        let score = dist(sim.endX, sim.endY, target.x, target.y);
        if (sim.hitWorm) {
          score += sim.hitWorm.team !== actor.team ? -1400 : 600;
        }
        if (sim.hitBuilding) score += 480;
        const selfD = dist(sim.endX, sim.endY, actor.x, actor.y);
        if (selfD < weapon.radius + 46) score += 1200;
        if (sim.endX < 0 || sim.endX > W) score += 600;
        score += rand(0, 12);
        if (!best || score < best.score) {
          best = { score, angle: a, power, weaponIndex: g.weapons.indexOf(weapon), weapon };
        }
      }
    }
  }

  if (!best) {
    return { angle: facingRight ? 45 : 135, power: 68, weaponIndex: 0 };
  }

  // Aim with a human-ish error margin, then correct for wind over multiple turns.
  const skill = g.aiSkill ?? 1;
  const angle = clamp(best.angle + rand(-2.3, 2.3) / skill, 5, 175);
  const power = clamp(best.power + rand(-3.8, 3.8) / skill, 5, 100);
  return { angle, power, weaponIndex: best.weaponIndex };
}
