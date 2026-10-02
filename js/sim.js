import * as D from './data.js';

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;

export class Run {
  constructor({ mode = 'normal', gate = 0, levels = { dmg: 0, spd: 0, hp: 0 }, seed = Date.now() }) {
    this.mode = mode;
    this.rand = rng(seed);
    this.levels = levels;
    this.gateWave = gate + 10;
    this.wave = mode === 'boss' ? this.gateWave : gate + 1;
    this.startWave = this.wave;
    this.waveIndex = 0;
    this.waveTimer = 0;
    this.elapsed = 0;
    this.limit = mode === 'boss' ? D.BOSS_LIMIT : D.RUN_LIMIT;
    this.clearing = false;
    this.cards = [];
    this.cardCount = {};
    this.pick = null;
    this.bossPicksDone = 0;
    this.enemies = [];
    this.shots = [];
    this.events = [];
    this.pendingBooms = [];
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.spawnGap = 0;
    this.minionTimer = 7;
    this.blizzardTimer = 3;
    this.nextId = 1;
    this.kills = 0;
    this.acorns = 0;
    this.result = null;
    this.boss = null;
    this.player = { x: D.TREE.x, y: D.TREE.y + 170, facing: 1, atkTimer: 0.3, moving: false };
    this.helpers = [];
    this.helperAngle = 0;
    this.computeStats();
    this.tree = { hp: this.treeMax, max: this.treeMax };

    if (mode === 'boss') {
      this.spawnBoss();
    } else {
      this.setupWave();
    }
    this.maybePick();
  }

  // ---------- stats & cards ----------
  tagCount(tag) {
    return this.cards.filter((id) => D.CARDS[id].tag === tag).length;
  }

  computeStats() {
    const c = (id) => this.cardCount[id] || 0;
    const set = (tag) => this.tagCount(tag) >= 3;
    const lv = this.levels;
    let interval = (D.PLAYER.interval * Math.pow(0.95, lv.spd)) / Math.pow(1.4, c('quick'));
    if (set('bolt')) interval /= 1.2;
    let burn = 0.4 * c('burn') + (set('fire') ? 0.4 : 0);
    if (set('fire')) burn *= 2;
    this.stats = {
      dmg: D.PLAYER.dmg * Math.pow(1.12, lv.dmg) * Math.pow(1.45, c('hard')),
      interval: Math.max(0.08, interval),
      pierce: 2 * c('pierce'),
      chain: 2 * c('chain') + (set('bolt') ? 3 : 0),
      burn,
      boom: 0.6 * c('boom'),
      slow: c('frost') > 0 ? 1.5 + 0.5 * c('frost') : 0,
      blizzard: c('blizzard'),
      shatter: set('ice'),
      helpers: c('buddy') + (set('friend') ? 2 : 0),
      treeDR: set('thorn') ? 0.4 : 1,
      regen: 0.02 * c('heal'),
    };
    this.treeMax = D.TREE_HP * Math.pow(1.15, lv.hp);
    while (this.helpers.length < this.stats.helpers) this.helpers.push({ timer: 0.4 * this.helpers.length });
  }

  offerCards(n) {
    const ids = Object.keys(D.CARDS);
    const options = [];
    while (options.length < n) {
      const weights = ids.map((id) => (options.includes(id) ? 0 : 1 + 1.5 * this.tagCount(D.CARDS[id].tag)));
      const total = weights.reduce((a, b) => a + b, 0);
      let r = this.rand() * total;
      let i = 0;
      while (r > weights[i]) r -= weights[i++];
      options.push(ids[i]);
    }
    return options;
  }

  maybePick() {
    if (this.mode === 'boss') {
      if (this.bossPicksDone < D.BOSS_PICK_AT.length && this.elapsed >= D.BOSS_PICK_AT[this.bossPicksDone]) {
        this.bossPicksDone++;
        this.pick = { options: this.offerCards(this.bossPicksDone === 1 ? 3 : 2), timer: D.PICK_TIME };
      }
    } else if (D.PICK_AT.includes(this.waveIndex)) {
      this.pick = { options: this.offerCards(this.waveIndex === 0 ? 3 : 2), timer: D.PICK_TIME };
    }
    if (this.pick) this.events.push({ type: 'pickOpen' });
  }

