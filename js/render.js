import * as D from './data.js';
import { drawAcornShape } from './assets.js';
import { COLORS, roundRect, text, wrap, panel } from './ui.js';

const LEAF = ['#5fae48', '#7cc35a', '#a3d977', '#b5773a', '#f3e3a0'];

export class Fx {
  constructor() {
    this.parts = [];
    this.texts = [];
    this.rings = [];
    this.zaps = [];
    this.shake = 0;
    this.treeFlash = 0;
    this.banner = null;
    this.flashScreen = 0;
  }

  reset() {
    this.parts = [];
    this.texts = [];
    this.rings = [];
    this.zaps = [];
    this.shake = 0;
    this.treeFlash = 0;
    this.banner = null;
  }

  burst(x, y, n, colors, speed = 260, size = 7) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      this.parts.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, life: 0.45 + Math.random() * 0.3,
        max: 0.75, size: size * (0.6 + Math.random() * 0.7), color: colors[Math.floor(Math.random() * colors.length)],
        spin: Math.random() * 6, rot: Math.random() * 6,
      });
    }
    if (this.parts.length > 400) this.parts.splice(0, this.parts.length - 400);
  }

  floatText(str, x, y, { size = 30, color = '#fff', life = 0.7, rise = 60 } = {}) {
    this.texts.push({ str, x: x + (Math.random() - 0.5) * 20, y, size, color, life, max: life, rise });
    if (this.texts.length > 70) this.texts.shift();
  }

  showBanner(title, sub = '', color = '#fff', time = 1.3) {
    this.banner = { title, sub, color, t: 0, time };
  }

  consume(events, sfx) {
    for (const e of events) {
      switch (e.type) {
        case 'hit':
          this.floatText(D.fmt(e.dmg), e.x, e.y, { size: e.kind === 'boss' ? 38 : 30 });
          sfx.play('hit');
          break;
        case 'burn':
          this.floatText(D.fmt(e.dmg), e.x, e.y, { size: 22, color: '#ffb35c', life: 0.5, rise: 40 });
          sfx.play('burn');
          break;
        case 'kill':
          this.burst(e.x, e.y - 30, e.kind === 'boss' ? 60 : 12, LEAF, e.kind === 'boss' ? 520 : 280);
          if (e.reward) this.floatText(`+${D.fmt(e.reward)}`, e.x, e.y - 70, { size: 26, color: COLORS.gold, life: 0.8, rise: 80 });
          sfx.play('kill');
          if (e.kind === 'boss') { this.shake = 26; this.flashScreen = 0.5; }
          break;
        case 'pop':
          this.burst(e.x, e.y - 20, 8, ['#d9d2c0', '#b9b09c'], 160, 8);
          break;
        case 'treeHit':
          this.shake = Math.max(this.shake, e.heavy ? 16 : 9);
          this.treeFlash = 0.18;
          this.burst(D.TREE.x + (Math.random() - 0.5) * 120, D.TREE.y - 150, 6, ['#5fae48', '#7cc35a'], 180, 9);
          sfx.play('treeHit');
          break;
        case 'boom':
          this.rings.push({ x: e.x, y: e.y - 20, r: 10, max: 100, life: 0.35, color: '#ff8a3d' });
          this.burst(e.x, e.y - 20, 14, ['#ff8a3d', '#ffd34a', '#ff5a3d'], 320, 8);
          sfx.play('boom');
          break;
        case 'frost':
          this.rings.push({ x: e.x, y: e.y, r: 20, max: 250, life: 0.5, color: '#8fd8ff' });
          this.burst(e.x, e.y - 20, 16, ['#dff6ff', '#8fd8ff'], 300, 6);
          sfx.play('frost');
          break;
        case 'zap':
          this.zaps.push({ ...e, life: 0.16 });
          sfx.play('zap');
          break;
        case 'wave':
          this.showBanner(`웨이브 ${e.wave}`, '', '#fff', 1.0);
          sfx.play('wave');
          break;
        case 'clearing':
          this.showBanner('남은 적을 처치!', '다 쓰러뜨리면 관문 도착', COLORS.gold, 1.6);
          sfx.play('clearing');
          break;
        case 'bossAppear':
          this.showBanner('보스 등장!', '가시 대장이 길을 막았어요', '#ff8a6a', 2);
          this.shake = 18;
          sfx.play('bossAppear');
          break;
        case 'summon':
          this.rings.push({ x: e.x, y: e.y, r: 30, max: 180, life: 0.5, color: '#b38cff' });
          sfx.play('summon');
          break;
        case 'set':
          this.showBanner(`${D.TAGS[e.tag].name} 세트 완성!`, D.SET_BONUS[e.tag].split(': ')[1], D.TAGS[e.tag].color, 2.2);
          sfx.play('set');
          break;
        case 'pick': sfx.play('pick'); break;
        case 'pickOpen': sfx.play('pickOpen'); break;
        case 'throw': sfx.play('throw'); break;
        default: break;
      }
    }
  }

  update(dt) {
    for (const p of this.parts) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 700 * dt;
      p.vx *= 0.98;
      p.rot += p.spin * dt;
      p.life -= dt;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const t of this.texts) t.life -= dt;
    this.texts = this.texts.filter((t) => t.life > 0);
    for (const r of this.rings) { r.life -= dt; r.r += (r.max - r.r) * Math.min(1, dt * 10); }
    this.rings = this.rings.filter((r) => r.life > 0);
    for (const z of this.zaps) z.life -= dt;
    this.zaps = this.zaps.filter((z) => z.life > 0);
    this.shake = Math.max(0, this.shake - dt * 60);
    this.treeFlash = Math.max(0, this.treeFlash - dt);
    this.flashScreen = Math.max(0, this.flashScreen - dt);
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t > this.banner.time) this.banner = null;
    }
  }
}

