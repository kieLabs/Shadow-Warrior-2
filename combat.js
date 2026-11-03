import { getWeapon } from './weapons.js';
import { damageEnemy } from './enemies.js';

export function performAttack(player, kind = 'light', save) {
  if (player.attackCooldown > 0 || player.hurtTimer > 0 || player.dodgeTimer > 0 || player.block) return false;
  if (kind === 'special' && player.energy < 35) return false;
  const weapon = getWeapon(player.weapon);
  if (kind === 'special') player.energy -= 35;
  if (player.comboClock > 0 && kind !== 'special') player.combo = player.combo % 5 + 1;
  else player.combo = 1;
  player.comboClock = .78;
  player.attackKind = kind;
  player.attackTimer = kind === 'heavy' ? .34 : kind === 'special' ? .5 : .23;
  const baseDamage = (12 + save.upgrades.attack * 3) * player.stats.damage;
  const multiplier = kind === 'special' ? 3.1 : kind === 'heavy' ? 1.75 : 1 + (player.combo - 1) * .13;
  player.attackCritical = kind !== 'special' && Math.random() < .09;
  player.attackDamage = baseDamage * weapon.damage * multiplier;
  if (player.attackCritical) player.attackDamage *= 2;
  player.attackRange = 54 * weapon.range * (kind === 'special' ? 1.8 : kind === 'heavy' ? 1.28 : 1);
  player.attackCooldown = (kind === 'heavy' ? .55 : kind === 'special' ? .72 : .28) / weapon.speed;
  player.attackHitIds = new Set();
  if (kind === 'special' && !player.grounded) {
    player.groundSlamPending = true;
    player.attackActive = false;
    player.attackTimer = 0;
    player.attackCooldown = .95;
    player.attackKind = 'groundslam';
    player.vy = Math.max(player.vy, 180);
  } else {
    player.attackActive = true;
  }
  return true;
}

export function updateCombat(game, dt) {
  const player = game.player;
  if (player.attackActive && player.attackTimer > 0) {
    const attackX = player.facing > 0 ? player.x + player.w : player.x - player.attackRange;
    const attackRect = { x: attackX, y: player.y + 11, w: player.attackRange, h: player.h - 15 };
    const enemies = [...game.enemies, ...(game.boss && !game.boss.dead ? [game.boss] : [])];
    for (const enemy of enemies) {
      if (!enemy || enemy.dead || player.attackHitIds.has(enemy.id ?? enemy)) continue;
      const target = { x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h };
      if (!overlap(attackRect, target)) continue;
      if (Math.abs((enemy.y + enemy.h / 2) - (player.y + player.h / 2)) > 88) continue;
      player.attackHitIds.add(enemy.id ?? enemy);
      const weapon = getWeapon(player.weapon);
      const direction = player.facing;
      const damage = player.attackDamage * (weapon.id === 'hammer' && player.attackKind === 'heavy' ? 1.25 : 1);
      let killed = false;
      if (enemy === game.boss) {
        killed = game.damageBoss(damage, direction);
      } else {
        killed = damageEnemy(enemy, damage, direction * (player.attackKind === 'heavy' ? 310 : 185));
        if (killed) game.onEnemyDefeated(enemy);
      }
      game.spawnImpact(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, player.attackKind === 'special' ? '#b69cff' : weapon.color, player.attackKind === 'special' ? 16 : 8);
      game.addFloatText(player.attackCritical ? `CRIT -${Math.round(damage)}` : `-${Math.round(damage)}`, enemy.x + enemy.w / 2, enemy.y - 8, player.attackCritical ? '#ffe17e' : '#fff1c9');
      game.audio.play('hit');
      game.cameraShake = Math.max(game.cameraShake, player.attackKind === 'heavy' ? 7 : player.attackKind === 'special' ? 11 : 3);
      if (player.attackKind === 'special') game.spawnImpact(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, '#8d8aff', 20);
    }
    for (const object of game.level.objects || []) {
      if (object.destroyed || player.attackHitIds.has(object)) continue;
      if (!overlap(attackRect, object)) continue;
      player.attackHitIds.add(object);
      object.hp -= player.attackKind === 'heavy' || player.attackKind === 'special' ? 2 : 1;
      game.spawnImpact(object.x + object.w / 2, object.y + object.h / 2, '#d8ad73', 7);
      if (object.hp <= 0) {
        object.destroyed = true;
        player.coins += 5; game.levelReward.coins += 5;
        game.addFloatText('+5 COINS', object.x, object.y - 8, '#f2d18b');
        game.audio.play('hit');
      }
    }
  } else {
    player.attackActive = false;
  }
  if (player.attackTimer <= 0) player.attackActive = false;
}

function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
