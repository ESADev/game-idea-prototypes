import './style.css'
import { CFG } from './config.js'

// ── Upgrade definitions (in-run) ────────────────────────────────────────────
const IN_RUN_UPGRADE_DEFS = [
  { key: 'speedBoost',   label: '🏃 Hız Artışı', desc: 'Raket %20 daha hızlı' },
  { key: 'ballSpeed',    label: '⚡ Top Hızı',    desc: 'Toplar %15 daha hızlı' },
  { key: 'extraBallRun', label: '🎱 Ekstra Top',  desc: 'Bu turda +1 top' },
  { key: 'shield',       label: '🛡 Kalkan',      desc: '3 vuruşu emer' },
  { key: 'magnet',       label: '🧲 Mıknatıs',   desc: 'Kristaller raketi arar' },
  { key: 'doubleGems',   label: '💎 Çift Taş',   desc: '%50 ihtimal: +1 taş düşer' },
]

// ── HTML ─────────────────────────────────────────────────────────────────────
const app = document.querySelector('#app')
app.innerHTML = `
  <div class="layout">
    <h1>Pong Survivors</h1>
    <div class="hud">
      <span id="money">💰 0</span>
      <span id="crystals-hud">💎 0</span>
      <span id="hp-hud">❤️ Can: 100</span>
      <span id="castle-hp-hud">🏰 Kale: 300</span>
    </div>
    <div class="canvas-wrap">
      <canvas id="game" width="960" height="600" aria-label="Oyun alanı"></canvas>
      <div id="shop" class="shop hidden" role="dialog" aria-modal="true">
        <h2>Yükseltme Dükkanı</h2>
        <p id="shop-summary"></p>
        <div class="shop-actions">
          <button id="buy-width"  class="shop-btn"></button>
          <button id="buy-balls"  class="shop-btn"></button>
          <button id="buy-pierce" class="shop-btn"></button>
        </div>
        <button id="next-run" class="start-btn">Sonraki Tur</button>
      </div>
      <div id="upgrade-menu" class="upgrade-panel hidden" role="dialog" aria-modal="true">
        <h2>Yükseltme Seç — 10 💎</h2>
        <div class="shop-actions" id="upgrade-choices"></div>
        <button id="upgrade-skip" class="skip-btn">Geç</button>
      </div>
    </div>
    <div class="touch-controls" aria-label="Dokunmatik kontroller">
      <button class="touch-btn" id="btn-left"  aria-label="Sola git">&#9664;</button>
      <button class="touch-btn" id="btn-right" aria-label="Sağa git">&#9654;</button>
    </div>
  </div>
`

// ── DOM refs ─────────────────────────────────────────────────────────────────
const canvas       = document.querySelector('#game')
const ctx          = canvas.getContext('2d')
const moneyEl      = document.querySelector('#money')
const crystalsHudEl= document.querySelector('#crystals-hud')
const hpHudEl      = document.querySelector('#hp-hud')
const castleHpHudEl= document.querySelector('#castle-hp-hud')
const shopEl       = document.querySelector('#shop')
const shopSummaryEl= document.querySelector('#shop-summary')
const buyWidthBtn  = document.querySelector('#buy-width')
const buyBallsBtn  = document.querySelector('#buy-balls')
const buyPierceBtn = document.querySelector('#buy-pierce')
const nextRunBtn   = document.querySelector('#next-run')
const upgradeMenuEl= document.querySelector('#upgrade-menu')
const upgradeChoicesEl = document.querySelector('#upgrade-choices')
const upgradeSkipBtn   = document.querySelector('#upgrade-skip')
const btnLeft  = document.querySelector('#btn-left')
const btnRight = document.querySelector('#btn-right')

// ── World + layout constants ─────────────────────────────────────────────────
const world = { w: canvas.width, h: canvas.height }

// Breach line: enemies that cross this slow down, stop, and explode on castle.
// It sits BELOW the paddle — between paddle bottom and the castle battlements.
const BREACH_Y      = world.h - CFG.CASTLE_H - CFG.CASTLE_BATT_H - 8   // ≈ 516
const PADDLE_START_Y= world.h - CFG.CASTLE_H - CFG.CASTLE_BATT_H - 62  // ≈ 462

// ── Input state ──────────────────────────────────────────────────────────────
const keys = { left: false, right: false }

