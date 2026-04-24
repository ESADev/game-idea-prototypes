const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const startColumnInput = document.getElementById('startColumn');
const angleInput = document.getElementById('angle');
const ballTypeInput = document.getElementById('ballType');
const throwBtn = document.getElementById('throwBtn');
const newRunBtn = document.getElementById('newRunBtn');
const statusEl = document.getElementById('status');
const shopEl = document.getElementById('shop');
const startValueEl = document.getElementById('startValue');
const angleValueEl = document.getElementById('angleValue');

const cols = 7;
const rows = 12;
const cell = 80;
const simSteps = 150;
const dt = 0.08;
const TIER_ESCALATION_RATE = 30;
const HEAVY_BALL_SPEED = 7;
const NORMAL_BALL_SPEED = 9;
const BASE_DAMAGE = 2;
const HEAVY_DAMAGE_MULTIPLIER = 1.45;

const baseUpgradeDefs = {
  damage: { label: '+1 Base Ball Damage', key: 'damage', baseCost: 20, growth: 1.45 },
  heavy: { label: '+1 Heavy Ball Per Run', key: 'heavy', baseCost: 30, growth: 1.5 },
  bomb: { label: '+1 Bomb Ball Per Run', key: 'bomb', baseCost: 35, growth: 1.55 },
  barrier: { label: '+1 Barrier Charge', key: 'barrier', baseCost: 45, growth: 1.7 }
};

const state = {
  upgrades: { damage: 0, heavy: 0, bomb: 0, barrier: 0 },
  currency: 0,
  enemies: [],
  turn: 1,
  maxTurns: 14,
  kills: 0,
  runActive: false,
  inventory: { heavy: 1, bomb: 1 },
  barrierCharges: 0,
  message: 'Press Start New Run',
  lastShopKey: ''
};

function startRun() {
  state.enemies = [];
  state.turn = 1;
  state.kills = 0;
  state.runActive = true;
  state.inventory = {
    heavy: 1 + state.upgrades.heavy,
    bomb: 1 + state.upgrades.bomb
  };
  state.barrierCharges = state.upgrades.barrier;
  state.message = 'Run started. Throw to stop the wave.';
  spawnWave();
  render();
}

function getEnemyTier(turn) {
  if (turn > 10) return 3;
  if (turn > 6) return 2;
  return 1;
}

function spawnWave() {
  if (state.turn > state.maxTurns) return;
  const count = Math.min(4, 2 + Math.floor(state.turn / 4));
  const occupied = new Set(state.enemies.filter((e) => e.y <= 1).map((e) => `${Math.round(e.x)}:${Math.round(e.y)}`));

  for (let i = 0; i < count; i += 1) {
    let x = Math.floor(Math.random() * cols);
    let attempts = 0;
    while (occupied.has(`${x}:0`) && attempts < 12) {
      x = Math.floor(Math.random() * cols);
      attempts += 1;
    }

    const extraTierChance = state.turn / TIER_ESCALATION_RATE;
    const bonusTier = Math.random() < extraTierChance ? 1 : 0;
    const tier = Math.min(3, getEnemyTier(state.turn) + bonusTier);
    const hp = tier === 1 ? 3 : tier === 2 ? 6 : 10;
    const weight = tier === 1 ? 1 : tier === 2 ? 1.9 : 3;

    occupied.add(`${x}:0`);
    state.enemies.push({
      x,
      y: 0,
      vx: 0,
      vy: 0,
      hp,
      maxHp: hp,
      weight,
      tier
    });
  }
}

