import { createPlayer, updatePlayer, drawPlayer } from './player.js';
import { createEnemy, updateEnemies, drawEnemy, damageEnemy } from './enemies.js';
import { performAttack, updateCombat } from './combat.js';
import { generateLevel, WORLDS, getWorld } from './levels.js';
import { createBoss, updateBoss, drawBoss } from './bosses.js';
import { WEAPONS, CHARACTERS, getWeapon } from './weapons.js';
import { loadSave, writeSave, levelKey, upgradeCost } from './save.js';
import { AudioEngine } from './audio.js';
import { drawUI } from './ui.js';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d', { alpha: false });
const W = canvas.width, H = canvas.height;
const game = {
  state: 'menu', menuPage: 'main', fromPause: false, save: loadSave(), audio: null,
  player: null, level: null, enemies: [], boss: null, bossTemplate: null, bossSpawned: false,
  cameraX: 0, cameraShake: 0, particles: [], floatTexts: [], projectiles: [],
  input: { left: false, right: false, jumpPressed: false, attackPressed: false, heavyPressed: false, specialPressed: false, dodgePressed: false, crouch: false, block: false },
  uiButtons: [], mode: 'story', runScore: 0, levelReward: { score: 0, coins: 0 },
  time: 0, elapsed: 0, wave: 1, waveLabel: 'WAVE 1', lastSave: 0,
};
game.audio = new AudioEngine(game.save);
Object.defineProperty(window, '__shadowWarrior', { value: game, configurable: false });

const MISSION_DEFS = [
  { id: 'defeats', label: 'Defeat 20 enemies', target: 20, reward: 70 },
  { id: 'coins', label: 'Collect 100 coins', target: 100, reward: 60 },
  { id: 'levels', label: 'Complete 3 levels', target: 3, reward: 100 },
  { id: 'bosses', label: 'Defeat a boss', target: 1, reward: 120 },
  { id: 'combos', label: 'Perform 10 combo attacks', target: 10, reward: 90 },
];

function localDay() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function ensureMissions() {
  const today = localDay();
  if (game.save.missionDay !== today) {
    game.save.missionDay = today;
    game.save.missions = Object.fromEntries(MISSION_DEFS.map(item => [item.id, { progress: 0, claimed: false }]));
    persist();
  }
}
function incrementMission(id, amount = 1) {
  ensureMissions();
  const definition = MISSION_DEFS.find(item => item.id === id);
  if (!definition) return;
  const record = game.save.missions[id] || (game.save.missions[id] = { progress: 0, claimed: false });
  if (record.claimed) return;
  record.progress = Math.min(definition.target, (record.progress || 0) + amount);
  if (record.progress >= definition.target) {
    record.claimed = true;
    game.save.coins += definition.reward;
    game.addFloatText?.(`MISSION +${definition.reward}`, 480, 160, '#f4d184');
  }
  persist();
}
function getMissionList() {
  ensureMissions();
  return MISSION_DEFS.map(def => {
    const record = game.save.missions[def.id] || { progress: 0, claimed: false };
    return { ...def, progress: record.progress || 0, complete: Boolean(record.claimed) };
  });
}
game.getMissionList = getMissionList;
function persist() { writeSave(game.save); }

function startGame(mode = 'story') {
  game.audio.resume();
  game.mode = mode;
  game.wave = 1;
  game.runScore = 0;
  game.elapsed = 0;
  game.challengeTime = mode === 'challenge' ? 90 : null;
  const world = mode === 'story' ? game.save.world : Math.min(game.save.world, 7);
  const levelNumber = mode === 'story' ? game.save.level : 1;
  startLevel(world, levelNumber, mode);
}

function startLevel(world, levelNumber, mode = game.mode) {
  game.level = generateLevel(world, levelNumber, mode === 'bossrush' ? 'story' : mode);
  if (mode === 'bossrush') game.level.bossLevel = true;
  game.player = createPlayer(game.save);
  const firstFloor = game.level.platforms.find(platform => platform.type === 'ground') || game.level.platforms[0];
  game.player.x = 68;
  game.player.y = firstFloor.y - game.player.h;
  game.player.grounded = true;
  game.enemies = game.level.enemies.map(item => createEnemy(item.x, item.y, item.type, item.healthScale * difficultyFactor()));
  const lockedWeapons = WEAPONS.filter(weapon => !game.save.unlockedWeapons.includes(weapon.id) && weapon.id !== 'fists');
  for (const pickup of game.level.pickups) {
    if (pickup.type === 'weapon') pickup.weaponId = lockedWeapons.length ? lockedWeapons[Math.floor(Math.random() * lockedWeapons.length)].id : null;
  }
  game.bossTemplate = game.level.bossLevel ? createBoss(world, 1 + game.level.difficulty * .10) : null;
  game.boss = null;
  game.bossSpawned = false;
  game.cameraX = 0;
  game.particles = [];
  game.floatTexts = [];
  game.projectiles = [];
  game.cameraShake = 0;
  game.levelReward = { score: 0, coins: 0 };
  game.state = 'playing';
  game.time = 0;
  game.waveLabel = mode === 'story' ? `LEVEL ${levelNumber}` : `WAVE ${game.wave}`;
  if (game.mode === 'bossrush') spawnBoss();
}