// ── Game state ───────────────────────────────────────────────────────────────
const state = {
  running: true,
  paused: false,
  money: 0,
  runKills: 0,
  crystals: 0,
  spawnTimer: 0,
  time: 0,
  upgrades:      { width: 0, extraBalls: 0, pierce: 0 },
  inRunUpgrades: { speedBoost: 0, ballSpeed: 0, extraBallRun: 0, shield: 0, magnet: 0, doubleGems: 0 },
  balls: [],
  waitingBalls: [],   // { timer: seconds, pierceLeft: N } — queued for relaunch
  enemies: [],
  crystalPickups: [],
  coinPickups: [],
  explosions: [],
  paddle: {
    x: world.w / 2,
    y: PADDLE_START_Y,
    vx: 0,
    width: CFG.PADDLE_BASE_WIDTH,
    height: CFG.PADDLE_HEIGHT,
    speed: CFG.PADDLE_BASE_SPEED,
    hp: CFG.PADDLE_MAX_HP,
    lastHitTime: -999,
  },
  castle: { hp: CFG.CASTLE_MAX_HP },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getBallSpeedMult()   { return 1 + state.inRunUpgrades.ballSpeed   * CFG.BALL_SPEED_PER_LEVEL }
function getPaddleSpeedMult() { return 1 + state.inRunUpgrades.speedBoost  * CFG.PADDLE_SPEED_PER_LEVEL }

function getCost(type) {
  const bases = { width: CFG.COST_BASE_WIDTH, extraBalls: CFG.COST_BASE_EXTRA_BALLS, pierce: CFG.COST_BASE_PIERCE }
  return Math.floor(bases[type] * Math.pow(CFG.COST_SCALE_FACTOR, state.upgrades[type]))
}

// Crystal drop count: triangular distribution peaked at 2 (≈75% 2s, ≈12.5% each 1 & 3)
function crystalDropCount() {
  return Math.max(CFG.CRYSTAL_VALUE_MIN,
    Math.min(CFG.CRYSTAL_VALUE_MAX,
      Math.round(CFG.CRYSTAL_VALUE_MIN + Math.random() + Math.random())))
}

// ── Persistence ───────────────────────────────────────────────────────────────
function saveUpgrades() {
  localStorage.setItem(CFG.STORAGE_KEY, JSON.stringify({ upgrades: state.upgrades, money: state.money }))
}
function loadUpgrades() {
  try {
    const raw = localStorage.getItem(CFG.STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (parsed?.upgrades) {
      state.upgrades.width      = Number(parsed.upgrades.width)      || 0
      state.upgrades.extraBalls = Number(parsed.upgrades.extraBalls) || 0
      state.upgrades.pierce     = Number(parsed.upgrades.pierce)     || 0
    }
    state.money = Number(parsed?.money) || 0
  } catch { /* ignore broken saves */ }
}

// ── Run lifecycle ─────────────────────────────────────────────────────────────
function resetRun() {
  state.runKills    = 0
  state.crystals    = 0
  state.spawnTimer  = 0
  state.time        = 0
  state.enemies     = []
  state.crystalPickups = []
  state.coinPickups    = []
  state.explosions     = []
  state.balls          = []
  state.waitingBalls   = []
  state.paused   = false
  state.running  = true

  state.inRunUpgrades = { speedBoost: 0, ballSpeed: 0, extraBallRun: 0, shield: 0, magnet: 0, doubleGems: 0 }

  state.paddle.width       = CFG.PADDLE_BASE_WIDTH + state.upgrades.width * CFG.PADDLE_WIDTH_PER_UPGRADE
  state.paddle.x           = world.w / 2
  state.paddle.y           = PADDLE_START_Y
  state.paddle.vx          = 0
  state.paddle.hp          = CFG.PADDLE_MAX_HP
  state.paddle.lastHitTime = -999

  state.castle.hp = CFG.CASTLE_MAX_HP

  const ballCount = 1 + state.upgrades.extraBalls
  state.balls = Array.from({ length: ballCount }, (_, i) => createBall(i, ballCount))
}

function createBall(index, total) {
  const spread = (index - (total - 1) / 2) * CFG.BALL_SPREAD_INIT_FACTOR
  const speed  = CFG.BALL_BASE_SPEED * getBallSpeedMult()
  return {
    x: state.paddle.x + spread * CFG.BALL_SPREAD_X_OFFSET,
    y: state.paddle.y - 22,
    vx: speed * spread,
    vy: -speed,
    r:  CFG.BALL_RADIUS,
    pierceLeft: state.upgrades.pierce,
  }
}

function createRelaunchedBall(wb) {
  const speed = CFG.BALL_BASE_SPEED * getBallSpeedMult()
  return {
    x: state.paddle.x,
    y: state.paddle.y - 24,
    vx: (Math.random() - 0.5) * CFG.BALL_MISS_VX_SPREAD,
    vy: -speed,
    r:  CFG.BALL_RADIUS,
    pierceLeft: wb.pierceLeft,
  }
}

function endRun() {
  state.running = false
  state.paused  = false
  state.waitingBalls = []
  upgradeMenuEl.classList.add('hidden')
  shopEl.classList.remove('hidden')
  shopSummaryEl.textContent = `Bu turda ${state.runKills} düşman öldürdünüz.`
  renderShopButtons()
}

// ── Damage helpers ────────────────────────────────────────────────────────────
function applyPaddleHit(dmg) {
  if (state.inRunUpgrades.shield > 0) {
    state.inRunUpgrades.shield -= 1
  } else {
    state.paddle.hp = Math.max(0, state.paddle.hp - dmg)
    state.paddle.lastHitTime = state.time
  }
}
function applyCastleDamage(dmg) {
  state.castle.hp = Math.max(0, state.castle.hp - dmg)
}

// ── Physics updates ───────────────────────────────────────────────────────────
function updatePaddleHP(dt) {
  if (state.time - state.paddle.lastHitTime >= CFG.PADDLE_HP_REGEN_DELAY) {
    state.paddle.hp = Math.min(CFG.PADDLE_MAX_HP, state.paddle.hp + CFG.PADDLE_HP_REGEN_RATE * dt)
  }
}

function updatePaddle(dt) {
  const dir      = (keys.right ? 1 : 0) - (keys.left ? 1 : 0)
  const maxSpeed = state.paddle.speed * getPaddleSpeedMult()
  const rate     = dir !== 0 ? CFG.PADDLE_ACCEL_RATE : CFG.PADDLE_DECEL_RATE
  state.paddle.vx += (dir * maxSpeed - state.paddle.vx) * Math.min(1, rate * dt)
  state.paddle.x  += state.paddle.vx * dt
  const half = state.paddle.width / 2
  state.paddle.x = Math.max(half, Math.min(world.w - half, state.paddle.x))
}

function reflectFromPaddle(ball) {
  const p        = state.paddle
  const relative = (ball.x - p.x) / (p.width / 2)
  const clamped  = Math.max(-1, Math.min(1, relative))
  const speed    = Math.hypot(ball.vx, ball.vy) * CFG.BALL_SPEED_BOOST_REFLECT * getBallSpeedMult()
  ball.vx = clamped * speed * CFG.BALL_REFLECT_CURVE
  ball.vy = -Math.abs(speed * (CFG.BALL_REFLECT_VY_CENTER + CFG.BALL_REFLECT_VY_EDGE_BONUS * (1 - Math.abs(clamped))))
  ball.pierceLeft = state.upgrades.pierce
}

// Returns true if the ball was missed (caller handles queuing + removal)
function updateBall(ball, dt) {
  ball.x += ball.vx * dt
  ball.y += ball.vy * dt

  // Wall bounces
  if (ball.x - ball.r <= 0        && ball.vx < 0) { ball.x = ball.r;           ball.vx *= -1 }
  if (ball.x + ball.r >= world.w  && ball.vx > 0) { ball.x = world.w - ball.r; ball.vx *= -1 }
  if (ball.y - ball.r <= 0        && ball.vy < 0) { ball.y = ball.r;            ball.vy *= -1 }

  // Paddle reflection
  const p       = state.paddle
  const withinX = ball.x >= p.x - p.width / 2  && ball.x <= p.x + p.width / 2
  const touchY  = ball.y + ball.r >= p.y - p.height / 2 && ball.y - ball.r <= p.y + p.height / 2
  if (withinX && touchY && ball.vy > 0) {
    ball.y = p.y - p.height / 2 - ball.r
    reflectFromPaddle(ball)
  }

  // Ball crossed the breach line → missed, no damage, queue for relaunch
  if (ball.y - ball.r > BREACH_Y) {
    return true  // signal to caller: remove and queue this ball
  }
  return false
}

// Update waiting-ball countdown; relaunch when timer expires
function updateWaitingBalls(dt) {
  for (let i = state.waitingBalls.length - 1; i >= 0; i--) {
    const wb = state.waitingBalls[i]
    wb.timer -= dt
    if (wb.timer <= 0) {
      state.waitingBalls.splice(i, 1)
      state.balls.push(createRelaunchedBall(wb))
    }
  }
}

function spawnEnemy() {
  const roll = Math.random()
  let x, y
  if (roll < CFG.ENEMY_TOP_SPAWN_CHANCE) {
    x = Math.random() * world.w
    y = -CFG.ENEMY_BASE_RADIUS * 2
  } else if (roll < CFG.ENEMY_LEFT_SPAWN_CHANCE) {
    x = -CFG.ENEMY_BASE_RADIUS * 2
    y = Math.random() * world.h * CFG.ENEMY_SIDE_Y_FRACTION
  } else {
    x = world.w + CFG.ENEMY_BASE_RADIUS * 2
    y = Math.random() * world.h * CFG.ENEMY_SIDE_Y_FRACTION
  }

  const r     = CFG.ENEMY_BASE_RADIUS + Math.floor((Math.random() - 0.5) * CFG.ENEMY_RADIUS_VARIANCE)
  const hue   = Math.round(355 + (Math.random() - 0.5) * 20)
  const sat   = Math.round(70  + Math.random() * 20)
  const light = Math.round(45  + Math.random() * 10)
  const speed = CFG.ENEMY_BASE_SPEED + Math.random() * CFG.ENEMY_SPEED_VARIANCE
              + Math.min(CFG.ENEMY_SPEED_TIME_CAP, state.time * CFG.ENEMY_SPEED_TIME_SCALE)

  state.enemies.push({ x, y, r, color: `hsl(${hue},${sat}%,${light}%)`, speed, breaching: false })
}

function handleEnemyMovement(dt) {
  // Move all enemies
  for (const e of state.enemies) {
    if (e.breaching) e.speed = Math.max(0, e.speed - CFG.ENEMY_BREACH_DECEL * dt)
    e.y += e.speed * dt
  }

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i]

    // ── Direct paddle hit → paddle damage ──────────────────────────────────
    if (!e.breaching) {
      const hitPaddle =
        e.y + e.r >= state.paddle.y - state.paddle.height / 2 &&
        e.y - e.r <= state.paddle.y + state.paddle.height / 2 &&
        e.x >= state.paddle.x - state.paddle.width / 2 &&
        e.x <= state.paddle.x + state.paddle.width / 2

      if (hitPaddle) {
        state.enemies.splice(i, 1)
        applyPaddleHit(CFG.PADDLE_HP_PER_HIT)
        spawnExplosion(e.x, e.y, 32, true)
        continue
      }

      // Cross breach line → start slowing toward castle
      if (e.y + e.r >= BREACH_Y) e.breaching = true
    }

    // ── Breaching enemy stopped or reached castle wall → explode ───────────
    if (e.breaching && (e.speed <= 0 || e.y + e.r >= world.h - CFG.CASTLE_H)) {
      state.enemies.splice(i, 1)
      applyCastleDamage(CFG.ENEMY_CASTLE_DAMAGE)
      spawnExplosion(e.x, Math.min(e.y, world.h - CFG.CASTLE_H - 5), 52, false)
    }
  }
}

