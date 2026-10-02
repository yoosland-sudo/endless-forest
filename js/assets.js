import { W, H, TREE } from './data.js';
import { rng } from './sim.js';

const IMAGE_NAMES = ['squirrel', 'sprout', 'hedgehog'];

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function silhouette(img) {
  const c = canvas(img.width, img.height);
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#fff';
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

function blob(g, x, y, r, color) {
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}

function drawBackground() {
  const c = canvas(W, H);
  const g = c.getContext('2d');
  const rand = rng(7);

  const base = g.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, '#9fd068');
  base.addColorStop(1, '#79b955');
  g.fillStyle = base;
  g.fillRect(0, 0, W, H);

  const glow = g.createRadialGradient(TREE.x, TREE.y, 40, TREE.x, TREE.y, 520);
  glow.addColorStop(0, 'rgba(232,246,170,0.55)');
  glow.addColorStop(1, 'rgba(232,246,170,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);

  for (let i = 0; i < 60; i++) {
    g.fillStyle = rand() < 0.5 ? 'rgba(70,130,50,0.10)' : 'rgba(220,245,160,0.12)';
    g.beginPath();
    g.ellipse(rand() * W, rand() * H, 40 + rand() * 90, 20 + rand() * 40, rand() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }

  g.strokeStyle = 'rgba(60,115,45,0.45)';
  g.lineWidth = 2.5;
  g.lineCap = 'round';
  for (let i = 0; i < 220; i++) {
    const x = rand() * W;
    const y = 200 + rand() * (H - 200);
    const s = 6 + rand() * 7;
    g.beginPath();
    g.moveTo(x - s * 0.6, y - s);
    g.lineTo(x, y);
    g.lineTo(x + s * 0.6, y - s);
    g.moveTo(x, y);
    g.lineTo(x + 1, y - s * 1.2);
    g.stroke();
  }

  const petals = ['#ffffff', '#ffe27a', '#ffb3c9', '#d8c4ff'];
  for (let i = 0; i < 55; i++) {
    const x = 50 + rand() * (W - 100);
    const y = 260 + rand() * (H - 320);
    if (Math.hypot(x - TREE.x, y - TREE.y) < 150) continue;
    const col = petals[Math.floor(rand() * petals.length)];
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      blob(g, x + Math.cos(a) * 4.5, y + Math.sin(a) * 4.5, 3.6, col);
    }
    blob(g, x, y, 2.6, '#f2a93b');
  }

  g.fillStyle = 'rgba(70,110,50,0.18)';
  g.beginPath();
  g.ellipse(TREE.x, TREE.y + 40, 150, 56, 0, 0, Math.PI * 2);
  g.fill();

  const bush = (x, y, r) => {
    blob(g, x, y + r * 0.25, r, '#3c7a35');
    blob(g, x - r * 0.25, y, r * 0.85, '#4b8f3f');
    blob(g, x - r * 0.35, y - r * 0.3, r * 0.45, '#68ab52');
  };
  for (let x = -20; x < W + 40; x += 62) bush(x + rand() * 20, 196 + rand() * 18, 46 + rand() * 18);
  for (let y = 260; y < H; y += 70) {
    bush(-10 + rand() * 14, y + rand() * 20, 34 + rand() * 16);
    bush(W + 10 - rand() * 14, y + rand() * 20, 34 + rand() * 16);
  }
  for (let x = -20; x < W + 40; x += 66) bush(x + rand() * 20, H + 10 - rand() * 12, 44 + rand() * 14);

  const vignette = g.createRadialGradient(W / 2, H * 0.55, H * 0.35, W / 2, H * 0.55, H * 0.85);
  vignette.addColorStop(0, 'rgba(20,40,20,0)');
  vignette.addColorStop(1, 'rgba(20,40,20,0.35)');
  g.fillStyle = vignette;
  g.fillRect(0, 0, W, H);
  return c;
}

export function drawAcornShape(g, x, y, s) {
  g.fillStyle = '#b5773a';
  g.beginPath();
  g.ellipse(x, y + s * 0.18, s * 0.42, s * 0.5, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.beginPath();
  g.ellipse(x - s * 0.14, y + s * 0.1, s * 0.1, s * 0.2, -0.3, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#6b4423';
  g.beginPath();
  g.ellipse(x, y - s * 0.16, s * 0.5, s * 0.26, 0, Math.PI, Math.PI * 2);
  g.lineTo(x + s * 0.5, y - s * 0.12);
  g.ellipse(x, y - s * 0.12, s * 0.5, s * 0.1, 0, 0, Math.PI);
  g.fill();
  g.strokeStyle = '#4e3018';
  g.lineWidth = Math.max(1, s * 0.08);
  g.beginPath();
  g.moveTo(x, y - s * 0.38);
  g.lineTo(x + s * 0.08, y - s * 0.52);
  g.stroke();
}

function drawAcorn() {
  const c = canvas(48, 48);
  drawAcornShape(c.getContext('2d'), 24, 24, 34);
  return c;
}

function drawTree() {
  const c = canvas(320, 360);
  const g = c.getContext('2d');
  const cx = 160;
  const base = 300;
  g.fillStyle = '#7a4d2b';
  g.beginPath();
  g.moveTo(cx - 34, base);
  g.quadraticCurveTo(cx - 62, base + 10, cx - 70, base + 2);
  g.quadraticCurveTo(cx - 40, base - 20, cx - 26, base - 70);
  g.lineTo(cx - 20, base - 150);
  g.lineTo(cx + 20, base - 150);
  g.lineTo(cx + 26, base - 70);
  g.quadraticCurveTo(cx + 40, base - 20, cx + 72, base + 4);
  g.quadraticCurveTo(cx + 60, base + 10, cx + 34, base);
  g.quadraticCurveTo(cx, base + 8, cx - 34, base);
  g.fill();
  g.fillStyle = '#5f3a1f';
  g.beginPath();
  g.moveTo(cx + 6, base - 150);
  g.lineTo(cx + 20, base - 150);
  g.lineTo(cx + 26, base - 70);
  g.quadraticCurveTo(cx + 40, base - 20, cx + 72, base + 4);
  g.quadraticCurveTo(cx + 40, base, cx + 14, base - 6);
  g.fill();
  g.strokeStyle = 'rgba(60,35,18,0.5)';
  g.lineWidth = 3;
  for (const [x1, y1, x2, y2] of [[-8, -40, -4, -110], [6, -20, 10, -90], [-14, -10, -18, -60]]) {
    g.beginPath();
    g.moveTo(cx + x1, base + y1);
    g.lineTo(cx + x2, base + y2);
    g.stroke();
  }
  const canopy = [
    [0, -200, 104], [-78, -170, 70], [78, -170, 70], [-48, -238, 70], [52, -240, 68], [0, -270, 62],
  ];
  for (const [x, y, r] of canopy) blob(g, cx + x, base + y + 8, r, '#356f30');
  for (const [x, y, r] of canopy) blob(g, cx + x, base + y, r * 0.95, '#4b9440');
  for (const [x, y, r] of canopy) blob(g, cx + x - r * 0.22, base + y - r * 0.24, r * 0.55, '#69b352');
  for (const [x, y, r] of canopy) blob(g, cx + x - r * 0.34, base + y - r * 0.4, r * 0.22, '#8fd06c');
  for (const [x, y] of [[-60, -150], [40, -132], [74, -196], [-20, -170], [-86, -210], [18, -250]]) {
    drawAcornShape(g, cx + x, base + y, 26);
  }
  return c;
}

export async function loadAssets() {
  const images = {};
  await Promise.all(IMAGE_NAMES.map(async (n) => {
    images[n] = await loadImage(`assets/img/${n}.webp`);
  }));
  const white = {};
  for (const n of IMAGE_NAMES) white[n] = silhouette(images[n]);
  const tree = drawTree();
  return {
    images,
    white,
    background: drawBackground(),
    tree,
    treeWhite: silhouette(tree),
    acorn: drawAcorn(),
  };
}