function difficultyFactor() {
  const multiplier = { easy: .78, normal: 1, hard: 1.28 }[game.save.settings.difficulty] || 1;
  return multiplier;
}

function spawnBoss() {
  if (game.bossSpawned || !game.bossTemplate) return;
  const boss = game.bossTemplate;
  const grounds = game.level.platforms.filter(p => p.type === 'ground');
  const platform = grounds.reduce((best, item) => Math.abs((item.x + item.w / 2) - game.level.bossX) < Math.abs((best.x + best.w / 2) - game.level.bossX) ? item : best, grounds[0] || game.level.platforms[0]);
  boss.x = Math.max(platform.x + 8, Math.min(platform.x + platform.w - boss.w - 8, game.level.bossX));
  boss.y = platform.y - boss.h;
  boss.facing = -1;
  game.boss = boss;
  game.bossSpawned = true;
  game.audio.play('boss');
  game.addFloatText('BOSS APPROACHING', 480, 150, '#ffd28b');
  game.cameraShake = 8;
}

function playerHit(amount, direction = -1, blocked = false) {
  const p = game.player;
  if (!p || p.invulnerable > 0 || p.dodgeTimer > 0) return;
  const reduction = Math.min(.5, game.save.upgrades.defense * .025);
  const finalDamage = Math.max(1, Math.round(amount * (1 - reduction) * (blocked ? .18 : 1)));
  p.health = Math.max(0, p.health - finalDamage);
  p.invulnerable = blocked ? .18 : .62;
  p.hurtTimer = blocked ? .05 : .18;
  p.vx = direction * (blocked ? 80 : 220);
  game.spawnImpact(p.x + p.w / 2, p.y + p.h / 2, blocked ? '#8edbd0' : '#f3777e', blocked ? 4 : 9);
  game.addFloatText(blocked ? 'BLOCK' : `-${finalDamage}`, p.x + p.w / 2, p.y - 10, blocked ? '#9fe3d6' : '#ff9b9e');
  game.audio.play('hurt');
  game.cameraShake = Math.max(game.cameraShake, blocked ? 2 : 5);
  if (p.health <= 0) gameOver();
}

function bossDamaged(damage, direction) {
  if (!game.boss || game.boss.dead) return false;
  const boss = game.boss;
  boss.hp = Math.max(0, boss.hp - damage);
  boss.hurt = .12;
  boss.hitFlash = .13;
  boss.vx = direction * 130;
  if (boss.hp <= 0) {
    boss.dead = true;
    boss.state = 'dead';
    game.save.achievements = addUnique(game.save.achievements, 'boss');
    incrementMission('bosses');
    game.player.score += 1000;
    game.runScore += 1000;
    game.addFloatText('BOSS DEFEATED', 480, 160, '#ffd27d');
    game.spawnImpact(boss.x + boss.w / 2, boss.y + boss.h / 2, boss.color, 36);
    game.audio.play('win');
    completeLevel(true);
    return true;
  }
  return false;
}
game.damageBoss = bossDamaged;

function onEnemyDefeated(enemy) {
  const p = game.player;
  p.enemiesDefeated++;
  p.score += 100;
  game.save.enemiesDefeated++;
  game.runScore += 100;
  const reward = enemy.type === 10 ? 12 : enemy.type === 9 ? 8 : 4 + Math.floor(Math.random() * 4);
  p.coins += reward;
  game.levelReward.coins += reward;
  game.addFloatText(`+${reward} COINS`, enemy.x, enemy.y - 6, '#f3d48b');
  incrementMission('defeats');
  checkAchievements();
  persist();
}
game.onEnemyDefeated = onEnemyDefeated;