function spawnExplosion(x, y, maxR, isPaddle) {
  state.explosions.push({ x, y, r: 4, maxR, age: 0, maxAge: 0.55, isPaddle })
}
function updateExplosions(dt) {
  for (let i = state.explosions.length - 1; i >= 0; i--) {
    const ex = state.explosions[i]
    ex.age += dt
    ex.r    = ex.maxR * (ex.age / ex.maxAge)
    if (ex.age >= ex.maxAge) state.explosions.splice(i, 1)
  }
}

function handleBallEnemyCollisions() {
  for (const ball of state.balls) {
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i]
      if (e.breaching) continue  // breaching enemies are past the playfield

      const nearX = Math.max(e.x - e.r, Math.min(ball.x, e.x + e.r))
      const nearY = Math.max(e.y - e.r, Math.min(ball.y, e.y + e.r))
      const dx = ball.x - nearX
      const dy = ball.y - nearY
      if (dx * dx + dy * dy > ball.r * ball.r) continue

      // ── Kill ──────────────────────────────────────────────────────────────
      state.enemies.splice(i, 1)
      state.runKills += 1
      state.money    += 1

      // Crystal drop — always at least 1, up to 3 (triangular dist peaked at 2)
      {
        const base  = crystalDropCount()  // guaranteed 1-3
        const count = (state.inRunUpgrades.doubleGems > 0 && Math.random() < CFG.DOUBLE_GEMS_CHANCE)
                      ? base + 1 : base
        for (let c = 0; c < count; c++) {
          state.crystalPickups.push({
            x:  e.x + (Math.random() - 0.5) * CFG.CRYSTAL_SPREAD_X,
            y:  e.y + (Math.random() - 0.5) * CFG.CRYSTAL_SPREAD_Y,
            vy: CFG.CRYSTAL_SPEED_MIN + Math.random() * (CFG.CRYSTAL_SPEED_MAX - CFG.CRYSTAL_SPEED_MIN),
          })
        }
      }

      // Coin drop
      if (Math.random() < CFG.COIN_DROP_CHANCE) {
        state.coinPickups.push({
          x:  e.x + (Math.random() - 0.5) * CFG.COIN_SPREAD_X,
          y:  e.y,
          vy: CFG.COIN_SPEED_MIN + Math.random() * (CFG.COIN_SPEED_MAX - CFG.COIN_SPEED_MIN),
        })
      }

      // ── Ball bounce ───────────────────────────────────────────────────────
      if (ball.pierceLeft > 0) {
        ball.pierceLeft -= 1
      } else {
        if (Math.abs(dx) >= Math.abs(dy)) ball.vx *= -1
        else                               ball.vy *= -1
        break
      }
    }
  }
}

