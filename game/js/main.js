import * as D from './data.js';
import { Run } from './sim.js';
import { loadAssets } from './assets.js';
import { Sfx } from './audio.js';
import { Ui, text, panel, COLORS, roundRect, wrap } from './ui.js';
import { Fx, drawWorld, drawHud, drawBanner, drawJoystick, drawPick, drawTree, drawPlayer, acornIcon, tagIcon } from './render.js';
import { loadSave, persist, applyResult, bossReady, startWave, buy, canBuy, affordableCount, nextGoal } from './save.js';

const cv = document.getElementById('game');
const g = cv.getContext('2d');
const ui = new Ui();
const fx = new Fx();
const sfx = new Sfx();
const save = loadSave();
sfx.muted = save.muted;

let assets = null;
let screen = 'loading';
let run = null;
let result = null;
let endTimer = 0;
let sheetOpen = false;
let paused = false;
let recordShown = false;
let t = 0;
let screenT = 0;
const view = { scale: 1, ox: 0, oy: 0, dpr: 1 };
const stick = { active: false, id: null, ox: 0, oy: 0, mx: 0, my: 0 };
const keys = new Set();

// ---------- layout ----------
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const w = Math.round(cv.clientWidth * dpr);
  const h = Math.round(cv.clientHeight * dpr);
  if (w === cv.width && h === cv.height && dpr === view.dpr) return;
  cv.width = w;
  cv.height = h;
  const scale = Math.min(cv.width / D.W, cv.height / D.H);
  view.scale = scale;
  view.dpr = dpr;
  view.ox = (cv.width - D.W * scale) / 2;
  view.oy = (cv.height - D.H * scale) / 2;
}
window.addEventListener('resize', resize);
resize();

function toLogical(e) {
  const r = cv.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) * view.dpr - view.ox) / view.scale,
    y: ((e.clientY - r.top) * view.dpr - view.oy) / view.scale,
  };
}

// ---------- flow ----------
function setScreen(s) {
  screen = s;
  screenT = 0;
  ui.pressed = null;
}

function startRun(mode) {
  run = new Run({ mode, gate: save.gate, levels: { ...save.levels }, seed: (Math.random() * 2 ** 32) >>> 0 });
  fx.reset();
  result = null;
  endTimer = 0;
  paused = false;
  sheetOpen = false;
  recordShown = false;
  stick.active = false;
  setScreen('run');
  consumeEvents();
}

function primaryAction() {
  if (bossReady(save)) startRun('boss');
  else startRun('normal');
}

function finishRun() {
  result = applyResult(save, run.result);
  result.goal = nextGoal(save, result);
  setScreen('result');
  if (result.newBest || result.reason === 'bossWin') sfx.play('record');
}

function consumeEvents() {
  if (!run) return;
  const events = run.events.splice(0);
  fx.consume(events, sfx);
  for (const e of events) {
    if (e.type === 'end') {
      endTimer = 1.0;
      sfx.play(e.reason === 'gate' || e.reason === 'bossWin' ? 'win' : 'lose');
      if (e.reason === 'gate') fx.showBanner('관문 도착!', `웨이브 ${run.gateWave}`, COLORS.gold, 1.2);
      if (e.reason === 'bossWin') fx.showBanner('보스 격파!', '다음 10웨이브가 열렸어요', COLORS.gold, 1.2);
      if (e.reason === 'tree') fx.showBanner('나무가 쓰러졌어요', '', '#ffb3a6', 1.2);
      if (e.reason === 'time') fx.showBanner('시간 끝!', '', '#ffe08a', 1.2);
    }
  }
  if (!recordShown && save.best > 0 && run.mode === 'normal' && run.wave > save.best && !run.result) {
    recordShown = true;
    fx.showBanner('신기록!', `웨이브 ${run.wave} 돌파 중`, COLORS.gold, 1.4);
    sfx.play('record');
  }
}

// ---------- input ----------
cv.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  sfx.unlock();
  const p = toLogical(e);
  const b = ui.hitTest(p.x, p.y);
  if (b) {
    ui.pressed = b.id;
    return;
  }
  if (screen === 'run' && !paused && !run.pick && !run.result && !stick.active) {
    Object.assign(stick, { active: true, id: e.pointerId, ox: p.x, oy: p.y, mx: 0, my: 0 });
  }
});

