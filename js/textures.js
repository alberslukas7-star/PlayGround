import * as THREE from '../vendor/three.module.js';

function makeTexture(w, h, draw, { repeat = [1, 1], nearest = true, clamp = false } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (nearest) {
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
  }
  t.colorSpace = THREE.SRGBColorSpace;
  if (clamp) {
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
  } else {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  t.needsUpdate = true;
  return t;
}

function splotch(g, x, y, r, color, alpha = 0.12) {
  const grad = g.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = alpha;
  g.fillStyle = grad;
  g.fillRect(x - r, y - r, r * 2, r * 2);
  g.globalAlpha = 1;
}

export function wallpaperTexture() {
  return makeTexture(96, 96, (g, w, h) => {
    g.fillStyle = '#8b795f';
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 8) {
      g.fillStyle = (x / 8) % 2 ? 'rgba(80,64,45,0.22)' : 'rgba(210,190,150,0.09)';
      g.fillRect(x, 0, 4, h);
    }
    for (let i = 0; i < 22; i++) {
      g.fillStyle = 'rgba(50,36,25,0.28)';
      g.fillRect(Math.random() * w, Math.random() * h, 1, 1 + Math.random() * 2);
    }
    splotch(g, 14, 20, 17, '#4d3927', 0.28);
    splotch(g, 74, 66, 20, '#3c2e21', 0.2);
    // suspicious stain
    g.globalAlpha = 0.18;
    g.fillStyle = '#3c1f18';
    g.beginPath();
    g.ellipse(64, 14, 10, 5, 0.3, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
  }, { repeat: [3, 1.7] });
}

export function floorTexture() {
  return makeTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#694329';
    g.fillRect(0, 0, w, h);
    const plank = 32;
    for (let y = 0; y < h; y += plank) {
      const shade = ['#775036', '#603b25', '#714a30', '#5b3621'][(y / plank) % 4];
      g.fillStyle = shade;
      g.fillRect(0, y + 1, w, plank - 2);
      g.fillStyle = 'rgba(30,16,8,0.55)';
      g.fillRect(0, y, w, 1);
      g.fillRect(0, y + plank - 1, w, 1);
      // grain
      for (let i = 0; i < 12; i++) {
        g.strokeStyle = `rgba(${30 + Math.random() * 25},${16 + Math.random() * 15},8,${0.1 + Math.random() * 0.2})`;
        g.lineWidth = 1;
        g.beginPath();
        const yy = y + 4 + Math.random() * (plank - 8);
        g.moveTo(0, yy);
        g.bezierCurveTo(w * 0.3, yy + Math.random() * 3 - 1.5, w * 0.7, yy - Math.random() * 3, w, yy + Math.random() * 2 - 1);
        g.stroke();
      }
      // plank ends
      g.fillStyle = 'rgba(25,12,5,0.45)';
      const off = (y / plank) % 2 ? 20 : 76;
      g.fillRect(off, y + 1, 1, plank - 2);
    }
    splotch(g, 100, 30, 26, '#2a1408', 0.22);
  }, { repeat: [5, 4] });
}

export function ceilingTexture() {
  return makeTexture(64, 64, (g, w, h) => {
    g.fillStyle = '#b8a98e';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 170; i++) {
      g.fillStyle = `rgba(${70 + Math.random() * 50},${60 + Math.random() * 40},${45 + Math.random() * 30},${Math.random() * 0.22})`;
      g.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }
    splotch(g, 22, 40, 18, '#6a563c', 0.3);
  }, { repeat: [4, 3] });
}

export function rugTexture() {
  return makeTexture(96, 96, (g, w, h) => {
    g.fillStyle = '#6f2f32';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(230,190,130,0.55)';
    g.lineWidth = 3;
    g.strokeRect(6, 6, w - 12, h - 12);
    g.strokeStyle = 'rgba(30,12,15,0.5)';
    g.lineWidth = 2;
    g.strokeRect(13, 13, w - 26, h - 26);
    g.fillStyle = 'rgba(230,190,130,0.23)';
    for (let y = 20; y < h - 18; y += 12) {
      for (let x = 20; x < w - 18; x += 12) {
        g.beginPath();
        g.moveTo(x, y - 4);
        g.lineTo(x + 4, y);
        g.lineTo(x, y + 4);
        g.lineTo(x - 4, y);
        g.fill();
      }
    }
    splotch(g, 50, 55, 25, '#2b0d0d', 0.32);
    splotch(g, 20, 72, 14, '#341010', 0.25);
  }, { repeat: [1, 1] });
}