  choose(index) {
    if (!this.pick) return;
    const id = this.pick.options[Math.max(0, Math.min(index, this.pick.options.length - 1))];
    const tag = D.CARDS[id].tag;
    const hadSet = this.tagCount(tag) >= 3;
    this.cards.push(id);
    this.cardCount[id] = (this.cardCount[id] || 0) + 1;
    const oldMax = this.treeMax;
    this.computeStats();
    this.tree.max = this.treeMax;
    this.tree.hp += this.treeMax - oldMax;
    if (id === 'heal') this.tree.hp = Math.min(this.tree.max, this.tree.hp + this.tree.max * 0.3);
    this.pick = null;
    this.events.push({ type: 'pick', id });
    if (!hadSet && this.tagCount(tag) >= 3) this.events.push({ type: 'set', tag });
  }

  // ---------- spawning ----------
  setupWave() {
    const { sprouts, elites } = D.waveRoster(this.wave);
    const q = [];
    for (let i = 0; i < sprouts; i++) q.push('sprout');
    for (let i = 0; i < elites; i++) q.splice(Math.floor(this.rand() * (q.length + 1)), 0, 'hedgehog');
    this.spawnQueue = q;
    this.spawnGap = 3.5 / q.length;
    this.spawnTimer = 0;
    this.events.push({ type: 'wave', wave: this.wave });
  }

  edgePoint() {
    const side = this.rand();
    if (side < 0.4) return { x: 60 + this.rand() * 600, y: D.FIELD.top - 60 };
    if (side < 0.65) return { x: -50, y: 320 + this.rand() * 880 };
    if (side < 0.9) return { x: D.W + 50, y: 320 + this.rand() * 880 };
    return { x: 60 + this.rand() * 600, y: D.H + 60 };
  }

  spawnEnemy(kind, wave, at) {
    const k = D.ENEMY[kind];
    const p = at || this.edgePoint();
    const hp = D.enemyHp(wave) * k.hp;
    const e = {
      id: this.nextId++, kind, x: p.x, y: p.y, hp, maxHp: hp, r: k.r,
      speed: k.speed * D.enemySpeedScale(wave), dmg: k.dmg, reward: k.reward * D.reward(wave),
      slowT: 0, burnT: 0, burnDps: 0, burnTick: 0, flash: 0, atkTimer: 0, dead: false, age: 0,
    };
    this.enemies.push(e);
    return e;
  }

  spawnBoss() {
    this.boss = this.spawnEnemy('boss', this.gateWave, { x: D.W / 2, y: D.FIELD.top - 20 });
    this.events.push({ type: 'bossAppear' });
  }

  // ---------- main update ----------
  update(realDt, input) {
    if (this.result) return;
    let dt = realDt;
    if (this.pick) {
      this.pick.timer -= realDt;
      if (this.pick.timer <= 0) this.choose(0);
      dt = realDt * D.PICK_SLOWMO;
    }
    this.elapsed += dt;
    this.updatePlayer(dt, input);
    if (this.mode === 'boss') this.updateBossMode(dt);
    else this.updateWaves(dt);
    this.updateHelpers(dt);
    this.updateShots(dt);
    this.updateEnemies(dt);
    this.updateBlizzard(dt);
    for (const b of this.pendingBooms.splice(0)) this.explode(b);
    if (this.stats.regen > 0) this.tree.hp = Math.min(this.tree.max, this.tree.hp + this.tree.max * this.stats.regen * dt);
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.checkEnd();
  }

  updateWaves(dt) {
    if (this.clearing) return;
    this.waveTimer += dt;
    this.spawnTimer -= dt;
    while (this.spawnQueue.length && this.spawnTimer <= 0) {
      this.spawnEnemy(this.spawnQueue.shift(), this.wave);
      this.spawnTimer += this.spawnGap;
    }
    if (this.waveTimer >= D.WAVE_TIME) {
      if (this.waveIndex >= D.RUN_WAVES - 1) {
        this.clearing = true;
        this.events.push({ type: 'clearing' });
        return;
      }
      this.waveTimer -= D.WAVE_TIME;
      this.waveIndex++;
      this.wave++;
      this.setupWave();
      this.maybePick();
    }
  }