function updateCrystals(dt) {
  const px = state.paddle.x
  const py = state.paddle.y - state.paddle.height / 2
  const pw = state.paddle.width / 2
  const pr = CFG.CRYSTAL_PICKUP_RADIUS

  for (let i = state.crystalPickups.length - 1; i >= 0; i--) {
    const c = state.crystalPickups[i]

    if (state.inRunUpgrades.magnet > 0) {
      c.x  += (px - c.x) * CFG.CRYSTAL_MAGNET_PULL * dt
      c.vy  = Math.min(c.vy + CFG.CRYSTAL_MAGNET_ACCEL * dt, CFG.CRYSTAL_MAGNET_MAX_VY)
    }
    c.y += c.vy * dt

    if (c.y + pr >= py - 4 &&
        c.y - pr <= py + state.paddle.height + 4 &&
        c.x >= px - pw - pr &&
        c.x <= px + pw + pr) {
      state.crystalPickups.splice(i, 1)
      state.crystals += 1
      if (state.crystals >= CFG.CRYSTAL_THRESHOLD && !state.paused && state.running) {
        state.paused = true
        showUpgradeMenu()
      }
      continue
    }

    if (c.y - pr > world.h) state.crystalPickups.splice(i, 1)
  }
}

function updateCoins(dt) {
  const px = state.paddle.x
  const py = state.paddle.y - state.paddle.height / 2
  const pw = state.paddle.width / 2
  const pr = CFG.COIN_PICKUP_RADIUS

  for (let i = state.coinPickups.length - 1; i >= 0; i--) {
    const c = state.coinPickups[i]
    c.y += c.vy * dt

    if (c.y + pr >= py - 4 &&
        c.y - pr <= py + state.paddle.height + 4 &&
        c.x >= px - pw - pr &&
        c.x <= px + pw + pr) {
      state.coinPickups.splice(i, 1)
      state.money += CFG.COIN_VALUE
      continue
    }

    if (c.y - pr > world.h) state.coinPickups.splice(i, 1)
  }
}