export function doorTexture() {
  return makeTexture(64, 128, (g, w, h) => {
    g.fillStyle = '#5e3321';
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) {
      g.fillStyle = `rgba(${30 + Math.random() * 25},${15 + Math.random() * 10},8,0.25)`;
      g.fillRect(x, 0, 1, h);
    }
    for (let i = 0; i < 70; i++) {
      g.strokeStyle = `rgba(${30 + Math.random() * 30},${16 + Math.random() * 16},8,${0.08 + Math.random() * 0.16})`;
      g.lineWidth = 1;
      g.beginPath();
      const x = Math.random() * w;
      g.moveTo(x, 0);
      g.bezierCurveTo(x + 4, h * 0.3, x - 5, h * 0.7, x + 2, h);
      g.stroke();
    }
    // panels
    g.strokeStyle = 'rgba(32,14,7,0.65)';
    g.lineWidth = 3;
    g.strokeRect(8, 10, w - 16, 46);
    g.strokeRect(8, 68, w - 16, 50);
    g.strokeStyle = 'rgba(213,170,110,0.12)';
    g.lineWidth = 1;
    g.strokeRect(11, 13, w - 22, 40);
    g.strokeRect(11, 71, w - 22, 44);
    // scratches
    g.strokeStyle = 'rgba(220,200,160,0.18)';
    g.beginPath();
    g.moveTo(20, 92); g.lineTo(27, 84); g.lineTo(24, 80); g.lineTo(33, 74);
    g.stroke();
  }, { clamp: true });
}

export function doormatTexture() {
  return makeTexture(96, 48, (g, w, h) => {
    g.fillStyle = '#483a25';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(185,160,110,0.5)';
    g.lineWidth = 3;
    g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = 'rgba(220,200,150,0.72)';
    g.font = 'bold 13px monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('WELCOME', w / 2, h / 2 + 1);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(20,12,5,${Math.random() * 0.2})`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 1);
    }
  }, { clamp: true });
}

export function letterTexture() {
  return makeTexture(96, 64, (g, w, h) => {
    g.fillStyle = '#f1e6c8';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(80,60,30,0.45)';
    g.lineWidth = 1;
    for (let y = 14; y < h - 6; y += 7) {
      g.beginPath();
      g.moveTo(9, y);
      g.lineTo(w - 9, y);
      g.stroke();
    }
    g.fillStyle = 'rgba(130,20,20,0.75)';
    g.font = 'bold 9px monospace';
    g.fillText('PARTY', 9, 10);
    g.strokeStyle = 'rgba(0,0,0,0.3)';
    g.strokeRect(1, 1, w - 2, h - 2);
  }, { clamp: true });
}