function completeLevel(bossWasDefeated = false) {
  if (game.state !== 'playing') return;
  game.state = 'victory';
  const p = game.player;
  const cleanBonus = Math.max(0, Math.round(p.health / p.maxHealth * 35));
  const rewardCoins = 25 + game.level.world * 8 + Math.round(game.level.difficulty * 4) + cleanBonus;
  game.levelReward.coins += rewardCoins;
  game.levelReward.score += 500 + (bossWasDefeated ? 1200 : 0) + game.runScore;
  game.save.coins += p.coins + rewardCoins;
  game.save.score += game.levelReward.score;
  game.save.highScore = Math.max(game.save.highScore, game.save.score);
  if (game.mode === 'story') {
    const key = levelKey(game.level.world, game.level.level);
    if (!game.save.completedLevels.includes(key)) game.save.completedLevels.push(key);
    if (game.level.world < 7 && game.level.level >= 5) { game.save.world = game.level.world + 1; game.save.level = 1; }
    else if (game.level.world === 7 && game.level.level >= 5) { game.save.world = 7; game.save.level = game.level.level + 1; game.save.achievements = addUnique(game.save.achievements, 'ultimate'); }
    else { game.save.world = game.level.world; game.save.level = game.level.level + 1; }
  }
  game.save.achievements = addUnique(game.save.achievements, 'first');
  checkAchievements();
  incrementMission('levels');
  persist();
  game.runScore = 0;
  game.audio.play('win');
}

function gameOver() {
  if (game.state === 'gameover') return;
  game.state = 'gameover';
  game.save.highScore = Math.max(game.save.highScore, game.save.score + game.runScore);
  persist();
  game.audio.play('lose');
}

function checkAchievements() {
  const p = game.player;
  if (p && p.combo >= 5) {
    game.save.achievements = addUnique(game.save.achievements, 'combo');
    incrementMission('combos');
  }
  if (game.save.coins >= 500) game.save.achievements = addUnique(game.save.achievements, 'collector');
  if (game.save.unlockedWeapons.length >= 3) game.save.achievements = addUnique(game.save.achievements, 'weapon');
}
function addUnique(list, value) { return list.includes(value) ? list : [...list, value]; }

function nextLevel() {
  if (game.mode === 'story') startLevel(game.save.world, game.save.level, 'story');
  else if (game.mode === 'bossrush') {
    game.wave++;
    const world = (game.wave - 1) % 8;
    startLevel(world, game.wave * 5, 'bossrush');
  } else {
    game.wave++;
    const world = (game.save.world + game.wave - 1) % 8;
    const mode = game.mode;
    startLevel(world, game.wave, mode);
    game.waveLabel = `WAVE ${game.wave}`;
    if (mode === 'survival') game.player.maxHealth += 3;
  }
}

function togglePause() {
  if (game.state === 'playing') game.state = 'paused';
  else if (game.state === 'paused') { game.state = 'playing'; game.audio.resume(); }
}

function openPage(page) {
  game.fromPause = game.state === 'paused';
  game.menuPage = page;
  game.state = 'menu';
}

function handleUI(id) {
  game.audio.resume();
  game.audio.play('select');
  if (id.startsWith('mode:')) {
    const mode = id.split(':')[1];
    startGame(mode === 'continue' ? 'story' : mode);
  } else if (id.startsWith('page:')) {
    const page = id.split(':')[1];
    if (page === 'main') {
      if (game.fromPause) { game.state = 'paused'; game.fromPause = false; }
      else { game.menuPage = 'main'; game.state = 'menu'; }
    } else openPage(page);
  } else if (id === 'pause') togglePause();
  else if (id === 'resume') togglePause();
  else if (id === 'restart') { game.runScore = 0; startLevel(game.level.world, game.level.level, game.mode); }
  else if (id === 'to-menu') { game.state = 'menu'; game.menuPage = 'main'; game.fromPause = false; game.audio.resume(); }
  else if (id === 'next-level') nextLevel();
  else if (id.startsWith('character:')) {
    const character = CHARACTERS.find(item => item.id === id.split(':')[1]);
    if (!character) return;
    if (game.save.unlockedCharacters.includes(character.id)) game.save.character = character.id;
    else if (game.save.coins >= character.cost) { game.save.coins -= character.cost; game.save.unlockedCharacters.push(character.id); game.save.character = character.id; }
    persist();
  } else if (id.startsWith('weapon:')) {
    const weapon = WEAPONS.find(item => item.id === id.split(':')[1]);
    if (!weapon) return;
    if (game.save.unlockedWeapons.includes(weapon.id)) game.save.weapon = weapon.id;
    else {
      const currency = weapon.unlock === 'gems' ? 'gems' : 'coins';
      if (game.save[currency] >= weapon.cost) { game.save[currency] -= weapon.cost; game.save.unlockedWeapons.push(weapon.id); game.save.weapon = weapon.id; }
    }
    persist();
  } else if (id.startsWith('upgrade:')) {
    const key = id.split(':')[1], level = game.save.upgrades[key], cost = upgradeCost(key, level);
    if (level < 20 && game.save.coins >= cost) { game.save.coins -= cost; game.save.upgrades[key]++; persist(); }
  } else if (id.startsWith('setting:')) {
    const key = id.split(':')[1];
    if (key === 'music' || key === 'sound') game.save.settings[key] = !game.save.settings[key];
    else if (key === 'difficulty') game.save.settings.difficulty = ({ easy: 'normal', normal: 'hard', hard: 'easy' })[game.save.settings.difficulty];
    else if (key === 'volume-up') game.save.settings.volume = Math.min(1, game.save.settings.volume + .1);
    else if (key === 'volume-down') game.save.settings.volume = Math.max(0, game.save.settings.volume - .1);
    game.audio.setSettings(game.save.settings); persist();
  }
}

