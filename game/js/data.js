export const W = 720;
export const H = 1280;
export const TREE = { x: 360, y: 700, r: 64 };
export const FIELD = { left: 40, right: 680, top: 230, bottom: 1230 };

export const WAVE_TIME = 5;
export const RUN_WAVES = 9;
export const RUN_LIMIT = 60;
export const BOSS_LIMIT = 120;
export const PICK_TIME = 3;
export const PICK_SLOWMO = 0.25;
export const PICK_AT = [0, 3, 6];
export const BOSS_PICK_AT = [0, 45];

export const PLAYER = { speed: 380, dmg: 6, interval: 0.5, range: 430, shotSpeed: 900 };
export const TREE_HP = 100;

export const ENEMY = {
  sprout: { hp: 1, speed: 60, dmg: 8, r: 34, reward: 1, size: 78 },
  hedgehog: { hp: 4, speed: 44, dmg: 20, r: 46, reward: 4, size: 104 },
  boss: { hp: 70, speed: 20, dmg: 6, r: 100, reward: 0, size: 230 },
};

export const enemyHp = (wave) => 8 * Math.pow(1.085, wave - 1);
export const reward = (wave) => Math.ceil(Math.pow(1.075, wave - 1));
export const enemySpeedScale = (wave) => 1 + Math.min(0.4, wave * 0.004);

export function waveRoster(wave) {
  const sprouts = Math.min(12, 5 + Math.floor((wave - 1) / 4));
  const elites = wave % 3 === 0 ? Math.min(3, 1 + Math.floor(wave / 30)) : 0;
  return { sprouts, elites };
}

export const UPGRADES = {
  dmg: { name: '도토리 힘', desc: '공격력 +12%', base: 12, growth: 1.22, max: 999 },
  spd: { name: '던지기 속도', desc: '공격 속도 +5%', base: 15, growth: 1.25, max: 30 },
  hp: { name: '나무 체력', desc: '나무 체력 +15%', base: 10, growth: 1.2, max: 999 },
};
export const upgradeCost = (key, lv) => Math.round(UPGRADES[key].base * Math.pow(UPGRADES[key].growth, lv));

export const TAGS = {
  fire: { name: '불꽃', color: '#f0743c' },
  ice: { name: '얼음', color: '#4fb3e8' },
  bolt: { name: '번개', color: '#f2c230' },
  thorn: { name: '가시', color: '#6fae3f' },
  friend: { name: '동료', color: '#e88bb0' },
};

export const CARDS = {
  quick: { tag: 'bolt', name: '빠른 손', desc: '공격 속도 +40%' },
  chain: { tag: 'bolt', name: '번개 도토리', desc: '맞으면 옆의 적 2마리에게 번개' },
  hard: { tag: 'thorn', name: '단단한 도토리', desc: '공격력 +45%' },
  pierce: { tag: 'thorn', name: '관통 도토리', desc: '적을 2마리 더 뚫고 지나감' },
  burn: { tag: 'fire', name: '불붙은 도토리', desc: '맞은 적이 3초 동안 불탐' },
  boom: { tag: 'fire', name: '폭발 도토리', desc: '쓰러진 적이 펑! 주변에 피해' },
  frost: { tag: 'ice', name: '얼음 도토리', desc: '맞은 적이 2초 동안 느려짐' },
  blizzard: { tag: 'ice', name: '서리 바람', desc: '3초마다 주변 적을 얼리는 바람' },
  buddy: { tag: 'friend', name: '아기 다람쥐', desc: '나무 곁에서 함께 던져요' },
  heal: { tag: 'friend', name: '도토리 수프', desc: '나무 체력 30% 회복, 계속 조금씩 회복' },
};

export const SET_BONUS = {
  fire: '불꽃 3장: 모든 도토리가 불을 붙이고 화상 2배',
  ice: '얼음 3장: 느려진 적이 받는 피해 +50%',
  bolt: '번개 3장: 번개가 3마리 더 튀고 공격 속도 +20%',
  thorn: '가시 3장: 나무가 받는 피해 -60%',
  friend: '동료 3장: 아기 다람쥐 2마리 추가',
};

export const TITLES = [
  { wave: 1, name: '새싹 수호대' },
  { wave: 10, name: '도토리 지킴이' },
  { wave: 30, name: '숲길 순찰대' },
  { wave: 50, name: '숲의 지킴이' },
  { wave: 100, name: '천년 나무의 친구' },
  { wave: 200, name: '천년 나무의 영웅' },
  { wave: 500, name: '전설의 수호대' },
  { wave: 1000, name: '별빛 수호대' },
];

export function titleFor(wave) {
  let t = TITLES[0];
  for (const x of TITLES) if (wave >= x.wave) t = x;
  return t;
}

const UNITS = [[1e16, '경'], [1e12, '조'], [1e8, '억'], [1e4, '만']];
export function fmt(n) {
  n = Math.floor(n);
  if (n < 10000) return n.toLocaleString('en-US');
  if (n >= 1e20) {
    const idx = Math.floor((Math.log10(n) - 20) / 3);
    const name = String.fromCharCode(97 + Math.floor(idx / 26) % 26) + String.fromCharCode(97 + idx % 26);
    return (n / Math.pow(10, 20 + 3 * idx)).toFixed(1) + name;
  }
  for (const [v, u] of UNITS) if (n >= v) return (n / v).toFixed(n / v < 100 ? 1 : 0) + u;
  return String(n);
}
