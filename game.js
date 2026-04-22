const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const TILE = 32;
const COLS = 30;
const ROWS = 20;
const BASE_ENEMY_SPEED = 62;
const ENEMY_SPEED_VARIANCE = 28;
const ENEMY_SPEED_SCALING = 0.15;
const DOUBLE_DROP_CHANCE = 0.45;
const ENEMY_SEPARATION_DISTANCE = 28;

const MAZE = [
  "##############################",
  "#............##............##",
  "#.####.#####.##.#####.####..#",
  "#.#..#.....#....#.....#..#..#",
  "#.#..#.###.######.###.#..#..#",
  "#....#...#...##...#...#.....#",
  "####.###.###.##.###.###.###.#",
  "#......#..........#......#..#",
  "#.####.####.##.####.####.#..#",
  "#.#......#..##..#......#.#..#",
  "#.#.####.#.####.#.####.#.#..#",
  "#...#....#......#....#...#..#",
  "###.#.##########.####.####..#",
  "#...#......##......#........#",
  "#.####.###.##.###.####.###..#",
  "#......#...##...#......#....#",
  "#.######.######.######.###..#",
  "#..............#........#...#",
  "##.####################.#...#",
  "##############################",
];

const upgrades = {
  spread: { name: "Wider Spread", baseCost: 12, growth: 1.7, level: 0 },
  speed: { name: "Move Speed", baseCost: 10, growth: 1.6, level: 0 },
  health: { name: "Max Health", baseCost: 14, growth: 1.8, level: 0 },
};

const state = {
  scene: "run",
  keys: new Set(),
  mouseX: canvas.width / 2,
  mouseY: canvas.height / 2,
  mouseDown: false,
  runScore: 0,
  bank: 0,
  enemySpawnTimer: 0,
  hurtFlash: 0,
  shootPulse: 0,
  player: null,
  bullets: [],
  enemies: [],
  pickups: [],
  shopSelection: 0,
};

function isWallTile(c, r) {
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return true;
  return MAZE[r][c] === "#";
}

function isWallAt(x, y) {
  const c = Math.floor(x / TILE);
  const r = Math.floor(y / TILE);
  return isWallTile(c, r);
}

function tileCenter(c, r) {
  return { x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 };
}

function randomOpenTileCenter() {
  while (true) {
    const c = Math.floor(Math.random() * COLS);
    const r = Math.floor(Math.random() * ROWS);
    if (!isWallTile(c, r)) return tileCenter(c, r);
  }
}

function resetRun() {
  const spawn = tileCenter(1, 1);
  const maxHealth = 3 + upgrades.health.level;
  state.scene = "run";
  state.runScore = 0;
  state.enemySpawnTimer = 0;
  state.hurtFlash = 0;
  state.shootPulse = 0;
  state.bullets = [];
  state.enemies = [];
  state.pickups = [];
  state.player = {
    x: spawn.x,
    y: spawn.y,
    radius: 10,
    hp: maxHealth,
    maxHp: maxHealth,
    speed: 120 + upgrades.speed.level * 18,
    fireCooldown: 0,
    invuln: 0,
  };

  for (let i = 0; i < 70; i++) {
    const p = randomOpenTileCenter();
    state.pickups.push({ x: p.x, y: p.y, r: 5, value: 1 });
  }
}

function getAimVector() {
  const aimX = (state.keys.has("ArrowRight") ? 1 : 0) - (state.keys.has("ArrowLeft") ? 1 : 0);
  const aimY = (state.keys.has("ArrowDown") ? 1 : 0) - (state.keys.has("ArrowUp") ? 1 : 0);
  if (aimX !== 0 || aimY !== 0) {
    const m = Math.hypot(aimX, aimY);
    return { x: aimX / m, y: aimY / m };
  }
  if (state.mouseDown) {
    const dx = state.mouseX - state.player.x;
    const dy = state.mouseY - state.player.y;
    const m = Math.hypot(dx, dy);
    if (m > 0.001) return { x: dx / m, y: dy / m };
  }
  return null;
}