// ---------- icons ----------
export function acornIcon(g, x, y, s = 30) {
  drawAcornShape(g, x, y, s);
}

export function tagIcon(g, tag, x, y, s) {
  const c = D.TAGS[tag].color;
  g.save();
  g.translate(x, y);
  g.fillStyle = c;
  g.strokeStyle = c;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  if (tag === 'fire') {
    g.beginPath();
    g.moveTo(0, -s);
    g.bezierCurveTo(s * 0.9, -s * 0.2, s * 0.8, s * 0.9, 0, s * 0.9);
    g.bezierCurveTo(-s * 0.8, s * 0.9, -s * 0.9, -s * 0.1, -s * 0.2, -s * 0.4);
    g.bezierCurveTo(-s * 0.1, -s * 0.1, 0, -s * 0.5, 0, -s);
    g.fill();
    g.fillStyle = '#ffd34a';
    g.beginPath();
    g.ellipse(0, s * 0.45, s * 0.3, s * 0.4, 0, 0, Math.PI * 2);
    g.fill();
  } else if (tag === 'ice') {
    g.lineWidth = s * 0.18;
    for (let i = 0; i < 3; i++) {
      g.rotate(Math.PI / 3);
      g.beginPath();
      g.moveTo(0, -s);
      g.lineTo(0, s);
      g.moveTo(-s * 0.3, -s * 0.7);
      g.lineTo(0, -s * 0.45);
      g.lineTo(s * 0.3, -s * 0.7);
      g.moveTo(-s * 0.3, s * 0.7);
      g.lineTo(0, s * 0.45);
      g.lineTo(s * 0.3, s * 0.7);
      g.stroke();
    }
  } else if (tag === 'bolt') {
    g.beginPath();
    g.moveTo(s * 0.2, -s);
    g.lineTo(-s * 0.55, s * 0.1);
    g.lineTo(-s * 0.02, s * 0.1);
    g.lineTo(-s * 0.25, s);
    g.lineTo(s * 0.6, -s * 0.15);
    g.lineTo(s * 0.05, -s * 0.15);
    g.closePath();
    g.fill();
  } else if (tag === 'thorn') {
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r = i % 2 ? s * 0.55 : s;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
    g.fillStyle = '#2f5a1c';
    g.beginPath();
    g.arc(0, 0, s * 0.3, 0, Math.PI * 2);
    g.fill();
  } else if (tag === 'friend') {
    g.beginPath();
    g.arc(-s * 0.4, -s * 0.15, s * 0.42, 0, Math.PI * 2);
    g.arc(s * 0.4, -s * 0.15, s * 0.42, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(-s * 0.8, 0);
    g.lineTo(0, s * 0.9);
    g.lineTo(s * 0.8, 0);
    g.fill();
  }
  g.restore();
}

// ---------- world ----------
function shadow(g, x, y, w) {
  g.fillStyle = 'rgba(40,60,30,0.28)';
  g.beginPath();
  g.ellipse(x, y, w, w * 0.32, 0, 0, Math.PI * 2);
  g.fill();
}

function sprite(g, assets, name, x, y, h, { flip = false, flash = 0, squash = 1, alpha = 1 } = {}) {
  const img = assets.images[name];
  const w = (img.width / img.height) * h;
  g.save();
  g.globalAlpha = alpha;
  g.translate(x, y);
  g.scale(flip ? -1 : 1, 1);
  g.scale(1 / Math.sqrt(squash), squash);
  g.drawImage(img, -w / 2, -h, w, h);
  if (flash > 0) {
    g.globalAlpha = Math.min(1, flash) * alpha;
    g.drawImage(assets.white[name], -w / 2, -h, w, h);
  }
  g.restore();
}

export function drawTree(g, assets, fx, hpRatio, alpha = 1) {
  const tx = D.TREE.x - assets.tree.width / 2;
  const ty = D.TREE.y + 40 - 300;
  g.save();
  g.globalAlpha = alpha;
  g.drawImage(assets.tree, tx, ty);
  g.restore();
  if (fx && fx.treeFlash > 0) {
    g.save();
    g.globalAlpha = fx.treeFlash / 0.18 * 0.7;
    g.drawImage(assets.treeWhite, tx, ty);
    g.restore();
  }
  if (hpRatio !== undefined && hpRatio < 0.35) {
    g.save();
    g.globalAlpha = 0.25 + 0.15 * Math.sin(performance.now() / 120);
    g.fillStyle = '#ff4a3a';
    g.beginPath();
    g.ellipse(D.TREE.x, D.TREE.y + 40, 120, 40, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
}

export function drawPlayer(g, assets, p, t, scale = 1, marker = false) {
  const hop = p.moving ? Math.abs(Math.sin(t * 14)) * 10 * scale : Math.sin(t * 3) * 2 * scale;
  if (marker) {
    g.save();
    g.strokeStyle = 'rgba(255,236,140,0.85)';
    g.lineWidth = 4;
    g.beginPath();
    g.ellipse(p.x, p.y + 4, 46, 16, 0, 0, Math.PI * 2);
    g.stroke();
    g.restore();
  }
  shadow(g, p.x, p.y + 4, 34 * scale);
  sprite(g, assets, 'squirrel', p.x, p.y + 8 - hop, 124 * scale, { flip: p.facing > 0, squash: 1 + (p.moving ? 0 : Math.sin(t * 3) * 0.02) });
}

export function drawWorld(g, assets, run, fx, t) {
  g.save();
  if (fx.shake > 0) g.translate((Math.random() - 0.5) * fx.shake, (Math.random() - 0.5) * fx.shake);
  g.drawImage(assets.background, 0, 0);

  for (const r of fx.rings) {
    g.save();
    g.globalAlpha = Math.max(0, r.life * 2);
    g.strokeStyle = r.color;
    g.lineWidth = 8;
    g.beginPath();
    g.ellipse(r.x, r.y, r.r, r.r * 0.7, 0, 0, Math.PI * 2);
    g.stroke();
    g.restore();
  }

  const behindTree = (x, y) => y < D.TREE.y + 40 && y > D.TREE.y - 280 && Math.abs(x - D.TREE.x) < 160;
  const hidden = behindTree(run.player.x, run.player.y) || run.enemies.some((e) => behindTree(e.x, e.y));
  fx.treeAlpha = (fx.treeAlpha ?? 1) + ((hidden ? 0.5 : 1) - (fx.treeAlpha ?? 1)) * 0.2;
  const items = [];
  items.push({ y: D.TREE.y + 40, draw: () => drawTree(g, assets, fx, run.tree.hp / run.tree.max, fx.treeAlpha) });
  for (const e of run.enemies) items.push({ y: e.y, draw: () => drawEnemy(g, assets, e, t) });
  items.push({ y: run.player.y, draw: () => drawPlayer(g, assets, run.player, t, 1, true) });
  for (const h of run.helpers) {
    if (h.x === undefined) continue;
    items.push({ y: h.y, draw: () => drawPlayer(g, assets, { x: h.x, y: h.y, facing: 1, moving: true }, t + h.timer, 0.5) });
  }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();

  for (const s of run.shots) {
    g.save();
    g.translate(s.x, s.y);
    g.rotate(s.spin);
    const sz = s.helper ? 20 : 28;
    g.drawImage(assets.acorn, -sz / 2, -sz / 2, sz, sz);
    g.restore();
  }

  for (const z of fx.zaps) {
    g.save();
    g.globalAlpha = z.life / 0.16;
    g.strokeStyle = '#fff6a8';
    g.lineWidth = 6;
    g.shadowColor = '#f2c230';
    g.shadowBlur = 12;
    g.beginPath();
    g.moveTo(z.x1, z.y1);
    const steps = 5;
    for (let i = 1; i < steps; i++) {
      const k = i / steps;
      g.lineTo(z.x1 + (z.x2 - z.x1) * k + (Math.random() - 0.5) * 24, z.y1 + (z.y2 - z.y1) * k + (Math.random() - 0.5) * 24);
    }
    g.lineTo(z.x2, z.y2);
    g.stroke();
    g.restore();
  }

  for (const p of fx.parts) {
    g.save();
    g.globalAlpha = Math.min(1, p.life / 0.3);
    g.translate(p.x, p.y);
    g.rotate(p.rot);
    g.fillStyle = p.color;
    g.beginPath();
    g.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  for (const tx of fx.texts) {
    const k = 1 - tx.life / tx.max;
    const pop = k < 0.15 ? 0.6 + k / 0.15 * 0.5 : 1.1 - Math.min(0.1, (k - 0.15));
    text(g, tx.str, tx.x, tx.y - tx.rise * k, { size: tx.size * pop, color: tx.color, alpha: Math.min(1, tx.life / tx.max * 2.5) });
  }
  g.restore();

  if (fx.flashScreen > 0) {
    g.save();
    g.globalAlpha = fx.flashScreen;
    g.fillStyle = '#fff';
    g.fillRect(0, 0, D.W, D.H);
    g.restore();
  }
}

function drawEnemy(g, assets, e, t) {
  const k = D.ENEMY[e.kind];
  const name = e.kind === 'sprout' ? 'sprout' : 'hedgehog';
  const bob = Math.sin(e.age * 9 + e.id) * 3;
  const squash = 1 + (e.flash > 0 ? -0.12 : Math.sin(e.age * 9 + e.id) * 0.04);
  shadow(g, e.x, e.y + 4, e.r * 0.95);
  if (e.slowT > 0) {
    g.save();
    g.globalAlpha = 0.5;
    g.fillStyle = '#9fe2ff';
    g.beginPath();
    g.ellipse(e.x, e.y + 4, e.r * 1.1, e.r * 0.38, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  sprite(g, assets, name, e.x, e.y + 8 + bob, k.size, { flip: e.x > D.TREE.x, flash: e.flash / 0.12, squash });
  if (e.burnT > 0 && Math.random() < 0.3) {
    g.save();
    g.fillStyle = Math.random() < 0.5 ? '#ff8a3d' : '#ffd34a';
    g.globalAlpha = 0.85;
    g.beginPath();
    g.arc(e.x + (Math.random() - 0.5) * e.r, e.y - Math.random() * k.size * 0.8, 4 + Math.random() * 5, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  if (e.kind === 'hedgehog' && e.hp < e.maxHp) {
    const w = 70;
    const x = e.x - w / 2;
    const y = e.y - k.size - 8;
    g.fillStyle = 'rgba(40,25,15,0.7)';
    roundRect(g, x - 2, y - 2, w + 4, 12, 6);
    g.fill();
    g.fillStyle = '#ff6d5a';
    roundRect(g, x, y, w * Math.max(0, e.hp / e.maxHp), 8, 4);
    g.fill();
  }
}

// ---------- HUD ----------
function bar(g, x, y, w, h, ratio, color, back = 'rgba(40,25,15,0.55)') {
  g.fillStyle = back;
  roundRect(g, x, y, w, h, h / 2);
  g.fill();
  if (ratio > 0) {
    g.fillStyle = color;
    roundRect(g, x + 3, y + 3, Math.max(h - 6, (w - 6) * Math.min(1, ratio)), h - 6, (h - 6) / 2);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.3)';
    roundRect(g, x + 6, y + 4, Math.max(0, (w - 12) * Math.min(1, ratio)), (h - 6) * 0.35, 4);
    g.fill();
  }
}

export function drawHud(g, run, save, t) {
  g.save();
  g.fillStyle = 'rgba(38,58,28,0.72)';
  roundRect(g, 16, 16, D.W - 32, 150, 30);
  g.fill();

  const isBoss = run.mode === 'boss';
  text(g, isBoss ? '보스 관문' : '웨이브', 92, 50, { size: 24, color: '#d8f0b8', outline: null });
  text(g, String(run.wave), 92, 104, { size: 64, color: '#fff' });

  const left = 172;
  const width = 400;
  const remain = run.remainingTime();
  const low = remain < 10;
  text(g, `${Math.ceil(remain)}초`, left, 44, { size: 26, align: 'left', color: low ? '#ffb3a6' : '#fff', outline: null });
  bar(g, left, 60, width, 26, remain / run.limit, low ? '#ff7a5c' : '#ffd34a');
  text(g, '나무', left, 116, { size: 24, align: 'left', color: '#d8f0b8', outline: null });
  bar(g, left + 58, 102, width - 58, 28, run.tree.hp / run.tree.max, run.tree.hp / run.tree.max < 0.35 ? '#ff6d5a' : '#7fd85e');

  acornIcon(g, left + width - 6, 148, 22);
  text(g, D.fmt(run.acorns), left + width - 24, 148, { size: 24, align: 'right', color: COLORS.gold, outline: null });

  // progress to gate
  if (!isBoss) {
    const y = 200;
    const x0 = 120;
    const step = 60;
    for (let i = 0; i < D.RUN_WAVES; i++) {
      const w = run.startWave + i;
      const done = w < run.wave || (run.clearing && w === run.wave);
      const cur = w === run.wave && !run.clearing;
      g.fillStyle = done ? '#ffd34a' : cur ? '#fff' : 'rgba(40,25,15,0.45)';
      g.beginPath();
      g.arc(x0 + i * step, y, cur ? 13 : 10, 0, Math.PI * 2);
      g.fill();
      if (w === save.best && save.best > 0) text(g, '최고', x0 + i * step, y - 26, { size: 18, color: '#fff' });
    }
    const gx = x0 + D.RUN_WAVES * step;
    g.fillStyle = '#ff8a6a';
    g.beginPath();
    g.moveTo(gx, y - 18);
    g.lineTo(gx + 16, y);
    g.lineTo(gx, y + 18);
    g.lineTo(gx - 16, y);
    g.closePath();
    g.fill();
    text(g, `관문 ${run.gateWave}`, gx, y + 34, { size: 20, color: '#fff' });
  } else if (run.boss) {
    const b = run.boss;
    text(g, '가시 대장', D.W / 2, 196, { size: 28, color: '#fff' });
    bar(g, 60, 214, D.W - 120, 30, Math.max(0, b.hp / b.maxHp), '#ff6d5a');
    text(g, D.fmt(Math.max(0, b.hp)), D.W / 2, 229, { size: 20, color: '#fff' });
  }
  g.restore();
}

export function drawBanner(g, fx) {
  const b = fx.banner;
  if (!b) return;
  const k = b.t / b.time;
  const inK = Math.min(1, b.t / 0.18);
  const out = k > 0.8 ? (1 - k) / 0.2 : 1;
  const alpha = Math.min(inK, out);
  const scale = 0.7 + 0.3 * inK;
  g.save();
  g.translate(D.W / 2, 430);
  g.scale(scale, scale);
  text(g, b.title, 0, 0, { size: 72, color: b.color, alpha, width: 12 });
  if (b.sub) text(g, b.sub, 0, 64, { size: 30, color: '#fff', alpha, width: 7 });
  g.restore();
}

export function drawJoystick(g, stick) {
  if (!stick.active) return;
  g.save();
  g.globalAlpha = 0.35;
  g.strokeStyle = '#fff';
  g.lineWidth = 5;
  g.beginPath();
  g.arc(stick.ox, stick.oy, 70, 0, Math.PI * 2);
  g.stroke();
  g.globalAlpha = 0.5;
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(stick.ox + stick.mx * 70, stick.oy + stick.my * 70, 30, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

export function drawPick(g, ui, run, onChoose) {
  const pick = run.pick;
  if (!pick) return;
  g.save();
  g.fillStyle = 'rgba(20,30,15,0.5)';
  g.fillRect(0, 0, D.W, D.H);
  const first = run.cards.length === 0;
  text(g, first ? '이번 판 첫 카드!' : '카드 하나 골라요!', D.W / 2, 610, { size: 50, color: '#fff', width: 10 });
  const ratio = Math.max(0, pick.timer / D.PICK_TIME);
  bar(g, D.W / 2 - 150, 650, 300, 22, ratio, '#ffd34a');

  const n = pick.options.length;
  const cw = n === 3 ? 210 : 290;
  const gap = 20;
  const total = n * cw + (n - 1) * gap;
  const x0 = (D.W - total) / 2;
  pick.options.forEach((id, i) => {
    const card = D.CARDS[id];
    const tag = D.TAGS[card.tag];
    const x = x0 + i * (cw + gap);
    const y = 700;
    const h = 380;
    const pressed = ui.pressed === `card${i}`;
    const dy = pressed ? 6 : 0;
    panel(g, x, y + dy, cw, h, { fill: '#fffaf0', edge: tag.color, r: 26 });
    g.fillStyle = tag.color;
    roundRect(g, x + 10, y + dy + 10, cw - 20, 44, 18);
    g.fill();
    const have = run.cardCount[id] || 0;
    text(g, have ? `${tag.name} · 강화` : tag.name, x + cw / 2, y + dy + 33, { size: 24, color: '#fff', outline: null });
    tagIcon(g, card.tag, x + cw / 2, y + dy + 130, 46);
    text(g, card.name, x + cw / 2, y + dy + 214, { size: n === 3 ? 30 : 34, color: COLORS.ink, outline: null });
    const lines = wrap(g, card.desc, cw - 30, 22);
    lines.forEach((ln, j) => text(g, ln, x + cw / 2, y + dy + 262 + j * 30, { size: 22, color: '#6b5844', outline: null }));
    const tc = run.tagCount(card.tag);
    if (tc >= 2 && tc < 3) text(g, '세트 완성까지 1장!', x + cw / 2, y + dy + h - 30, { size: 20, color: tag.color, outline: null });
    ui.buttons.push({ id: `card${i}`, x, y, w: cw, h, onTap: () => onChoose(i) });
  });
  g.restore();
}
