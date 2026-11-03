const BOSSES = [
  { name: 'IRON JACKAL', title: 'Street Enforcer', color: '#b66c58', armor: '#493b45', hp: 420, size: 1.15, style: 'brawler' },
  { name: 'MOTHER THORN', title: 'Forest Warden', color: '#8ebc78', armor: '#314c39', hp: 510, size: 1.2, style: 'caster' },
  { name: 'COMMANDER VEX', title: 'The War Machine', color: '#c69e5e', armor: '#344958', hp: 580, size: 1.25, style: 'ranger' },
  { name: 'THE SUN EATER', title: 'Desert Tyrant', color: '#de9460', armor: '#684437', hp: 640, size: 1.3, style: 'brawler' },
  { name: 'FROST MAW', title: 'Glacier Beast', color: '#a6dae9', armor: '#365b78', hp: 700, size: 1.38, style: 'charger' },
  { name: 'CORE-09', title: 'The Last Machine', color: '#63ccd2', armor: '#263d59', hp: 760, size: 1.32, style: 'ranger' },
  { name: 'DREAD KNIGHT', title: 'King of Ash', color: '#b47aa8', armor: '#382a46', hp: 850, size: 1.4, style: 'charger' },
  { name: 'THE NULL KING', title: 'Architect of Shadows', color: '#a98cff', armor: '#242346', hp: 1050, size: 1.55, style: 'void' },
];

export function createBoss(worldIndex, difficulty = 1) {
  const spec = BOSSES[Math.max(0, Math.min(BOSSES.length - 1, worldIndex | 0))];
  const hp = Math.round(spec.hp * difficulty);
  return {
    ...spec, x: 0, y: 0, w: 92 * spec.size, h: 126 * spec.size,
    hp, maxHp: hp, damage: 18 + worldIndex * 2 + difficulty * 2,
    facing: -1, vx: 0, state: 'enter', timer: 1, attackCooldown: 1.2,
    phase: 1, dead: false, hurt: 0, hitFlash: 0, attackName: '', phaseClock: 0,
  };
}

export function updateBoss(boss, player, dt, callbacks = {}) {
  if (!boss || boss.dead) return;
  boss.timer = Math.max(0, boss.timer - dt);
  boss.attackCooldown = Math.max(0, boss.attackCooldown - dt);
  boss.hurt = Math.max(0, boss.hurt - dt);
  boss.hitFlash = Math.max(0, boss.hitFlash - dt);
  boss.phaseClock += dt;
  const dx = player.x - boss.x;
  const dist = Math.abs(dx);
  boss.facing = dx < 0 ? -1 : 1;
  const hpRatio = boss.hp / boss.maxHp;
  boss.phase = hpRatio < .28 ? 3 : hpRatio < .62 ? 2 : 1;
  if (boss.state === 'enter') {
    boss.vx = -boss.facing * 120;
    boss.state = 'idle';
    boss.timer = .5;
  }
  if (boss.hurt > 0) { boss.vx *= Math.pow(.08, dt); boss.x += boss.vx * dt; return; }
  if (boss.state === 'attack') {
    if (boss.timer <= 0) boss.state = 'idle';
    else if (boss.timer < .13 && !boss.hitApplied) {
      boss.hitApplied = true;
      const range = boss.attackName === 'charge' ? 120 : boss.attackName === 'projectile' ? 0 : 86;
      if (dist < range && Math.abs(player.y - boss.y) < 105) callbacks.playerHit?.(boss.damage * (boss.phase === 3 ? 1.35 : 1), boss.facing, player.block && player.facing === -boss.facing);
      if (boss.attackName === 'smash' || boss.attackName === 'charge') callbacks.shockwave?.(boss.x + boss.w / 2, boss.y + boss.h - 20, boss.attackName === 'smash');
      if (boss.attackName === 'projectile' || boss.style === 'void' && boss.phase >= 2) callbacks.projectile?.({ x: boss.x + boss.w / 2, y: boss.y + 42, vx: boss.facing * (250 + boss.phase * 55), damage: boss.damage * .72, color: boss.color, from: 'boss' });
    }
  } else {
    boss.vx = dist > 120 ? boss.facing * (boss.style === 'charger' ? 112 : 68) : 0;
    boss.x += boss.vx * dt;
    if (boss.attackCooldown <= 0) {
      const r = Math.random();
      boss.attackName = boss.style === 'ranger' && r < .4 ? 'projectile' : boss.style === 'charger' && r < .55 ? 'charge' : r < .32 ? 'smash' : 'strike';
      if (boss.style === 'void' && r < .28) boss.attackName = 'projectile';
      boss.state = 'attack';
      boss.timer = boss.attackName === 'charge' ? .48 : boss.attackName === 'smash' ? .6 : .38;
      boss.attackCooldown = Math.max(.58, 1.45 - boss.phase * .2 + Math.random() * .35);
      boss.hitApplied = false;
      if (boss.attackName === 'charge') boss.vx = boss.facing * 360;
    }
  }
  if (boss.state === 'attack' && boss.attackName === 'charge' && boss.timer > 0) boss.x += boss.facing * 260 * dt;
  boss.x = Math.max(0, Math.min(callbacks.maxX ?? Infinity, boss.x));
}

