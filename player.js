import { getCharacter, getWeapon } from './weapons.js';
import { findLandingPlatform } from './levels.js';

export function createPlayer(save) {
  const character = getCharacter(save.character);
  const healthBonus = save.upgrades.health * 10;
  return {
    x: 70, y: 300, w: 42, h: 86, vx: 0, vy: 0, facing: 1,
    grounded: false, jumps: 0, health: character.hp + healthBonus, maxHealth: character.hp + healthBonus,
    energy: 100 + save.upgrades.energy * 8, maxEnergy: 100 + save.upgrades.energy * 8,
    invulnerable: 0, attackCooldown: 0, attackTimer: 0, attackKind: '', combo: 0, comboClock: 0,
    hurtTimer: 0, dodgeTimer: 0, block: false, crouch: false, sliding: false, groundSlamPending: false, animTime: 0,
    score: 0, coins: 0, enemiesDefeated: 0, weapon: save.weapon,
    characterId: save.character, stats: character,
  };
}

export function updatePlayer(player, input, level, dt, save) {
  player.animTime += dt;
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  player.attackCooldown = Math.max(0, player.attackCooldown - dt);
  player.attackTimer = Math.max(0, player.attackTimer - dt);
  player.comboClock = Math.max(0, player.comboClock - dt);
  player.hurtTimer = Math.max(0, player.hurtTimer - dt);
  player.dodgeTimer = Math.max(0, player.dodgeTimer - dt);
  player.block = Boolean(input.block && player.grounded && player.attackTimer <= 0 && player.dodgeTimer <= 0);
  player.crouch = Boolean(input.crouch && player.grounded && !player.block);
  player.sliding = Boolean(player.crouch && Math.abs(player.vx) > 135);

  const baseSpeed = 245 * player.stats.speed * (1 + save.upgrades.speed * .035);
  const controlLock = player.hurtTimer > 0 ? .38 : 1;
  if (player.dodgeTimer > 0) {
    player.vx = player.facing * 540;
  } else if (!player.block && player.attackTimer <= 0) {
    const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (direction) player.facing = direction;
    const target = direction * baseSpeed * controlLock * (player.sliding ? 1.08 : player.crouch ? .45 : 1);
    player.vx += (target - player.vx) * Math.min(1, dt * (player.grounded ? 13 : 5));
  } else {
    player.vx *= Math.pow(.03, dt);
  }
  player.sliding = Boolean(player.crouch && Math.abs(player.vx) > 135);

  if (input.jumpPressed && player.dodgeTimer <= 0 && !player.block) {
    if (player.grounded) {
      player.vy = -650 - save.upgrades.speed * 2;
      player.grounded = false;
      player.jumps = 1;
      player.jumpFlash = .15;
    } else if (player.jumps < 2) {
      player.vy = -590;
      player.jumps = 2;
      player.jumpFlash = .2;
      player.doubleJumpFlash = .28;
    }
  }
  player.jumpFlash = Math.max(0, (player.jumpFlash || 0) - dt);
  player.doubleJumpFlash = Math.max(0, (player.doubleJumpFlash || 0) - dt);

  if (input.dodgePressed && player.dodgeTimer <= 0 && player.energy >= 12) {
    player.dodgeTimer = .22;
    player.invulnerable = Math.max(player.invulnerable, .28);
    player.energy -= 12;
  }

  player.vy += 1700 * dt;
  const previousBottom = player.y + player.h;
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  const nextBottom = player.y + player.h;
  const landing = findLandingPlatform(level.platforms, previousBottom, nextBottom, player.x, player.x + player.w, player.vy);
  if (landing) {
    player.y = landing.y - player.h;
    player.vy = 0;
    player.grounded = true;
    player.jumps = 0;
  } else {
    player.grounded = false;
  }
  if (player.y > 800) {
    player.health = 0;
  }
  player.x = Math.max(0, Math.min(level.length - player.w, player.x));
  player.energy = Math.min(player.maxEnergy, player.energy + (player.grounded ? 7 : 3) * dt);
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
}

