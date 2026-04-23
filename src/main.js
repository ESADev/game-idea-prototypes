import './style.css'

const STORAGE_KEY = 'pong-vs-swarm-upgrades-v1'

const app = document.querySelector('#app')
app.innerHTML = `
  <div class="layout">
    <h1>Pong Survivors Prototype</h1>
    <p class="subtitle">Bounce balls into enemy swarms. Stop breaches. Buy permanent upgrades between runs.</p>

    <div class="hud">
      <span id="money">Money: 0</span>
      <span id="run">Run Kills: 0</span>
      <span id="breaches">Breaches: 0 / 20</span>
    </div>

    <div class="canvas-wrap">
      <canvas id="game" width="960" height="600" aria-label="Game area"></canvas>

      <div id="shop" class="shop hidden" role="dialog" aria-modal="true">
        <h2>Run Over — Upgrade Shop</h2>
        <p id="shop-summary"></p>
        <div class="shop-actions">
          <button id="buy-width" class="shop-btn"></button>
          <button id="buy-balls" class="shop-btn"></button>
          <button id="buy-pierce" class="shop-btn"></button>
        </div>
        <button id="next-run" class="start-btn">Start Next Run</button>
      </div>
    </div>

    <p class="controls">Controls: A/D or ←/→ to move paddle.</p>
  </div>
`

const canvas = document.querySelector('#game')
const ctx = canvas.getContext('2d')

const moneyEl = document.querySelector('#money')
const runEl = document.querySelector('#run')
const breachesEl = document.querySelector('#breaches')

const shopEl = document.querySelector('#shop')
const shopSummaryEl = document.querySelector('#shop-summary')
const buyWidthBtn = document.querySelector('#buy-width')
const buyBallsBtn = document.querySelector('#buy-balls')
const buyPierceBtn = document.querySelector('#buy-pierce')
const nextRunBtn = document.querySelector('#next-run')

const world = {
  w: canvas.width,
  h: canvas.height,
  breachLimit: 20,
}

const keys = { left: false, right: false }

const state = {
  running: true,
  money: 0,
  runKills: 0,
  breaches: 0,
  spawnTimer: 0,
  time: 0,
  upgrades: {
    width: 0,
    extraBalls: 0,
    pierce: 0,
  },
  balls: [],
  enemies: [],
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

function resetRun() {
  state.runKills = 0
  state.breaches = 0
  state.spawnTimer = 0
  state.time = 0
  state.enemies = []
  state.running = true

  state.paddle.width = 160 + state.upgrades.width * 22
  state.paddle.x = world.w / 2

  const ballCount = 1 + state.upgrades.extraBalls
  state.balls = Array.from({ length: ballCount }, (_, i) => createBall(i, ballCount))
}

function createBall(index, total) {
  const spread = (index - (total - 1) / 2) * 0.16
  const speed = 320
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
  shopEl.classList.remove('hidden')
  shopSummaryEl.textContent = `You earned ${state.runKills} money this run. Spend to get stronger.`
  renderShopButtons()
}

function spawnEnemy() {
  const sideRoll = Math.random()
  let x
  let y

  if (sideRoll < 0.65) {
    x = Math.random() * world.w
    y = -20
  } else if (sideRoll < 0.82) {
    x = -20
    y = Math.random() * world.h * 0.6
  } else {
    x = world.w + 20
    y = Math.random() * world.h * 0.6
  }

  const targetX = state.paddle.x + (Math.random() - 0.5) * 300
  const targetY = world.h + 40
  const dx = targetX - x
  const dy = targetY - y
  const length = Math.hypot(dx, dy) || 1
  const speed = 28 + Math.random() * 26 + Math.min(36, state.time * 1.8)

  state.enemies.push({
    x,
    y,
    r: 7,
    vx: (dx / length) * speed,
    vy: (dy / length) * speed,
  })
}

function updatePaddle(dt) {
  const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0)
  state.paddle.x += dir * state.paddle.speed * dt
  const half = state.paddle.width / 2
  state.paddle.x = Math.max(half, Math.min(world.w - half, state.paddle.x))
}

function reflectFromPaddle(ball) {
  const paddle = state.paddle
  const relative = (ball.x - paddle.x) / (paddle.width / 2)
  const clamped = Math.max(-1, Math.min(1, relative))
  const speed = Math.hypot(ball.vx, ball.vy) * 1.02
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
    state.breaches += 1
    ball.x = state.paddle.x
    ball.y = state.paddle.y - 24
    ball.vx = (Math.random() - 0.5) * 180
    ball.vy = -320
    ball.pierceLeft = state.upgrades.pierce
  }
}

function handleEnemyMovement(dt) {
  for (const e of state.enemies) {
    e.x += e.vx * dt
    e.y += e.vy * dt
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
      state.breaches += 1
    }
  }
}

function handleBallEnemyCollisions() {
  for (const ball of state.balls) {
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const e = state.enemies[i]
      const dx = ball.x - e.x
      const dy = ball.y - e.y
      const minDist = ball.r + e.r
      if (dx * dx + dy * dy > minDist * minDist) continue

      state.enemies.splice(i, 1)
      state.runKills += 1
      state.money += 1

      if (ball.pierceLeft > 0) {
        ball.pierceLeft -= 1
      } else {
        const len = Math.hypot(dx, dy) || 1
        const nx = dx / len
        const ny = dy / len
        const dot = ball.vx * nx + ball.vy * ny
        ball.vx -= 2 * dot * nx
        ball.vy -= 2 * dot * ny
        break
      }
    }
  }
}

function updateHUD() {
  moneyEl.textContent = `Money: ${state.money}`
  runEl.textContent = `Run Kills: ${state.runKills}`
  breachesEl.textContent = `Breaches: ${state.breaches} / ${world.breachLimit}`
}

function renderShopButtons() {
  const widthCost = getCost('width')
  const ballCost = getCost('extraBalls')
  const pierceCost = getCost('pierce')

  buyWidthBtn.textContent = `Wider Paddle Lv.${state.upgrades.width} (+22px) — ${widthCost}`
  buyBallsBtn.textContent = `Extra Ball Lv.${state.upgrades.extraBalls} (+1 ball) — ${ballCost}`
  buyPierceBtn.textContent = `Pierce Lv.${state.upgrades.pierce} (+1 pass) — ${pierceCost}`

  buyWidthBtn.disabled = state.money < widthCost
  buyBallsBtn.disabled = state.money < ballCost
  buyPierceBtn.disabled = state.money < pierceCost
}

function draw() {
  ctx.clearRect(0, 0, world.w, world.h)

  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, world.w, world.h)

  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, world.w - 2, world.h - 2)

  ctx.fillStyle = '#f1f5f9'
  ctx.fillRect(
    state.paddle.x - state.paddle.width / 2,
    state.paddle.y - state.paddle.height / 2,
    state.paddle.width,
    state.paddle.height
  )

  ctx.fillStyle = '#ef4444'
  for (const e of state.enemies) {
    ctx.beginPath()
    ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle = '#22d3ee'
  for (const ball of state.balls) {
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2)
    ctx.fill()
  }
}

let last = performance.now()
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000)
  last = now

  if (state.running) {
    state.time += dt
    updatePaddle(dt)

    const targetInterval = Math.max(0.028, 0.08 - state.time * 0.0014)
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

    if (state.breaches >= world.breachLimit) {
      endRun()
    }
  }

  updateHUD()
  draw()
  requestAnimationFrame(loop)
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') keys.left = true
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') keys.right = true
})

document.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') keys.left = false
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') keys.right = false
})

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