function update(dt) {
  game.elapsed += dt; game.time += dt;
  if (game.state !== 'playing') {
    updateEffects(dt);
    return;
  }
  if (game.mode === 'challenge') {
    game.challengeTime = Math.max(0, (game.challengeTime ?? 90) - dt);
    game.waveLabel = `${Math.ceil(game.challengeTime)} SECONDS LEFT`;
    if (game.challengeTime <= 0) { gameOver(); return; }
  }
  game.player.stats = CHARACTERS.find(c => c.id === game.save.character) || CHARACTERS[0];
  game.player.weapon = game.save.weapon;
  if (game.input.jumpPressed) game.audio.play(game.player.jumps ? 'doublejump' : 'jump');
  updatePlayer(game.player, game.input, game.level, dt, game.save);
  if (game.player.groundSlamPending && game.player.grounded) {
    const p = game.player;
    p.groundSlamPending = false;
    const radius = 145;
    for (const enemy of game.enemies) {
      if (enemy.dead || Math.abs((enemy.x + enemy.w / 2) - (p.x + p.w / 2)) > radius || Math.abs((enemy.y + enemy.h) - (p.y + p.h)) > 95) continue;
      const killed = damageEnemy(enemy, p.attackDamage, (enemy.x < p.x ? -1 : 1) * 330);
      if (killed) game.onEnemyDefeated(enemy);
      game.addFloatText(`-${Math.round(p.attackDamage)}`, enemy.x + enemy.w / 2, enemy.y - 8, '#d5c5ff');
      game.spawnImpact(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, '#a995ff', 15);
    }
    if (game.boss && !game.boss.dead && Math.abs((game.boss.x + game.boss.w / 2) - (p.x + p.w / 2)) < radius) game.damageBoss(p.attackDamage, p.facing);
    game.spawnImpact(p.x + p.w / 2, p.y + p.h, '#a995ff', 24);
    game.cameraShake = Math.max(game.cameraShake, 12);
    game.audio.play('heavy');
  }
  if (game.input.attackPressed) performAttack(game.player, 'light', game.save);
  if (game.input.heavyPressed && performAttack(game.player, 'heavy', game.save)) game.audio.play('heavy');
  if (game.input.specialPressed) {
    if (performAttack(game.player, 'special', game.save)) { game.audio.play('heavy'); game.cameraShake = 7; }
    else game.addFloatText('NOT ENOUGH ENERGY', game.player.x, game.player.y - 14, '#a7b7ff');
  }
  game.input.jumpPressed = game.input.attackPressed = game.input.heavyPressed = game.input.specialPressed = game.input.dodgePressed = false;

  updateEnemies(game.enemies, game.player, game.level.platforms, dt, {
    playerHit,
    projectile: data => game.projectiles.push(data),
  });
  if (game.level.bossLevel && !game.bossSpawned && game.player.x > game.level.bossX - 560) spawnBoss();
  if (game.boss && !game.boss.dead) {
    updateBoss(game.boss, game.player, dt, {
      playerHit,
      projectile: data => game.projectiles.push(data),
      shockwave: (x, y, heavy) => {
        game.shockwaves = game.shockwaves || [];
        game.shockwaves.push({ x, y, r: 8, max: heavy ? 120 : 70, life: .35, damage: game.boss.damage * .6, hit: false });
      },
      maxX: game.level.length - 100,
    });
  }
  updateCombat(game, dt);
  updateProjectiles(dt);
  updateShockwaves(dt);
  collectItems();
  updateTraps(dt);
  updateEffects(dt);
  game.enemies = game.enemies.filter(enemy => !enemy.dead || enemy.deathTimer > 0);

  const targetCamera = Math.max(0, Math.min(game.level.length - W, game.player.x - 365));
  game.cameraX += (targetCamera - game.cameraX) * Math.min(1, dt * 6);
  game.cameraShake = Math.max(0, game.cameraShake - dt * 22);

  if (game.mode === 'story') {
    if (!game.level.bossLevel && game.player.x >= game.level.exitX) completeLevel(false);
  } else if (game.player.x >= game.level.exitX && (!game.boss || game.boss.dead)) {
    completeLevel(Boolean(game.boss));
  }
  if (game.player.health <= 0) gameOver();
  if (game.elapsed - game.lastSave > 8) { persist(); game.lastSave = game.elapsed; }
}