cv.addEventListener('pointermove', (e) => {
  if (!stick.active || e.pointerId !== stick.id) return;
  const p = toLogical(e);
  let dx = p.x - stick.ox;
  let dy = p.y - stick.oy;
  const len = Math.hypot(dx, dy);
  if (len > 110) {
    stick.ox = p.x - (dx / len) * 110;
    stick.oy = p.y - (dy / len) * 110;
    dx = p.x - stick.ox;
    dy = p.y - stick.oy;
  }
  const m = Math.min(1, Math.hypot(dx, dy) / 70);
  const l = Math.hypot(dx, dy) || 1;
  stick.mx = (dx / l) * m;
  stick.my = (dy / l) * m;
});

function release(e) {
  if (stick.active && e.pointerId === stick.id) {
    stick.active = false;
    stick.mx = stick.my = 0;
  }
  if (ui.pressed) {
    const p = toLogical(e);
    const b = ui.hitTest(p.x, p.y);
    const id = ui.pressed;
    ui.pressed = null;
    if (b && b.id === id && !b.disabled && b.onTap) {
      sfx.play('tap');
      b.onTap();
    }
  }
}
cv.addEventListener('pointerup', release);
cv.addEventListener('pointercancel', release);

window.addEventListener('keydown', (e) => {
  sfx.unlock();
  keys.add(e.key.toLowerCase());
  if (screen === 'run' && run.pick && ['1', '2', '3'].includes(e.key)) run.choose(Number(e.key) - 1);
  if (e.key === 'Escape' && screen === 'run') paused = !paused;
  if ((e.key === 'Enter' || e.key === ' ') && (screen === 'home' || screen === 'result') && !sheetOpen) primaryAction();
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
const params = new URLSearchParams(location.search);
const TEST_MODE = params.has('test');
const AUTOPLAY = TEST_MODE && params.get('autoplay');

// Test-only pilot (?test&autoplay=normal): stays between the tree and the closest monster.
function botInput() {
  if (run.pick && run.pick.timer < D.PICK_TIME - 0.8) run.choose(Number(params.get('card') || 0));
  const p = run.player;
  const target = run.nearest(D.TREE.x, D.TREE.y, 420);
  const goal = target ? { x: (target.x + D.TREE.x) / 2, y: (target.y + D.TREE.y) / 2 } : { x: D.TREE.x, y: D.TREE.y + 160 };
  const dx = goal.x - p.x;
  const dy = goal.y - p.y;
  const d = Math.hypot(dx, dy);
  return d < 20 ? { mx: 0, my: 0 } : { mx: dx / d, my: dy / d };
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden && !TEST_MODE && screen === 'run' && !run.result) paused = true;
});

function moveInput() {
  let mx = stick.mx;
  let my = stick.my;
  if (keys.has('arrowleft') || keys.has('a')) mx -= 1;
  if (keys.has('arrowright') || keys.has('d')) mx += 1;
  if (keys.has('arrowup') || keys.has('w')) my -= 1;
  if (keys.has('arrowdown') || keys.has('s')) my += 1;
  const l = Math.hypot(mx, my);
  return l > 1 ? { mx: mx / l, my: my / l } : { mx, my };
}

// ---------- screens ----------
function drawHome() {
  g.drawImage(assets.background, 0, 0);
  drawTree(g, assets, null);
  drawPlayer(g, assets, { x: 470, y: 900, facing: -1, moving: false }, t);

  const bob = Math.sin(t * 2) * 6;
  text(g, '끝없는 숲', D.W / 2, 120 + bob, { size: 84, color: '#fff3c4', outline: '#6e4524', width: 16 });
  text(g, '수호대', D.W / 2, 214 + bob, { size: 104, color: COLORS.gold, outline: '#6e4524', width: 18 });

  g.fillStyle = 'rgba(38,58,28,0.7)';
  roundRect(g, 150, 282, 420, 92, 30);
  g.fill();
  text(g, save.best ? `최고 웨이브 ${save.best}` : '첫 판을 시작해요!', D.W / 2, 314, { size: 36, color: '#fff', outline: null });
  text(g, D.titleFor(save.best || 1).name, D.W / 2, 352, { size: 24, color: '#d8f0b8', outline: null });

  drawAcornChip();
  drawSoundButton();

  const ready = bossReady(save);
  const pulse = 1 + Math.sin(t * 6) * 0.02;
  g.save();
  g.translate(D.W / 2, 1060);
  g.scale(pulse, pulse);
  g.translate(-D.W / 2, -1060);
  if (ready) {
    ui.button(g, 'boss', 100, 1000, 520, 130, '보스 도전!', { colors: COLORS.red, size: 54, sub: `웨이브 ${save.gate + 10} · 최대 2분`, onTap: () => startRun('boss') });
  } else {
    ui.button(g, 'start', 100, 1000, 520, 130, '출발!', { colors: COLORS.orange, size: 58, sub: `웨이브 ${startWave(save)}부터 · 1분`, onTap: () => startRun('normal') });
  }
  g.restore();
  const n = affordableCount(save);
  ui.button(g, 'upgrade', 100, 1166, 250, 80, n ? `강화 (${n})` : '강화', { colors: COLORS.green, size: 36, onTap: () => { sheetOpen = true; } });
  if (ready) {
    ui.button(g, 'practice', 370, 1166, 250, 80, '연습 판', { colors: COLORS.blue, size: 36, onTap: () => startRun('normal') });
  } else {
    ui.button(g, 'bossLocked', 370, 1166, 250, 80, `보스 ${save.gate + 10}`, { size: 34, disabled: true });
  }
}

