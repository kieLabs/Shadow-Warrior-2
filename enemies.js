const ENEMY_TYPES = [
  { name: 'Rogue', hp: 34, speed: 74, damage: 8, range: 54, color: '#b75f56', armor: '#482b36', behavior: 'rush' },
  { name: 'Runner', hp: 26, speed: 132, damage: 6, range: 42, color: '#d1a35f', armor: '#59432e', behavior: 'rush' },
  { name: 'Brute', hp: 82, speed: 45, damage: 16, range: 68, color: '#8c7161', armor: '#37353b', behavior: 'heavy' },
  { name: 'Shield Guard', hp: 64, speed: 55, damage: 10, range: 58, color: '#7796a5', armor: '#263e55', behavior: 'guard' },
  { name: 'Blade Rogue', hp: 45, speed: 82, damage: 12, range: 72, color: '#9c8abd', armor: '#352e53', behavior: 'blade' },
  { name: 'Ninja', hp: 42, speed: 108, damage: 11, range: 58, color: '#697d9d', armor: '#182338', behavior: 'ninja' },
  { name: 'Wisp', hp: 34, speed: 88, damage: 9, range: 190, color: '#79bca8', armor: '#214b48', behavior: 'fly' },
  { name: 'Ranger', hp: 40, speed: 48, damage: 10, range: 220, color: '#c5a16f', armor: '#4c4233', behavior: 'ranged' },
  { name: 'Bomber', hp: 38, speed: 58, damage: 18, range: 75, color: '#c67655', armor: '#4c2b29', behavior: 'bomb' },
  { name: 'Elite', hp: 104, speed: 92, damage: 16, range: 78, color: '#bb6e9c', armor: '#4c244e', behavior: 'elite' },
  { name: 'Sentinel', hp: 132, speed: 60, damage: 19, range: 82, color: '#b7a36e', armor: '#39414b', behavior: 'elite' },
];

export function createEnemy(x, y, type = 0, difficulty = 1) {
  const spec = ENEMY_TYPES[type] || ENEMY_TYPES[0];
  return {
    x, y, w: spec.behavior === 'heavy' ? 54 : 42, h: spec.behavior === 'heavy' ? 88 : 74,
    type, spec, hp: Math.round(spec.hp * difficulty), maxHp: Math.round(spec.hp * difficulty),
    speed: spec.speed * (1 + difficulty * .018), damage: spec.damage * (1 + difficulty * .08),
    vx: 0, vy: 0, facing: -1, state: 'patrol', timer: 0, attackTimer: .3 + Math.random() * .4,
    hurt: 0, stun: 0, dead: false, hitFlash: 0, phase: Math.random() * 6, scored: false,
    patrolOrigin: x, patrolRange: 75 + Math.random() * 70, projectileClock: 0,
  };
}

export function updateEnemies(enemies, player, platforms, dt, callbacks = {}) {
  for (const enemy of enemies) {
    if (enemy.dead) {
      enemy.deathTimer = Math.max(0, (enemy.deathTimer || 0) - dt);
      enemy.vy = (enemy.vy || 0) + 500 * dt;
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      continue;
    }
    enemy.phase += dt * 5;
    enemy.hurt = Math.max(0, enemy.hurt - dt);
    enemy.stun = Math.max(0, enemy.stun - dt);
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.attackTimer = Math.max(0, enemy.attackTimer - dt);
    enemy.projectileClock = Math.max(0, enemy.projectileClock - dt);
    if (enemy.hurt > 0 || enemy.stun > 0) { enemy.x += enemy.vx * dt; enemy.vx *= Math.pow(.05, dt); continue; }
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.abs(dx);
    enemy.facing = dx < 0 ? -1 : 1;
    const detection = enemy.spec.behavior === 'ranged' || enemy.spec.behavior === 'fly' ? 340 : 280;
    if (dist < detection && Math.abs(dy) < 160) enemy.state = 'chase';
    else enemy.state = 'patrol';
    const behavior = enemy.spec.behavior;
    if (enemy.state === 'patrol') {
      const patrolDirection = Math.sin(enemy.phase * .35) > 0 ? 1 : -1;
      enemy.vx = patrolDirection * enemy.speed * .32;
      if (Math.abs(enemy.x - enemy.patrolOrigin) > enemy.patrolRange) enemy.patrolOrigin = enemy.x;
    } else {
      const stopDistance = behavior === 'ranged' ? 150 : behavior === 'fly' ? 130 : enemy.spec.range * .62;
      if (dist > stopDistance) enemy.vx = Math.sign(dx) * enemy.speed;
      else enemy.vx *= Math.pow(.04, dt);
      if (behavior === 'fly') enemy.y += Math.sin(enemy.phase * .55) * 19 * dt;
      if ((behavior === 'ninja' || behavior === 'elite') && dist < 180 && Math.random() < .008) enemy.vx = -Math.sign(dx) * enemy.speed * 1.8;
      if (dist < enemy.spec.range && Math.abs(dy) < 70 && enemy.attackTimer <= 0) {
        enemy.state = 'attack';
        enemy.attackTimer = behavior === 'heavy' ? 1.45 : behavior === 'ranged' ? 1.7 : .95;
        if (behavior === 'ranged' || behavior === 'fly') {
          callbacks.projectile?.({ x: enemy.x + enemy.w / 2, y: enemy.y + 30, vx: enemy.facing * 260, damage: enemy.damage, color: enemy.spec.color, from: 'enemy' });
        } else if (dist < enemy.spec.range + 12 && player.invulnerable <= 0) {
          const blocked = player.block && player.facing === -enemy.facing;
          callbacks.playerHit?.(blocked ? enemy.damage * .18 : enemy.damage, enemy.facing, blocked);
        }
      }
    }
    enemy.x += enemy.vx * dt;
    const ground = platforms.find(platform => enemy.x + enemy.w > platform.x && enemy.x < platform.x + platform.w && Math.abs(enemy.y + enemy.h - platform.y) < 20);
    if (ground && behavior !== 'fly') enemy.y = ground.y - enemy.h;
  }
}

