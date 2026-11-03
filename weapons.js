export const WEAPONS = [
  { id: 'fists', name: 'Bare Hands', damage: 1, speed: 1.15, range: 1, cost: 0, unlock: 'start', color: '#e6c7a2', glow: false, special: 'Twin impact' },
  { id: 'wooden-stick', name: 'Wooden Stick', damage: 1.2, speed: 1.08, range: 1.25, cost: 80, unlock: 'coins', color: '#b98552', special: 'Wide swing' },
  { id: 'iron-pipe', name: 'Iron Pipe', damage: 1.55, speed: .88, range: 1.35, cost: 180, unlock: 'coins', color: '#a9bac6', special: 'Heavy stun' },
  { id: 'baseball-bat', name: 'Street Bat', damage: 1.7, speed: .9, range: 1.45, cost: 260, unlock: 'coins', color: '#d89b62', special: 'Knockback' },
  { id: 'sword', name: 'Iron Sword', damage: 1.9, speed: 1.05, range: 1.5, cost: 420, unlock: 'coins', color: '#c5e0ed', special: 'Piercing arc' },
  { id: 'katana', name: 'Moon Katana', damage: 2.35, speed: 1.22, range: 1.65, cost: 700, unlock: 'coins', color: '#76d9d1', special: 'Swift slash' },
  { id: 'hammer', name: 'War Hammer', damage: 2.8, speed: .68, range: 1.42, cost: 900, unlock: 'coins', color: '#d4b58d', special: 'Ground tremor' },
  { id: 'dual-blades', name: 'Twin Blades', damage: 2.25, speed: 1.38, range: 1.55, cost: 1250, unlock: 'coins', color: '#a7c9fa', special: 'Flurry' },
  { id: 'energy-sword', name: 'Void Edge', damage: 3.2, speed: 1.08, range: 1.8, cost: 5, unlock: 'gems', color: '#9f8cff', glow: true, special: 'Void wave' },
  { id: 'shadow-reaper', name: 'Shadow Reaper', damage: 4, speed: 1.12, range: 2, cost: 12, unlock: 'gems', color: '#ff78a8', glow: true, special: 'Soul cleave' },
];

export const CHARACTERS = [
  { id: 'kael', name: 'KAEL', role: 'The Exile', desc: 'Balanced warrior. A reliable all-round fighter.', cost: 0, hp: 100, damage: 1, speed: 1, ability: 'Rising Strike', colors: ['#263c4b', '#4ce0bd', '#e5b28d'] },
  { id: 'nyra', name: 'NYRA', role: 'The Silent Edge', desc: 'Swift assassin with faster movement and attacks.', cost: 600, hp: 84, damage: 1.05, speed: 1.22, ability: 'Phantom Dash', colors: ['#382747', '#d58bfa', '#e9bfaa'] },
  { id: 'brakk', name: 'BRAKK', role: 'The Iron Wall', desc: 'Heavy guardian with greater health and power.', cost: 850, hp: 135, damage: 1.25, speed: .82, ability: 'Titan Slam', colors: ['#49372e', '#e4a85c', '#c89b7a'] },
  { id: 'sora', name: 'SORA', role: 'The Stormborn', desc: 'Agile fighter who channels storm energy.', cost: 1100, hp: 96, damage: 1.18, speed: 1.1, ability: 'Thunder Arc', colors: ['#233d56', '#6fbdff', '#d6a58c'] },
];

export function getWeapon(id) { return WEAPONS.find(item => item.id === id) || WEAPONS[0]; }
export function getCharacter(id) { return CHARACTERS.find(item => item.id === id) || CHARACTERS[0]; }