function drawAcornChip() {
  g.fillStyle = 'rgba(38,58,28,0.7)';
  roundRect(g, D.W - 230, 24, 206, 60, 30);
  g.fill();
  acornIcon(g, D.W - 196, 54, 32);
  text(g, D.fmt(save.acorns), D.W - 44, 54, { size: 32, align: 'right', color: COLORS.gold, outline: null });
}

function drawSoundButton() {
  ui.button(g, 'sound', 24, 24, 110, 56, save.muted ? '소리 끔' : '소리 켬', {
    colors: save.muted ? COLORS.gray : COLORS.brown, size: 24,
    onTap: () => { save.muted = !save.muted; sfx.muted = save.muted; persist(save); },
  });
}

function drawRun() {
  drawWorld(g, assets, run, fx, t);
  drawHud(g, run, save, t);
  if (!run.result) {
    ui.button(g, 'pause', D.W - 112, 34, 76, 64, 'II', { colors: COLORS.brown, size: 30, onTap: () => { paused = true; } });
  }
  drawJoystick(g, stick);
  if (!run.pick) drawBanner(g, fx);
  if (!paused) drawPick(g, ui, run, (i) => run.choose(i));
  if (!run.result && run.elapsed < 2.5 && !run.pick && run.mode === 'normal') {
    text(g, '화면을 누른 채 끌어서 움직여요', D.W / 2, 1200, { size: 30, color: '#fff', alpha: Math.min(1, 2.5 - run.elapsed) });
  }
  if (paused) drawPause();
}

function drawPause() {
  g.fillStyle = 'rgba(20,30,15,0.6)';
  g.fillRect(0, 0, D.W, D.H);
  panel(g, 110, 440, 500, 420);
  text(g, '잠깐 멈춤', D.W / 2, 520, { size: 54, color: COLORS.ink, outline: null });
  ui.button(g, 'resume', 160, 590, 400, 110, '계속하기', { colors: COLORS.green, size: 44, onTap: () => { paused = false; } });
  ui.button(g, 'quit', 160, 730, 400, 90, '이번 판 끝내기', { colors: COLORS.gray, size: 34, onTap: () => { paused = false; run.forfeit(); consumeEvents(); } });
}

const REASON_TITLE = {
  tree: '나무가 쓰러졌어요',
  time: '시간 끝!',
  gate: '관문 도착!',
  bossWin: '보스 격파!',
  quit: '이번 판 끝',
};