function updateProjectiles(dt) {
  for (const projectile of game.projectiles) {
    projectile.x += projectile.vx * dt;
    projectile.life = (projectile.life ?? 3) - dt;
    if (projectile.from === 'enemy' || projectile.from === 'boss') {
      const p = game.player;
      if (projectile.life > 0 && overlaps({ x: projectile.x - 9, y: projectile.y - 9, w: 18, h: 18 }, { x: p.x, y: p.y, w: p.w, h: p.h })) {
        playerHit(projectile.damage, projectile.vx > 0 ? 1 : -1, p.block && p.facing === (projectile.vx > 0 ? -1 : 1));
        projectile.life = 0;
      }
    }
  }
  game.projectiles = game.projectiles.filter(p => p.life > 0 && p.x > game.cameraX - 100 && p.x < game.cameraX + W + 100);
}
function updateShockwaves(dt) {
  if (!game.shockwaves) return;
  for (const wave of game.shockwaves) {
    wave.r += 340 * dt; wave.life -= dt;
    const p = game.player;
    if (!wave.hit && Math.abs((p.x + p.w / 2) - wave.x) < wave.r + 18 && Math.abs((p.y + p.h) - wave.y) < 60) {
      playerHit(wave.damage, wave.x < p.x ? 1 : -1, false); wave.hit = true;
    }
  }
  game.shockwaves = game.shockwaves.filter(w => w.life > 0 && w.r < w.max + 60);
}
function collectItems() {
  const p = game.player;
  for (const coin of game.level.coins) {
    if (coin.taken || !overlaps({ x: p.x, y: p.y, w: p.w, h: p.h }, { x: coin.x - 11, y: coin.y - 11, w: 22, h: 22 })) continue;
    coin.taken = true;
    if (coin.type === 'gem') { game.save.gems++; game.audio.play('gem'); game.addFloatText('+1 GEM', coin.x, coin.y, '#bfaaff'); }
    else { p.coins++; game.levelReward.coins++; game.audio.play('coin'); game.addFloatText('+1', coin.x, coin.y, '#f4d58e'); incrementMission('coins'); }
    game.runScore += coin.type === 'gem' ? 50 : 10;
  }
  for (const pickup of game.level.pickups) {
    if (pickup.taken || !overlaps({ x: p.x, y: p.y, w: p.w, h: p.h }, { x: pickup.x - 13, y: pickup.y - 13, w: 26, h: 26 })) continue;
    pickup.taken = true;
    if (pickup.type === 'health') { p.health = Math.min(p.maxHealth, p.health + 28); game.addFloatText('+HEALTH', pickup.x, pickup.y, '#90edb1'); }
    else if (pickup.type === 'energy') { p.energy = Math.min(p.maxEnergy, p.energy + 40); game.addFloatText('+ENERGY', pickup.x, pickup.y, '#9cc2ff'); }
    else if (pickup.type === 'weapon') {
      const weapon = WEAPONS.find(item => item.id === pickup.weaponId);
      if (weapon && !game.save.unlockedWeapons.includes(weapon.id)) {
        game.save.unlockedWeapons.push(weapon.id); game.save.weapon = weapon.id; p.weapon = weapon.id;
        game.addFloatText(`NEW WEAPON: ${weapon.name}`, pickup.x, pickup.y, '#f4d58e');
        game.save.achievements = addUnique(game.save.achievements, 'weapon'); persist();
      } else { p.coins += 50; game.levelReward.coins += 50; game.addFloatText('+50 COINS', pickup.x, pickup.y, '#f4d58e'); }
    }
  }
}
function updateTraps(dt) {
  const p = game.player;
  for (const trap of game.level.traps) {
    if (!trap.active) continue;
    trap.clock = (trap.clock || 0) + dt;
    const active = trap.type !== 'laser' || Math.floor(trap.clock * 1.5) % 2 === 0;
    if (active && overlaps({ x: p.x + 4, y: p.y + p.h - 20, w: p.w - 8, h: 20 }, trap) && p.invulnerable <= 0) playerHit(12 + game.level.difficulty, trap.x < p.x ? 1 : -1, false);
  }
}
function updateEffects(dt) {
  for (const part of game.particles) {
    part.x += part.vx * dt; part.y += part.vy * dt; part.vy += 180 * dt; part.life -= dt;
  }
  game.particles = game.particles.filter(p => p.life > 0);
  for (const item of game.floatTexts) { item.y -= 26 * dt; item.life -= dt; }
  game.floatTexts = game.floatTexts.filter(item => item.life > 0);
}