export function drawPlayer(ctx, player, cameraX, now = 0) {
  const x = player.x - cameraX;
  const y = player.y;
  const palette = player.stats.colors;
  const moving = Math.abs(player.vx) > 24 && player.grounded;
  const run = moving ? Math.sin(player.animTime * 14) : 0;
  const idle = Math.sin(player.animTime * 3.2) * 1.5;
  const attacking = player.attackTimer > 0;
  const kickPose = attacking && player.attackKind === 'light' && player.combo % 2 === 0;
  ctx.save();
  ctx.translate(x + player.w / 2, y + player.h / 2 + idle);
  ctx.scale(player.facing, 1);
  if (player.invulnerable > 0 && Math.floor(now * 22) % 2 === 0) ctx.globalAlpha = .48;
  if (player.dodgeTimer > 0) ctx.rotate(-.28);
  if (player.crouch) ctx.translate(0, player.sliding ? 22 : 15);
  if (player.sliding) ctx.rotate(-.12);

  // Ground shadow and animated booted legs.
  ctx.fillStyle = '#06101888'; ctx.beginPath(); ctx.ellipse(0, 44, 26, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#111b28'; ctx.lineWidth = 10; ctx.lineCap = 'round';
  const legSwing = moving ? run * 13 : 0;
  ctx.beginPath(); ctx.moveTo(-7, 20); ctx.lineTo(-9 + legSwing, 35); ctx.lineTo(-12 + legSwing, 41); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8, 20); ctx.lineTo(kickPose ? 27 : 9 - legSwing, kickPose ? -1 : 35); ctx.lineTo(kickPose ? 43 : 13 - legSwing, kickPose ? -5 : 41); ctx.stroke();
  ctx.fillStyle = '#d4e1df'; roundedRect(ctx, -22 + legSwing, 36, 16, 8, 3); roundedRect(ctx, kickPose ? 36 : 5 - legSwing, kickPose ? -9 : 36, 17, 8, 3);
  ctx.fillStyle = palette[1]; roundedRect(ctx, -16, 4, 31, 26, 8);
  ctx.fillStyle = palette[0]; roundedRect(ctx, -19, -18, 38, 34, 9);
  ctx.fillStyle = '#0c1722'; roundedRect(ctx, -18, -15, 36, 8, 4);
  ctx.fillStyle = palette[1]; ctx.beginPath(); ctx.moveTo(-17, -5); ctx.lineTo(-25, 4); ctx.lineTo(-12, 11); ctx.lineTo(-5, 0); ctx.fill();
  ctx.fillStyle = '#e9b994'; ctx.beginPath(); ctx.arc(0, -29, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = palette[0]; ctx.beginPath(); ctx.arc(-1, -33, 16, Math.PI, Math.PI * 2); ctx.lineTo(14, -26); ctx.lineTo(5, -25); ctx.fill();
  // Face, eye, scarf and details.
  ctx.fillStyle = '#172632'; ctx.fillRect(5, -30, 3.5, 2.3);
  ctx.fillStyle = palette[1]; ctx.beginPath(); ctx.moveTo(-9, -17); ctx.lineTo(12, -15); ctx.lineTo(22, -4); ctx.lineTo(5, -7); ctx.fill();
  ctx.fillStyle = '#d8e2da'; ctx.fillRect(-10, -1, 20, 3);
  // Arms follow attack pose.
  const swing = attacking ? (player.attackKind === 'heavy' ? -25 : -37) : run * 8;
  ctx.strokeStyle = palette[0]; ctx.lineWidth = 11;
  ctx.beginPath(); ctx.moveTo(-13, -10); ctx.lineTo(-20 + swing * .18, 4); ctx.lineTo(5 + swing, -4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(14, -9); ctx.lineTo(24, 2 + run * 4); ctx.lineTo(30 + (attacking ? 13 : 0), 4); ctx.stroke();
  ctx.fillStyle = '#e6c2a1'; ctx.beginPath(); ctx.arc(30 + (attacking ? 13 : 0), 4, 6, 0, Math.PI * 2); ctx.fill();

  const weapon = getWeapon(player.weapon);
  if (player.weapon !== 'fists') {
    ctx.save(); ctx.translate(32 + (attacking ? 12 : 0), 3); ctx.rotate(attacking ? -.9 : -.18);
    ctx.strokeStyle = weapon.color; ctx.lineWidth = player.weapon === 'hammer' ? 9 : 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -45); ctx.stroke();
    if (player.weapon === 'hammer') { ctx.fillStyle = '#aebdca'; roundedRect(ctx, -12, -53, 24, 13, 3); }
    else if (player.weapon.includes('sword') || player.weapon.includes('katana') || player.weapon.includes('blade') || player.weapon.includes('reaper')) {
      ctx.fillStyle = weapon.color; ctx.beginPath(); ctx.moveTo(-4, -39); ctx.lineTo(0, -64); ctx.lineTo(4, -39); ctx.fill();
      if (weapon.glow) { ctx.shadowColor = weapon.color; ctx.shadowBlur = 14; ctx.stroke(); }
    } else { ctx.fillStyle = '#533d2b'; roundedRect(ctx, -3, -52, 6, 14, 2); }
    ctx.restore();
  }
  if (player.groundSlamPending) { ctx.strokeStyle = '#a99bff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 7, 27 + Math.sin(player.animTime * 12) * 4, 0, Math.PI * 2); ctx.stroke(); }
  if (player.block) { ctx.strokeStyle = '#6cebd3'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -5, 34, -1.3, 1.3); ctx.stroke(); }
  if (player.doubleJumpFlash > 0) { ctx.strokeStyle = '#a8e8ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 2, 32 + player.doubleJumpFlash * 40, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}
