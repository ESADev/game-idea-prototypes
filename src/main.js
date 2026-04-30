import './style.css'

const STORAGE_KEY = 'pong-vs-swarm-upgrades-v1'
const CRYSTAL_THRESHOLD = 10
const CRYSTAL_DROP_CHANCE = 0.4
const COIN_DROP_CHANCE = 0.3

// ── Enemy spawn tuning ──────────────────────────────────────────────────────
const ENEMY_SPAWN_INTERVAL_START = 2.0
const ENEMY_SPAWN_RATE_RAMP = 0.0014
// ───────────────────────────────────────────────────────────────────────────

const PADDLE_MAX_HP = 100
const PADDLE_HP_PER_HIT = 25
const PADDLE_HP_REGEN = 5
const PADDLE_HP_REGEN_DELAY = 2.5

const CASTLE_MAX_HP = 300
const CASTLE_H = 60       // height of castle zone at the very bottom
const CASTLE_BATT_H = 16  // crenellation height above castle body

const IN_RUN_UPGRADE_DEFS = [
  { key: 'speedBoost',   label: '🏃 Hız Artışı', desc: 'Raket %20 daha hızlı' },
  { key: 'ballSpeed',    label: '⚡ Top Hızı',    desc: 'Toplar %15 daha hızlı' },
  { key: 'extraBallRun', label: '🎱 Ekstra Top',  desc: 'Bu turda +1 top' },
  { key: 'shield',       label: '🛡 Kalkan',      desc: '3 vuruşu emer' },
  { key: 'magnet',       label: '🧲 Mıknatıs',   desc: 'Kristaller raketi arar' },
  { key: 'doubleGems',   label: '💎 Çift Taş',   desc: '%50 ihtimal: +1 taş düşer' },
]

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
          <button id="buy-width" class="shop-btn"></button>
          <button id="buy-balls" class="shop-btn"></button>
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
      <button class="touch-btn" id="btn-left" aria-label="Sola git">&#9664;</button>
      <button class="touch-btn" id="btn-right" aria-label="Sağa git">&#9654;</button>
    </div>
  </div>
