import { clamp, lerp, mulberry32, seededNoise, smoothstep } from './utils.js';

function padWeight(x, center, radius) {
  return smoothstep(1 - Math.abs(x - center) / radius);
}

export class Terrain {
  constructor(w, h, seed = 7) {
    this.w = w;
    this.h = h;
    this.seed = seed;
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    // Rasterize on the CPU: the large offscreen terrain layer is static most
    // of the time, and letting the GPU track it stalls frame presentation on
    // software renderers (headless capture, low-end devices).
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.mask = new Uint8Array(w * h);
    this.islands = [];
    this.generate();
  }

  generate() {
    const { w, h, ctx } = this;
    const rng = mulberry32(this.seed);
    const noise = seededNoise(this.seed * 13 + 3);
    const noise2 = seededNoise(this.seed * 31 + 9);
    const heights = new Float32Array(w);

    for (let x = 0; x < w; x++) {
      let y = h * 0.675;
      y -= noise(x * 0.0032) * 58;
      y -= noise2(x * 0.0091 + 40) * 24;
      y -= noise(x * 0.017 + 100) * 9;
      // A tall mid-left mesa and a central valley: instant cover and verticality.
      y -= Math.exp(-Math.pow((x - w * 0.335) / (w * 0.062), 2)) * h * 0.19;
      y += Math.exp(-Math.pow((x - w * 0.475) / (w * 0.075), 2)) * h * 0.085;
      y -= Math.exp(-Math.pow((x - w * 0.675) / (w * 0.085), 2)) * h * 0.095;
      y -= Math.exp(-Math.pow((x - w * 0.845) / (w * 0.055), 2)) * h * 0.05;
      // Flat spawn benches on both sides.
      y = lerp(y, h * 0.675, padWeight(x, 158, 158));
      y = lerp(y, h * 0.675, padWeight(x, w - 158, 158));
      y = clamp(y, h * 0.4, h * 0.82);
      heights[x] = y;
    }
    this.heights = heights;

    ctx.clearRect(0, 0, w, h);

    // ---------- dirt body ----------
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, heights[0]);
    for (let x = 1; x < w; x++) {
      const prev = heights[x - 1];
      const cur = heights[x];
      ctx.lineTo(x, (prev + cur) / 2);
    }
    ctx.lineTo(w, heights[w - 1]);
    ctx.lineTo(w, h);
    ctx.closePath();

    const dirt = ctx.createLinearGradient(0, h * 0.35, 0, h);
    dirt.addColorStop(0, '#7b4a2c');
    dirt.addColorStop(0.32, '#633a24');
    dirt.addColorStop(0.72, '#43241b');
    dirt.addColorStop(1, '#2a1513');
    ctx.fillStyle = dirt;
    ctx.fill();

    ctx.save();
    ctx.clip();

    // rock strata
    for (let i = 0; i < 16; i++) {
      const sy = h * 0.46 + rng() * h * 0.5;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      for (let x = 0; x <= w; x += 90) {
        ctx.lineTo(x, sy + Math.sin(x * 0.01 + i) * 9 + rng() * 3);
      }
      ctx.lineWidth = 1.5 + rng() * 2.5;
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(20, 10, 8, 0.28)' : 'rgba(160, 100, 62, 0.13)';
      ctx.stroke();
    }

    // pebbles and roots
    for (let i = 0; i < 470; i++) {
      const x = rng() * w;
      const top = heights[Math.floor(x)] || h * 0.7;
      const y = top + 26 + Math.pow(rng(), 0.7) * (h - top);
      if (y > h - 4) continue;
      const r = 0.7 + rng() * (rng() > 0.9 ? 7 : 2.4);
      ctx.beginPath();
      ctx.ellipse(x, y, r * (0.7 + rng()), r, rng() * Math.PI, 0, Math.PI * 2);
      ctx.fillStyle = rng() > 0.45 ? `rgba(30, 16, 13, ${0.15 + rng() * 0.25})` : `rgba(176, 119, 74, ${0.1 + rng() * 0.2})`;
      ctx.fill();
    }