export function drawEnemy(ctx, enemy, cameraX) {
  if (enemy.dead && enemy.deathTimer <= 0) return;
  const x = enemy.x - cameraX;
  const y = enemy.y;
  const s = enemy.spec;
  const run = Math.sin(enemy.phase) * (enemy.state === 'chase' ? 8 : 2);
  ctx.save();
  if (enemy.dead) { ctx.globalAlpha = Math.max(0, enemy.deathTimer / .38); ctx.rotate(enemy.facing * (1 - enemy.deathTimer / .38) * .9); }
  ctx.translate(x + enemy.w / 2, y + enemy.h / 2); ctx.scale(enemy.facing, 1);
  if (s.behavior === 'fly') { ctx.translate(0, Math.sin(enemy.phase * .4) * 5); }
  ctx.fillStyle = '#07101888'; ctx.beginPath(); ctx.ellipse(0, enemy.h / 2, enemy.w * .65, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = s.armor; ctx.lineWidth = s.behavior === 'heavy' ? 12 : 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-7, 14); ctx.lineTo(-8 + run, 30); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8, 14); ctx.lineTo(8 - run, 30); ctx.stroke();
  ctx.fillStyle = s.color; ctx.beginPath(); ctx.roundRect(-17, -19, 34, 38, 8); ctx.fill();
  ctx.fillStyle = s.armor; ctx.beginPath(); ctx.roundRect(-20, -13, 40, 15, 5); ctx.fill();
  ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(0, -29, s.behavior === 'heavy' ? 15 : 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = s.armor; ctx.beginPath(); ctx.arc(0, -33, 14, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f4d6a0'; ctx.fillRect(5, -29, 4, 3);
  ctx.strokeStyle = s.armor; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(-13, -9); ctx.lineTo(-25, 3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(13, -9); ctx.lineTo(23, 3); ctx.stroke();
  if (s.behavior === 'guard') {
    ctx.fillStyle = '#78909a'; ctx.beginPath(); ctx.roundRect(19, -19, 14, 37, 4); ctx.fill();
    ctx.strokeStyle = '#d2e1df'; ctx.lineWidth = 2; ctx.strokeRect(22, -13, 8, 25);
  } else if (['blade', 'ninja', 'elite'].includes(s.behavior)) {
    ctx.strokeStyle = '#d4e7ec'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(22, 4); ctx.lineTo(42, -20); ctx.stroke();
  }
  if (enemy.state === 'attack') { ctx.strokeStyle = '#ffb16e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(20, -2, 17, -.9, .8); ctx.stroke(); }
  if (enemy.hitFlash > 0) { ctx.globalAlpha = .6; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, -10, 25, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  if (enemy.hp < enemy.maxHp) {
    ctx.fillStyle = '#151a20'; ctx.fillRect(x - 2, y - 12, enemy.w + 4, 5);
    ctx.fillStyle = '#ef6970'; ctx.fillRect(x - 2, y - 12, (enemy.w + 4) * Math.max(0, enemy.hp / enemy.maxHp), 5);
  }
}

export function damageEnemy(enemy, amount, knockback = 180) {
  if (!enemy || enemy.dead) return false;
  const dealt = Math.max(1, amount);
  enemy.hp -= dealt;
  enemy.hurt = .12;
  enemy.hitFlash = .12;
  enemy.stun = Math.max(enemy.stun, .1);
  enemy.vx = knockback;
  if (enemy.hp <= 0) { enemy.hp = 0; enemy.dead = true; enemy.state = 'dead'; enemy.deathTimer = .38; enemy.vy = -155; return true; }
  return false;
}
