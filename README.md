# Shadow-Warrior-2
SHADOW WARRIOR 2 — GamerKie Edition
Fight Your Way. Become a Legend.
An original, single-player 2D side-scrolling action platformer built with HTML5 Canvas 2D, CSS and vanilla JavaScript modules. All character art, enemies, environments, effects and sound are rendered or synthesized in code; the project does not depend on third-party image/audio assets, paid APIs or a backend.
Run locally
The project uses JavaScript ES modules, so serve the folder over HTTP rather than opening index.html as a file:// URL.
python -m http.server 8000
Open http://localhost:8000.
GitHub Pages deployment
Create a GitHub repository named shadow-warrior (or another name you prefer).
Upload every file and folder from this project to the repository root. Keep the file names and folder structure unchanged.
Open Settings → Pages.
Under Build and deployment, select Deploy from a branch, choose main and / (root), then save.
Open the Pages URL after deployment. index.html is the entry point.
No build step is required. The repository includes a package.json only for running the local Node test suite.
Blogger integration
After publishing to GitHub Pages, copy this snippet into a Blogger HTML post and replace YOUR-USERNAME and YOUR-REPOSITORY with the actual GitHub details:
<div style="width:100%;max-width:1100px;margin:auto;">
  <iframe
    src="https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/"
    title="Shadow Warrior — GamerKie Edition"
    loading="lazy"
    allow="fullscreen; autoplay"
    allowfullscreen
    style="display:block;width:100%;aspect-ratio:16/9;border:0;border-radius:10px;background:#08111b;">
  </iframe>
</div>
embed.html is also included as a ready-made Blogger-friendly wrapper with a Play Now cover and fullscreen button. When it is hosted on GitHub Pages, it loads index.html from the same folder.
Controls
Action
Desktop
Touch
Move
A / D or ← / →
Left / right
Jump / double jump
Space, W or ↑
Jump
Light attack
J
Hit
Heavy attack
K
Heavy
Special attack
L
⚡
Dodge
Shift
Dodge
Block
Hold B
Hold Block
Crouch
Hold S or ↓
—
Pause
Esc or P
Pause button
The game is designed for landscape play on phones and tablets. The browser's fullscreen API is available from the header button.
Included gameplay systems
Original vector-drawn warrior, 11 enemy archetypes, 8 themed worlds and 8 original bosses.
Running, jumping, double jumping, crouching, blocking, dodging, light/heavy/special attacks and combo chaining.
Enemy patrol, chase, melee and ranged behavior; boss health, attack phases and projectile/shockwave moves.
Procedurally assembled platform routes, coin lines, weapon/health/energy pickups, destructible crates and barrels, and traps; 8 worlds × 5 campaign levels, plus a repeating procedural story path after the campaign and replay modes.
Weapons, character unlocks, permanent stat upgrades, daily missions, achievements, score, coins and gems. Challenge mode is a timed 90-second run; Boss Rush cycles through the eight world bosses; Survival carries remaining health between waves.
Keyboard and multi-touch controls, pause/retry/victory screens, synthesized Web Audio effects and localStorage progression.
Save data
Progress is stored locally in the browser under gamerkie.shadowWarrior.save with a version field. Clearing browser site data or changing browsers/devices removes access to that local save. There is no cloud sync.
Tests
Node.js 20+ is recommended. Run:
npm test
npm run check
The tests cover procedural-level bounds, boss schedule, deterministic generation, platform landing, save normalization and upgrade pricing. A runtime smoke harness also drives the menu, story start, movement, attack, jump and pause transitions with a mocked Canvas environment.
Implementation status
Stage
Status
Evidence
1. Core movement and physics
Partial
Walking/running, jump, double jump, crouch-to-slide, dodge, gravity and platform landing are implemented. Climbing is not.
2. Combat and enemy AI
Partial
Light/heavy/special attacks, combos, impact effects and patrol/chase/melee/ranged enemies are implemented. A dedicated finisher move and advanced enemy defense behaviors remain.
3. Level design and camera
Partial
Eight themed procedural worlds, platforms, traps, pickups, crates/barrels and camera follow are implemented. Checkpoints and secret-room routing remain.
4. Boss battles and weapons
Partial
Eight boss archetypes and ten weapons with different damage/speed/range are implemented. Per-weapon tier upgrades and some boss-specific presentation polish remain.
5. Progression and rewards
Partial
Characters, stat upgrades, coins, gems, pickups, daily missions and achievements are implemented. Daily login rewards are not.
6. Menus, HUD and settings
Implemented
Main menu, character/weapon/upgrades pages, mission/achievement pages, HUD, pause, victory, game-over and settings are wired.
7. Save system
Implemented
Versioned localStorage read/write and normalization; profile progression persists on rewards and level completion.
8. Mobile and desktop optimization
Partial
Responsive 16:9 canvas, keyboard, multi-touch and portrait rotate notice are implemented. Physical iOS/Android device testing has not been performed here.
9. Testing and GitHub deployment
Partially verified
Automated Node tests, runtime interaction smoke harness and syntax checks pass. Actual GitHub Pages publication and live-browser QA are user-side steps.
10. Blogger integration
Implemented, not live-verified
embed.html wrapper and copy/paste iframe snippet are included. Blogger theme/iframe behavior has not been verified on a live blog.
This is a playable first game build, not a claim of parity with a full commercial console/mobile title. The art is original code-drawn Canvas artwork rather than a hand-painted sprite-sheet production. Some features from the larger brief are not in this build yet: climbing, a dedicated finisher animation, checkpoint/secret-room systems, weapon tier upgrades, daily login rewards, distinct composed music tracks for each world, and full physical-device/Blogger live testing. The game does include crouch, dodge, air-capable attacks, alternating punch/kick combo poses, ground slam, combo chaining, destructible props, and the procedural level framework; the remaining items are clearly listed here rather than represented as finished.