// ── Upgrade menu ──────────────────────────────────────────────────────────────
function showUpgradeMenu() {
  upgradeMenuEl.classList.remove('hidden')
  upgradeChoicesEl.innerHTML = ''

  const choices = [...IN_RUN_UPGRADE_DEFS].sort(() => Math.random() - 0.5).slice(0, 3)
  for (const upg of choices) {
    const btn = document.createElement('button')
    btn.className = 'shop-btn upgrade-choice-btn'
    btn.innerHTML = `<span class="upg-label">${upg.label}</span><span class="upg-desc">${upg.desc}</span>`
    btn.addEventListener('click', () => {
      applyInRunUpgrade(upg.key)
      state.crystals -= CFG.CRYSTAL_THRESHOLD
      upgradeMenuEl.classList.add('hidden')
      state.paused = false
    })
    upgradeChoicesEl.appendChild(btn)
  }
}

function applyInRunUpgrade(key) {
  if (key === 'shield') {
    state.inRunUpgrades.shield += CFG.SHIELD_STACKS_PER_PICK
  } else if (key === 'extraBallRun') {
    state.inRunUpgrades.extraBallRun += 1
    const speed = CFG.BALL_BASE_SPEED * getBallSpeedMult()
    state.balls.push({
      x: state.paddle.x,
      y: state.paddle.y - 24,
      vx: (Math.random() - 0.5) * CFG.EXTRA_BALL_RUN_VX_SPREAD,
      vy: -speed,
      r:  CFG.BALL_RADIUS,
      pierceLeft: state.upgrades.pierce,
    })
  } else {
    state.inRunUpgrades[key] += 1
  }
}

upgradeSkipBtn.addEventListener('click', () => {
  upgradeMenuEl.classList.add('hidden')
  state.paused = false
})

// ── HUD ───────────────────────────────────────────────────────────────────────
function updateHUD() {
  moneyEl.textContent     = `💰 ${state.money}`
  crystalsHudEl.textContent = `💎 ${state.crystals}`

  const hpPct = state.paddle.hp / CFG.PADDLE_MAX_HP
  hpHudEl.textContent  = `❤️ Can: ${Math.ceil(state.paddle.hp)}`
  hpHudEl.style.color  = hpPct <= 0.25 ? '#ef4444' : hpPct <= 0.5 ? '#f97316' : ''

  const cPct = state.castle.hp / CFG.CASTLE_MAX_HP
  castleHpHudEl.textContent = `🏰 Kale: ${Math.ceil(state.castle.hp)}`
  castleHpHudEl.style.color = cPct  <= 0.25 ? '#ef4444' : cPct  <= 0.5 ? '#f97316' : ''
}

function renderShopButtons() {
  const wc = getCost('width')
  const bc = getCost('extraBalls')
  const pc = getCost('pierce')
  buyWidthBtn.textContent  = `Geniş Raket Sv.${state.upgrades.width}      (+22px)     — 💰${wc}`
  buyBallsBtn.textContent  = `Ekstra Top  Sv.${state.upgrades.extraBalls} (+1 top)    — 💰${bc}`
  buyPierceBtn.textContent = `Delme       Sv.${state.upgrades.pierce}     (+1 geçiş)  — 💰${pc}`
  buyWidthBtn.disabled  = state.money < wc
  buyBallsBtn.disabled  = state.money < bc
  buyPierceBtn.disabled = state.money < pc
}