function createBall() {
  const angle = Number(angleInput.value) * (Math.PI / 180);
  const column = Number(startColumnInput.value);
  const type = ballTypeInput.value;
  const speed = type === 'heavy' ? HEAVY_BALL_SPEED : NORMAL_BALL_SPEED;

  const ball = {
    x: column + 0.5,
    y: rows - 0.45,
    vx: Math.sin(angle) * speed,
    vy: -Math.cos(angle) * speed,
    radius: 0.28,
    type,
    mass: type === 'heavy' ? 3 : 1,
    damage: (BASE_DAMAGE + state.upgrades.damage) * (type === 'heavy' ? HEAVY_DAMAGE_MULTIPLIER : 1),
    bounce: type !== 'heavy',
    pierce: type === 'heavy',
    alive: true
  };

  return ball;
}

function useBallInventory(type) {
  if (type === 'normal') return true;
  if (state.inventory[type] <= 0) {
    state.message = `No ${type} balls left this run.`;
    return false;
  }
  state.inventory[type] -= 1;
  return true;
}

function explode(x, y) {
  for (const enemy of state.enemies) {
    const dx = enemy.x + 0.5 - x;
    const dy = enemy.y + 0.5 - y;
    const d = Math.hypot(dx, dy);
    if (d <= 1.6) {
      const falloff = Math.max(0.35, 1 - d / 1.8);
      const dmg = (3.5 + state.upgrades.damage * 0.8) * falloff;
      enemy.hp -= dmg;
      const push = 4 * falloff;
      enemy.vx += (dx / (d + 0.001)) * push;
      enemy.vy += (dy / (d + 0.001)) * push;
    }
  }
}

function doThrow() {
  if (!state.runActive) {
    state.message = 'Start a run first.';
    render();
    return;
  }

  if (!useBallInventory(ballTypeInput.value)) {
    render();
    return;
  }

  const ball = createBall();

  for (let i = 0; i < simSteps && ball.alive; i += 1) {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.x < ball.radius || ball.x > cols - ball.radius) {
      if (ball.bounce) {
        ball.vx *= -0.85;
      } else {
        ball.x = Math.max(ball.radius, Math.min(cols - ball.radius, ball.x));
      }
    }

    if (ball.y < -0.2 || ball.y > rows + 0.6) {
      ball.alive = false;
      break;
    }

    for (const enemy of state.enemies) {
      if (enemy.hp <= 0) continue;
      const ex = enemy.x + 0.5;
      const ey = enemy.y + 0.5;
      const dx = ex - ball.x;
      const dy = ey - ball.y;
      const dist = Math.hypot(dx, dy);

      if (dist < ball.radius + 0.42) {
        const hitForce = (Math.hypot(ball.vx, ball.vy) * ball.mass) / enemy.weight;
        const impactDamage = ball.damage + hitForce * 0.9;
        enemy.hp -= impactDamage;

        const nx = dx / (dist + 0.001);
        const ny = dy / (dist + 0.001);
        enemy.vx += nx * hitForce;
        enemy.vy += ny * hitForce;

        if (ball.type === 'bomb') {
          explode(ball.x, ball.y);
          ball.alive = false;
          break;
        }

        if (ball.pierce) {
          ball.vy *= 0.98;
          ball.vx *= 0.98;
        } else {
          ball.vx -= nx * 2.2;
          ball.vy -= ny * 2.2;
          ball.vx *= 0.8;
          ball.vy *= 0.8;
          if (Math.hypot(ball.vx, ball.vy) < 1.2) {
            ball.alive = false;
          }
        }
      }
    }

    for (const enemy of state.enemies) {
      if (enemy.hp <= 0) continue;
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      enemy.vx *= 0.86;
      enemy.vy *= 0.86;
      enemy.x = Math.max(0, Math.min(cols - 1, enemy.x));
      enemy.y = Math.max(0, Math.min(rows - 1, enemy.y));
    }

    for (let a = 0; a < state.enemies.length; a += 1) {
      const e1 = state.enemies[a];
      if (e1.hp <= 0) continue;
      for (let b = a + 1; b < state.enemies.length; b += 1) {
        const e2 = state.enemies[b];
        if (e2.hp <= 0) continue;
        const dx = e2.x - e1.x;
        const dy = e2.y - e1.y;
        const d = Math.hypot(dx, dy);
        if (d < 0.78) {
          const nx = dx / (d + 0.001);
          const ny = dy / (d + 0.001);
          const rel = Math.hypot(e1.vx - e2.vx, e1.vy - e2.vy);
          const transfer = rel * 0.42;

          e1.vx -= nx * transfer / e1.weight;
          e1.vy -= ny * transfer / e1.weight;
          e2.vx += nx * transfer / e2.weight;
          e2.vy += ny * transfer / e2.weight;

          if (rel > 2.1) {
            const chainDamage = rel * 0.55;
            e1.hp -= chainDamage;
            e2.hp -= chainDamage;
          }
        }
      }
    }
  }

  let reward = 0;
  state.enemies = state.enemies.filter((e) => {
    if (e.hp > 0) return true;
    reward += 4 + e.tier * 3;
    state.kills += 1;
    return false;
  });
  state.currency += reward;

  enemyAdvanceStep();
  resolveTurnState();
  render();
}

