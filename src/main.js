import './style.css'

const STORAGE_KEY = 'pong-vs-swarm-upgrades-v1'
const CRYSTAL_THRESHOLD = 10
const CRYSTAL_DROP_CHANCE = 0.4

const IN_RUN_UPGRADE_DEFS = [
  { key: 'speedBoost',   label: '🏃 Speed Boost', desc: 'Paddle 20% faster' },
  { key: 'ballSpeed',    label: '⚡ Ball Speed',   desc: 'Balls 15% faster' },
  { key: 'extraBallRun', label: '🎱 Extra Ball',   desc: '+1 ball this run' },
  { key: 'shield',       label: '🛡 Shield',       desc: 'Absorb 3 breaches' },
  { key: 'magnet',       label: '🧲 Magnet',       desc: 'Crystals seek paddle' },
  { key: 'doubleGems',   label: '💎 Double Gems',  desc: '50% chance: 2 gem drops' },
]

const app = document.querySelector('#app')
app.innerHTML = `
  <div class="layout">
    <h1>Pong Survivors</h1>
    <div class="hud">
      <span id="money">💰 0</span>
      <span id="crystals-hud">💎 0</span>
      <span id="run">Kills: 0</span>
      <span id="breaches">⚠️ Breaches: 0 / 20</span>
    </div>
    <div class="canvas-wrap">
      <canvas id="game" width="960" height="600" aria-label="Game area"></canvas>
      <div id="shop" class="shop hidden" role="dialog" aria-modal="true">
        <h2>Upgrade Shop</h2>
        <p id="shop-summary"></p>
        <div class="shop-actions">
          <button id="buy-width" class="shop-btn"></button>
          <button id="buy-balls" class="shop-btn"></button>
          <button id="buy-pierce" class="shop-btn"></button>
        </div>
        <button id="next-run" class="start-btn">Next Run</button>
      </div>
      <div id="upgrade-menu" class="shop hidden" role="dialog" aria-modal="true">
        <h2>Pick Upgrade — 10 💎</h2>
        <div class="shop-actions" id="upgrade-choices"></div>
        <button id="upgrade-skip" class="skip-btn">Skip</button>
      </div>
    </div>
    <div class="touch-controls" aria-label="Touch controls">
      <button class="touch-btn" id="btn-left" aria-label="Move left">&#9664;</button>
      <button class="touch-btn" id="btn-right" aria-label="Move right">&#9654;</button>
    </div>
  </div>
`

const canvas = document.querySelector('#game')
const ctx = canvas.getContext('2d')

const moneyEl = document.querySelector('#money')
const crystalsHudEl = document.querySelector('#crystals-hud')
const runEl = document.querySelector('#run')
const breachesEl = document.querySelector('#breaches')

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

const world = {
  w: canvas.width,
  h: canvas.height,
  breachLimit: 20,
}

const keys = { left: false, right: false }

const state = {
  running: true,
  paused: false,
  money: 0,
  runKills: 0,
  breaches: 0,
  crystals: 0,
  spawnTimer: 0,
  time: 0,
  upgrades: {
    width: 0,
    extraBalls: 0,
    pierce: 0,
  },
  inRunUpgrades: {
    speedBoost: 0,
    ballSpeed: 0,
    extraBallRun: 0,
    shield: 0,
    magnet: 0,
    doubleGems: 0,
  },
  balls: [],
  enemies: [],
  crystalPickups: [],
  paddle: {
    x: world.w / 2,
    y: world.h - 30,
    width: 160,
    height: 16,
    speed: 700,
  },
}

const costBase = {
  width: 20,
  extraBalls: 35,
  pierce: 45,
}

function getCost(type) {
  const level = state.upgrades[type]
  return Math.floor(costBase[type] * Math.pow(1.65, level))
}

function saveUpgrades() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ upgrades: state.upgrades, money: state.money })
  )
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
  } catch {
    // ignore broken saves in prototype
  }
}

function getBallSpeedMult() {
  return 1 + state.inRunUpgrades.ballSpeed * 0.15
}

function getPaddleSpeedMult() {
  return 1 + state.inRunUpgrades.speedBoost * 0.2
}

function resetRun() {
  state.runKills = 0
  state.breaches = 0
  state.spawnTimer = 0
  state.time = 0
  state.crystals = 0
  state.enemies = []
  state.crystalPickups = []
  state.paused = false
  state.running = true

  state.inRunUpgrades = {
    speedBoost: 0,
    ballSpeed: 0,
    extraBallRun: 0,
    shield: 0,
    magnet: 0,
    doubleGems: 0,
  }

  state.paddle.width = 160 + state.upgrades.width * 22
  state.paddle.x = world.w / 2

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
  shopSummaryEl.textContent = `Earned ${state.runKills} kills this run.`
  renderShopButtons()
}