// ── Drawing ───────────────────────────────────────────────────────────────────
function drawCastle() {
  const cY = world.h - CFG.CASTLE_H
  const cW = world.w

  // Body fill
  ctx.fillStyle = '#1e1050'
  ctx.fillRect(0, cY, cW, CFG.CASTLE_H)

  // Stone-block rows
  ctx.strokeStyle = '#2d1a70'
  ctx.lineWidth = 1
  for (let row = 0; row < 3; row++) {
    const rowY = cY + 6 + row * 17
    const off  = row % 2 === 0 ? 0 : 26
    for (let bx = -off; bx < cW; bx += 52) ctx.strokeRect(bx + 1, rowY, 50, 15)
  }

  // Crenellations
  ctx.fillStyle = '#251560'
  const battW = 28, battGap = 18, period = battW + battGap
  for (let bx = 4; bx < cW - battW; bx += period)
    ctx.fillRect(bx, cY - CFG.CASTLE_BATT_H, battW, CFG.CASTLE_BATT_H)

  // Side towers
  const tW = 54, tH = CFG.CASTLE_H + 28
  ctx.fillStyle = '#180e45'
  ctx.fillRect(0,      cY - 28, tW, tH)
  ctx.fillRect(cW - tW, cY - 28, tW, tH)

  // Tower battlements
  ctx.fillStyle = '#251560'
  const tBatt = 12, tGap = 8
  for (let tx = 4; tx < tW - tBatt; tx += tBatt + tGap) {
    ctx.fillRect(tx,          cY - 28 - 12, tBatt, 12)
    ctx.fillRect(cW - tW + tx, cY - 28 - 12, tBatt, 12)
  }

  // Tower arrow-slit windows
  ctx.fillStyle = '#7c3aed44'
  const winW = 10, winH = 22
  ctx.fillRect(tW / 2 - winW / 2,          cY - 14, winW, winH)
  ctx.fillRect(cW - tW + tW / 2 - winW / 2, cY - 14, winW, winH)

  // Gate arch
  const gateW = 60, gX = cW / 2 - gateW / 2
  ctx.fillStyle = '#0d0830'
  ctx.fillRect(gX, cY, gateW, 28)
  ctx.beginPath()
  ctx.arc(cW / 2, cY, gateW / 2, Math.PI, 0)
  ctx.fill()

  // Castle HP bar
  const hpPct = state.castle.hp / CFG.CASTLE_MAX_HP
  const barX = tW + 12, barW = cW - tW * 2 - 24
  const barY = cY + 6,  barH = 10
  ctx.fillStyle = '#0a0624'
  ctx.fillRect(barX, barY, barW, barH)
  const barColor = hpPct > 0.5 ? '#7c3aed' : hpPct > 0.25 ? '#f97316' : '#ef4444'
  ctx.fillStyle = barColor
  ctx.fillRect(barX, barY, barW * hpPct, barH)
  if (hpPct <= 0.25) {
    ctx.save()
    ctx.shadowBlur  = 10 + 6 * Math.sin(state.time * 8)
    ctx.shadowColor = '#ef4444'
    ctx.fillRect(barX, barY, barW * hpPct, barH)
    ctx.restore()
  }

  // Castle name + HP text
  ctx.fillStyle = '#a78bfa'
  ctx.font = 'bold 13px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`🏰 KOZMİK KALE  ${Math.ceil(state.castle.hp)} / ${CFG.CASTLE_MAX_HP}`, cW / 2, cY + 26)
  ctx.textAlign = 'left'
}

// Crystal progress bar — top of canvas, fills as crystals accumulate toward threshold
function drawCrystalBar() {
  const fill   = Math.min(1, state.crystals / CFG.CRYSTAL_THRESHOLD)
  const barH   = 14
  const barY   = 3
  const margin = 4
  const barX   = margin
  const barW   = world.w - margin * 2

  // Track background
  ctx.fillStyle = '#0a1628'
  ctx.fillRect(barX, barY, barW, barH)

  // Filled portion
  if (fill > 0) {
    const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0)
    grad.addColorStop(0, '#0369a1')
    grad.addColorStop(0.6, '#0ea5e9')
    grad.addColorStop(1, '#22d3ee')
    ctx.fillStyle = grad
    // Pulsing glow when almost full
    if (fill >= 0.8) {
      ctx.save()
      ctx.shadowBlur  = 8 + 5 * Math.sin(state.time * 10)
      ctx.shadowColor = '#22d3ee'
      ctx.fillRect(barX, barY, barW * fill, barH)
      ctx.restore()
    } else {
      ctx.fillRect(barX, barY, barW * fill, barH)
    }
  }

  // Border
  ctx.strokeStyle = '#1e3a5f'
  ctx.lineWidth   = 1
  ctx.strokeRect(barX, barY, barW, barH)

  // Segment tick marks
  ctx.strokeStyle = '#0f172a'
  ctx.lineWidth   = 1
  for (let i = 1; i < CFG.CRYSTAL_THRESHOLD; i++) {
    const tx = barX + (barW / CFG.CRYSTAL_THRESHOLD) * i
    ctx.beginPath()
    ctx.moveTo(tx, barY)
    ctx.lineTo(tx, barY + barH)
    ctx.stroke()
  }

  // Label
  ctx.fillStyle     = fill >= 0.8 ? '#ffffff' : '#94a3b8'
  ctx.font          = `bold ${barH - 4}px Inter, system-ui, sans-serif`
  ctx.textAlign     = 'center'
  ctx.textBaseline  = 'middle'
  ctx.fillText(`💎 ${state.crystals} / ${CFG.CRYSTAL_THRESHOLD}  —  YÜKSELTME`, world.w / 2, barY + barH / 2)
  ctx.textBaseline  = 'alphabetic'
  ctx.textAlign     = 'left'
}

