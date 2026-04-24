import './style.css'

document.querySelector('#app').innerHTML = `
  <div class="game-shell">
    <header class="hud">
      <div><strong>Round:</strong> <span id="round">1</span></div>
      <div><strong>Gold:</strong> <span id="gold">0</span></div>
      <div><strong>Ball:</strong> <span id="ballType">Standard</span></div>
    </header>

    <div class="arena-wrap">
      <canvas id="game" width="520" height="760" aria-label="Pinball monster arena"></canvas>
      <div class="message" id="message"></div>
    </div>

    <section id="shop" class="shop hidden">
      <h2>Shop Between Rounds</h2>
      <p>Spend gold on better pinball tools.</p>
      <div class="shop-grid">
        <button data-upgrade="unlockHeavy"></button>
        <button data-upgrade="unlockSpiked"></button>
        <button data-upgrade="flipperLength"></button>
        <button data-upgrade="flipperForce"></button>
      </div>
      <div class="equip-row">
        <button data-equip="standard">Equip Standard Ball</button>
        <button data-equip="heavy">Equip Heavy Ball</button>
        <button data-equip="spiked">Equip Spiked Ball</button>
      </div>
      <button id="nextRound">Start Next Round</button>
    </section>

    <footer class="controls">
      <span><b>A</b> / <b>←</b>: Left Flipper</span>
      <span><b>L</b> / <b>→</b>: Right Flipper</span>
      <span><b>Space</b>: Launch Ball</span>
    </footer>
  </div>
`

const canvas = document.getElementById('game')
const ctx = canvas.getContext('2d')

const ui = {
  round: document.getElementById('round'),
  gold: document.getElementById('gold'),
  ballType: document.getElementById('ballType'),
  message: document.getElementById('message'),
  shop: document.getElementById('shop'),
  nextRound: document.getElementById('nextRound'),
}

const keys = { left: false, right: false }

const state = {
  phase: 'play',
  round: 1,
  gold: 0,
  activeBall: 'standard',
  unlockedBalls: { standard: true, heavy: false, spiked: false },
  upgrades: { flipperLength: 1, flipperForce: 1 },
  ball: {
    x: canvas.width / 2,
    y: canvas.height - 130,
    vx: 0,
    vy: 0,
    radius: 10,
    active: false,
    launched: false,
  },
  enemies: [],
  leftFlipper: null,
  rightFlipper: null,
  lastFrame: performance.now(),
}

const BALL_STATS = {
  standard: { damageMult: 1, gravityMult: 1, bonusFlatDamage: 0 },
  heavy: { damageMult: 1.45, gravityMult: 1.25, bonusFlatDamage: 2 },
  spiked: { damageMult: 1.1, gravityMult: 1, bonusFlatDamage: 9 },
}

const BOARD = {
  wallPadding: 10,
  drainWidth: 120,
  gravity: 860,
  restitution: 0.84,
}

function flipperDefaults() {
  const length = 84 * state.upgrades.flipperLength
  const baseForce = 420 * state.upgrades.flipperForce

  state.leftFlipper = {
    pivotX: 170,
    pivotY: canvas.height - 66,
    length,
    restAngle: 0.44,
    activeAngle: -0.6,
    angle: 0.44,
    speed: 11,
    isLeft: true,
    thickness: 13,
    force: baseForce,
  }

  state.rightFlipper = {
    pivotX: canvas.width - 170,
    pivotY: canvas.height - 66,
    length,
    restAngle: Math.PI - 0.44,
    activeAngle: Math.PI + 0.6,
    angle: Math.PI - 0.44,
    speed: 11,
    isLeft: false,
    thickness: 13,
    force: baseForce,
  }
}

function resetBall() {
  state.ball.x = canvas.width / 2
  state.ball.y = canvas.height - 132
  state.ball.vx = 0
  state.ball.vy = 0
  state.ball.active = true
  state.ball.launched = false
}

function spawnEnemies() {
  const count = 4 + state.round
  const list = []
  for (let i = 0; i < count; i += 1) {
    const x = 70 + ((i % 4) * (canvas.width - 140)) / 3
    const y = 110 + Math.floor(i / 4) * 110 + (i % 2 ? 15 : 0)
    const maxHp = 26 + state.round * 12
    list.push({
      x,
      y,
      radius: 26,
      hp: maxHp,
      maxHp,
      wobble: Math.random() * Math.PI * 2,
      speed: 8 + Math.random() * 8,
    })
  }
  state.enemies = list
}