function drawResult() {
  drawWorld(g, assets, run, fx, t);
  const k = Math.min(1, screenT / 0.25);
  g.fillStyle = `rgba(20,30,15,${0.55 * k})`;
  g.fillRect(0, 0, D.W, D.H);
  g.save();
  const s = 0.85 + 0.15 * (1 - Math.pow(1 - k, 3));
  g.translate(D.W / 2, 620);
  g.scale(s, s);
  g.translate(-D.W / 2, -620);
  g.globalAlpha = k;

  const r = result;
  const lost = r.mode === 'boss' && r.reason !== 'bossWin';
  panel(g, 60, 230, 600, 740);
  text(g, lost ? '보스에게 졌어요' : REASON_TITLE[r.reason], D.W / 2, 300, { size: 46, color: COLORS.ink, outline: null });
  text(g, '웨이브', D.W / 2, 372, { size: 30, color: '#8a7358', outline: null });
  text(g, String(r.waveReached), D.W / 2, 466, { size: 136, color: COLORS.gold, outline: '#6e4524', width: 16 });

  if (r.newBest) {
    g.save();
    g.translate(D.W / 2, 566);
    g.rotate(-0.04);
    g.fillStyle = '#ff6d5a';
    roundRect(g, -150, -30, 300, 60, 20);
    g.fill();
    text(g, '신기록!', 0, 2, { size: 40, color: '#fff', outline: '#c23b2c' });
    g.restore();
  } else if (r.prevBest) {
    text(g, `최고 기록 ${r.prevBest}`, D.W / 2, 566, { size: 30, color: '#8a7358', outline: null });
  }

  const stats = [['처치', D.fmt(r.kills)], ['도토리', `+${D.fmt(r.acorns)}`], ['시간', `${Math.round(r.seconds)}초`]];
  stats.forEach(([label, value], i) => {
    const x = 170 + i * 190;
    text(g, label, x, 640, { size: 24, color: '#8a7358', outline: null });
    text(g, value, x, 684, { size: 38, color: i === 1 ? '#c98a1c' : COLORS.ink, outline: null });
  });

  let y = 760;
  if (r.newTitle) {
    text(g, `새 칭호 · ${r.newTitle}`, D.W / 2, y, { size: 32, color: '#e0662f', outline: null });
    y += 56;
  }
  g.fillStyle = '#fff1c9';
  roundRect(g, 100, y - 30, 520, 64, 20);
  g.fill();
  const lines = wrap(g, r.goal, 480, 26);
  lines.slice(0, 2).forEach((ln, i) => text(g, ln, D.W / 2, y + 2 + (i - (lines.length > 1 ? 0.5 : 0)) * 30, { size: 26, color: '#7a5418', outline: null }));
  g.restore();

  if (screenT < 0.35) return;
  const ready = bossReady(save);
  if (ready) {
    ui.button(g, 'boss', 80, 1010, 560, 128, '보스 도전!', { colors: COLORS.red, size: 54, sub: `웨이브 ${save.gate + 10} · 최대 2분`, onTap: () => startRun('boss') });
  } else {
    ui.button(g, 'again', 80, 1010, 560, 128, '다시!', { colors: COLORS.orange, size: 60, sub: `웨이브 ${startWave(save)}부터`, onTap: () => startRun('normal') });
  }
  const n = affordableCount(save);
  ui.button(g, 'upgrade', 80, 1170, 270, 80, n ? `강화 (${n})` : '강화', { colors: COLORS.green, size: 36, onTap: () => { sheetOpen = true; } });
  if (ready) ui.button(g, 'practice', 370, 1170, 270, 80, '연습 판', { colors: COLORS.blue, size: 36, onTap: () => startRun('normal') });
  else ui.button(g, 'home', 370, 1170, 270, 80, '처음 화면', { colors: COLORS.brown, size: 34, onTap: () => setScreen('home') });
}