// Ball indicator: bottom-right corner, above the breach line
function drawBallIndicator() {
  const total = state.balls.length + state.waitingBalls.length
  if (total === 0) return

  const R    = CFG.BALL_HUD_RADIUS
  const unit = R * 2 + CFG.BALL_HUD_GAP
  // Anchor: far-right side, vertically centred in the gap between paddle bottom and breach line
  const anchorX = world.w - 16
  const anchorY = Math.round((state.paddle.y + state.paddle.height / 2 + BREACH_Y) / 2)

  // Label
  ctx.fillStyle = '#94a3b8'
  ctx.font      = '11px Inter, system-ui, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('TOPLAR', anchorX, anchorY - R - 6)

  for (let i = 0; i < total; i++) {
    const cx = anchorX - i * unit
    const cy = anchorY

    if (i < state.balls.length) {
      // Active ball — bright cyan dot
      ctx.save()
      ctx.shadowBlur  = 8
      ctx.shadowColor = '#22d3ee'
      ctx.fillStyle   = '#22d3ee'
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    } else {
      // Waiting ball — dark background + progress arc + countdown
      const wb = state.waitingBalls[i - state.balls.length]
      ctx.fillStyle = '#1e293b'
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fill()

      const progress = 1 - wb.timer / CFG.BALL_RELAUNCH_DELAY
      ctx.save()
      ctx.strokeStyle = '#22d3ee88'
      ctx.lineWidth   = 2
      ctx.beginPath()
      ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2)
      ctx.stroke()
      ctx.restore()

      ctx.fillStyle     = '#7dd3fc'
      ctx.font          = `bold ${R - 1}px Inter, system-ui`
      ctx.textAlign     = 'center'
      ctx.textBaseline  = 'middle'
      ctx.fillText(Math.ceil(wb.timer), cx, cy)
      ctx.textBaseline  = 'alphabetic'
    }
  }
  ctx.textAlign = 'left'
}

function draw() {
  ctx.clearRect(0, 0, world.w, world.h)
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, world.w, world.h)

  drawCastle()

  // Danger-zone tint between paddle bottom and breach line
  const dangerTop = state.paddle.y + state.paddle.height / 2 + 4
  ctx.fillStyle = 'rgba(220, 38, 38, 0.06)'
  ctx.fillRect(0, dangerTop, world.w, BREACH_Y - dangerTop)

  // Breach line (dashed red, BELOW the paddle)
  ctx.save()
  ctx.strokeStyle = '#dc2626'
  ctx.lineWidth   = 2
  ctx.shadowBlur  = 10
  ctx.shadowColor = '#ef4444'
  ctx.setLineDash([16, 8])
  ctx.beginPath()
  ctx.moveTo(0, BREACH_Y)
  ctx.lineTo(world.w, BREACH_Y)
  ctx.stroke()
  ctx.restore()

  // Warning label (left-aligned so it doesn't collide with ball HUD)
  ctx.fillStyle = 'rgba(220, 38, 38, 0.8)'
  ctx.font = 'bold 12px Inter, system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('⚠ KALEYİ SAVUNUN — DÜŞMANLARı DURDURUN', 10, BREACH_Y - 4)

  // Canvas border
  ctx.strokeStyle = '#334155'
  ctx.lineWidth   = 2
  ctx.setLineDash([])
  ctx.strokeRect(1, 1, world.w - 2, world.h - 2)

  // Paddle HP bar
  const barW  = state.paddle.width
  const barX  = state.paddle.x - barW / 2
  const barY  = state.paddle.y - state.paddle.height / 2 - 12
  const hpPct = state.paddle.hp / CFG.PADDLE_MAX_HP
  ctx.fillStyle = '#1e293b'
  ctx.fillRect(barX, barY, barW, 8)
  ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#f97316' : '#ef4444'
  ctx.fillRect(barX, barY, barW * hpPct, 8)

  // Paddle body
  ctx.fillStyle = state.inRunUpgrades.shield > 0 ? '#93c5fd' : '#f1f5f9'
  ctx.fillRect(
    state.paddle.x - state.paddle.width / 2,
    state.paddle.y - state.paddle.height / 2,
    state.paddle.width, state.paddle.height
  )
  if (state.inRunUpgrades.shield > 0) {
    ctx.save()
    ctx.strokeStyle = '#60a5fa'
    ctx.lineWidth   = 3
    ctx.shadowBlur  = 10
    ctx.shadowColor = '#60a5fa'
    ctx.strokeRect(
      state.paddle.x - state.paddle.width / 2 - 4,
      state.paddle.y - state.paddle.height / 2 - 4,
      state.paddle.width + 8, state.paddle.height + 8
    )
    ctx.restore()
  }

  // Enemies
  for (const e of state.enemies) {
    if (e.breaching) {
      ctx.save()
      ctx.shadowBlur  = 14 + 6 * Math.sin(state.time * 12)
      ctx.shadowColor = '#ff6600'
      ctx.fillStyle   = '#ff4422'
      ctx.fillRect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2)
      ctx.restore()
    } else {
      ctx.fillStyle = e.color
      ctx.fillRect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2)
    }
  }

  // Active balls
  ctx.fillStyle = '#22d3ee'
  for (const ball of state.balls) {
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2)
    ctx.fill()
  }

  // Crystal pickups — diamond shape
  for (const c of state.crystalPickups) {
    ctx.save()
    ctx.shadowBlur  = 6
    ctx.shadowColor = '#7dd3fc'
    ctx.fillStyle   = '#7dd3fc'
    ctx.beginPath()
    ctx.moveTo(c.x, c.y - 9)
    ctx.lineTo(c.x + 7, c.y)
    ctx.lineTo(c.x, c.y + 9)
    ctx.lineTo(c.x - 7, c.y)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  // Coin pickups — gold circle with $ glyph
  for (const c of state.coinPickups) {
    ctx.save()
    ctx.shadowBlur  = 8
    ctx.shadowColor = '#fbbf24'
    ctx.beginPath()
    ctx.arc(c.x, c.y, CFG.COIN_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle   = '#fbbf24'
    ctx.fill()
    ctx.strokeStyle = '#d97706'
    ctx.lineWidth   = 2
    ctx.stroke()
    ctx.fillStyle     = '#78350f'
    ctx.font          = `bold ${CFG.COIN_RADIUS + 1}px Inter, system-ui`
    ctx.textAlign     = 'center'
    ctx.textBaseline  = 'middle'
    ctx.fillText('$', c.x, c.y)
    ctx.textBaseline  = 'alphabetic'
    ctx.restore()
  }

  // Explosions
  for (const ex of state.explosions) {
    const alpha = 1 - ex.age / ex.maxAge
    ctx.save()
    ctx.globalAlpha = alpha
    const grad = ctx.createRadialGradient(ex.x, ex.y, 0, ex.x, ex.y, Math.max(1, ex.r))
    if (ex.isPaddle) {
      grad.addColorStop(0, '#ffffff')
      grad.addColorStop(0.5, '#60a5fa')
      grad.addColorStop(1, 'transparent')
    } else {
      grad.addColorStop(0, '#ffdd44')
      grad.addColorStop(0.4, '#ff6600')
      grad.addColorStop(1, 'transparent')
    }
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(ex.x, ex.y, Math.max(1, ex.r), 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // Ball indicator (bottom-right of playfield)
  drawBallIndicator()

  // Crystal progress bar (top of canvas, always on top)
  drawCrystalBar()
}

// ── Game loop ─────────────────────────────────────────────────────────────────
let last = performance.now()
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000)
  last = now

  if (state.running && !state.paused) {
    state.time += dt
    updatePaddle(dt)
    updatePaddleHP(dt)

    // Spawn enemies
    const targetInterval = Math.max(
      CFG.ENEMY_SPAWN_INTERVAL_MIN,
      CFG.ENEMY_SPAWN_INTERVAL_START - state.time * CFG.ENEMY_SPAWN_RATE_RAMP
    )
    state.spawnTimer += dt
    while (state.spawnTimer >= targetInterval && state.enemies.length < CFG.ENEMY_MAX_COUNT) {
      spawnEnemy()
      state.spawnTimer -= targetInterval
    }

    handleEnemyMovement(dt)

    // Update balls — index-based so we can remove missed balls
    for (let i = state.balls.length - 1; i >= 0; i--) {
      if (updateBall(state.balls[i], dt)) {
        // Ball was missed: queue for relaunch, no damage
        state.waitingBalls.push({ timer: CFG.BALL_RELAUNCH_DELAY, pierceLeft: state.balls[i].pierceLeft })
        state.balls.splice(i, 1)
      }
    }

    updateWaitingBalls(dt)
    handleBallEnemyCollisions()
    updateCrystals(dt)
    updateCoins(dt)
    updateExplosions(dt)

    // End condition: either health bar reaches 0
    if (state.paddle.hp <= 0 || state.castle.hp <= 0) endRun()
  }

  updateHUD()
  draw()
  requestAnimationFrame(loop)
}

// ── Input ─────────────────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft'  || e.key.toLowerCase() === 'a') keys.left  = true
  if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = true
})
document.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft'  || e.key.toLowerCase() === 'a') keys.left  = false
  if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = false
})

