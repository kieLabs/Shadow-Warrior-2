import { WORLDS } from './levels.js';
import { WEAPONS, CHARACTERS } from './weapons.js';
import { upgradeCost } from './save.js';

const FONT = 'Inter, system-ui, sans-serif';
function panel(ctx, x, y, w, h, fill = '#0a1723eF') {
  ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill();
  ctx.strokeStyle = '#7ca69f55'; ctx.lineWidth = 1; ctx.stroke();
}
function text(ctx, value, x, y, size = 14, color = '#f3f7f5', align = 'left', weight = 600) {
  ctx.fillStyle = color; ctx.font = `${weight} ${size}px ${FONT}`; ctx.textAlign = align; ctx.fillText(value, x, y);
}
function button(ctx, game, label, x, y, w, h, id, style = 'normal', sub = '') {
  const colors = style === 'gold' ? ['#5e4728', '#e6b45d'] : style === 'red' ? ['#522c38', '#ef7884'] : style === 'teal' ? ['#164c4a', '#51d9b7'] : ['#1a3040', '#5a8490'];
  ctx.fillStyle = colors[0]; ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = colors[1]; ctx.lineWidth = 1.2; ctx.stroke();
  text(ctx, label, x + w / 2, y + (sub ? h * .44 : h * .61), Math.min(15, h * .32), '#f8fffb', 'center', 800);
  if (sub) text(ctx, sub, x + w / 2, y + h * .77, 9, '#b6d1ca', 'center', 500);
  game.uiButtons.push({ x, y, w, h, id });
}
function title(ctx, heading, sub) {
  text(ctx, heading, 480, 70, 25, '#f3f8f4', 'center', 900);
  text(ctx, sub, 480, 94, 10, '#93afb2', 'center', 700);
}

export function drawUI(ctx, game) {
  game.uiButtons = [];
  if (game.state === 'menu') return drawMenu(ctx, game);
  drawHUD(ctx, game);
  if (game.state === 'paused') drawPause(ctx, game);
  else if (game.state === 'gameover') drawGameOver(ctx, game);
  else if (game.state === 'victory') drawVictory(ctx, game);
}

function drawMenu(ctx, game) {
  const gradient = ctx.createLinearGradient(0, 0, 0, 540);
  gradient.addColorStop(0, '#152f43'); gradient.addColorStop(.57, '#142531'); gradient.addColorStop(1, '#09131e');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 960, 540);
  // Distant skyline and moon.
  ctx.fillStyle = '#d2e4d955'; ctx.beginPath(); ctx.arc(760, 112, 42, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 14; i++) {
    const x = i * 78 - 10, h = 100 + (i * 47 % 145);
    ctx.fillStyle = i % 2 ? '#1b3441' : '#203a46'; ctx.fillRect(x, 420 - h, 62, h);
    ctx.fillStyle = '#d7b77a33'; for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) ctx.fillRect(x + 13 + c * 23, 440 - h + r * 26, 7, 10);
  }
  ctx.fillStyle = '#08131d'; ctx.fillRect(0, 426, 960, 114);
  ctx.save(); ctx.shadowColor = '#4ce0bd'; ctx.shadowBlur = 16;
  text(ctx, 'SHADOW WARRIOR', 480, 88, 37, '#f7fff9', 'center', 1000);
  ctx.restore();
  text(ctx, 'GAMERKIE EDITION', 480, 113, 11, '#4ce0bd', 'center', 900);
  text(ctx, 'FIGHT YOUR WAY. BECOME A LEGEND.', 480, 139, 10, '#b5c8c7', 'center', 700);
  if (game.menuPage === 'main') {
    button(ctx, game, 'STORY MODE', 326, 168, 308, 42, 'mode:story', 'teal', `WORLD ${game.save.world + 1}  •  LEVEL ${game.save.level}`);
    button(ctx, game, 'CONTINUE', 326, 217, 308, 38, 'mode:continue', 'normal', 'Resume your saved journey');
    const modes = [
      ['ENDLESS', 'mode:endless'], ['BOSS RUSH', 'mode:bossrush'], ['SURVIVAL', 'mode:survival'], ['CHALLENGE', 'mode:challenge'],
    ];
    modes.forEach((item, i) => button(ctx, game, item[0], 166 + i * 159, 272, 148, 43, item[1], i === 1 ? 'gold' : 'normal'));
    const pages = [
      ['HEROES', 'page:characters'], ['ARSENAL', 'page:weapons'], ['UPGRADES', 'page:upgrades'],
      ['MISSIONS', 'page:missions'], ['ACHIEVEMENTS', 'page:achievements'], ['SETTINGS', 'page:settings'],
    ];
    pages.forEach((item, i) => button(ctx, game, item[0], 179 + (i % 3) * 202, 335 + Math.floor(i / 3) * 45, 190, 37, item[1], 'normal'));
    button(ctx, game, 'HOW TO PLAY', 378, 435, 204, 31, 'page:howto', 'normal');
    text(ctx, `BEST SCORE  ${game.save.highScore.toLocaleString()}     •     COINS  ${game.save.coins.toLocaleString()}     •     GEMS  ${game.save.gems}`, 480, 495, 11, '#d8c68d', 'center', 700);
    text(ctx, 'A / D MOVE     SPACE JUMP     J HIT     K HEAVY     L SPECIAL     SHIFT DODGE', 480, 516, 9, '#8da7aa', 'center', 600);
  } else {
    drawMenuPage(ctx, game);
  }
}