function roundStart() {
  state.phase = 'play'
  ui.shop.classList.add('hidden')
  ui.message.textContent = 'Press Space to launch!'
  spawnEnemies()
  flipperDefaults()
  resetBall()
  refreshHud()
}

function refreshHud() {
  ui.round.textContent = String(state.round)
  ui.gold.textContent = String(Math.floor(state.gold))
  ui.ballType.textContent = state.activeBall[0].toUpperCase() + state.activeBall.slice(1)
}

function lineSegmentForFlipper(flipper) {
  const tipX = flipper.pivotX + Math.cos(flipper.angle) * flipper.length
  const tipY = flipper.pivotY + Math.sin(flipper.angle) * flipper.length
  return [flipper.pivotX, flipper.pivotY, tipX, tipY]
}

function nearestPointOnSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) return [x1, y1]
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq
  t = Math.max(0, Math.min(1, t))
  return [x1 + t * dx, y1 + t * dy]
}

function bounceOnFlipper(flipper, dt) {
  const b = state.ball
  const [x1, y1, x2, y2] = lineSegmentForFlipper(flipper)
  const [cx, cy] = nearestPointOnSegment(b.x, b.y, x1, y1, x2, y2)
  const dx = b.x - cx
  const dy = b.y - cy
  const dist = Math.hypot(dx, dy)
  const hitDist = b.radius + flipper.thickness

  if (dist > hitDist) return

  const nx = dist > 0.001 ? dx / dist : 0
  const ny = dist > 0.001 ? dy / dist : -1
  const push = hitDist - dist + 0.1
  b.x += nx * push
  b.y += ny * push

  const normalSpeed = b.vx * nx + b.vy * ny
  if (normalSpeed < 0) {
    b.vx -= 2 * normalSpeed * nx
    b.vy -= 2 * normalSpeed * ny
  }

  const pressing = flipper.isLeft ? keys.left : keys.right
  if (pressing) {
    const impulse = flipper.force * dt
    b.vx += nx * impulse
    b.vy += ny * impulse - 80 * dt
  }

  b.vx *= 1.03
  b.vy *= 1.03
}

function bounceBallFromEnemy(enemy) {
  const b = state.ball
  const dx = b.x - enemy.x
  const dy = b.y - enemy.y
  const dist = Math.hypot(dx, dy)
  const minDist = b.radius + enemy.radius
  if (dist >= minDist || dist === 0) return false

  const nx = dx / dist
  const ny = dy / dist

  const overlap = minDist - dist + 0.1
  b.x += nx * overlap
  b.y += ny * overlap

  const speedAlongNormal = b.vx * nx + b.vy * ny
  if (speedAlongNormal < 0) {
    b.vx -= 2 * speedAlongNormal * nx
    b.vy -= 2 * speedAlongNormal * ny
  }

  b.vx *= BOARD.restitution
  b.vy *= BOARD.restitution

  const speed = Math.hypot(b.vx, b.vy)
  const stats = BALL_STATS[state.activeBall]
  const damage = Math.max(1, speed * 0.015 * stats.damageMult + stats.bonusFlatDamage)
  enemy.hp -= damage
  return true
}

function updateFlipper(flipper, isPressed, dt) {
  const target = isPressed ? flipper.activeAngle : flipper.restAngle
  const diff = target - flipper.angle
  if (Math.abs(diff) < 0.001) {
    flipper.angle = target
    return
  }
  const step = Math.sign(diff) * flipper.speed * dt
  if (Math.abs(step) > Math.abs(diff)) {
    flipper.angle = target
  } else {
    flipper.angle += step
  }
}

function handleWalls() {
  const b = state.ball
  const left = BOARD.wallPadding + b.radius
  const right = canvas.width - BOARD.wallPadding - b.radius
  const top = BOARD.wallPadding + b.radius

  if (b.x < left) {
    b.x = left
    b.vx = Math.abs(b.vx) * BOARD.restitution
  }
  if (b.x > right) {
    b.x = right
    b.vx = -Math.abs(b.vx) * BOARD.restitution
  }
  if (b.y < top) {
    b.y = top
    b.vy = Math.abs(b.vy) * BOARD.restitution
  }

  const drainLeft = canvas.width / 2 - BOARD.drainWidth / 2
  const drainRight = canvas.width / 2 + BOARD.drainWidth / 2
  const floorY = canvas.height - BOARD.wallPadding - b.radius

  if (b.y >= floorY) {
    if (b.x < drainLeft || b.x > drainRight) {
      b.y = floorY
      b.vy = -Math.abs(b.vy) * BOARD.restitution
    }
  }

  if (b.y - b.radius > canvas.height + 8) {
    loseRound()
  }
}