export function posterTexture(title, subtitle, opts = {}) {
  const { bg = '#263c45', fg = '#f3ddb0', accent = '#d84b3e', doodle = 'smile' } = opts;
  return makeTexture(128, 160, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(0, 0, w, 8);
    g.fillStyle = fg;
    g.textAlign = 'center';
    g.font = 'bold 13px Trebuchet MS';
    const words = title.toUpperCase().split(' ');
    let y = 28;
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (g.measureText(test).width > w - 18 && line) {
        g.fillText(line, w / 2, y);
        y += 16;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) g.fillText(line, w / 2, y);
    g.strokeStyle = accent;
    g.lineWidth = 2;
    g.strokeRect(7, 7, w - 14, h - 14);
    g.fillStyle = accent;
    if (doodle === 'smile') {
      g.beginPath();
      g.arc(w / 2, 91, 22, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.arc(w / 2, 98, 12, 0.1, Math.PI - 0.1);
      g.stroke();
      g.beginPath();
      g.arc(w / 2 - 8, 85, 2, 0, Math.PI * 2);
      g.arc(w / 2 + 8, 85, 2, 0, Math.PI * 2);
      g.fill();
    } else if (doodle === 'dog') {
      g.beginPath();
      g.ellipse(w / 2, 94, 22, 15, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.arc(w / 2 + 17, 88, 9, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = fg;
      g.beginPath();
      g.arc(w / 2 + 20, 86, 1.8, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = accent;
      g.beginPath();
      g.moveTo(w / 2 + 25, 89); g.lineTo(w / 2 + 31, 87); g.lineTo(w / 2 + 27, 92);
      g.fill();
    } else if (doodle === 'sun') {
      g.beginPath();
      g.arc(w / 2, 94, 17, 0, Math.PI * 2);
      g.fill();
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        g.beginPath();
        g.moveTo(w / 2 + Math.cos(a) * 24, 94 + Math.sin(a) * 24);
        g.lineTo(w / 2 + Math.cos(a) * 32, 94 + Math.sin(a) * 32);
        g.stroke();
      }
    }
    g.fillStyle = fg;
    g.font = '9px monospace';
    g.fillText(subtitle.toUpperCase(), w / 2, h - 17);
    // age spots
    for (let i = 0; i < 20; i++) {
      g.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 1);
    }
  }, { clamp: true });
}

export function photoTexture(kind = 0) {
  return makeTexture(64, 48, (g, w, h) => {
    const bgs = ['#7c8d99', '#8d7f65', '#6d7b67', '#8b6b63'];
    g.fillStyle = bgs[kind % bgs.length];
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,240,200,0.8)';
    g.fillRect(0, 0, w, 5);
    g.strokeStyle = 'rgba(20,20,20,0.35)';
    g.strokeRect(3, 3, w - 6, h - 6);
    // tiny stick people
    g.strokeStyle = '#222';
    g.lineWidth = 1.4;
    const heads = [[20, 24], [31, 27], [44, 23]];
    heads.forEach(([x, y], i) => {
      g.fillStyle = i === 1 ? '#d5b28a' : '#c7a17c';
      g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill();
      g.beginPath();
      g.moveTo(x, y + 4); g.lineTo(x, y + 13);
      g.moveTo(x - 5, y + 8); g.lineTo(x + 5, y + 8);
      g.moveTo(x, y + 13); g.lineTo(x - 4, y + 20);
      g.moveTo(x, y + 13); g.lineTo(x + 4, y + 20);
      g.stroke();
    });
    // one person has no face, if kind==3 perhaps
    if (kind === 3) {
      g.fillStyle = '#c7a17c';
      g.beginPath(); g.arc(44, 23, 4, 0, Math.PI * 2); g.fill();
    }
  }, { clamp: true });
}

export function nightWindowTexture() {
  return makeTexture(96, 80, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#081427');
    grad.addColorStop(0.65, '#162944');
    grad.addColorStop(1, '#0d1118');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#f3e5b0';
    g.beginPath();
    g.arc(70, 20, 9, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#0d1118';
    g.beginPath();
    g.arc(75, 16, 8, 0, Math.PI * 2);
    g.fill();
    // stars
    for (let i = 0; i < 24; i++) {
      g.fillStyle = `rgba(240,240,210,${0.3 + Math.random() * 0.6})`;
      g.fillRect(Math.random() * w, Math.random() * 48, 1, 1);
    }
    // distant houses
    g.fillStyle = '#060b12';
    g.fillRect(0, h - 22, w, 22);
    g.fillStyle = '#0a1018';
    for (let x = 0; x < w; x += 24) {
      const hh = 8 + ((x * 7) % 17);
      g.fillRect(x + 3, h - 22 - hh, 15, hh);
      g.fillStyle = 'rgba(240,190,80,0.5)';
      g.fillRect(x + 6, h - 26 - hh, 3, 3);
      g.fillStyle = '#0a1018';
    }
    // curtains from sides? no, frame handles
  }, { clamp: true });
}

export function tvTexture() {
  return makeTexture(128, 96, (g, w, h) => {
    g.fillStyle = '#0a0a0e';
    g.fillRect(0, 0, w, h);
  }, { clamp: true });
}