function circleWallResolve(entity, oldX, oldY) {
  if (!touchingWall(entity.x, entity.y, entity.radius)) return;
  entity.x = oldX;
  if (!touchingWall(entity.x, entity.y, entity.radius)) return;
  entity.y = oldY;
  if (!touchingWall(entity.x, entity.y, entity.radius)) return;
  entity.x = oldX;
  entity.y = oldY;
}

function touchingWall(x, y, r) {
  const minC = Math.floor((x - r) / TILE);
  const maxC = Math.floor((x + r) / TILE);
  const minR = Math.floor((y - r) / TILE);
  const maxR = Math.floor((y + r) / TILE);
  for (let rr = minR; rr <= maxR; rr++) {
    for (let cc = minC; cc <= maxC; cc++) {
      if (isWallTile(cc, rr)) return true;
    }
  }
  return false;
}

function fire(aim) {
  const spreadLevel = upgrades.spread.level;
  const bulletCount = 1 + Math.min(4, spreadLevel);
  const spreadArc = 0.1 + spreadLevel * 0.09;
  const angle = Math.atan2(aim.y, aim.x);
  for (let i = 0; i < bulletCount; i++) {
    const t = bulletCount === 1 ? 0 : i / (bulletCount - 1) - 0.5;
    const a = angle + t * spreadArc;
    state.bullets.push({
      x: state.player.x,
      y: state.player.y,
      vx: Math.cos(a) * 440,
      vy: Math.sin(a) * 440,
      life: 0.9,
      r: 3,
    });
  }
  state.shootPulse = 0.12;
}

function spawnEnemy() {
  let spawn = randomOpenTileCenter();
  let tries = 0;
  while (tries < 40 && Math.hypot(spawn.x - state.player.x, spawn.y - state.player.y) < 220) {
    spawn = randomOpenTileCenter();
    tries++;
  }
  state.enemies.push({
    x: spawn.x,
    y: spawn.y,
    r: 10,
    hp: 2,
    speed: BASE_ENEMY_SPEED + Math.random() * ENEMY_SPEED_VARIANCE + state.runScore * ENEMY_SPEED_SCALING,
    touchDamage: 1,
    hitCooldown: 0,
  });
}