    // bottom vignette
    const bottom = ctx.createLinearGradient(0, h * 0.72, 0, h);
    bottom.addColorStop(0, 'rgba(20, 10, 12, 0)');
    bottom.addColorStop(1, 'rgba(14, 7, 12, 0.55)');
    ctx.fillStyle = bottom;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // ---------- floating islands ----------
    this.islands = [
      { x: w * 0.545, y: h * 0.15, rx: w * 0.05, ry: 20, phase: 0 },
      { x: w * 0.18, y: h * 0.22, rx: w * 0.035, ry: 16, phase: 2.1 },
      { x: w * 0.84, y: h * 0.2, rx: w * 0.04, ry: 17, phase: 4.4 },
    ];
    for (const island of this.islands) this.drawIsland(island, rng);

    // ---------- grass edge ----------
    const tracePath = () => {
      ctx.beginPath();
      ctx.moveTo(0, heights[0] + 4);
      for (let x = 1; x < w; x++) ctx.lineTo(x, heights[x] + 4);
    };
    tracePath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#28431f';
    ctx.lineWidth = 22;
    ctx.stroke();
    tracePath();
    ctx.strokeStyle = '#4f8f32';
    ctx.lineWidth = 16;
    ctx.stroke();
    tracePath();
    ctx.strokeStyle = '#82c344';
    ctx.lineWidth = 9;
    ctx.stroke();
    tracePath();
    ctx.strokeStyle = '#b9ee64';
    ctx.lineWidth = 3.2;
    ctx.stroke();