function updateEnemies(dt, elapsed) {
  for (const enemy of state.enemies) {
    enemy.wobble += enemy.speed * dt * 0.1
    enemy.x += Math.sin(elapsed * 0.001 + enemy.wobble) * 0.15
  }
  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    if (bounceBallFromEnemy(state.enemies[i]) && state.enemies[i].hp <= 0) {
      state.enemies.splice(i, 1)
    }
  }
  if (state.enemies.length === 0) {
    winRound()
  }
}

function winRound() {
  if (state.phase !== 'play') return
  state.phase = 'shop'
  const reward = 30 + state.round * 16
  state.gold += reward
  ui.message.textContent = `Round cleared! +${reward} gold.`
  openShop()
}

function loseRound() {
  if (state.phase !== 'play') return
  state.phase = 'shop'
  const pity = 10 + Math.max(0, state.round - 1) * 2
  state.gold += pity
  ui.message.textContent = `Ball lost! You get ${pity} gold consolation.`
  openShop()
}

function upgradeCost(type) {
  const roundScale = 1 + (state.round - 1) * 0.25
  switch (type) {
    case 'unlockHeavy':
      return Math.floor(80 * roundScale)
    case 'unlockSpiked':
      return Math.floor(100 * roundScale)
    case 'flipperLength':
      return Math.floor(45 * state.upgrades.flipperLength * roundScale)
    case 'flipperForce':
      return Math.floor(55 * state.upgrades.flipperForce * roundScale)
    default:
      return 9999
  }
}

function buyUpgrade(type) {
  const cost = upgradeCost(type)
  if (state.gold < cost) return

  if (type === 'unlockHeavy' && state.unlockedBalls.heavy) return
  if (type === 'unlockSpiked' && state.unlockedBalls.spiked) return

  state.gold -= cost
  if (type === 'unlockHeavy') state.unlockedBalls.heavy = true
  if (type === 'unlockSpiked') state.unlockedBalls.spiked = true
  if (type === 'flipperLength') state.upgrades.flipperLength += 0.18
  if (type === 'flipperForce') state.upgrades.flipperForce += 0.2

  refreshHud()
  renderShop()
}

function equipBall(type) {
  if (!state.unlockedBalls[type]) return
  state.activeBall = type
  refreshHud()
  renderShop()
}

function renderShop() {
  const buttons = [...ui.shop.querySelectorAll('[data-upgrade]')]
  for (const button of buttons) {
    const type = button.dataset.upgrade
    const cost = upgradeCost(type)

    if (type === 'unlockHeavy') {
      button.textContent = state.unlockedBalls.heavy
        ? 'Heavy Ball Unlocked'
        : `Unlock Heavy Ball (${cost}g)`
      button.disabled = state.unlockedBalls.heavy || state.gold < cost
    }

    if (type === 'unlockSpiked') {
      button.textContent = state.unlockedBalls.spiked
        ? 'Spiked Ball Unlocked'
        : `Unlock Spiked Ball (${cost}g)`
      button.disabled = state.unlockedBalls.spiked || state.gold < cost
    }

    if (type === 'flipperLength') {
      button.textContent = `Flipper Length + (${cost}g)`
      button.disabled = state.gold < cost
    }

    if (type === 'flipperForce') {
      button.textContent = `Flipper Force + (${cost}g)`
      button.disabled = state.gold < cost
    }
  }

  const equipButtons = [...ui.shop.querySelectorAll('[data-equip]')]
  for (const button of equipButtons) {
    const type = button.dataset.equip
    const unlocked = state.unlockedBalls[type]
    button.disabled = !unlocked || state.activeBall === type
    button.textContent = unlocked
      ? state.activeBall === type
        ? `Equipped: ${type}`
        : `Equip ${type}`
      : `${type} (locked)`
  }
}

function openShop() {
  ui.shop.classList.remove('hidden')
  refreshHud()
  renderShop()
}

function launchBall() {
  if (state.phase !== 'play') return
  if (state.ball.launched) return
  state.ball.launched = true
  state.ball.vx = (Math.random() * 2 - 1) * 180
  state.ball.vy = -560
  ui.message.textContent = 'Keep it alive and clear all monsters!'
}