function updateRun(dt) {
  const p = state.player;
  state.hurtFlash = Math.max(0, state.hurtFlash - dt);
  state.shootPulse = Math.max(0, state.shootPulse - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.fireCooldown = Math.max(0, p.fireCooldown - dt);

  const mx = (state.keys.has("KeyD") ? 1 : 0) - (state.keys.has("KeyA") ? 1 : 0);
  const my = (state.keys.has("KeyS") ? 1 : 0) - (state.keys.has("KeyW") ? 1 : 0);
  if (mx || my) {
    const m = Math.hypot(mx, my);
    const oldX = p.x;
    const oldY = p.y;
    p.x += (mx / m) * p.speed * dt;
    p.y += (my / m) * p.speed * dt;
    circleWallResolve(p, oldX, oldY);
  }

  const aim = getAimVector();
  if (aim && p.fireCooldown <= 0) {
    fire(aim);
    p.fireCooldown = Math.max(0.22, 0.32 - upgrades.spread.level * 0.01);
  }

  state.enemySpawnTimer -= dt;
  const spawnInterval = Math.max(0.45, 1.2 - state.runScore * 0.003);
  if (state.enemySpawnTimer <= 0) {
    spawnEnemy();
    state.enemySpawnTimer = spawnInterval;
  }

  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || isWallAt(b.x, b.y)) {
      state.bullets.splice(i, 1);
      continue;
    }
    for (let j = state.enemies.length - 1; j >= 0; j--) {
      const e = state.enemies[j];
      if (Math.hypot(b.x - e.x, b.y - e.y) < b.r + e.r) {
        e.hp -= 1;
        state.bullets.splice(i, 1);
        if (e.hp <= 0) {
          state.enemies.splice(j, 1);
          const dropCount = Math.random() < DOUBLE_DROP_CHANCE ? 2 : 1;
          for (let k = 0; k < dropCount; k++) {
            state.pickups.push({
              x: e.x + (Math.random() - 0.5) * 10,
              y: e.y + (Math.random() - 0.5) * 10,
              r: 5,
              value: 1,
            });
          }
        }
        break;
      }
    }
  }

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    e.hitCooldown = Math.max(0, e.hitCooldown - dt);
    let dx = p.x - e.x;
    let dy = p.y - e.y;
    const m = Math.max(0.001, Math.hypot(dx, dy));
    dx /= m;
    dy /= m;

    let sepX = 0;
    let sepY = 0;
    for (let j = 0; j < state.enemies.length; j++) {
      if (i === j) continue;
      const o = state.enemies[j];
      const ddx = e.x - o.x;
      const ddy = e.y - o.y;
      const d = Math.hypot(ddx, ddy);
      if (d > 0 && d < ENEMY_SEPARATION_DISTANCE) {
        sepX += ddx / d;
        sepY += ddy / d;
      }
    }
    dx += sepX * 0.65;
    dy += sepY * 0.65;
    const dm = Math.max(0.001, Math.hypot(dx, dy));
    dx /= dm;
    dy /= dm;

    const oldX = e.x;
    const oldY = e.y;
    e.x += dx * e.speed * dt;
    e.y += dy * e.speed * dt;
    circleWallResolve(e, oldX, oldY);

    if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.radius && p.invuln <= 0 && e.hitCooldown <= 0) {
      p.hp -= e.touchDamage;
      p.invuln = 0.7;
      e.hitCooldown = 0.35;
      state.hurtFlash = 0.18;
      if (p.hp <= 0) {
        state.bank += state.runScore;
        state.scene = "shop";
        state.shopSelection = 0;
        return;
      }
    }
  }

  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const c = state.pickups[i];
    if (Math.hypot(c.x - p.x, c.y - p.y) < c.r + p.radius) {
      state.runScore += c.value;
      state.pickups.splice(i, 1);
    }
  }
}

function drawMaze() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * TILE;
      const y = r * TILE;
      if (MAZE[r][c] === "#") {
        ctx.fillStyle = "#1e1f30";
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = "#2c2f4e";
        ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
      } else {
        ctx.fillStyle = "#0d0f17";
        ctx.fillRect(x, y, TILE, TILE);
      }
    }
  }
}

