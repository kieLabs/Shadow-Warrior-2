export const WORLDS = [
  { name: 'CITY STREETS', subtitle: 'Where the uprising began', sky: ['#182c48', '#54758a'], ground: '#273944', accent: '#f5a66d', hazard: '#ff8c63', music: 0 },
  { name: 'DARK FOREST', subtitle: 'The trees remember', sky: ['#102b2a', '#52765c'], ground: '#293c2b', accent: '#a8d58c', hazard: '#e5bb65', music: 1 },
  { name: 'MILITARY BASE', subtitle: 'No way out but through', sky: ['#1a2935', '#637b7c'], ground: '#35424a', accent: '#e7bd65', hazard: '#ff6b57', music: 2 },
  { name: 'DESERT KINGDOM', subtitle: 'Beneath the burning sun', sky: ['#80513b', '#e4ad69'], ground: '#70503a', accent: '#f3d08a', hazard: '#d76d4e', music: 3 },
  { name: 'FROZEN MOUNTAINS', subtitle: 'Every breath is a battle', sky: ['#18364e', '#8ab6c9'], ground: '#7a9eae', accent: '#d8f4f3', hazard: '#8de0ff', music: 4 },
  { name: 'UNDERGROUND LAB', subtitle: 'The machine beneath the world', sky: ['#111a34', '#344d70'], ground: '#283849', accent: '#7ce7eb', hazard: '#6de5f6', music: 5 },
  { name: 'DARK CASTLE', subtitle: 'A kingdom consumed by shadow', sky: ['#201a32', '#60415e'], ground: '#352e40', accent: '#d58ac0', hazard: '#fa835d', music: 6 },
  { name: 'SHADOW REALM', subtitle: 'Face the source of all fear', sky: ['#090e22', '#322c5a'], ground: '#1d2340', accent: '#bd9cff', hazard: '#e66d9a', music: 7 },
];

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function generateLevel(worldIndex = 0, levelNumber = 1, mode = 'story') {
  const world = Math.max(0, Math.min(7, worldIndex | 0));
  const level = Math.max(1, levelNumber | 0);
  const seed = (world + 1) * 98731 + level * 7919 + mode.length * 127;
  const random = seededRandom(seed);
  const difficulty = Math.min(24, 1 + Math.floor((level - 1) / 2) + world * .7);
  const length = mode === 'endless' || mode === 'survival' ? 6200 : 3400 + Math.min(level, 20) * 35;
  const platforms = [];
  const coins = [];
  const pickups = [];
  const traps = [];
  const objects = [];
  const enemies = [];
  const segment = 390;
  let x = 0;
  let floorY = 452;
  let previousEnd = 0;
  let index = 0;
  while (x < length) {
    const gap = index === 0 ? 0 : 48 + random() * 58;
    const width = 285 + random() * 105;
    x = previousEnd + gap;
    floorY = 438 + Math.round(random() * 30);
    platforms.push({ x, y: floorY, w: width, h: 100, type: 'ground' });
    // A reachable raised route gives combat spaces and optional coin lines.
    const ledgeX = x + 82 + random() * 90;
    const ledgeY = floorY - (82 + random() * 35);
    platforms.push({ x: ledgeX, y: ledgeY, w: 92 + random() * 54, h: 18, type: 'ledge' });
    if (random() > .38) {
      platforms.push({ x: x + 230, y: floorY - 140 - random() * 25, w: 90, h: 16, type: 'ledge' });
    }
    const coinCount = 3 + Math.floor(random() * 4);
    for (let c = 0; c < coinCount; c++) {
      const coinX = x + 55 + c * 27;
      coins.push({ x: coinX, y: floorY - 45 - Math.sin(c / Math.max(1, coinCount - 1) * Math.PI) * 38, type: random() > .94 ? 'gem' : 'coin', taken: false });
    }
    if (index > 0 && index % 3 === 1) pickups.push({ x: x + 175, y: floorY - 42, type: random() > .5 ? 'health' : 'energy', taken: false });
    if (index > 2 && random() > .965) pickups.push({ x: x + 250, y: floorY - 45, type: 'weapon', taken: false });
    if (index > 1 && random() > .68) objects.push({ x: x + 155 + random() * 120, y: floorY - 38, w: 34, h: 38, hp: 2, type: random() > .5 ? 'crate' : 'barrel', destroyed: false });
    if (index > 1 && random() > .65) traps.push({ x: x + 205, y: floorY - 18, w: 48 + random() * 26, h: 18, type: world === 2 ? 'laser' : 'spikes', active: true });
    if (x > 210 && x < length - 450) {
      const count = 1 + Math.floor(random() * Math.min(3, 1 + difficulty / 4));
      for (let e = 0; e < count; e++) {
        enemies.push({ x: x + 120 + e * 46, y: floorY - 64, type: enemyType(world, difficulty, random), healthScale: 1 + difficulty * .11 });
      }
    }
    previousEnd = x + width;
    index++;
  }
  const bossLevel = mode === 'story' && level % 5 === 0;
  return {
    world, level, mode, seed, difficulty, length: previousEnd + 100,
    platforms, coins, pickups, traps, objects, enemies,
    exitX: previousEnd + 30,
    bossLevel,
    bossX: previousEnd - 330,
  };
}

function enemyType(world, difficulty, random) {
  const pool = [0, 0, 1, 2, 4, 5];
  if (world >= 1) pool.push(6, 7);
  if (world >= 2) pool.push(3, 8);
  if (difficulty > 5) pool.push(9, 10);
  return pool[Math.floor(random() * pool.length)];
}

export function findLandingPlatform(platforms, previousBottom, nextBottom, playerLeft, playerRight, vy) {
  if (vy < 0 || nextBottom < previousBottom) return null;
  return platforms.find(platform =>
    previousBottom <= platform.y + 2 && nextBottom >= platform.y &&
    playerRight > platform.x && playerLeft < platform.x + platform.w
  ) || null;
}

export function getWorld(index) { return WORLDS[Math.max(0, Math.min(7, index | 0))]; }
