// Plays many runs with a simple bot and prints how far each upgrade level gets.
// The bot circles close to the tree and always takes the left card, so real players should do better.
import { Run } from '../game/js/sim.js';
import * as D from '../game/js/data.js';

function botInput(run) {
  const p = run.player;
  const target = run.nearest(D.TREE.x, D.TREE.y, 400);
  const goal = target
    ? { x: (target.x + D.TREE.x) / 2, y: (target.y + D.TREE.y) / 2 }
    : { x: D.TREE.x, y: D.TREE.y + 150 };
  const dx = goal.x - p.x;
  const dy = goal.y - p.y;
  const d = Math.hypot(dx, dy);
  return d < 20 ? { mx: 0, my: 0 } : { mx: dx / d, my: dy / d };
}

export function play(opts, seed) {
  const run = new Run({ ...opts, seed });
  const dt = 1 / 30;
  let guard = 0;
  while (!run.result && guard++ < 30 * 200) {
    if (run.pick) run.choose(0);
    run.update(dt, botInput(run));
  }
  return run.result;
}

function summary(opts, n = 40) {
  const results = [];
  for (let i = 0; i < n; i++) results.push(play(opts, 1000 + i));
  const waves = results.map((r) => r.waveReached).sort((a, b) => a - b);
  const secs = results.map((r) => r.seconds);
  const reasons = {};
  for (const r of results) reasons[r.reason] = (reasons[r.reason] || 0) + 1;
  return {
    median: waves[Math.floor(n / 2)],
    min: waves[0],
    max: waves[n - 1],
    avgAcorns: Math.round(results.reduce((a, r) => a + r.acorns, 0) / n),
    maxSec: Math.max(...secs).toFixed(1),
    reasons,
  };
}

const rows = [];
for (const gate of [0, 10, 20, 30, 50]) {
  for (const lv of [0, 5, 10, 15, 20, 30]) {
    const levels = { dmg: lv, spd: Math.min(lv, 30), hp: lv };
    const normal = summary({ mode: 'normal', gate, levels });
    const boss = summary({ mode: 'boss', gate, levels }, 20);
    rows.push({
      gate, lv,
      runMedian: normal.median, runRange: `${normal.min}-${normal.max}`,
      gateRate: `${normal.reasons.gate || 0}/40`, runMaxSec: normal.maxSec, acorns: normal.avgAcorns,
      bossWin: `${boss.reasons.bossWin || 0}/20`, bossMaxSec: boss.maxSec,
    });
  }
}
console.table(rows);

const costs = (lv) => ['dmg', 'spd', 'hp'].reduce((s, k) => {
  let t = 0;
  for (let i = 0; i < lv; i++) t += D.upgradeCost(k, Math.min(i, D.UPGRADES[k].max));
  return s + t;
}, 0);
console.log('total acorns to reach all-level:', [5, 10, 15, 20, 30].map((lv) => `${lv}:${costs(lv)}`).join('  '));