function spawnEnemy() {
  const sideRoll = Math.random()
  let x
  let y

  if (sideRoll < 0.65) {
    x = Math.random() * world.w
    y = -30
  } else if (sideRoll < 0.82) {
    x = -30
    y = Math.random() * world.h * 0.6
  } else {
    x = world.w + 30
    y = Math.random() * world.h * 0.6
  }

  const baseR = 21
  const r = baseR + Math.floor((Math.random() - 0.5) * 6)
  const hue = Math.round(355 + (Math.random() - 0.5) * 20)
  const sat = Math.round(70 + Math.random() * 20)
  const light = Math.round(45 + Math.random() * 10)
  const color = `hsl(${hue},${sat}%,${light}%)`
  const speed = 28 + Math.random() * 26 + Math.min(36, state.time * 1.8)

  state.enemies.push({ x, y, r, color, speed })
}

function updatePaddle(dt) {
  const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0)
  const speed = state.paddle.speed * getPaddleSpeedMult()
  state.paddle.x += dir * speed * dt
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

  if (ball.x - ball.r <= 0 && ball.vx < 0) {
    ball.x = ball.r
    ball.vx *= -1
  }
  if (ball.x + ball.r >= world.w && ball.vx > 0) {
    ball.x = world.w - ball.r
    ball.vx *= -1
  }
  if (ball.y - ball.r <= 0 && ball.vy < 0) {
    ball.y = ball.r
    ball.vy *= -1
  }

  const p = state.paddle
  const withinX = ball.x >= p.x - p.width / 2 && ball.x <= p.x + p.width / 2
  const touchingY = ball.y + ball.r >= p.y - p.height / 2 && ball.y - ball.r <= p.y + p.height / 2
  if (withinX && touchingY && ball.vy > 0) {
    ball.y = p.y - p.height / 2 - ball.r
    reflectFromPaddle(ball)
  }

  if (ball.y - ball.r > world.h) {
    if (state.inRunUpgrades.shield > 0) {
      state.inRunUpgrades.shield -= 1
    } else {
      state.breaches += 1
    }
    ball.x = state.paddle.x
    ball.y = state.paddle.y - 24
    ball.vx = (Math.random() - 0.5) * 180
    ball.vy = -320 * getBallSpeedMult()
    ball.pierceLeft = state.upgrades.pierce
  }
}

function handleEnemyMovement(dt) {
  for (const e of state.enemies) {
    const dx = state.paddle.x - e.x
    const dy = state.paddle.y - e.y
    const len = Math.hypot(dx, dy) || 1
    e.x += (dx / len) * e.speed * dt
    e.y += (dy / len) * e.speed * dt
  }

  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const e = state.enemies[i]

    const reachedBottom = e.y - e.r > world.h
    const hitPaddle =
      e.y + e.r >= state.paddle.y - state.paddle.height / 2 &&
      e.y - e.r <= state.paddle.y + state.paddle.height / 2 &&
      e.x >= state.paddle.x - state.paddle.width / 2 &&
      e.x <= state.paddle.x + state.paddle.width / 2

    if (reachedBottom || hitPaddle) {
      state.enemies.splice(i, 1)
      if (state.inRunUpgrades.shield > 0) {
        state.inRunUpgrades.shield -= 1
      } else {
        state.breaches += 1
      }
    }
  }
}

