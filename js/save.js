import * as D from './data.js';

const KEY = 'endless-forest-save-v1';

const DEFAULT = {
  acorns: 0,
  best: 0,
  gate: 0,
  levels: { dmg: 0, spd: 0, hp: 0 },
  runs: 0,
  kills: 0,
  bossWins: 0,
  titleWave: 1,
  muted: false,
};

export function loadSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { ...DEFAULT, ...raw, levels: { ...DEFAULT.levels, ...(raw.levels || {}) } };
  } catch {
    return structuredClone(DEFAULT);
  }
}

export function persist(save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // storage blocked (private mode): progress lasts until the tab closes
  }
}

export const bossReady = (save) => save.best >= save.gate + 10;
export const startWave = (save) => save.gate + 1;

export function canBuy(save, key) {
  const lv = save.levels[key];
  return lv < D.UPGRADES[key].max && save.acorns >= D.upgradeCost(key, lv);
}

export function affordableCount(save) {
  return Object.keys(D.UPGRADES).filter((k) => canBuy(save, k)).length;
}

export function buy(save, key) {
  if (!canBuy(save, key)) return false;
  save.acorns -= D.upgradeCost(key, save.levels[key]);
  save.levels[key]++;
  persist(save);
  return true;
}

export function applyResult(save, r) {
  const prevBest = save.best;
  save.acorns += r.acorns;
  save.runs++;
  save.kills += r.kills;
  if (r.mode === 'boss' && r.reason === 'bossWin') {
    save.gate += 10;
    save.bossWins++;
  }
  save.best = Math.max(save.best, r.waveReached);
  const newBest = save.best > prevBest;
  const title = D.titleFor(save.best);
  const newTitle = title.wave > save.titleWave ? title.name : null;
  save.titleWave = Math.max(save.titleWave, title.wave);
  persist(save);
  return { ...r, prevBest, newBest, newTitle };
}

export function nextGoal(save, r) {
  const n = affordableCount(save);
  const upg = n ? ` · 강화 ${n}개 가능` : '';
  if (r.mode === 'boss' && r.reason === 'bossWin') return `다음 관문은 웨이브 ${save.gate + 10}!`;
  if (bossReady(save)) return `보스 관문(웨이브 ${save.gate + 10})에 도전할 수 있어요!`;
  if (r.mode === 'boss') return n ? `강화하고 다시 도전해요${upg}` : '도토리를 더 모아 강화하고 다시 도전!';
  const toGate = save.gate + 10 - r.waveReached;
  return `관문까지 ${toGate}웨이브 남았어요${upg}`;
}