function draw() {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  if (game.state === 'menu') {
    drawUI(ctx, game);
    ctx.restore();
    return;
  }
  const shakeX = game.cameraShake > 0 ? (Math.random() - .5) * game.cameraShake : 0;
  const shakeY = game.cameraShake > 0 ? (Math.random() - .5) * game.cameraShake * .45 : 0;
  ctx.translate(shakeX, shakeY);
  drawBackground();
  drawWorld();
  drawEffects();
  drawUI(ctx, game);
  ctx.restore();
}

function drawBackground() {
  const world = getWorld(game.level.world);
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, world.sky[0]); gradient.addColorStop(.65, world.sky[1]); gradient.addColorStop(1, world.ground);
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
  // Atmospheric light and parallax silhouettes.
  ctx.fillStyle = `${world.accent}22`; ctx.beginPath(); ctx.arc(760 - game.cameraX * .05, 118, 67, 0, Math.PI * 2); ctx.fill();
  const farOffset = -(game.cameraX * .2 % 480);
  for (let i = -1; i < 4; i++) {
    const x = i * 480 + farOffset;
    if (game.level.world === 1) {
      ctx.fillStyle = '#0a211f99';
      for (let t = 0; t < 5; t++) {
        const tx = x + t * 104 + 34, height = 150 + (t * 29 % 120);
        ctx.fillRect(tx - 7, 360 - height, 14, height + 70);
        ctx.beginPath(); ctx.moveTo(tx - 62, 330 - height * .45); ctx.lineTo(tx, 190 - height); ctx.lineTo(tx + 65, 330 - height * .45); ctx.fill();
      }
    } else if (game.level.world === 4) {
      ctx.fillStyle = '#dae9ee55'; ctx.beginPath(); ctx.moveTo(x, 420); ctx.lineTo(x + 140, 160); ctx.lineTo(x + 230, 325); ctx.lineTo(x + 345, 120); ctx.lineTo(x + 480, 420); ctx.fill();
    } else if (game.level.world === 3) {
      ctx.fillStyle = '#9a633c55'; ctx.beginPath(); ctx.moveTo(x, 420); ctx.lineTo(x + 115, 220); ctx.lineTo(x + 205, 420); ctx.lineTo(x + 280, 245); ctx.lineTo(x + 480, 420); ctx.fill();
    } else {
      ctx.fillStyle = '#07172255';
      for (let b = 0; b < 4; b++) {
        const bx = x + b * 130, bh = 105 + (b * 43 % 115);
        ctx.fillRect(bx, 425 - bh, 92, bh);
        ctx.fillStyle = '#d1bf8a22'; for (let r = 0; r < 3; r++) ctx.fillRect(bx + 18, 350 - bh + r * 28, 8, 11);
        ctx.fillStyle = '#07172255';
      }
    }
  }
  // Foreground low mist.
  ctx.fillStyle = '#c5e2d50a'; ctx.fillRect(0, 400, W, 90);
}