`

const canvas = document.querySelector('#game')
const ctx = canvas.getContext('2d')

const moneyEl = document.querySelector('#money')
const crystalsHudEl = document.querySelector('#crystals-hud')
const hpHudEl = document.querySelector('#hp-hud')
const castleHpHudEl = document.querySelector('#castle-hp-hud')

const shopEl = document.querySelector('#shop')
const shopSummaryEl = document.querySelector('#shop-summary')
const buyWidthBtn = document.querySelector('#buy-width')
const buyBallsBtn = document.querySelector('#buy-balls')
const buyPierceBtn = document.querySelector('#buy-pierce')
const nextRunBtn = document.querySelector('#next-run')

const upgradeMenuEl = document.querySelector('#upgrade-menu')
const upgradeChoicesEl = document.querySelector('#upgrade-choices')
const upgradeSkipBtn = document.querySelector('#upgrade-skip')

const btnLeft = document.querySelector('#btn-left')
const btnRight = document.querySelector('#btn-right')

const world = { w: canvas.width, h: canvas.height }

// Layout constants — all derived from canvas height
// Castle body: y=(world.h - CASTLE_H) to y=world.h
// Battlements: CASTLE_BATT_H above castle body top
// Breach line: above battlements — enemies that cross this line slow, stop, explode
// Paddle: comfortably above the breach line
const BREACH_Y = world.h - CASTLE_H - CASTLE_BATT_H - 8   // ≈ 516
const PADDLE_START_Y = world.h - CASTLE_H - CASTLE_BATT_H - 62  // ≈ 462

const keys = { left: false, right: false }

const state = {
  running: true,
  paused: false,
  money: 0,
  runKills: 0,
  crystals: 0,
  spawnTimer: 0,
  time: 0,
  upgrades: { width: 0, extraBalls: 0, pierce: 0 },
  inRunUpgrades: { speedBoost: 0, ballSpeed: 0, extraBallRun: 0, shield: 0, magnet: 0, doubleGems: 0 },
  balls: [],
  enemies: [],
  crystalPickups: [],
  coinPickups: [],
  explosions: [],
  paddle: {
    x: world.w / 2,
    y: PADDLE_START_Y,
    vx: 0,
    width: 160,
    height: 16,
    speed: 700,
    hp: PADDLE_MAX_HP,
    lastHitTime: -999,
  },
  castle: { hp: CASTLE_MAX_HP },
}

// Cost reduced ~3× from original
const costBase = { width: 7, extraBalls: 12, pierce: 15 }

function getCost(type) {
  return Math.floor(costBase[type] * Math.pow(1.65, state.upgrades[type]))
}

function saveUpgrades() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ upgrades: state.upgrades, money: state.money }))
}

function loadUpgrades() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (parsed?.upgrades) {
      state.upgrades.width = Number(parsed.upgrades.width) || 0
      state.upgrades.extraBalls = Number(parsed.upgrades.extraBalls) || 0
      state.upgrades.pierce = Number(parsed.upgrades.pierce) || 0
    }
    state.money = Number(parsed?.money) || 0
  } catch { /* ignore broken saves */ }
}

function getBallSpeedMult() { return 1 + state.inRunUpgrades.ballSpeed * 0.15 }
function getPaddleSpeedMult() { return 1 + state.inRunUpgrades.speedBoost * 0.2 }

function resetRun() {
  state.runKills = 0
  state.crystals = 0
  state.spawnTimer = 0
  state.time = 0
  state.enemies = []
  state.crystalPickups = []
  state.coinPickups = []
  state.explosions = []
  state.paused = false
  state.running = true

  state.inRunUpgrades = { speedBoost: 0, ballSpeed: 0, extraBallRun: 0, shield: 0, magnet: 0, doubleGems: 0 }

  state.paddle.width = 160 + state.upgrades.width * 22
  state.paddle.x = world.w / 2
  state.paddle.y = PADDLE_START_Y
  state.paddle.vx = 0
  state.paddle.hp = PADDLE_MAX_HP
  state.paddle.lastHitTime = -999

  state.castle.hp = CASTLE_MAX_HP

  const ballCount = 1 + state.upgrades.extraBalls
  state.balls = Array.from({ length: ballCount }, (_, i) => createBall(i, ballCount))
}

function createBall(index, total) {
  const spread = (index - (total - 1) / 2) * 0.16
  const speed = 320 * getBallSpeedMult()
  return {
    x: state.paddle.x + spread * 120,
    y: state.paddle.y - 22,
    vx: speed * spread,
    vy: -speed,
    r: 7,
    pierceLeft: state.upgrades.pierce,
  }
}

function endRun() {
  state.running = false
  upgradeMenuEl.classList.add('hidden')
  state.paused = false
  shopEl.classList.remove('hidden')
  shopSummaryEl.textContent = `Bu turda ${state.runKills} düşman öldürdünüz.`
  renderShopButtons()
}

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

function updatePaddleHP(dt) {
  if (state.time - state.paddle.lastHitTime >= PADDLE_HP_REGEN_DELAY) {
    state.paddle.hp = Math.min(PADDLE_MAX_HP, state.paddle.hp + PADDLE_HP_REGEN * dt)
  }
}

function spawnEnemy() {
  const sideRoll = Math.random()
  let x, y
  if (sideRoll < 0.65) {
    x = Math.random() * world.w
    y = -30
  } else if (sideRoll < 0.82) {
    x = -30
    y = Math.random() * world.h * 0.55
  } else {
    x = world.w + 30
    y = Math.random() * world.h * 0.55
  }

  const r = 21 + Math.floor((Math.random() - 0.5) * 6)
  const hue = Math.round(355 + (Math.random() - 0.5) * 20)
  const sat = Math.round(70 + Math.random() * 20)
  const light = Math.round(45 + Math.random() * 10)
  const color = `hsl(${hue},${sat}%,${light}%)`
  const speed = 28 + Math.random() * 26 + Math.min(36, state.time * 1.8)

  state.enemies.push({ x, y, r, color, speed, breaching: false })
}

function updatePaddle(dt) {
  const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0)
  const maxSpeed = state.paddle.speed * getPaddleSpeedMult()
  const targetVx = dir * maxSpeed
  const rate = dir !== 0 ? 14 : 20
  state.paddle.vx += (targetVx - state.paddle.vx) * Math.min(1, rate * dt)
  state.paddle.x += state.paddle.vx * dt
  const half = state.paddle.width / 2
  state.paddle.x = Math.max(half, Math.min(world.w - half, state.paddle.x))
}

function reflectFromPaddle(ball) {
  const paddle = state.paddle
  const relative = (ball.x - paddle.x) / (paddle.width / 2)
  const clamped = Math.max(-1, Math.min(1, relative))
  const speed = Math.hypot(ball.vx, ball.vy) * 1.02 * getBallSpeedMult()
  ball.vx = clamped * speed * 0.95
  ball.vy = -Math.abs(speed * (0.62 + 0.38 * (1 - Math.abs(clamped))))
  ball.pierceLeft = state.upgrades.pierce
}

function updateBall(ball, dt) {
  ball.x += ball.vx * dt
  ball.y += ball.vy * dt

  if (ball.x - ball.r <= 0 && ball.vx < 0) { ball.x = ball.r; ball.vx *= -1 }
  if (ball.x + ball.r >= world.w && ball.vx > 0) { ball.x = world.w - ball.r; ball.vx *= -1 }
  if (ball.y - ball.r <= 0 && ball.vy < 0) { ball.y = ball.r; ball.vy *= -1 }

  const p = state.paddle
  const withinX = ball.x >= p.x - p.width / 2 && ball.x <= p.x + p.width / 2
  const touchingY = ball.y + ball.r >= p.y - p.height / 2 && ball.y - ball.r <= p.y + p.height / 2
  if (withinX && touchingY && ball.vy > 0) {
    ball.y = p.y - p.height / 2 - ball.r
    reflectFromPaddle(ball)
  }

  // Ball missed — reset it, deal minor paddle damage
  if (ball.y - ball.r > BREACH_Y) {
    applyPaddleHit(5)
    ball.x = state.paddle.x
    ball.y = state.paddle.y - 24
    ball.vx = (Math.random() - 0.5) * 180
    ball.vy = -320 * getBallSpeedMult()
    ball.pierceLeft = state.upgrades.pierce
  }
}

function handleEnemyMovement(dt) {
  for (const e of state.enemies) {
    if (e.breaching) {
      e.speed = Math.max(0, e.speed - 220 * dt)
    }
    e.y += e.speed * dt
  }

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i]

    // Enemy directly hits the paddle → paddle takes damage
    const hitPaddle =
      !e.breaching &&
      e.y + e.r >= state.paddle.y - state.paddle.height / 2 &&
      e.y - e.r <= state.paddle.y + state.paddle.height / 2 &&
      e.x >= state.paddle.x - state.paddle.width / 2 &&
      e.x <= state.paddle.x + state.paddle.width / 2

    if (hitPaddle) {
      state.enemies.splice(i, 1)
      applyPaddleHit(PADDLE_HP_PER_HIT)
      spawnExplosion(e.x, e.y, 32, true)
      continue
    }

    // Enemy crosses the breach line → start slowing down
    if (!e.breaching && e.y + e.r >= BREACH_Y) {
      e.breaching = true
    }

    // Enemy stopped or reached castle wall → explode against castle
    if (e.breaching && (e.speed <= 0 || e.y + e.r >= world.h - CASTLE_H)) {
      state.enemies.splice(i, 1)
      applyCastleDamage(30)
      spawnExplosion(e.x, Math.min(e.y, world.h - CASTLE_H - 5), 52, false)
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
    ex.r = ex.maxR * (ex.age / ex.maxAge)
    if (ex.age >= ex.maxAge) state.explosions.splice(i, 1)
  }
}

// Returns a random integer 1–3 with normal-ish distribution peaked at 2
function crystalCount() {
  return Math.max(1, Math.min(3, Math.round(1 + Math.random() + Math.random())))
}

function handleBallEnemyCollisions() {
  for (const ball of state.balls) {
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i]
      if (e.breaching) continue  // breaching enemies are past the ball's reach

      const nearestX = Math.max(e.x - e.r, Math.min(ball.x, e.x + e.r))
      const nearestY = Math.max(e.y - e.r, Math.min(ball.y, e.y + e.r))
      const dx = ball.x - nearestX
      const dy = ball.y - nearestY
      if (dx * dx + dy * dy > ball.r * ball.r) continue

      state.enemies.splice(i, 1)
      state.runKills += 1
      state.money += 1

      // Crystal drop: 1–3 crystals, normal-ish distribution, scattered around enemy
      if (Math.random() < CRYSTAL_DROP_CHANCE) {
        const base = crystalCount()
        const count = (state.inRunUpgrades.doubleGems > 0 && Math.random() < 0.5) ? base + 1 : base
        for (let c = 0; c < count; c++) {
          state.crystalPickups.push({
            x: e.x + (Math.random() - 0.5) * 44,
            y: e.y + (Math.random() - 0.5) * 22,
            vy: 160 + Math.random() * 60,
          })
        }
      }

      // Coin drop
      if (Math.random() < COIN_DROP_CHANCE) {
        state.coinPickups.push({
          x: e.x + (Math.random() - 0.5) * 24,
          y: e.y,
          vy: 290 + Math.random() * 90,
        })
      }

      if (ball.pierceLeft > 0) {
        ball.pierceLeft -= 1
      } else {
        const collDx = ball.x - e.x
        const collDy = ball.y - e.y
        if (Math.abs(collDx) >= Math.abs(collDy)) ball.vx *= -1
        else ball.vy *= -1
        break
      }
    }
  }
}

function updateCrystals(dt) {
  const px = state.paddle.x
  const py = state.paddle.y - state.paddle.height / 2
  const pw = state.paddle.width / 2
  const pr = 12

  for (let i = state.crystalPickups.length - 1; i >= 0; i--) {
    const c = state.crystalPickups[i]

    if (state.inRunUpgrades.magnet > 0) {
      c.x += (px - c.x) * 4 * dt
      c.vy = Math.min(c.vy + 180 * dt, 320)
    }
    c.y += c.vy * dt

    if (
      c.y + pr >= py - 4 &&
      c.y - pr <= py + state.paddle.height + 4 &&
      c.x >= px - pw - pr &&
      c.x <= px + pw + pr
    ) {
      state.crystalPickups.splice(i, 1)
      state.crystals += 1
      if (state.crystals >= CRYSTAL_THRESHOLD && !state.paused && state.running) {
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
  const pr = 10

  for (let i = state.coinPickups.length - 1; i >= 0; i--) {
    const c = state.coinPickups[i]
    c.y += c.vy * dt

    if (
      c.y + pr >= py - 4 &&
      c.y - pr <= py + state.paddle.height + 4 &&
      c.x >= px - pw - pr &&
      c.x <= px + pw + pr
    ) {
      state.coinPickups.splice(i, 1)
      state.money += 2
      continue
    }

    if (c.y - pr > world.h) state.coinPickups.splice(i, 1)
  }
}

function showUpgradeMenu() {
  upgradeMenuEl.classList.remove('hidden')
  upgradeChoicesEl.innerHTML = ''

  const shuffled = [...IN_RUN_UPGRADE_DEFS].sort(() => Math.random() - 0.5)
  const choices = shuffled.slice(0, 3)

  for (const upg of choices) {
    const btn = document.createElement('button')
    btn.className = 'shop-btn upgrade-choice-btn'
    btn.innerHTML = `<span class="upg-label">${upg.label}</span><span class="upg-desc">${upg.desc}</span>`
    btn.addEventListener('click', () => {
      applyInRunUpgrade(upg.key)
      state.crystals -= CRYSTAL_THRESHOLD
      upgradeMenuEl.classList.add('hidden')
      state.paused = false
    })
    upgradeChoicesEl.appendChild(btn)
  }
}

function applyInRunUpgrade(key) {
  if (key === 'shield') {
    state.inRunUpgrades.shield += 3
  } else if (key === 'extraBallRun') {
    state.inRunUpgrades.extraBallRun += 1
    state.balls.push({
      x: state.paddle.x,
      y: state.paddle.y - 24,
      vx: (Math.random() - 0.5) * 100,
      vy: -320 * getBallSpeedMult(),
      r: 7,
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

function updateHUD() {
  moneyEl.textContent = `💰 ${state.money}`
  crystalsHudEl.textContent = `💎 ${state.crystals}`

  const hpPct = state.paddle.hp / PADDLE_MAX_HP
  hpHudEl.textContent = `❤️ Can: ${Math.ceil(state.paddle.hp)}`
  hpHudEl.style.color = hpPct <= 0.25 ? '#ef4444' : hpPct <= 0.5 ? '#f97316' : ''

  const castlePct = state.castle.hp / CASTLE_MAX_HP
  castleHpHudEl.textContent = `🏰 Kale: ${Math.ceil(state.castle.hp)}`
  castleHpHudEl.style.color = castlePct <= 0.25 ? '#ef4444' : castlePct <= 0.5 ? '#f97316' : ''
}

function renderShopButtons() {
  const widthCost = getCost('width')
  const ballCost = getCost('extraBalls')
  const pierceCost = getCost('pierce')

  buyWidthBtn.textContent = `Geniş Raket Sv.${state.upgrades.width} (+22px) — 💰${widthCost}`
  buyBallsBtn.textContent = `Ekstra Top Sv.${state.upgrades.extraBalls} (+1 top) — 💰${ballCost}`
  buyPierceBtn.textContent = `Delme Sv.${state.upgrades.pierce} (+1 geçiş) — 💰${pierceCost}`

  buyWidthBtn.disabled = state.money < widthCost
  buyBallsBtn.disabled = state.money < ballCost
  buyPierceBtn.disabled = state.money < pierceCost
}

// ── Drawing ─────────────────────────────────────────────────────────────────

function drawCastle() {
  const cY = world.h - CASTLE_H
  const cW = world.w

  // Castle body
  ctx.fillStyle = '#1e1050'
  ctx.fillRect(0, cY, cW, CASTLE_H)

  // Stone-block texture
  ctx.strokeStyle = '#2d1a70'
  ctx.lineWidth = 1
  for (let row = 0; row < 3; row++) {
    const rowY = cY + 6 + row * 17
    const off = row % 2 === 0 ? 0 : 26
    for (let bx = -off; bx < cW; bx += 52) {
      ctx.strokeRect(bx + 1, rowY, 50, 15)
    }
  }

  // Crenellations (battlements)
  const battW = 28
  const battGap = 18
  const period = battW + battGap
  ctx.fillStyle = '#251560'
  for (let bx = 4; bx < cW - battW; bx += period) {
    ctx.fillRect(bx, cY - CASTLE_BATT_H, battW, CASTLE_BATT_H)
  }

  // Side towers
  const tW = 54
  const tH = CASTLE_H + 28
  ctx.fillStyle = '#180e45'
  ctx.fillRect(0, cY - 28, tW, tH)
  ctx.fillRect(cW - tW, cY - 28, tW, tH)

  // Tower crenellations
  ctx.fillStyle = '#251560'
  const tBatt = 12
  const tGap = 8
  for (let tx = 4; tx < tW - tBatt; tx += tBatt + tGap) {
    ctx.fillRect(tx, cY - 28 - 12, tBatt, 12)
    ctx.fillRect(cW - tW + tx, cY - 28 - 12, tBatt, 12)
  }

  // Tower windows (arrow slits)
  ctx.fillStyle = '#7c3aed44'
  const winW = 10; const winH = 22
  ctx.fillRect(tW / 2 - winW / 2, cY - 14, winW, winH)
  ctx.fillRect(cW - tW + tW / 2 - winW / 2, cY - 14, winW, winH)

  // Gate arch in center
  const gateW = 60; const gateH = 28
  const gX = cW / 2 - gateW / 2
  ctx.fillStyle = '#0d0830'
  ctx.fillRect(gX, cY, gateW, gateH)
  ctx.beginPath()
  ctx.arc(cW / 2, cY, gateW / 2, Math.PI, 0)
  ctx.fill()

  // Castle HP bar
  const hpPct = state.castle.hp / CASTLE_MAX_HP
  const barX = tW + 12; const barW = cW - tW * 2 - 24
  const barY = cY + 6; const barH = 10
  ctx.fillStyle = '#0a0624'
  ctx.fillRect(barX, barY, barW, barH)
  const barColor = hpPct > 0.5 ? '#7c3aed' : hpPct > 0.25 ? '#f97316' : '#ef4444'
  ctx.fillStyle = barColor
  ctx.fillRect(barX, barY, barW * hpPct, barH)
  if (hpPct <= 0.25) {
    // Pulsing glow when critical
    ctx.save()
    ctx.shadowBlur = 10 + 6 * Math.sin(state.time * 8)
    ctx.shadowColor = '#ef4444'
    ctx.fillRect(barX, barY, barW * hpPct, barH)
    ctx.restore()
  }

  // Castle label
  ctx.fillStyle = '#a78bfa'
  ctx.font = 'bold 13px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`🏰 KOZMİK KALE  ${Math.ceil(state.castle.hp)} / ${CASTLE_MAX_HP}`, cW / 2, cY + 26)
  ctx.textAlign = 'left'
}

function draw() {
  ctx.clearRect(0, 0, world.w, world.h)
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, world.w, world.h)

  // Castle at bottom
  drawCastle()

  // Breach danger zone tint (between paddle bottom and breach line)
  const dangerTop = state.paddle.y + state.paddle.height / 2 + 4
  ctx.fillStyle = 'rgba(220, 38, 38, 0.06)'
  ctx.fillRect(0, dangerTop, world.w, BREACH_Y - dangerTop)

  // Breach line (dashed red, BELOW the paddle)
  ctx.save()
  ctx.strokeStyle = '#dc2626'
  ctx.lineWidth = 2
  ctx.shadowBlur = 10
  ctx.shadowColor = '#ef4444'
  ctx.setLineDash([16, 8])
  ctx.beginPath()
  ctx.moveTo(0, BREACH_Y)
  ctx.lineTo(world.w, BREACH_Y)
  ctx.stroke()
  ctx.restore()

  ctx.fillStyle = 'rgba(220, 38, 38, 0.8)'
  ctx.font = 'bold 12px Inter, system-ui, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('⚠ KALEYİ SAVUNUN — DÜŞMANLARı DURDURUN', world.w - 10, BREACH_Y - 4)
  ctx.textAlign = 'left'

  // Canvas border
  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 2
  ctx.setLineDash([])
  ctx.strokeRect(1, 1, world.w - 2, world.h - 2)

  // Paddle HP bar (above paddle)
  const barW = state.paddle.width
  const barH = 8
  const barX = state.paddle.x - barW / 2
  const barY = state.paddle.y - state.paddle.height / 2 - barH - 4
  const hpPct = state.paddle.hp / PADDLE_MAX_HP
  ctx.fillStyle = '#1e293b'
  ctx.fillRect(barX, barY, barW, barH)
  ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#f97316' : '#ef4444'
  ctx.fillRect(barX, barY, barW * hpPct, barH)

  // Paddle
  ctx.fillStyle = state.inRunUpgrades.shield > 0 ? '#93c5fd' : '#f1f5f9'
  ctx.fillRect(
    state.paddle.x - state.paddle.width / 2,
    state.paddle.y - state.paddle.height / 2,
    state.paddle.width,
    state.paddle.height
  )

  if (state.inRunUpgrades.shield > 0) {
    ctx.save()
    ctx.strokeStyle = '#60a5fa'
    ctx.lineWidth = 3
    ctx.shadowBlur = 10
    ctx.shadowColor = '#60a5fa'
    ctx.strokeRect(
      state.paddle.x - state.paddle.width / 2 - 4,
      state.paddle.y - state.paddle.height / 2 - 4,
      state.paddle.width + 8,
      state.paddle.height + 8
    )
    ctx.restore()
  }

  // Enemies
  for (const e of state.enemies) {
    if (e.breaching) {
      // Glowing orange when breaching — slowing down toward castle
      ctx.save()
      ctx.shadowBlur = 14 + 6 * Math.sin(state.time * 12)
      ctx.shadowColor = '#ff6600'
      ctx.fillStyle = '#ff4422'
      ctx.fillRect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2)
      ctx.restore()
    } else {
      ctx.fillStyle = e.color
      ctx.fillRect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2)
    }
  }

  // Balls
  ctx.fillStyle = '#22d3ee'
  for (const ball of state.balls) {
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2)
    ctx.fill()
  }

  // Crystal pickups — diamond shape
  for (const c of state.crystalPickups) {
    ctx.save()
    ctx.shadowBlur = 6
    ctx.shadowColor = '#7dd3fc'
    ctx.fillStyle = '#7dd3fc'
    ctx.beginPath()
    ctx.moveTo(c.x, c.y - 9)
    ctx.lineTo(c.x + 7, c.y)
    ctx.lineTo(c.x, c.y + 9)
    ctx.lineTo(c.x - 7, c.y)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  // Coin pickups — golden circle with $ symbol
  for (const c of state.coinPickups) {
    ctx.save()
    ctx.shadowBlur = 8
    ctx.shadowColor = '#fbbf24'
    ctx.beginPath()
    ctx.arc(c.x, c.y, 9, 0, Math.PI * 2)
    ctx.fillStyle = '#fbbf24'
    ctx.fill()
    ctx.strokeStyle = '#d97706'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = '#78350f'
    ctx.font = 'bold 10px Inter, system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('$', c.x, c.y)
    ctx.textBaseline = 'alphabetic'
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
}

// ── Game loop ────────────────────────────────────────────────────────────────

let last = performance.now()
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000)
  last = now

  if (state.running && !state.paused) {
    state.time += dt
    updatePaddle(dt)
    updatePaddleHP(dt)

    const targetInterval = Math.max(0.028, ENEMY_SPAWN_INTERVAL_START - state.time * ENEMY_SPAWN_RATE_RAMP)
    state.spawnTimer += dt
    while (state.spawnTimer >= targetInterval && state.enemies.length < 260) {
      spawnEnemy()
      state.spawnTimer -= targetInterval
    }

    handleEnemyMovement(dt)
    for (const ball of state.balls) updateBall(ball, dt)
    handleBallEnemyCollisions()
    updateCrystals(dt)
    updateCoins(dt)
    updateExplosions(dt)

    if (state.paddle.hp <= 0 || state.castle.hp <= 0) endRun()
  }

  updateHUD()
  draw()
  requestAnimationFrame(loop)
}

// ── Input ────────────────────────────────────────────────────────────────────

document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') keys.left = true
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') keys.right = true
})
document.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') keys.left = false
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') keys.right = false
})

function setupHoldButton(btn, key) {
  btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true }, { passive: false })
  btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false }, { passive: false })
  btn.addEventListener('touchcancel', () => { keys[key] = false })
  btn.addEventListener('mousedown', (e) => { e.preventDefault(); keys[key] = true })
  btn.addEventListener('mouseup', () => { keys[key] = false })
  btn.addEventListener('mouseleave', () => { keys[key] = false })
}

setupHoldButton(btnLeft, 'left')
setupHoldButton(btnRight, 'right')

document.querySelector('.canvas-wrap').addEventListener('touchmove', (e) => e.preventDefault(), { passive: false })

// ── Shop ─────────────────────────────────────────────────────────────────────

function buyUpgrade(type) {
  const cost = getCost(type)
  if (state.money < cost) return
  state.money -= cost
  state.upgrades[type] += 1
  saveUpgrades()
  renderShopButtons()
  updateHUD()
}

buyWidthBtn.addEventListener('click', () => buyUpgrade('width'))
buyBallsBtn.addEventListener('click', () => buyUpgrade('extraBalls'))
buyPierceBtn.addEventListener('click', () => buyUpgrade('pierce'))

nextRunBtn.addEventListener('click', () => {
  shopEl.classList.add('hidden')
  resetRun()
  saveUpgrades()
})

loadUpgrades()
resetRun()
updateHUD()
requestAnimationFrame(loop)