function drawMenuPage(ctx, game) {
  const page = game.menuPage;
  const headings = {
    characters: ['CHOOSE YOUR WARRIOR', 'Four original fighters. Each one brings a different advantage.'],
    weapons: ['WEAPON ARSENAL', 'Equip a weapon to change your reach, power and attack rhythm.'],
    upgrades: ['WARRIOR TRAINING', 'Spend coins to permanently improve your combat stats.'],
    missions: ['DAILY MISSIONS', 'Complete objectives during your current day to earn rewards.'],
    achievements: ['LEGEND RECORDS', 'Milestones earned across your journey.'],
    settings: ['GAME SETTINGS', 'Tune the experience for your device.'],
    howto: ['HOW TO PLAY', 'Learn the controls and master the rhythm of combat.'],
  };
  title(ctx, ...(headings[page] || ['GAMERKIE', '']));
  panel(ctx, 84, 120, 792, 345);
  if (page === 'characters') {
    CHARACTERS.forEach((character, index) => {
      const x = 104 + index * 190;
      const unlocked = game.save.unlockedCharacters.includes(character.id);
      panel(ctx, x, 143, 174, 245, '#122431');
      ctx.fillStyle = character.colors[0]; ctx.beginPath(); ctx.arc(x + 87, 204, 35, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = character.colors[1]; ctx.beginPath(); ctx.roundRect(x + 66, 232, 42, 61, 10); ctx.fill();
      ctx.fillStyle = character.colors[2]; ctx.beginPath(); ctx.arc(x + 87, 195, 17, 0, Math.PI * 2); ctx.fill();
      text(ctx, character.name, x + 87, 315, 16, '#f8fffb', 'center', 900);
      text(ctx, character.role, x + 87, 333, 10, '#9eb9b9', 'center');
      text(ctx, character.ability, x + 87, 351, 9, '#4ce0bd', 'center');
      const label = unlocked ? (game.save.character === character.id ? 'EQUIPPED' : 'SELECT') : `UNLOCK ${character.cost}`;
      button(ctx, game, label, x + 12, 359, 150, 25, `character:${character.id}`, unlocked ? 'teal' : 'gold');
    });
  } else if (page === 'weapons') {
    WEAPONS.forEach((weapon, index) => {
      const x = 104 + (index % 2) * 385;
      const y = 139 + Math.floor(index / 2) * 57;
      const unlocked = game.save.unlockedWeapons.includes(weapon.id);
      panel(ctx, x, y, 365, 49, '#132634');
      ctx.fillStyle = weapon.color; ctx.fillRect(x + 14, y + 13, 5, 24);
      text(ctx, weapon.name, x + 31, y + 20, 12, '#f5faf7', 'left', 800);
      text(ctx, `DMG ${weapon.damage.toFixed(1)}  •  SPEED ${weapon.speed.toFixed(2)}  •  RANGE ${weapon.range.toFixed(2)}`, x + 31, y + 36, 8, '#9bb5b7');
      const label = unlocked ? (game.save.weapon === weapon.id ? 'EQUIPPED' : 'EQUIP') : `BUY ${weapon.cost} ${weapon.unlock === 'gems' ? 'GEMS' : 'COINS'}`;
      button(ctx, game, label, x + 252, y + 9, 101, 31, `weapon:${weapon.id}`, unlocked ? 'teal' : 'gold');
    });
  } else if (page === 'upgrades') {
    const upgrades = [
      ['health', 'MAX HEALTH', 'More health before defeat.'], ['attack', 'ATTACK POWER', 'Punches, kicks and weapons hit harder.'],
      ['defense', 'DEFENSE', 'Reduce incoming damage.'], ['energy', 'ENERGY CAPACITY', 'Hold more energy for special moves.'], ['speed', 'AGILITY', 'Move quicker and jump a little higher.'],
    ];
    upgrades.forEach((u, index) => {
      const x = 118 + (index % 2) * 365, y = 146 + Math.floor(index / 2) * 82;
      const level = game.save.upgrades[u[0]], cost = upgradeCost(u[0], level);
      panel(ctx, x, y, 340, 67, '#132634');
      text(ctx, u[1], x + 16, y + 22, 12, '#eff9f4', 'left', 800);
      text(ctx, `${u[2]}  •  LEVEL ${level}/20`, x + 16, y + 43, 9, '#9cb9ba');
      button(ctx, game, level >= 20 ? 'MAXED' : `UPGRADE ${cost}`, x + 218, y + 17, 108, 34, `upgrade:${u[0]}`, level >= 20 ? 'normal' : 'gold');
    });
    text(ctx, `AVAILABLE COINS: ${game.save.coins}`, 480, 428, 12, '#f6d28b', 'center', 800);
  } else if (page === 'missions') {
    const missions = game.getMissionList();
    missions.forEach((m, index) => {
      const y = 145 + index * 54;
      panel(ctx, 114, y, 732, 45, '#132634');
      text(ctx, m.label, 132, y + 18, 12, '#f3f8f5', 'left', 750);
      text(ctx, `${m.progress}/${m.target}`, 810, y + 18, 11, '#d4c18d', 'right', 800);
      ctx.fillStyle = '#243e48'; ctx.fillRect(132, y + 27, 650, 7);
      ctx.fillStyle = m.complete ? '#4ce0bd' : '#c89a58'; ctx.fillRect(132, y + 27, 650 * Math.min(1, m.progress / m.target), 7);
    });
  } else if (page === 'achievements') {
    const achievements = [
      ['first', 'FIRST VICTORY', 'Complete your first level.'], ['combo', 'COMBO MASTER', 'Land a 5-hit combo.'], ['weapon', 'WEAPON EXPERT', 'Unlock a weapon.'],
      ['boss', 'BOSS SLAYER', 'Defeat a world boss.'], ['collector', 'COIN COLLECTOR', 'Collect 500 coins.'], ['survivor', 'SURVIVAL LEGEND', 'Survive 10 waves.'], ['ultimate', 'ULTIMATE WARRIOR', 'Complete all 8 worlds.'],
    ];
    achievements.forEach((a, i) => {
      const x = 114 + (i % 2) * 370, y = 141 + Math.floor(i / 2) * 65;
      panel(ctx, x, y, 350, 53, '#132634');
      const done = game.save.achievements.includes(a[0]);
      text(ctx, `${done ? '✦' : '◇'}  ${a[1]}`, x + 14, y + 21, 12, done ? '#4ce0bd' : '#eff7f3', 'left', 800);
      text(ctx, a[2], x + 35, y + 39, 9, '#9db6b7');
    });
  } else if (page === 'settings') {
    button(ctx, game, `MUSIC  ${game.save.settings.music ? 'ON' : 'OFF'}`, 152, 153, 190, 42, 'setting:music', game.save.settings.music ? 'teal' : 'normal');
    button(ctx, game, `SOUND  ${game.save.settings.sound ? 'ON' : 'OFF'}`, 360, 153, 190, 42, 'setting:sound', game.save.settings.sound ? 'teal' : 'normal');
    button(ctx, game, `DIFFICULTY  ${game.save.settings.difficulty.toUpperCase()}`, 568, 153, 230, 42, 'setting:difficulty', 'normal');
    text(ctx, `MASTER VOLUME  ${Math.round(game.save.settings.volume * 100)}%`, 480, 258, 13, '#f4f8f5', 'center', 800);
    button(ctx, game, '−', 300, 277, 62, 39, 'setting:volume-down');
    button(ctx, game, '+', 598, 277, 62, 39, 'setting:volume-up');
    text(ctx, 'SETTINGS ARE SAVED ON THIS DEVICE', 480, 366, 10, '#9fb5b6', 'center');
  } else if (page === 'howto') {
    const lines = [
      ['MOVE', 'A / D or ← / →   •   Tap the left and right buttons.'],
      ['JUMP', 'SPACE / W / ↑   •   You can jump a second time in mid-air.'],
      ['ATTACK', 'J punches. K performs a heavy attack. L uses your special move.'],
      ['DEFEND', 'SHIFT dodges with brief invulnerability. Hold S to crouch or slide while moving.'],
      ['COMBAT', 'Chain attacks quickly for longer combos. Face enemies to block.'],
      ['GOAL', 'Defeat the boss or reach the exit. Collect coins and upgrade your hero.'],
    ];
    lines.forEach((item, i) => {
      const y = 151 + i * 43;
      text(ctx, item[0], 137, y, 11, '#4ce0bd', 'left', 900);
      text(ctx, item[1], 229, y, 11, '#edf5f1', 'left', 550);
    });
  }
  button(ctx, game, '← BACK', 400, 474, 160, 34, 'page:main', 'teal');
}

function drawHUD(ctx, game) {
  const p = game.player;
  ctx.fillStyle = '#091722d9'; ctx.fillRect(0, 0, 960, 66);
  // Character badge.
  ctx.fillStyle = p.stats.colors[0]; ctx.beginPath(); ctx.arc(35, 33, 23, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.stats.colors[1]; ctx.beginPath(); ctx.arc(35, 30, 13, 0, Math.PI * 2); ctx.fill();
  text(ctx, p.stats.name, 67, 19, 9, '#bed2ce', 'left', 800);
  bar(ctx, 67, 25, 155, 12, p.health / p.maxHealth, '#e76e77');
  text(ctx, `${Math.ceil(p.health)} / ${p.maxHealth}`, 226, 35, 9, '#dcebe5', 'left', 700);
  bar(ctx, 67, 43, 155, 8, p.energy / p.maxEnergy, '#6d9dff');
  text(ctx, 'ENERGY', 226, 50, 8, '#9cb8c0', 'left');
  const world = WORLDS[game.level.world];
  text(ctx, world.name, 480, 21, 13, '#f2f8f4', 'center', 900);
  text(ctx, `WORLD ${game.level.world + 1}  •  LEVEL ${game.level.level}  •  SCORE ${(game.save.score + game.runScore).toLocaleString()}`, 480, 43, 9, '#bad0cb', 'center', 700);
  text(ctx, `◉ ${game.save.coins + p.coins}`, 825, 25, 13, '#f4d287', 'center', 800);
  text(ctx, `◆ ${game.save.gems}`, 825, 47, 10, '#b9a9ff', 'center', 800);
  button(ctx, game, 'Ⅱ', 900, 13, 40, 40, 'pause', 'normal');
  if (game.boss && !game.boss.dead) {
    panel(ctx, 270, 76, 420, 42, '#111622de');
    text(ctx, game.boss.name, 480, 91, 10, '#f5e6d3', 'center', 900);
    bar(ctx, 291, 99, 378, 10, game.boss.hp / game.boss.maxHp, '#e36e86');
  }
  if (p.combo >= 2 && p.comboClock > 0) {
    ctx.save(); ctx.shadowColor = '#ffce71'; ctx.shadowBlur = 10;
    text(ctx, `${p.combo} HIT COMBO`, 805, 105, 16, '#ffd37d', 'center', 900); ctx.restore();
  }
  if (game.mode !== 'story') {
    text(ctx, `${game.mode.toUpperCase()}  •  ${game.waveLabel || 'WAVE 1'}`, 480, 135, 10, '#f5d08d', 'center', 800);
  }
}
function bar(ctx, x, y, w, h, ratio, color) {
  ctx.fillStyle = '#263943'; ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w * Math.max(0, Math.min(1, ratio)), h, h / 2); ctx.fill();
}
function drawOverlay(ctx) { ctx.fillStyle = '#030911bb'; ctx.fillRect(0, 0, 960, 540); }
function drawPause(ctx, game) {
  drawOverlay(ctx); panel(ctx, 330, 118, 300, 320); title(ctx, 'PAUSED', 'Catch your breath, warrior.');
  button(ctx, game, 'RESUME', 390, 180, 180, 42, 'resume', 'teal');
  button(ctx, game, 'RESTART LEVEL', 390, 230, 180, 38, 'restart', 'normal');
  button(ctx, game, 'SETTINGS', 390, 276, 180, 38, 'page:settings', 'normal');
  button(ctx, game, 'HOW TO PLAY', 390, 322, 180, 38, 'page:howto', 'normal');
  button(ctx, game, 'MAIN MENU', 390, 368, 180, 38, 'to-menu', 'red');
}
function drawGameOver(ctx, game) {
  drawOverlay(ctx); panel(ctx, 290, 100, 380, 345, '#101b29f5');
  text(ctx, 'WARRIOR DOWN', 480, 160, 27, '#ff8790', 'center', 950);
  text(ctx, 'The shadows are not finished with you.', 480, 183, 11, '#aabec0', 'center');
  text(ctx, `SCORE  ${game.runScore.toLocaleString()}`, 480, 231, 18, '#f7db9b', 'center', 900);
  text(ctx, `ENEMIES DEFEATED  ${game.player.enemiesDefeated}     COINS  ${game.player.coins}`, 480, 259, 10, '#d6e5de', 'center', 700);
  button(ctx, game, 'RETRY', 370, 300, 220, 42, 'restart', 'teal');
  button(ctx, game, 'RETURN TO MENU', 370, 351, 220, 38, 'to-menu', 'normal');
}
function drawVictory(ctx, game) {
  drawOverlay(ctx); panel(ctx, 285, 92, 390, 365, '#101d2bf5');
  ctx.save(); ctx.shadowColor = '#f6c56f'; ctx.shadowBlur = 20;
  text(ctx, game.level.bossLevel ? 'BOSS DEFEATED!' : 'LEVEL CLEARED!', 480, 154, 26, '#ffdd8e', 'center', 950); ctx.restore();
  text(ctx, `${WORLDS[game.level.world].name}  •  LEVEL ${game.level.level}`, 480, 180, 11, '#b6c8c4', 'center', 750);
  text(ctx, '✦   ✦   ✦', 480, 235, 32, '#ffd57b', 'center', 900);
  text(ctx, `SCORE +${game.levelReward.score}       COINS +${game.levelReward.coins}`, 480, 267, 12, '#f0e5c9', 'center', 800);
  button(ctx, game, 'NEXT LEVEL', 370, 306, 220, 42, 'next-level', 'teal');
  button(ctx, game, 'MAIN MENU', 370, 359, 220, 38, 'to-menu', 'normal');
}