  updateBossMode(dt) {
    this.minionTimer -= dt;
    if (this.minionTimer <= 0 && this.boss && !this.boss.dead) {
      this.minionTimer = 7;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + this.rand();
        this.spawnEnemy('sprout', this.gateWave, { x: this.boss.x + Math.cos(a) * 90, y: this.boss.y + Math.sin(a) * 60 });
      }
      this.events.push({ type: 'summon', x: this.boss.x, y: this.boss.y });
    }
    this.maybePick();
  }

  updatePlayer(dt, input) {
    const p = this.player;
    const mx = input?.mx || 0;
    const my = input?.my || 0;
    p.moving = Math.abs(mx) + Math.abs(my) > 0.05;
    p.x = Math.max(D.FIELD.left, Math.min(D.FIELD.right, p.x + mx * D.PLAYER.speed * dt));
    p.y = Math.max(D.FIELD.top, Math.min(D.FIELD.bottom, p.y + my * D.PLAYER.speed * dt));
    if (Math.abs(mx) > 0.1) p.facing = mx > 0 ? 1 : -1;
    p.atkTimer -= dt;
    if (p.atkTimer <= 0) {
      const target = this.nearest(p.x, p.y, D.PLAYER.range);
      if (target) {
        this.fire(p.x, p.y - 30, target, this.stats.dmg, false);
        p.facing = target.x >= p.x ? 1 : -1;
        p.atkTimer = this.stats.interval;
      } else {
        p.atkTimer = 0.05;
      }
    }
  }

  updateHelpers(dt) {
    this.helperAngle += dt * 0.9;
    const n = this.helpers.length;
    this.helpers.forEach((h, i) => {
      const a = this.helperAngle + (i / Math.max(1, n)) * Math.PI * 2;
      h.x = D.TREE.x + Math.cos(a) * 112;
      h.y = D.TREE.y + Math.sin(a) * 84;
      h.timer -= dt;
      if (h.timer <= 0) {
        const t = this.nearest(h.x, h.y, 380);
        if (t) {
          this.fire(h.x, h.y - 16, t, this.stats.dmg * 0.5, true);
          h.timer = 0.75;
        } else h.timer = 0.1;
      }
    });
  }

  nearest(x, y, range) {
    let best = null;
    let bd = range * range;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = dist2(x, y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  fire(x, y, target, dmg, helper) {
    const a = Math.atan2(target.y - y, target.x - x);
    this.shots.push({
      x, y, vx: Math.cos(a) * D.PLAYER.shotSpeed, vy: Math.sin(a) * D.PLAYER.shotSpeed,
      dmg, pierce: this.stats.pierce, hit: new Set(), life: 0.9, helper, spin: 0,
    });
    if (!helper) this.events.push({ type: 'throw' });
  }

  updateShots(dt) {
    for (const s of this.shots) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      s.spin += dt * 18;
      for (const e of this.enemies) {
        if (e.dead || s.hit.has(e.id)) continue;
        if (dist2(s.x, s.y, e.x, e.y - e.r * 0.6) < (e.r + 12) ** 2) {
          s.hit.add(e.id);
          this.hit(e, s.dmg, true);
          if (this.stats.chain > 0) this.chainFrom(e, s.dmg * 0.5);
          if (s.pierce-- <= 0) { s.life = 0; break; }
        }
      }
    }
    this.shots = this.shots.filter((s) => s.life > 0);
  }

  chainFrom(src, dmg) {
    const targets = this.enemies
      .filter((e) => !e.dead && e !== src && dist2(e.x, e.y, src.x, src.y) < 190 * 190)
      .sort((a, b) => dist2(a.x, a.y, src.x, src.y) - dist2(b.x, b.y, src.x, src.y))
      .slice(0, this.stats.chain);
    for (const t of targets) {
      this.events.push({ type: 'zap', x1: src.x, y1: src.y - src.r * 0.6, x2: t.x, y2: t.y - t.r * 0.6 });
      this.hit(t, dmg, false);
    }
  }

  hit(e, dmg, direct) {
    if (e.dead) return;
    const bossFactor = e.kind === 'boss' ? 0.5 : 1;
    if (this.stats.shatter && e.slowT > 0) dmg *= 1.5;
    e.hp -= dmg;
    e.flash = 0.12;
    if (direct && this.stats.burn > 0) {
      e.burnT = 3;
      e.burnDps = Math.max(e.burnDps, dmg * this.stats.burn);
    }
    if (direct && this.stats.slow > 0) {
      e.slowT = Math.max(e.slowT, this.stats.slow * bossFactor);
    }
    this.events.push({ type: 'hit', x: e.x, y: e.y - e.r * 1.2, dmg, kind: e.kind });
    if (e.hp <= 0) this.kill(e);
  }

  kill(e) {
    e.dead = true;
    this.kills++;
    this.acorns += e.reward;
    this.events.push({ type: 'kill', x: e.x, y: e.y, kind: e.kind, reward: e.reward });
    if (this.stats.boom > 0 && e.kind !== 'boss') this.pendingBooms.push({ x: e.x, y: e.y });
  }

  explode(b) {
    const dmg = this.stats.dmg * this.stats.boom;
    this.events.push({ type: 'boom', x: b.x, y: b.y });
    for (const e of this.enemies) {
      if (!e.dead && dist2(e.x, e.y, b.x, b.y) < 95 * 95) this.hit(e, dmg, false);
    }
  }

  updateBlizzard(dt) {
    if (!this.stats.blizzard) return;
    this.blizzardTimer -= dt;
    if (this.blizzardTimer > 0) return;
    this.blizzardTimer = 3;
    const p = this.player;
    this.events.push({ type: 'frost', x: p.x, y: p.y });
    for (const e of this.enemies) {
      if (e.dead || dist2(e.x, e.y, p.x, p.y) > 250 * 250) continue;
      e.slowT = Math.max(e.slowT, e.kind === 'boss' ? 1 : 2);
      this.hit(e, this.stats.dmg * 0.5 * this.stats.blizzard, false);
    }
  }

  updateEnemies(dt) {
    const t = D.TREE;
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.age += dt;
      e.flash = Math.max(0, e.flash - dt);
      if (e.burnT > 0) {
        e.burnT -= dt;
        e.hp -= e.burnDps * dt;
        e.burnTick += dt;
        if (e.burnTick >= 0.5) {
          e.burnTick = 0;
          this.events.push({ type: 'burn', x: e.x, y: e.y - e.r * 1.2, dmg: e.burnDps * 0.5 });
        }
        if (e.hp <= 0) { this.kill(e); continue; }
      }
      const slowed = e.slowT > 0;
      if (slowed) e.slowT -= dt;
      const speed = e.speed * (slowed ? 0.55 : 1);
      const dx = t.x - e.x;
      const dy = t.y - e.y;
      const d = Math.hypot(dx, dy);
      const reach = t.r + e.r * (e.kind === 'boss' ? 1.1 : 0.5);
      if (d > reach) {
        e.x += (dx / d) * speed * dt;
        e.y += (dy / d) * speed * dt;
      } else if (e.kind === 'boss') {
        e.atkTimer -= dt;
        if (e.atkTimer <= 0) {
          e.atkTimer = 2;
          this.damageTree(e.dmg, e);
        }
      } else {
        this.damageTree(e.dmg, e);
        e.dead = true;
        this.events.push({ type: 'pop', x: e.x, y: e.y });
      }
    }
  }

  damageTree(amount, e) {
    this.tree.hp -= amount * this.stats.treeDR;
    this.events.push({ type: 'treeHit', x: e.x, y: e.y, heavy: e.kind !== 'sprout' });
  }

  forfeit() {
    if (!this.result) this.finish('quit');
  }

  checkEnd() {
    if (this.tree.hp <= 0) this.finish('tree');
    else if (this.mode === 'boss' && this.boss && this.boss.dead) this.finish('bossWin');
    else if (this.mode === 'normal' && this.clearing && this.enemies.length === 0) this.finish('gate');
    else if (this.elapsed >= this.limit) this.finish('time');
  }

  finish(reason) {
    this.tree.hp = Math.max(0, this.tree.hp);
    let bonus = 0;
    if (reason === 'gate') bonus = D.reward(this.gateWave) * 15;
    if (reason === 'bossWin') bonus = D.reward(this.gateWave) * 60;
    this.acorns += bonus;
    this.pick = null;
    this.result = {
      mode: this.mode,
      reason,
      waveReached: reason === 'gate' ? this.gateWave : this.wave,
      kills: this.kills,
      acorns: Math.round(this.acorns),
      bonus,
      seconds: this.elapsed,
    };
    this.events.push({ type: 'end', reason });
  }

  remainingTime() {
    return Math.max(0, this.limit - this.elapsed);
  }
}