function update(dt, elapsed) {
  if (state.phase !== 'play') return

  updateFlipper(state.leftFlipper, keys.left, dt)
  updateFlipper(state.rightFlipper, keys.right, dt)

  const ball = state.ball
  const stats = BALL_STATS[state.activeBall]

  if (!ball.launched) return

  ball.vy += BOARD.gravity * stats.gravityMult * dt
  ball.x += ball.vx * dt
  ball.y += ball.vy * dt

  handleWalls()
  bounceOnFlipper(state.leftFlipper, dt)
  bounceOnFlipper(state.rightFlipper, dt)
  updateEnemies(dt, elapsed)
}

function drawFlipper(flipper) {
  const [x1, y1, x2, y2] = lineSegmentForFlipper(flipper)
  ctx.strokeStyle = '#4dd9ff'
  ctx.lineCap = 'round'
  ctx.lineWidth = flipper.thickness * 2
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = '#120f1f'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const drainLeft = canvas.width / 2 - BOARD.drainWidth / 2
  const drainRight = canvas.width / 2 + BOARD.drainWidth / 2

  ctx.strokeStyle = '#c1d8ff'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(BOARD.wallPadding, BOARD.wallPadding)
  ctx.lineTo(BOARD.wallPadding, canvas.height - BOARD.wallPadding)
  ctx.lineTo(drainLeft, canvas.height - BOARD.wallPadding)
  ctx.moveTo(drainRight, canvas.height - BOARD.wallPadding)
  ctx.lineTo(canvas.width - BOARD.wallPadding, canvas.height - BOARD.wallPadding)
  ctx.lineTo(canvas.width - BOARD.wallPadding, BOARD.wallPadding)
  ctx.closePath()
  ctx.stroke()

  for (const enemy of state.enemies) {
    ctx.fillStyle = '#ff5862'
    ctx.beginPath()
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2)
    ctx.fill()

    const hpRatio = Math.max(0, enemy.hp / enemy.maxHp)
    const barW = enemy.radius * 2
    const barX = enemy.x - barW / 2
    const barY = enemy.y - enemy.radius - 16

    ctx.fillStyle = '#2b243f'
    ctx.fillRect(barX, barY, barW, 7)
    ctx.fillStyle = hpRatio > 0.4 ? '#75ff7a' : '#ffc14d'
    ctx.fillRect(barX, barY, barW * hpRatio, 7)
  }

  drawFlipper(state.leftFlipper)
  drawFlipper(state.rightFlipper)

  if (state.ball.active) {
    const b = state.ball
    ctx.fillStyle = state.activeBall === 'heavy' ? '#c6ccd8' : state.activeBall === 'spiked' ? '#ffd166' : '#ffffff'
    ctx.beginPath()
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2)
    ctx.fill()

    if (state.activeBall === 'spiked') {
      ctx.strokeStyle = '#9c4cff'
      ctx.lineWidth = 2
      for (let i = 0; i < 8; i += 1) {
        const angle = (Math.PI * 2 * i) / 8
        const sx = b.x + Math.cos(angle) * (b.radius - 1)
        const sy = b.y + Math.sin(angle) * (b.radius - 1)
        const ex = b.x + Math.cos(angle) * (b.radius + 4)
        const ey = b.y + Math.sin(angle) * (b.radius + 4)
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(ex, ey)
        ctx.stroke()
      }
    }
  }

  if (state.phase === 'play' && !state.ball.launched) {
    ctx.fillStyle = '#eaf2ff'
    ctx.font = '18px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText('Press Space to launch', canvas.width / 2, canvas.height - 180)
  }
}

function loop(time) {
  const dt = Math.min((time - state.lastFrame) / 1000, 1 / 30)
  state.lastFrame = time
  update(dt, time)
  draw()
  requestAnimationFrame(loop)
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
    keys.left = true
    e.preventDefault()
  }
  if (e.key === 'l' || e.key === 'L' || e.key === 'ArrowRight') {
    keys.right = true
    e.preventDefault()
  }
  if (e.code === 'Space') {
    launchBall()
    e.preventDefault()
  }
})

window.addEventListener('keyup', (e) => {
  if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.left = false
  if (e.key === 'l' || e.key === 'L' || e.key === 'ArrowRight') keys.right = false
})

ui.shop.addEventListener('click', (e) => {
  const target = e.target
  if (!(target instanceof HTMLButtonElement)) return

  const upgrade = target.dataset.upgrade
  if (upgrade) {
    buyUpgrade(upgrade)
    return
  }

  const equip = target.dataset.equip
  if (equip) {
    equipBall(equip)
  }
})

ui.nextRound.addEventListener('click', () => {
  if (state.phase !== 'shop') return
  state.round += 1
  roundStart()
})

roundStart()
requestAnimationFrame(loop)