    // grass blades
    for (let i = 0; i < 220; i++) {
      const x = rng() * w;
      const y = heights[Math.floor(x)];
      if (rng() > 0.55) continue;
      const tall = 3 + rng() * 7;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + (rng() - 0.5) * 5, y - tall * 0.6, x + (rng() - 0.5) * 9, y - tall);
      ctx.strokeStyle = rng() > 0.5 ? 'rgba(165, 230, 92, 0.85)' : 'rgba(95, 154, 53, 0.9)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    // a few chunky stones on the surface
    for (let i = 0; i < 26; i++) {
      const x = 40 + rng() * (w - 80);
      const y = heights[Math.floor(x)] + 4;
      if (rng() > 0.5) continue;
      const r = 5 + rng() * 11;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.6, rng() * 3, 0, Math.PI * 2);
      ctx.fillStyle = '#5a4a42';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x - r * 0.2, y - r * 0.3, r * 0.65, r * 0.32, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(160, 142, 120, 0.4)';
      ctx.fill();
    }

    this.buildMask();
  }

  drawIsland(island, rng) {
    const { ctx } = this;
    const { x, y, rx, ry } = island;
    // dangling rocky underside
    ctx.beginPath();
    ctx.moveTo(x - rx, y);
    ctx.quadraticCurveTo(x - rx * 0.7, y + ry + 20, x - rx * 0.25, y + ry + 34);
    ctx.lineTo(x + rx * 0.1, y + ry + 20);
    ctx.quadraticCurveTo(x + rx * 0.55, y + ry + 46, x + rx * 0.72, y + ry + 10);
    ctx.quadraticCurveTo(x + rx, y + ry + 4, x + rx, y);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, y - ry, 0, y + ry + 40);
    g.addColorStop(0, '#6e4028');
    g.addColorStop(1, '#301a18');
    ctx.fillStyle = g;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#5d3522';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(x, y - 2, rx, ry * 0.78, 0, Math.PI, 0);
    ctx.fillStyle = '#497f31';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, y - 5, rx * 0.94, ry * 0.56, 0, Math.PI, 0);
    ctx.fillStyle = '#7dbb45';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, y - 8, rx * 0.8, ry * 0.28, 0, Math.PI, 0);
    ctx.fillStyle = '#b5e966';
    ctx.fill();

    for (let i = 0; i < 5; i++) {
      const bx = x - rx * 0.6 + rng() * rx * 1.2;
      const by = y + 2 + rng() * ry * 0.6;
      ctx.beginPath();
      ctx.ellipse(bx, by, 1 + rng() * 2.4, 1 + rng() * 1.6, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(30, 16, 13, 0.4)';
      ctx.fill();
    }
    // vines
    for (let i = 0; i < 3; i++) {
      const vx = x - rx * 0.5 + rng() * rx;
      ctx.beginPath();
      ctx.moveTo(vx, y + ry * 0.55);
      ctx.quadraticCurveTo(vx + 6, y + ry + 14, vx - 4, y + ry + 26 + rng() * 20);
      ctx.strokeStyle = 'rgba(78, 128, 48, 0.8)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
  }

  buildMask() {
    const { w, h, mask, heights } = this;
    mask.fill(0);
    for (let x = 0; x < w; x++) {
      const top = clamp(Math.round(heights[x]) - 4, 0, h - 1);
      const row = x;
      for (let y = top; y < h; y++) mask[y * w + row] = 1;
    }
    for (const island of this.islands) {
      const { x: cx, y: cy, rx, ry } = island;
      const top = Math.max(0, Math.floor(cy - ry - 2));
      const bottom = Math.min(h - 1, Math.ceil(cy + ry + 44));
      const left = Math.max(0, Math.floor(cx - rx - 2));
      const right = Math.min(w - 1, Math.ceil(cx + rx + 2));
      for (let y = top; y <= bottom; y++) {
        const ny = (y - cy) / ry;
        for (let x = left; x <= right; x++) {
          const nx = (x - cx) / rx;
          let inside;
          if (ny <= 0) {
            inside = nx * nx + ny * ny <= 1;
          } else {
            const t = Math.min(1, (y - cy) / (ry + 42));
            const width = rx * Math.sqrt(Math.max(0, 1 - t * t)) * (1 - t * 0.55);
            inside = Math.abs(x - cx) <= width;
          }
          if (inside) mask[y * w + x] = 1;
        }
      }
    }
  }

  solidAt(x, y) {
    const ix = x | 0;
    const iy = y | 0;
    if (ix < 0 || ix >= this.w || iy < 0 || iy >= this.h) return false;
    return this.mask[iy * this.w + ix] === 1;
  }

  topAt(x) {
    const ix = clamp(x | 0, 0, this.w - 1);
    for (let y = 0; y < this.h; y++) {
      if (this.mask[y * this.w + ix]) return y;
    }
    return this.h;
  }

  surfaceBelow(x, fromY, maxY = this.h) {
    const ix = clamp(x | 0, 0, this.w - 1);
    const start = clamp(Math.floor(fromY), 0, this.h - 1);
    const end = clamp(Math.floor(maxY), 0, this.h - 1);
    for (let y = start; y <= end; y++) {
      if (this.mask[y * this.w + ix]) return y;
    }
    return null;
  }

  carve(x, y, radius) {
    const { ctx, w, h } = this;
    const r = Math.max(8, radius);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const g = ctx.createRadialGradient(x, y, r * 0.45, x, y, r);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.72, 'rgba(0,0,0,0.96)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Persistent scorch ring around the crater.
    const sg = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 1.18);
    sg.addColorStop(0, 'rgba(30, 16, 12, 0)');
    sg.addColorStop(0.62, 'rgba(30, 16, 12, 0.18)');
    sg.addColorStop(0.82, 'rgba(18, 9, 9, 0.38)');
    sg.addColorStop(1, 'rgba(10, 5, 5, 0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.2, 0, Math.PI * 2);
    ctx.fill();

    const rr = r * 0.93;
    const minX = Math.max(0, Math.floor(x - rr));
    const maxX = Math.min(w - 1, Math.ceil(x + rr));
    const minY = Math.max(0, Math.floor(y - rr));
    const maxY = Math.min(h - 1, Math.ceil(y + rr));
    const rr2 = rr * rr;
    for (let py = minY; py <= maxY; py++) {
      const dy = py - y;
      const row = py * w;
      for (let px = minX; px <= maxX; px++) {
        const dx = px - x;
        if (dx * dx + dy * dy <= rr2) this.mask[row + px] = 0;
      }
    }
  }

  draw(ctx) {
    ctx.drawImage(this.canvas, 0, 0);
  }
}