function setupHoldButton(btn, key) {
  btn.addEventListener('touchstart',  (e) => { e.preventDefault(); keys[key] = true  }, { passive: false })
  btn.addEventListener('touchend',    (e) => { e.preventDefault(); keys[key] = false }, { passive: false })
  btn.addEventListener('touchcancel', ()  => { keys[key] = false })
  btn.addEventListener('mousedown',   (e) => { e.preventDefault(); keys[key] = true  })
  btn.addEventListener('mouseup',     ()  => { keys[key] = false })
  btn.addEventListener('mouseleave',  ()  => { keys[key] = false })
}
setupHoldButton(btnLeft,  'left')
setupHoldButton(btnRight, 'right')

document.querySelector('.canvas-wrap')
  .addEventListener('touchmove', (e) => e.preventDefault(), { passive: false })

// ── Permanent shop ────────────────────────────────────────────────────────────
function buyUpgrade(type) {
  const cost = getCost(type)
  if (state.money < cost) return
  state.money -= cost
  state.upgrades[type] += 1
  saveUpgrades()
  renderShopButtons()
  updateHUD()
}
buyWidthBtn.addEventListener('click',  () => buyUpgrade('width'))
buyBallsBtn.addEventListener('click',  () => buyUpgrade('extraBalls'))
buyPierceBtn.addEventListener('click', () => buyUpgrade('pierce'))

nextRunBtn.addEventListener('click', () => {
  shopEl.classList.add('hidden')
  resetRun()
  saveUpgrades()
})

// ── Bootstrap ─────────────────────────────────────────────────────────────────
loadUpgrades()
resetRun()
updateHUD()
requestAnimationFrame(loop)