function drawRun() {
  drawMaze();

  for (const c of state.pickups) {
    ctx.fillStyle = "#ffe33a";
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const b of state.bullets) {
    ctx.strokeStyle = "#ff8f3a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.015, b.y - b.vy * 0.015);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillStyle = "#fff4c8";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const e of state.enemies) {
    ctx.fillStyle = "#ff3a58";
    ctx.beginPath();
    ctx.moveTo(e.x, e.y - e.r - 2);
    ctx.lineTo(e.x + e.r + 1, e.y + e.r);
    ctx.lineTo(e.x - e.r - 1, e.y + e.r);
    ctx.closePath();
    ctx.fill();
  }

  const p = state.player;
  const sizeBoost = state.shootPulse > 0 ? 2.3 : 0;
  const hurtTint = p.invuln > 0 ? "#ff8090" : "#6af2ff";
  ctx.fillStyle = hurtTint;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius + sizeBoost, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0b0b0f";
  ctx.beginPath();
  ctx.arc(p.x + 3, p.y - 3, 3, 0, Math.PI * 2);
  ctx.fill();

  if (state.hurtFlash > 0) {
    ctx.fillStyle = "rgba(255, 40, 40, 0.23)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.fillStyle = "#f4f4f8";
  ctx.font = "18px Arial";
  ctx.fillText(`HP: ${p.hp}/${p.maxHp}`, 14, 24);
  ctx.fillText(`Run Points: ${state.runScore}`, 14, 48);
  ctx.fillText(`Bank: ${state.bank}`, 14, 72);
  ctx.fillStyle = "#9ba1b8";
  ctx.fillText("Collect yellow dots. Survive and farm points.", 14, 96);
}

function upgradeCost(key) {
  const u = upgrades[key];
  return Math.floor(u.baseCost * Math.pow(u.growth, u.level));
}

function tryBuyUpgrade(key) {
  const cost = upgradeCost(key);
  if (state.bank < cost) return false;
  state.bank -= cost;
  upgrades[key].level += 1;
  return true;
}

function drawShop() {
  ctx.fillStyle = "#08080d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f25eff";
  ctx.font = "bold 38px Arial";
  ctx.fillText("YOU DIED", 360, 90);
  ctx.fillStyle = "#e7e8ef";
  ctx.font = "22px Arial";
  ctx.fillText("Spend banked points on permanent upgrades", 245, 130);
  ctx.fillText(`Bank: ${state.bank}`, 430, 170);

  const options = ["spread", "speed", "health"];
  for (let i = 0; i < options.length; i++) {
    const key = options[i];
    const u = upgrades[key];
    const y = 230 + i * 90;
    const selected = i === state.shopSelection;
    ctx.fillStyle = selected ? "#31285f" : "#171a28";
    ctx.fillRect(190, y - 40, 580, 68);
    ctx.strokeStyle = selected ? "#73e9ff" : "#39405f";
    ctx.lineWidth = selected ? 3 : 1;
    ctx.strokeRect(190, y - 40, 580, 68);

    ctx.fillStyle = "#f3f5ff";
    ctx.font = "22px Arial";
    ctx.fillText(`${i + 1}. ${u.name} Lv.${u.level}`, 215, y - 5);
    ctx.fillStyle = "#ffe55a";
    ctx.fillText(`Cost: ${upgradeCost(key)}`, 560, y - 5);
  }

  ctx.fillStyle = "#99a1c1";
  ctx.font = "20px Arial";
  ctx.fillText("Press 1/2/3 to buy | Enter or Space to start next run", 210, 560);
}

function updateShop() {
  if (state.keys.has("Digit1")) {
    tryBuyUpgrade("spread");
    state.keys.delete("Digit1");
  } else if (state.keys.has("Digit2")) {
    tryBuyUpgrade("speed");
    state.keys.delete("Digit2");
  } else if (state.keys.has("Digit3")) {
    tryBuyUpgrade("health");
    state.keys.delete("Digit3");
  }
}

let last = performance.now();
function tick(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;

  if (state.scene === "run") {
    updateRun(dt);
    drawRun();
  } else {
    updateShop();
    drawShop();
  }
  requestAnimationFrame(tick);
}

window.addEventListener("keydown", (e) => {
  state.keys.add(e.code);
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
    e.preventDefault();
  }
  if (state.scene === "shop") {
    if (e.code === "ArrowUp") state.shopSelection = Math.max(0, state.shopSelection - 1);
    if (e.code === "ArrowDown") state.shopSelection = Math.min(2, state.shopSelection + 1);
    if (e.code === "Enter" || e.code === "Space") resetRun();
    if (e.code === "KeyB") {
      const map = ["spread", "speed", "health"];
      tryBuyUpgrade(map[state.shopSelection]);
    }
  }
});

window.addEventListener("keyup", (e) => {
  state.keys.delete(e.code);
});

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  state.mouseX = (e.clientX - rect.left) * sx;
  state.mouseY = (e.clientY - rect.top) * sy;
});
canvas.addEventListener("mousedown", () => {
  state.mouseDown = true;
});
window.addEventListener("mouseup", () => {
  state.mouseDown = false;
});

resetRun();
requestAnimationFrame(tick);
