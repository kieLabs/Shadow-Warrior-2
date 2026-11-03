export const SAVE_KEY = 'gamerkie.shadowWarrior.save';
export const SAVE_VERSION = 1;

export function defaultSave() {
  return {
    version: SAVE_VERSION,
    world: 0,
    level: 1,
    coins: 0,
    gems: 0,
    score: 0,
    highScore: 0,
    enemiesDefeated: 0,
    unlockedCharacters: ['kael'],
    character: 'kael',
    unlockedWeapons: ['fists', 'wooden-stick'],
    weapon: 'fists',
    upgrades: { health: 0, attack: 0, defense: 0, energy: 0, speed: 0 },
    completedLevels: [],
    achievements: [],
    settings: { music: true, sound: true, volume: 0.65, difficulty: 'normal' },
    missionDay: '',
    missions: {},
  };
}

export function normalizeSave(raw) {
  const base = defaultSave();
  if (!raw || typeof raw !== 'object') return base;
  const data = { ...base, ...raw };
  data.version = SAVE_VERSION;
  data.world = clampInt(data.world, 0, 7);
  data.level = clampInt(data.level, 1, 999999);
  for (const key of ['coins', 'gems', 'score', 'highScore', 'enemiesDefeated']) data[key] = clampInt(data[key], 0, 999999999);
  data.unlockedCharacters = uniqueStrings(data.unlockedCharacters, ['kael']);
  data.unlockedWeapons = uniqueStrings(data.unlockedWeapons, ['fists', 'wooden-stick']);
  data.completedLevels = uniqueStrings(data.completedLevels, []);
  data.achievements = uniqueStrings(data.achievements, []);
  data.character = typeof data.character === 'string' ? data.character : 'kael';
  data.weapon = typeof data.weapon === 'string' ? data.weapon : 'fists';
  data.upgrades = { ...base.upgrades, ...(raw.upgrades || {}) };
  for (const key of Object.keys(base.upgrades)) data.upgrades[key] = clampInt(data.upgrades[key], 0, 20);
  data.settings = { ...base.settings, ...(raw.settings || {}) };
  data.settings.music = Boolean(data.settings.music);
  data.settings.sound = Boolean(data.settings.sound);
  data.settings.volume = Math.max(0, Math.min(1, Number(data.settings.volume) || 0));
  if (!['easy', 'normal', 'hard'].includes(data.settings.difficulty)) data.settings.difficulty = 'normal';
  data.missions = raw.missions && typeof raw.missions === 'object' ? raw.missions : {};
  data.missionDay = typeof data.missionDay === 'string' ? data.missionDay : '';
  return data;
}

function clampInt(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.floor(number))) : min;
}
function uniqueStrings(value, fallback) {
  return Array.isArray(value) ? [...new Set(value.filter(item => typeof item === 'string'))] : [...fallback];
}

export function loadSave(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(SAVE_KEY);
    return normalizeSave(raw ? JSON.parse(raw) : null);
  } catch (error) {
    console.warn('Save data could not be read; starting with a fresh profile.', error);
    return defaultSave();
  }
}

export function writeSave(data, storage = globalThis.localStorage) {
  const normalized = normalizeSave(data);
  try {
    storage?.setItem(SAVE_KEY, JSON.stringify(normalized));
    return true;
  } catch (error) {
    console.warn('Save data could not be written. Check browser storage settings.', error);
    return false;
  }
}

export function levelKey(world, level) { return `${world + 1}-${level}`; }

export function upgradeCost(upgrade, currentLevel) {
  const base = { health: 80, attack: 100, defense: 90, energy: 110, speed: 130 }[upgrade] || 100;
  return Math.floor(base * (1 + currentLevel * 0.72));
}