function drawWorld() {
  const world = getWorld(game.level.world);
  // Platforms.
  for (const platform of game.level.platforms) {
    const x = platform.x - game.cameraX;
    if (x + platform.w < -20 || x > W + 20) continue;
    if (platform.type === 'ground') {
      ctx.fillStyle = world.ground; ctx.fillRect(x, platform.y, platform.w, 110);
      ctx.fillStyle = world.accent; ctx.fillRect(x, platform.y, platform.w, 5);
      ctx.fillStyle = '#06121b33';
      for (let brick = 0; brick < platform.w; brick += 44) ctx.fillRect(x + brick + 4, platform.y + 18, 27, 3);
    } else {
      ctx.fillStyle = '#172b37'; ctx.fillRect(x, platform.y, platform.w, 17);
      ctx.fillStyle = world.accent; ctx.fillRect(x, platform.y, platform.w, 3);
      ctx.fillStyle = '#08111a'; ctx.fillRect(x + 6, platform.y + 17, 5, 14);
      ctx.fillRect(x + platform.w - 11, platform.y + 17, 5, 14);
    }
  }
  // Exit beacon.
  const exitX = game.level.exitX - game.cameraX;
  if (exitX > -30 && exitX < W + 30) {
    ctx.fillStyle = '#d8e8d5'; ctx.fillRect(exitX, 330, 5, 122);
    ctx.fillStyle = '#4ce0bd'; ctx.beginPath(); ctx.moveTo(exitX + 5, 333); ctx.lineTo(exitX + 47, 345); ctx.lineTo(exitX + 5, 360); ctx.fill();
  }
  // Coins and collectibles.
  for (const coin of game.level.coins) {
    if (coin.taken) continue;
    const x = coin.x - game.cameraX, bob = Math.sin(game.time * 5 + coin.x) * 3;
    ctx.save(); ctx.translate(x, coin.y + bob); ctx.rotate(Math.sin(game.time * 5 + coin.x) * .2);
    ctx.fillStyle = coin.type === 'gem' ? '#a997ff' : '#e9ba5d'; ctx.beginPath(); ctx.ellipse(0, 0, coin.type === 'gem' ? 8 : 7, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = coin.type === 'gem' ? '#e0d5ff' : '#fff1ab'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff8dd'; ctx.fillRect(-1, -5, 2, 9); ctx.restore();
  }
  for (const pickup of game.level.pickups) {
    if (pickup.taken) continue;
    const x = pickup.x - game.cameraX, pulse = 1 + Math.sin(game.time * 6 + x) * .09;
    ctx.save(); ctx.translate(x, pickup.y); ctx.scale(pulse, pulse);
    ctx.fillStyle = pickup.type === 'health' ? '#4dba73' : '#4a7fcb'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; if (pickup.type === 'health') { ctx.fillRect(-2, -7, 4, 14); ctx.fillRect(-7, -2, 14, 4); } else { ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(7, 1); ctx.lineTo(0, 8); ctx.lineTo(-7, 1); ctx.fill(); }
    ctx.restore();
  }
  for (const trap of game.level.traps) {
    const x = trap.x - game.cameraX; if (x + trap.w < 0 || x > W) continue;
    ctx.fillStyle = trap.type === 'laser' && Math.floor((trap.clock || 0) * 1.5) % 2 !== 0 ? '#596a78' : world.hazard;
    if (trap.type === 'spikes') {
      for (let i = 0; i < trap.w; i += 14) { ctx.beginPath(); ctx.moveTo(x + i, trap.y + trap.h); ctx.lineTo(x + i + 7, trap.y - 7); ctx.lineTo(x + i + 14, trap.y + trap.h); ctx.fill(); }
    } else { ctx.fillRect(x, trap.y, trap.w, trap.h); ctx.fillStyle = '#fff6'; ctx.fillRect(x, trap.y, trap.w, 3); }
  }
  for (const object of game.level.objects || []) {
    if (object.destroyed) continue;
    const ox = object.x - game.cameraX;
    if (ox + object.w < 0 || ox > W) continue;
    if (object.type === 'barrel') {
      ctx.fillStyle = '#7f4b36'; ctx.beginPath(); ctx.roundRect(ox, object.y, object.w, object.h, 7); ctx.fill();
      ctx.fillStyle = '#d09a62'; ctx.fillRect(ox + 2, object.y + 8, object.w - 4, 4); ctx.fillRect(ox + 2, object.y + 27, object.w - 4, 4);
    } else {
      ctx.fillStyle = '#8b6848'; ctx.fillRect(ox, object.y, object.w, object.h);
      ctx.strokeStyle = '#d0a66a'; ctx.lineWidth = 3; ctx.strokeRect(ox + 3, object.y + 3, object.w - 6, object.h - 6);
      ctx.beginPath(); ctx.moveTo(ox + 4, object.y + 4); ctx.lineTo(ox + object.w - 4, object.y + object.h - 4); ctx.moveTo(ox + object.w - 4, object.y + 4); ctx.lineTo(ox + 4, object.y + object.h - 4); ctx.stroke();
    }
  }
  for (const enemy of game.enemies) drawEnemy(ctx, enemy, game.cameraX);
  if (game.boss) drawBoss(ctx, game.boss, game.cameraX);
  for (const projectile of game.projectiles) {
    ctx.fillStyle = projectile.color || '#f28f76'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(projectile.x - game.cameraX, projectile.y, 8, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  }
  if (game.shockwaves) for (const wave of game.shockwaves) {
    ctx.strokeStyle = '#f8bd79'; ctx.globalAlpha = Math.max(.1, wave.life / .35); ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(wave.x - game.cameraX, wave.y, wave.r, 12, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
  }
  drawPlayer(ctx, game.player, game.cameraX, game.time);
}

function drawEffects() {
  for (const part of game.particles) {
    ctx.globalAlpha = Math.max(0, part.life / part.maxLife);
    ctx.fillStyle = part.color; ctx.beginPath(); ctx.arc(part.x - game.cameraX, part.y, part.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const item of game.floatTexts) {
    ctx.globalAlpha = Math.max(0, item.life / item.maxLife); ctx.font = '800 13px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = item.color;
    ctx.fillText(item.text, item.x - game.cameraX, item.y);
  }
  ctx.globalAlpha = 1;
}

function spawnImpact(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2, speed = 60 + Math.random() * 210;
    const life = .2 + Math.random() * .4;
    game.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, color, size: 1.5 + Math.random() * 3.5, life, maxLife: life });
  }
}
function addFloatText(value, x, y, color = '#f3f7ed') {
  const life = .85;
  game.floatTexts.push({ text: value, x, y, color, life, maxLife: life });
}
game.spawnImpact = spawnImpact;
game.addFloatText = addFloatText;

function overlaps(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

// Canvas menu and HUD buttons are drawn at the logical 960 × 540 resolution.
canvas.addEventListener('pointerdown', event => {
  if (game.state !== 'menu' && game.state !== 'paused' && game.state !== 'victory' && game.state !== 'gameover') return;
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * W / rect.width;
  const y = (event.clientY - rect.top) * H / rect.height;
  const button = [...game.uiButtons].reverse().find(item => x >= item.x && x <= item.x + item.w && y >= item.y && y <= item.y + item.h);
  if (button) handleUI(button.id);
});
canvas.addEventListener('pointerdown', () => canvas.focus());

const keyMap = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', KeyJ: 'attack', KeyK: 'heavy', KeyL: 'special',
  ShiftLeft: 'dodge', ShiftRight: 'dodge', ArrowDown: 'crouch', KeyS: 'crouch', KeyB: 'block',
};
function pressControl(control) {
  if (control === 'jump') game.input.jumpPressed = true;
  else if (control === 'attack') game.input.attackPressed = true;
  else if (control === 'heavy') game.input.heavyPressed = true;
  else if (control === 'special') game.input.specialPressed = true;
  else if (control === 'dodge') game.input.dodgePressed = true;
  else game.input[control] = true;
}
function releaseControl(control) {
  if (control === 'left' || control === 'right' || control === 'crouch' || control === 'block') game.input[control] = false;
}
window.addEventListener('keydown', event => {
  const control = keyMap[event.code];
  if (control) { event.preventDefault(); if (!event.repeat) pressControl(control); }
  if (event.code === 'Escape' || event.code === 'KeyP') { event.preventDefault(); if (game.state === 'playing' || game.state === 'paused') togglePause(); }
  if ((event.code === 'Enter' || event.code === 'Space') && game.state === 'menu' && game.menuPage === 'main') { event.preventDefault(); if (!event.repeat) startGame('story'); }
});
window.addEventListener('keyup', event => { const control = keyMap[event.code]; if (control) releaseControl(control); });
window.addEventListener('blur', () => { game.input.left = game.input.right = game.input.crouch = game.input.block = false; if (game.state === 'playing') game.state = 'paused'; });

for (const button of document.querySelectorAll('[data-control]')) {
  const control = button.dataset.control;
  button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture?.(event.pointerId); game.audio.resume(); pressControl(control); });
  button.addEventListener('pointerup', event => { event.preventDefault(); releaseControl(control); });
  button.addEventListener('pointercancel', () => releaseControl(control));
  button.addEventListener('lostpointercapture', () => releaseControl(control));
}
document.querySelector('#fullscreenBtn').addEventListener('click', async () => {
  const shell = document.querySelector('#app');
  try {
    if (!document.fullscreenElement) await shell.requestFullscreen?.();
    else await document.exitFullscreen?.();
  } catch (error) { console.warn('Fullscreen is unavailable in this browser.', error); }
});

let previous = performance.now();
function frame(now) {
  const dt = Math.min(.033, Math.max(.001, (now - previous) / 1000));
  previous = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

ensureMissions();
game.audio.setSettings(game.save.settings);
requestAnimationFrame(frame);