export function drawBoss(ctx, boss, cameraX) {
  if (!boss || boss.dead) return;
  const x = boss.x - cameraX;
  const y = boss.y;
  ctx.save(); ctx.translate(x + boss.w / 2, y + boss.h / 2); ctx.scale(boss.facing, 1);
  const pulse = Math.sin(boss.phaseClock * 5) * 2;
  ctx.fillStyle = '#05091099'; ctx.beginPath(); ctx.ellipse(0, boss.h / 2 - 2, boss.w * .62, 12, 0, 0, Math.PI * 2); ctx.fill();
  if (boss.style === 'void') { ctx.shadowColor = boss.color; ctx.shadowBlur = 22; }
  ctx.fillStyle = boss.armor; ctx.beginPath(); ctx.roundRect(-boss.w * .43, -boss.h * .27, boss.w * .86, boss.h * .65, 18); ctx.fill();
  ctx.fillStyle = boss.color; ctx.beginPath(); ctx.roundRect(-boss.w * .32, -boss.h * .34, boss.w * .64, boss.h * .62, 17); ctx.fill();
  ctx.fillStyle = boss.armor; ctx.beginPath(); ctx.arc(0, -boss.h * .36, boss.w * .28, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = boss.color; ctx.beginPath(); ctx.arc(0, -boss.h * .38, boss.w * .22, 0, Math.PI * 2); ctx.fill();
  // Large angular shoulder plates and glowing eye band.
  ctx.fillStyle = boss.armor; ctx.beginPath(); ctx.moveTo(-boss.w * .28, -boss.h * .25); ctx.lineTo(-boss.w * .58, -boss.h * .14); ctx.lineTo(-boss.w * .38, boss.h * .02); ctx.lineTo(-boss.w * .17, -boss.h * .05); ctx.fill();
  ctx.beginPath(); ctx.moveTo(boss.w * .28, -boss.h * .25); ctx.lineTo(boss.w * .58, -boss.h * .14); ctx.lineTo(boss.w * .38, boss.h * .02); ctx.lineTo(boss.w * .17, -boss.h * .05); ctx.fill();
  ctx.fillStyle = '#fff1be'; ctx.shadowColor = boss.color; ctx.shadowBlur = 12; ctx.fillRect(5, -boss.h * .42, 14, 5); ctx.shadowBlur = 0;
  ctx.strokeStyle = boss.armor; ctx.lineWidth = 18; ctx.lineCap = 'round';
  const wind = boss.state === 'attack' ? -26 : Math.sin(boss.phaseClock * 3) * 5;
  ctx.beginPath(); ctx.moveTo(-boss.w * .28, -boss.h * .13); ctx.lineTo(-boss.w * .5, wind); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(boss.w * .28, -boss.h * .13); ctx.lineTo(boss.w * .48, 7 + pulse); ctx.stroke();
  ctx.strokeStyle = boss.color; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(-boss.w * .2, boss.h * .3); ctx.lineTo(-boss.w * .24, boss.h * .48); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(boss.w * .2, boss.h * .3); ctx.lineTo(boss.w * .24, boss.h * .48); ctx.stroke();
  if (boss.state === 'attack') { ctx.strokeStyle = boss.color; ctx.globalAlpha = .65; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(boss.w * .43, -8, 36 + boss.phase * 7, -.9, .7); ctx.stroke(); }
  if (boss.hitFlash > 0) { ctx.globalAlpha = .65; ctx.fillStyle = '#fff'; ctx.fillRect(-boss.w * .45, -boss.h * .46, boss.w * .9, boss.h * .85); }
  ctx.restore();
}

export function bossRoster() { return BOSSES.map(({ name, title }) => ({ name, title })); }