function enemyAdvanceStep() {
  for (const enemy of state.enemies) {
    enemy.x = Math.round(enemy.x);
    enemy.y = Math.min(rows - 1, Math.round(enemy.y) + 1);
    enemy.vx = 0;
    enemy.vy = 0;
  }
}

function resolveTurnState() {
  const intruders = state.enemies.filter((e) => e.y >= rows - 1).length;

  if (intruders > 0) {
    if (state.barrierCharges > 0) {
      state.barrierCharges -= 1;
      state.enemies = state.enemies.filter((e) => e.y < rows - 1);
      state.message = 'Barrier absorbed a breach!';
    } else {
      state.runActive = false;
      state.message = 'Run failed: enemies reached you.';
      return;
    }
  }

  if (state.turn >= state.maxTurns && state.enemies.length === 0) {
    state.runActive = false;
    const clearBonus = 35 + Math.floor(state.maxTurns * 1.5);
    state.currency += clearBonus;
    state.message = `Stage cleared! +${clearBonus} bonus currency.`;
    return;
  }

  state.turn += 1;
  if (state.turn <= state.maxTurns) {
    spawnWave();
    state.message = `Turn ${state.turn}/${state.maxTurns}. Plan your next throw.`;
  } else {
    state.message = 'Final turns survived. Eliminate remaining enemies!';
  }
}

function upgradeCost(def) {
  const level = state.upgrades[def.key];
  return Math.floor(def.baseCost * def.growth ** level);
}

function buyUpgrade(key) {
  if (state.runActive) {
    state.message = 'Can only buy upgrades between runs.';
    render();
    return;
  }

  const def = baseUpgradeDefs[key];
  const cost = upgradeCost(def);
  if (state.currency < cost) {
    state.message = 'Not enough currency.';
    render();
    return;
  }

  state.currency -= cost;
  state.upgrades[key] += 1;
  state.message = `${def.label} purchased.`;
  render();
}

function renderShop() {
  shopEl.innerHTML = '';
  for (const def of Object.values(baseUpgradeDefs)) {
    const cost = upgradeCost(def);
    const level = state.upgrades[def.key];
    const item = document.createElement('div');
    item.className = 'shop-item';
    const title = document.createElement('strong');
    title.textContent = def.label;
    const levelEl = document.createElement('span');
    levelEl.textContent = `Level: ${level}`;
    const costEl = document.createElement('span');
    costEl.textContent = `Cost: ${cost}`;
    item.appendChild(title);
    item.appendChild(levelEl);
    item.appendChild(costEl);
    const btn = document.createElement('button');
    btn.textContent = 'Buy';
    btn.disabled = state.runActive || state.currency < cost;
    btn.addEventListener('click', () => buyUpgrade(def.key));
    item.appendChild(btn);
    shopEl.appendChild(item);
  }
}