export function drawTVFrame(texture, mode, t = 0) {
  const c = texture.image;
  const g = c.getContext('2d');
  const w = c.width, h = c.height;
  g.fillStyle = mode === 'party' ? '#24104a' : '#091019';
  g.fillRect(0, 0, w, h);
  // static
  for (let i = 0; i < 340; i++) {
    const v = Math.floor(Math.random() * 180);
    g.fillStyle = `rgba(${v},${v},${v},${0.18 + Math.random() * 0.35})`;
    g.fillRect(Math.random() * w, Math.random() * h, 2, 1 + Math.random() * 2);
  }
  if (mode === 'home') {
    g.fillStyle = 'rgba(255, 234, 170, 0.85)';
    g.font = 'bold 15px monospace';
    g.textAlign = 'center';
    g.fillText('HOME', w / 2, 34);
    g.font = '7px monospace';
    g.fillStyle = 'rgba(255,240,200,0.55)';
    g.fillText('CH 3  ·  8:47 PM', w / 2, 47);
    g.strokeStyle = 'rgba(255, 220, 120, 0.7)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(w / 2, 67, 10, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.arc(w / 2, 70, 5, 0.2, Math.PI - 0.2);
    g.stroke();
    g.fillStyle = 'rgba(255, 220, 120, 0.7)';
    g.beginPath(); g.arc(w / 2 - 3.5, 64, 1, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(w / 2 + 3.5, 64, 1, 0, Math.PI * 2); g.fill();
  } else if (mode === 'party') {
    const hue = (t * 60) % 360;
    g.fillStyle = `hsl(${hue}, 80%, 62%)`;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 12; i++) {
      g.fillStyle = `hsla(${(hue + i * 31) % 360}, 90%, 70%, 0.6)`;
      g.fillRect(Math.random() * w, Math.random() * h, 10, 7);
    }
    g.fillStyle = '#1b0e28';
    g.font = 'bold 19px monospace';
    g.textAlign = 'center';
    g.fillText('PARTY', w / 2, 42);
    g.font = '8px monospace';
    g.fillText('50 HUMANS', w / 2, 57);
    g.font = '24px monospace';
    g.fillText('♪', w / 2, 86);
  } else if (mode === 'scary') {
    g.fillStyle = '#000';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#c01818';
    g.font = 'bold 12px monospace';
    g.textAlign = 'center';
    g.fillText('DON\u2019T', w / 2, 40);
    g.fillStyle = '#f3e5b0';
    g.font = '7px monospace';
    g.fillText('IT SAW YOU', w / 2, 55);
    g.strokeStyle = 'rgba(220,30,30,0.65)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(w / 2, 75, 11, 0, Math.PI * 2);
    g.stroke();
    g.beginPath(); g.arc(w / 2 - 3.5, 72, 1.2, 0, Math.PI * 2); g.fillStyle = '#c01818'; g.fill();
    g.beginPath(); g.arc(w / 2 + 3.5, 72, 1.2, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = 'rgba(255,255,255,0.03)';
  for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
  texture.needsUpdate = true;
}

export function spriteLabel(text, color = '#ffd86b', bg = 'rgba(0,0,0,0.65)') {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 128, 64);
  g.strokeStyle = color;
  g.lineWidth = 3;
  g.strokeRect(3, 3, 122, 58);
  g.fillStyle = color;
  g.font = 'bold 30px monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 64, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  return t;
}

export function partyBannerTexture() {
  return makeTexture(512, 128, (g, w, h) => {
    g.fillStyle = '#1b0f23';
    g.fillRect(0, 0, w, h);
    const colors = ['#ff4a4a', '#ffd84d', '#56e07a', '#51b7ff', '#e665ff'];
    for (let i = 0; i < 36; i++) {
      g.fillStyle = colors[i % colors.length];
      g.beginPath();
      g.moveTo(Math.random() * w, Math.random() * h);
      g.lineTo(Math.random() * w, Math.random() * h);
      g.lineTo(Math.random() * w, Math.random() * h);
      g.fill();
    }
    g.fillStyle = 'rgba(0,0,0,0.56)';
    g.fillRect(0, 30, w, 68);
    g.fillStyle = '#fff3cf';
    g.font = 'bold 54px Impact, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('HOUSE PARTY', w / 2, h / 2);
    g.font = 'bold 16px monospace';
    g.fillStyle = '#ffd84d';
    g.fillText('50 HUMANS', w / 2, h - 14);
  }, { clamp: true });
}