function handleBallEnemyCollisions() {
  for (const ball of state.balls) {
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const e = state.enemies[i]
      // AABB vs circle collision
      const nearestX = Math.max(e.x - e.r, Math.min(ball.x, e.x + e.r))
      const nearestY = Math.max(e.y - e.r, Math.min(ball.y, e.y + e.r))
      const dx = ball.x - nearestX
      const dy = ball.y - nearestY
      if (dx * dx + dy * dy > ball.r * ball.r) continue

      state.enemies.splice(i, 1)
      state.runKills += 1
      state.money += 1

      // Drop crystal
      if (Math.random() < CRYSTAL_DROP_CHANCE) {
        const count = (state.inRunUpgrades.doubleGems > 0 && Math.random() < 0.5) ? 2 : 1
        for (let c = 0; c < count; c++) {
          state.crystalPickups.push({
            x: e.x + (Math.random() - 0.5) * 10,
            y: e.y,
            vy: 60 + Math.random() * 30,
          })
        }
      }

      if (ball.pierceLeft > 0) {
        ball.pierceLeft -= 1
      } else {
        const collDx = ball.x - e.x
        const collDy = ball.y - e.y
        if (Math.abs(collDx) >= Math.abs(collDy)) {
          ball.vx *= -1
        } else {
          ball.vy *= -1
        }
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

  for (let i = state.crystalPickups.length - 1; i >= 0; i -= 1) {
    const c = state.crystalPickups[i]

    if (state.inRunUpgrades.magnet > 0) {
      c.x += (px - c.x) * 4 * dt
      c.vy = Math.min(c.vy + 150 * dt, 200)
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

    if (c.y - pr > world.h) {
      state.crystalPickups.splice(i, 1)
    }
  }
}

function showUpgradeMenu() {
  upgradeMenuEl.classList.remove('hidden')
  upgradeChoicesEl.innerHTML = ''

  const shuffled = [...IN_RUN_UPGRADE_DEFS].sort(() => Math.random() - 0.5)
  const choices = shuffled.slice(0, 3)

  for (const upg of choices) {
    const btn = document.createElement('button')
    btn.className = 'shop-btn'
    btn.textContent = `${upg.label} — ${upg.desc}`
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
  runEl.textContent = `Kills: ${state.runKills}`
  const pct = state.breaches / world.breachLimit
  breachesEl.textContent = `⚠️ Breaches: ${state.breaches} / ${world.breachLimit}`
  breachesEl.style.color = pct >= 0.75 ? '#ef4444' : pct >= 0.5 ? '#f97316' : ''
}

function renderShopButtons() {
  const widthCost = getCost('width')
  const ballCost = getCost('extraBalls')
  const pierceCost = getCost('pierce')

  buyWidthBtn.textContent = `Wider Paddle Lv.${state.upgrades.width} (+22px) — 💰${widthCost}`
  buyBallsBtn.textContent = `Extra Ball Lv.${state.upgrades.extraBalls} (+1 ball) — 💰${ballCost}`
  buyPierceBtn.textContent = `Pierce Lv.${state.upgrades.pierce} (+1 pass) — 💰${pierceCost}`

  buyWidthBtn.disabled = state.money < widthCost
  buyBallsBtn.disabled = state.money < ballCost
  buyPierceBtn.disabled = state.money < pierceCost
}

function draw() {
  ctx.clearRect(0, 0, world.w, world.h)

  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, world.w, world.h)

  // Bottom breach danger zone
  const dangerY = world.h - 90
  ctx.fillStyle = 'rgba(220, 38, 38, 0.12)'
  ctx.fillRect(0, dangerY, world.w, world.h - dangerY)

  ctx.save()
  ctx.strokeStyle = '#dc2626'
  ctx.lineWidth = 3
  ctx.shadowBlur = 14
  ctx.shadowColor = '#ef4444'
  ctx.setLineDash([16, 8])
  ctx.beginPath()
  ctx.moveTo(0, dangerY)
  ctx.lineTo(world.w, dangerY)
  ctx.stroke()
  ctx.restore()

  ctx.fillStyle = 'rgba(220, 38, 38, 0.85)'
  ctx.font = 'bold 15px Inter, system-ui, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('⚠ STOP ENEMIES — DEFEND THIS LINE', world.w - 10, dangerY - 7)
  ctx.textAlign = 'left'

  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, world.w - 2, world.h - 2)

  // Paddle (blue tint when shielded)
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

  // Enemies — squares, fixed orientation, varying red
  for (const e of state.enemies) {
    ctx.fillStyle = e.color
    ctx.fillRect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2)
  }

  // Balls
  ctx.fillStyle = '#22d3ee'
  for (const ball of state.balls) {
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2)
    ctx.fill()
  }

  // Crystal pickups — diamond shape
  ctx.fillStyle = '#a855f7'
  for (const c of state.crystalPickups) {
    ctx.beginPath()
    ctx.moveTo(c.x, c.y - 9)
    ctx.lineTo(c.x + 7, c.y)
    ctx.lineTo(c.x, c.y + 9)
    ctx.lineTo(c.x - 7, c.y)
    ctx.closePath()
    ctx.fill()
  }
}

let last = performance.now()
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000)
  last = now

  if (state.running && !state.paused) {
    state.time += dt
    updatePaddle(dt)

    const targetInterval = Math.max(0.028, 0.4 - state.time * 0.0014)
    state.spawnTimer += dt
    while (state.spawnTimer >= targetInterval && state.enemies.length < 260) {
      spawnEnemy()
      state.spawnTimer -= targetInterval
    }

    handleEnemyMovement(dt)

    for (const ball of state.balls) {
      updateBall(ball, dt)
    }

    handleBallEnemyCollisions()
    updateCrystals(dt)

    if (state.breaches >= world.breachLimit) {
      endRun()
    }
  }

  updateHUD()
  draw()
  requestAnimationFrame(loop)
}

// Keyboard controls
document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') keys.left = true
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') keys.right = true
})

document.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') keys.left = false
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') keys.right = false
})

// Touch / mouse hold controls for on-screen buttons
function setupHoldButton(btn, key) {
  btn.addEventListener('touchstart', (e) => {
    e.preventDefault()
    keys[key] = true
  }, { passive: false })
  btn.addEventListener('touchend', (e) => {
    e.preventDefault()
    keys[key] = false
  }, { passive: false })
  btn.addEventListener('touchcancel', () => {
    keys[key] = false
  })
  btn.addEventListener('mousedown', (e) => {
    e.preventDefault()
    keys[key] = true
  })
  btn.addEventListener('mouseup', () => {
    keys[key] = false
  })
  btn.addEventListener('mouseleave', () => {
    keys[key] = false
  })
}

setupHoldButton(btnLeft, 'left')
setupHoldButton(btnRight, 'right')

// Prevent page scroll when interacting with the canvas area on touch devices
document.querySelector('.canvas-wrap').addEventListener('touchmove', (e) => {
  e.preventDefault()
}, { passive: false })

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