const UPGRADE_ICON = {
  dmg: (x, y) => acornIcon(g, x, y, 52),
  spd: (x, y) => tagIcon(g, 'bolt', x, y, 30),
  hp: (x, y) => {
    g.save();
    g.fillStyle = '#5fae48';
    g.beginPath();
    g.arc(x, y - 8, 26, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#7a4d2b';
    g.fillRect(x - 6, y + 10, 12, 22);
    g.restore();
  },
};

function drawSheet() {
  g.fillStyle = 'rgba(20,30,15,0.6)';
  g.fillRect(0, 0, D.W, D.H);
  panel(g, 40, 300, 640, 900);
  text(g, '강화', D.W / 2, 370, { size: 54, color: COLORS.ink, outline: null });
  acornIcon(g, D.W / 2 - 90, 432, 30);
  text(g, `${D.fmt(save.acorns)}개`, D.W / 2 - 66, 432, { size: 34, align: 'left', color: '#c98a1c', outline: null });
  text(g, '강화는 판이 끝나도 계속 남아요', D.W / 2, 482, { size: 24, color: '#8a7358', outline: null });

  Object.entries(D.UPGRADES).forEach(([key, u], i) => {
    const y = 530 + i * 190;
    g.fillStyle = '#f6ecd6';
    roundRect(g, 70, y, 580, 170, 24);
    g.fill();
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(140, y + 85, 50, 0, Math.PI * 2);
    g.fill();
    UPGRADE_ICON[key](140, y + 85);
    const lv = save.levels[key];
    text(g, u.name, 210, y + 56, { size: 36, align: 'left', color: COLORS.ink, outline: null });
    text(g, `Lv ${lv}`, 210, y + 100, { size: 28, align: 'left', color: '#c98a1c', outline: null });
    text(g, u.desc, 210, y + 138, { size: 22, align: 'left', color: '#8a7358', outline: null });
    const maxed = lv >= u.max;
    const cost = D.upgradeCost(key, lv);
    ui.button(g, `buy-${key}`, 440, y + 44, 190, 84, maxed ? '최대' : D.fmt(cost), {
      colors: COLORS.orange, size: 34, disabled: maxed || !canBuy(save, key),
      icon: maxed ? null : (gg, x, yy) => acornIcon(gg, x, yy, 30),
      onTap: () => { if (buy(save, key)) sfx.play('buy'); },
    });
  });
  ui.button(g, 'closeSheet', 210, 1110, 300, 76, '닫기', { colors: COLORS.brown, size: 36, onTap: () => { sheetOpen = false; } });
}

function drawLoading() {
  g.fillStyle = '#7fbf5a';
  g.fillRect(0, 0, D.W, D.H);
  text(g, '불러오는 중...', D.W / 2, D.H / 2, { size: 40, color: '#fff' });
}

// ---------- loop ----------
let last = performance.now();
function frame() {
  // rAF timestamps can trail performance.now(); mixing them would make time run backwards.
  const now = performance.now();
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = now;
  t += dt;
  screenT += dt;
  resize();

  if (screen === 'run') {
    if (!paused && !run.result) run.update(dt, AUTOPLAY ? botInput() : moveInput());
    consumeEvents();
    if (run.result) {
      endTimer -= dt;
      if (endTimer <= 0) finishRun();
    }
  }
  if (!paused) fx.update(screen === 'result' ? dt * 0.5 : dt);

  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#2c4a24';
  g.fillRect(0, 0, cv.width, cv.height);
  g.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
  if (assets) drawSurround();
  g.save();
  g.beginPath();
  g.rect(0, 0, D.W, D.H);
  g.clip();
  ui.begin();
  if (screen === 'loading') drawLoading();
  else if (screen === 'home') drawHome();
  else if (screen === 'run') drawRun();
  else if (screen === 'result') drawResult();
  if (sheetOpen) {
    ui.begin();
    drawSheet();
  }
  g.restore();
  schedule();
}

// Phones taller or wider than 9:16 show mirrored copies of the meadow instead of black bars.
function drawSurround() {
  const bg = assets.background;
  for (const i of [-1, 0, 1]) {
    for (const j of [-1, 0, 1]) {
      if (!i && !j) continue;
      g.save();
      g.translate(i === 1 ? 2 * D.W : 0, j === 1 ? 2 * D.H : 0);
      g.scale(i ? -1 : 1, j ? -1 : 1);
      g.drawImage(bg, 0, 0);
      g.restore();
    }
  }
  g.fillStyle = 'rgba(20,35,15,0.28)';
  g.fillRect(-D.W, -D.H, D.W * 3, D.H * 3);
}

// rAF stalls in some embedded/hidden webviews; a slower timer keeps the game alive there.
function schedule() {
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    frame();
  };
  requestAnimationFrame(go);
  setTimeout(go, 34);
}

async function boot() {
  schedule();
  const fontReady = document.fonts ? document.fonts.load(`40px Jua`).catch(() => {}) : Promise.resolve();
  assets = await loadAssets();
  await Promise.race([fontReady, new Promise((r) => setTimeout(r, 2500))]);
  document.getElementById('boot')?.remove();
  setScreen('home');
  if (TEST_MODE) {
    const num = (k) => Number(params.get(k) || 0);
    const lv = num('lv');
    Object.assign(save, { gate: num('gate'), best: Math.max(num('best'), num('gate')), acorns: num('acorns'), levels: { dmg: lv, spd: lv, hp: lv } });
    if (params.has('sheet')) sheetOpen = true;
    if (AUTOPLAY) {
      startRun(AUTOPLAY);
      const steps = num('ff') * 60;
      for (let i = 0; i < steps && !run.result; i++) {
        run.update(1 / 60, botInput());
        if (i % 6 === 0) { consumeEvents(); fx.update(0.1); }
      }
      consumeEvents();
      if (run.result) { finishRun(); screenT = 1; }
    }
  }
}

if (TEST_MODE) window.__efg = {
  state: () => ({ screen, paused, wave: run?.wave, elapsed: run?.elapsed, tree: run?.tree.hp, enemies: run?.enemies.length, pick: !!run?.pick, result }),
  save,
  view,
  get run() { return run; },
};

boot();