function hpColor(percent) {
  if (percent > 0.66) return '#8be07d';
  if (percent > 0.33) return '#f5c861';
  return '#f27474';
}

function renderGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(0, 0);
  ctx.strokeStyle = '#242c3d';
  ctx.lineWidth = 1;

  for (let x = 0; x <= cols; x += 1) {
    ctx.beginPath();
    ctx.moveTo(x * cell, 0);
    ctx.lineTo(x * cell, rows * cell);
    ctx.stroke();
  }
  for (let y = 0; y <= rows; y += 1) {
    ctx.beginPath();
    ctx.moveTo(0, y * cell);
    ctx.lineTo(cols * cell, y * cell);
    ctx.stroke();
  }

  ctx.fillStyle = '#3351a6';
  ctx.fillRect(0, (rows - 1) * cell, cols * cell, cell);

  const sx = (Number(startColumnInput.value) + 0.5) * cell;
  const sy = (rows - 0.45) * cell;
  const angle = Number(angleInput.value) * (Math.PI / 180);
  ctx.strokeStyle = '#6cc9ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx + Math.sin(angle) * 160, sy - Math.cos(angle) * 160);
  ctx.stroke();

  for (const enemy of state.enemies) {
    const x = (enemy.x + 0.5) * cell;
    const y = (enemy.y + 0.5) * cell;

    const size = enemy.tier === 1 ? 26 : enemy.tier === 2 ? 31 : 36;
    ctx.fillStyle = enemy.tier === 1 ? '#87b7ff' : enemy.tier === 2 ? '#5f86d7' : '#495a85';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    const pct = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = hpColor(pct);
    ctx.fillRect(x - 24, y - size - 14, 48 * pct, 6);
    ctx.strokeStyle = '#1a1d28';
    ctx.strokeRect(x - 24, y - size - 14, 48, 6);
  }

  ctx.restore();
}

function appendStatusLine(label, value) {
  const line = document.createElement('p');
  line.append(`${label}: `);
  const strong = document.createElement('strong');
  strong.textContent = value;
  line.appendChild(strong);
  statusEl.appendChild(line);
}

function render() {
  startValueEl.textContent = startColumnInput.value;
  angleValueEl.textContent = angleInput.value;

  statusEl.innerHTML = '';
  const message = document.createElement('p');
  const messageStrong = document.createElement('strong');
  messageStrong.textContent = state.message;
  message.appendChild(messageStrong);
  statusEl.appendChild(message);
  appendStatusLine('Currency', `${state.currency}`);
  appendStatusLine('Turn', `${state.turn}/${state.maxTurns} ${state.runActive ? '(Active)' : '(Between Runs)'}`);
  appendStatusLine('Kills this run', `${state.kills}`);
  appendStatusLine('Special Balls', `Heavy ${state.inventory.heavy}, Bomb ${state.inventory.bomb}`);
  appendStatusLine('Barrier Charges', `${state.barrierCharges}`);
  appendStatusLine(
    'Upgrades',
    `Damage ${state.upgrades.damage}, Heavy ${state.upgrades.heavy}, Bomb ${state.upgrades.bomb}, Barrier ${state.upgrades.barrier}`
  );

  throwBtn.disabled = !state.runActive;
  newRunBtn.disabled = state.runActive;

  const shopKey = `${state.currency}|${state.runActive}|${state.upgrades.damage}|${state.upgrades.heavy}|${state.upgrades.bomb}|${state.upgrades.barrier}`;
  if (shopKey !== state.lastShopKey) {
    renderShop();
    state.lastShopKey = shopKey;
  }
  renderGrid();
}

throwBtn.addEventListener('click', doThrow);
newRunBtn.addEventListener('click', () => {
  startRun();
});
startColumnInput.addEventListener('input', render);
angleInput.addEventListener('input', render);
ballTypeInput.addEventListener('change', render);

render();
