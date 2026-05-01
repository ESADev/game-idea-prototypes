import './style.css'
import { CFG } from './config.js'

// ─────────────────────────────────────────────────────────────────────────────
//  Game screens
// ─────────────────────────────────────────────────────────────────────────────
const SCREEN = { MENU: 'menu', COUNTDOWN: 'countdown', PLAYING: 'playing', END: 'end' }

// ─────────────────────────────────────────────────────────────────────────────
//  In-run upgrade definitions
// ─────────────────────────────────────────────────────────────────────────────
const IN_RUN_UPGRADE_DEFS = [
  {
    key: 'fireRate',
    label: '🔥 Atış Hızı',
    desc: () => `Mevcut: ${getFireRate().toFixed(1)}/s → +${CFG.BULLET_FIRE_RATE_PER_LVL}/s`,
  },
  {
    key: 'bulletDmg',
    label: '💥 Mermi Hasarı',
    desc: () => `Mevcut: ${getBulletDmg()} hasar → +${CFG.BULLET_DAMAGE_PER_LVL}`,
  },
  {
    key: 'pierce',
    label: '🎯 Delici Mermi',
    desc: () => `Mevcut: ${getPierceLevel()} geçiş → +1 geçiş`,
  },
  {
    key: 'shield',
    label: '🛡 Kalkan',
    desc: () => `Mevcut: ${state.inRunUpgrades.shield} yük → +${CFG.SHIELD_STACKS_PER_PICK} yük`,
  },
  {
    key: 'magnet',
    label: '🧲 Mıknatıs',
    desc: () => 'Kristaller topçuya çekilir (tek seferlik)',
  },
  {
    key: 'doubleGems',
    label: '💎 Çift Taş',
    desc: () => `Mevcut: ${state.inRunUpgrades.doubleGems} → %50 ihtimalle +1 taş düşer`,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
//  HTML scaffold
// ─────────────────────────────────────────────────────────────────────────────
const app = document.querySelector('#app')
app.innerHTML = `
  <div class="layout">
    <div class="hud" id="main-hud">
      <span id="money">💰 0</span>
      <span id="crystals-hud">💎 0</span>
      <span id="castle-hp-hud">🏰 Kale: 300</span>
    </div>
    <div class="canvas-wrap">
      <canvas id="game" width="960" height="600" aria-label="Oyun alanı"></canvas>

      <!-- Permanent inter-run shop (shown from main menu) -->
      <div id="shop" class="shop hidden" role="dialog" aria-modal="true">
        <h2>⚙️ Kalıcı Yükseltmeler</h2>
        <p id="shop-summary"></p>
        <div class="shop-actions">
          <button id="buy-fire-rate"  class="shop-btn"></button>
          <button id="buy-bullet-dmg" class="shop-btn"></button>
          <button id="buy-pierce"     class="shop-btn"></button>
        </div>
        <button id="shop-back" class="start-btn">← Geri Dön</button>
      </div>

      <!-- In-run upgrade choice panel -->
      <div id="upgrade-menu" class="upgrade-panel hidden" role="dialog" aria-modal="true">
        <h2>Yükseltme Seç — 💎 ${CFG.CRYSTAL_THRESHOLD}</h2>
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

// ─────────────────────────────────────────────────────────────────────────────
//  DOM refs
// ─────────────────────────────────────────────────────────────────────────────
const canvas          = document.querySelector('#game')
const ctx             = canvas.getContext('2d')
const mainHudEl       = document.querySelector('#main-hud')
const moneyEl         = document.querySelector('#money')
const crystalsHudEl   = document.querySelector('#crystals-hud')
const castleHpHudEl   = document.querySelector('#castle-hp-hud')
const shopEl          = document.querySelector('#shop')
const shopSummaryEl   = document.querySelector('#shop-summary')
const buyFireRateBtn  = document.querySelector('#buy-fire-rate')
const buyBulletDmgBtn = document.querySelector('#buy-bullet-dmg')
const buyPierceBtn    = document.querySelector('#buy-pierce')
const shopBackBtn     = document.querySelector('#shop-back')
const upgradeMenuEl   = document.querySelector('#upgrade-menu')
const upgradeChoicesEl= document.querySelector('#upgrade-choices')
const upgradeSkipBtn  = document.querySelector('#upgrade-skip')
const btnLeft         = document.querySelector('#btn-left')
const btnRight        = document.querySelector('#btn-right')

// ─────────────────────────────────────────────────────────────────────────────
//  World + layout
// ─────────────────────────────────────────────────────────────────────────────
const world = { w: canvas.width, h: canvas.height }

const BREACH_Y       = world.h - CFG.CASTLE_H - CFG.CASTLE_BATT_H - 8   // ≈ 516
const TURRET_START_Y = world.h - CFG.CASTLE_H - CFG.CASTLE_BATT_H - 52  // ≈ 472

// ─────────────────────────────────────────────────────────────────────────────
//  Input
// ─────────────────────────────────────────────────────────────────────────────
const keys = { left: false, right: false }
let mouseX = world.w / 2   // tracks latest mouse/touch x in canvas coords

// ─────────────────────────────────────────────────────────────────────────────
//  Game state
// ─────────────────────────────────────────────────────────────────────────────
const state = {
  screen: SCREEN.MENU,
  money: 0,
  runKills: 0,
  crystals: 0,
  spawnTimer: 0,
  time: 0,
  countdownTimer: 0,   // seconds remaining in 3-2-1 countdown

  // Permanent upgrades (persisted to localStorage)
  upgrades: { fireRate: 0, bulletDmg: 0, pierce: 0 },

  // In-run upgrades (reset each run)
  inRunUpgrades: { fireRate: 0, bulletDmg: 0, pierce: 0, shield: 0, magnet: 0, doubleGems: 0 },

  bullets:        [],
  enemies:        [],
  crystalPickups: [],
  coinPickups:    [],
  explosions:     [],

  fireTimer: 0,   // counts down to next shot

  turret: {
    x:           world.w / 2,
    y:           TURRET_START_Y,
    vx:          0,
    hp:          CFG.TURRET_MAX_HP,
    lastHitTime: -999,
  },

  castle: { hp: CFG.CASTLE_MAX_HP },
}

// ─────────────────────────────────────────────────────────────────────────────
//  Derived-value helpers
// ─────────────────────────────────────────────────────────────────────────────
function getFireRate() {
  return CFG.BULLET_BASE_FIRE_RATE
       + (state.upgrades.fireRate + state.inRunUpgrades.fireRate) * CFG.BULLET_FIRE_RATE_PER_LVL
}
function getBulletDmg() {
  return CFG.BULLET_BASE_DAMAGE
       + (state.upgrades.bulletDmg + state.inRunUpgrades.bulletDmg) * CFG.BULLET_DAMAGE_PER_LVL
}
function getPierceLevel() {
  return CFG.BULLET_PIERCE_BASE
       + state.upgrades.pierce
       + state.inRunUpgrades.pierce
}

function getCost(type) {
  const bases = {
    fireRate:  CFG.COST_BASE_FIRE_RATE,
    bulletDmg: CFG.COST_BASE_BULLET_DMG,
    pierce:    CFG.COST_BASE_PIERCE,
  }
  return Math.floor(bases[type] * Math.pow(CFG.COST_SCALE_FACTOR, state.upgrades[type]))
}

function crystalDropCount() {
  return Math.max(CFG.CRYSTAL_VALUE_MIN,
    Math.min(CFG.CRYSTAL_VALUE_MAX,
      Math.round(CFG.CRYSTAL_VALUE_MIN + Math.random() + Math.random())))
}

// ─────────────────────────────────────────────────────────────────────────────
//  Persistence
// ─────────────────────────────────────────────────────────────────────────────
function saveUpgrades() {
  localStorage.setItem(CFG.STORAGE_KEY, JSON.stringify({ upgrades: state.upgrades, money: state.money }))
}
function loadUpgrades() {
  try {
    const raw = localStorage.getItem(CFG.STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (parsed?.upgrades) {
      state.upgrades.fireRate  = Number(parsed.upgrades.fireRate)  || 0
      state.upgrades.bulletDmg = Number(parsed.upgrades.bulletDmg) || 0
      state.upgrades.pierce    = Number(parsed.upgrades.pierce)    || 0
    }
    state.money = Number(parsed?.money) || 0
  } catch { /* ignore broken saves */ }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Screen transitions
// ─────────────────────────────────────────────────────────────────────────────
function goToMenu() {
  state.screen = SCREEN.MENU
  shopEl.classList.add('hidden')
  upgradeMenuEl.classList.add('hidden')
  mainHudEl.style.display = 'none'
}

function openShop() {
  shopEl.classList.remove('hidden')
  shopSummaryEl.textContent = `💰 Toplam Altın: ${state.money}`
  renderShopButtons()
}

function startCountdown() {
  shopEl.classList.add('hidden')
  upgradeMenuEl.classList.add('hidden')
  resetRun()
  state.screen = SCREEN.COUNTDOWN
  state.countdownTimer = 3.99  // 3 → 2 → 1 → GO!
}

function startPlaying() {
  state.screen = SCREEN.PLAYING
  mainHudEl.style.display = ''
  updateHUD()
}

function endRun() {
  state.screen = SCREEN.END
  upgradeMenuEl.classList.add('hidden')
  mainHudEl.style.display = 'none'
  saveUpgrades()
}

// ─────────────────────────────────────────────────────────────────────────────
//  Run lifecycle
// ─────────────────────────────────────────────────────────────────────────────
function resetRun() {
  state.runKills      = 0
  state.crystals      = 0
  state.spawnTimer    = 0
  state.time          = 0
  state.fireTimer     = 0
  state.enemies       = []
  state.bullets       = []
  state.crystalPickups= []
  state.coinPickups   = []
  state.explosions    = []

  state.inRunUpgrades = { fireRate: 0, bulletDmg: 0, pierce: 0, shield: 0, magnet: 0, doubleGems: 0 }

  state.turret.x           = world.w / 2
  state.turret.vx          = 0
  state.turret.hp          = CFG.TURRET_MAX_HP
  state.turret.lastHitTime = -999

  state.castle.hp = CFG.CASTLE_MAX_HP
}

// ─────────────────────────────────────────────────────────────────────────────
//  Damage helpers
// ─────────────────────────────────────────────────────────────────────────────
function applyTurretHit(dmg) {
  if (state.inRunUpgrades.shield > 0) {
    state.inRunUpgrades.shield -= 1
    spawnExplosion(state.turret.x, state.turret.y, 28, true)
  } else {
    state.turret.hp = Math.max(0, state.turret.hp - dmg)
    state.turret.lastHitTime = state.time
  }
}
function applyCastleDamage(dmg) {
  state.castle.hp = Math.max(0, state.castle.hp - dmg)
}

// ─────────────────────────────────────────────────────────────────────────────
//  Physics updates
// ─────────────────────────────────────────────────────────────────────────────
function updateTurretHP(dt) {
  if (state.time - state.turret.lastHitTime >= CFG.TURRET_HP_REGEN_DELAY) {
    state.turret.hp = Math.min(CFG.TURRET_MAX_HP, state.turret.hp + CFG.TURRET_HP_REGEN_RATE * dt)
  }
}

function updateTurret(dt) {
  // Mouse/touch overrides keyboard: snap target toward mouseX
  const targetX = mouseX
  const diff     = targetX - state.turret.x
  const dir      = Math.sign(diff)

  // Also honour keyboard as fallback
  const keyDir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0)
  const finalDir = keyDir !== 0 ? keyDir : (Math.abs(diff) > 2 ? dir : 0)

  const rate  = finalDir !== 0 ? CFG.TURRET_ACCEL_RATE : CFG.TURRET_DECEL_RATE
  state.turret.vx += (finalDir * CFG.TURRET_BASE_SPEED - state.turret.vx) * Math.min(1, rate * dt)

  // If close to mouse target, clamp so we don't overshoot
  if (keyDir === 0 && Math.abs(diff) < Math.abs(state.turret.vx * dt)) {
    state.turret.x = targetX
    state.turret.vx = 0
  } else {
    state.turret.x += state.turret.vx * dt
  }

  const half = CFG.TURRET_WIDTH / 2
  state.turret.x = Math.max(half, Math.min(world.w - half, state.turret.x))
}

function fireBullet() {
  state.bullets.push({
    x: state.turret.x,
    y: state.turret.y - CFG.TURRET_HEIGHT / 2 - CFG.TURRET_BARREL_H,
    vy: -CFG.BULLET_SPEED,
    dmg: getBulletDmg(),
    pierceLeft: getPierceLevel(),
    r: CFG.BULLET_RADIUS,
  })
}

function updateBullets(dt) {
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i]
    b.y += b.vy * dt
    if (b.y + b.r < 0) {
      state.bullets.splice(i, 1)
    }
  }
}

function spawnEnemy() {
  const roll = Math.random()
  let x, y
  if (roll < CFG.ENEMY_TOP_SPAWN_CHANCE) {
    const m = CFG.ENEMY_SPAWN_MARGIN
    x = m + Math.random() * (world.w - m * 2)
    y = -CFG.ENEMY_BASE_RADIUS * 2
  } else if (roll < CFG.ENEMY_LEFT_SPAWN_CHANCE) {
    x = -CFG.ENEMY_BASE_RADIUS * 2
    y = Math.random() * world.h * CFG.ENEMY_SIDE_Y_FRACTION
  } else {
    x = world.w + CFG.ENEMY_BASE_RADIUS * 2
    y = Math.random() * world.h * CFG.ENEMY_SIDE_Y_FRACTION
  }

  const isElite = Math.random() < CFG.ELITE_SPAWN_CHANCE
  const baseR   = CFG.ENEMY_BASE_RADIUS + Math.floor((Math.random() - 0.5) * CFG.ENEMY_RADIUS_VARIANCE)
  const r       = isElite ? Math.round(baseR * CFG.ELITE_RADIUS_MULT) : baseR

  const baseSpeed = CFG.ENEMY_BASE_SPEED + Math.random() * CFG.ENEMY_SPEED_VARIANCE
                  + Math.min(CFG.ENEMY_SPEED_TIME_CAP, state.time * CFG.ENEMY_SPEED_TIME_SCALE)
  const speed = isElite ? baseSpeed * CFG.ELITE_SPEED_MULT : baseSpeed

  const baseHp = CFG.ENEMY_BASE_HP + Math.min(CFG.ENEMY_HP_TIME_CAP, state.time * CFG.ENEMY_HP_TIME_SCALE)
  const maxHp  = isElite ? Math.round(baseHp * CFG.ELITE_HP_MULT) : Math.round(baseHp)

  // Color: normal = red/orange hue; elite = purple/magenta
  let color
  if (isElite) {
    const hue   = Math.round(270 + (Math.random() - 0.5) * 30)
    const sat   = Math.round(80  + Math.random() * 20)
    const light = Math.round(45  + Math.random() * 10)
    color = `hsl(${hue},${sat}%,${light}%)`
  } else {
    const hue   = Math.round(355 + (Math.random() - 0.5) * 20)
    const sat   = Math.round(70  + Math.random() * 20)
    const light = Math.round(45  + Math.random() * 10)
    color = `hsl(${hue},${sat}%,${light}%)`
  }

  state.enemies.push({ x, y, r, color, speed, hp: maxHp, maxHp, isElite, breaching: false })
}

function handleEnemyMovement(dt) {
  for (const e of state.enemies) {
    if (e.breaching) e.speed = Math.max(0, e.speed - CFG.ENEMY_BREACH_DECEL * dt)
    e.y += e.speed * dt
  }

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i]

    // Cull enemies fully off-screen horizontally (side-spawned, no horizontal vel)
    if (e.x + e.r <= 0 || e.x - e.r >= world.w) {
      state.enemies.splice(i, 1)
      continue
    }

    // Direct turret hit → turret damage
    if (!e.breaching) {
      const t = state.turret
      const hitTurret =
        e.y + e.r >= t.y - CFG.TURRET_HEIGHT / 2 &&
        e.y - e.r <= t.y + CFG.TURRET_HEIGHT / 2 &&
        e.x >= t.x - CFG.TURRET_WIDTH / 2 &&
        e.x <= t.x + CFG.TURRET_WIDTH / 2

      if (hitTurret) {
        state.enemies.splice(i, 1)
        applyTurretHit(CFG.TURRET_HP_PER_HIT)
        spawnExplosion(e.x, e.y, 32, true)
        continue
      }

      if (e.y + e.r >= BREACH_Y) e.breaching = true
    }

    // Breaching enemy stopped or reached castle wall → explode
    if (e.breaching && (e.speed <= 0 || e.y + e.r >= world.h - CFG.CASTLE_H)) {
      state.enemies.splice(i, 1)
      const dmg = e.isElite
        ? Math.round(CFG.ENEMY_CASTLE_DAMAGE * CFG.ELITE_CASTLE_DAMAGE_MULT)
        : CFG.ENEMY_CASTLE_DAMAGE
      applyCastleDamage(dmg)
      spawnExplosion(e.x, Math.min(e.y, world.h - CFG.CASTLE_H - 5), e.isElite ? 72 : 52, false)
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

function handleBulletEnemyCollisions() {
  for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
    const b = state.bullets[bi]
    for (let ei = state.enemies.length - 1; ei >= 0; ei--) {
      const e = state.enemies[ei]
      if (e.breaching) continue

      const dx = b.x - e.x
      const dy = b.y - e.y
      const dist2 = dx * dx + dy * dy
      const minD  = b.r + e.r
      if (dist2 > minD * minD) continue

      // Hit!
      e.hp -= b.dmg
      spawnExplosion(b.x, b.y, 18, true)

      if (e.hp <= 0) {
        // Kill
        state.enemies.splice(ei, 1)
        state.runKills += 1
        state.money    += 1

        if (e.isElite) state.money += CFG.ELITE_COIN_BONUS

        // Crystal drop
        const base  = crystalDropCount()
        const count = (state.inRunUpgrades.doubleGems > 0 && Math.random() < CFG.DOUBLE_GEMS_CHANCE)
                      ? base + 1 : base
        for (let c = 0; c < count; c++) {
          state.crystalPickups.push({
            x:  e.x + (Math.random() - 0.5) * CFG.CRYSTAL_SPREAD_X,
            y:  e.y + (Math.random() - 0.5) * CFG.CRYSTAL_SPREAD_Y,
            vy: CFG.CRYSTAL_SPEED_MIN + Math.random() * (CFG.CRYSTAL_SPEED_MAX - CFG.CRYSTAL_SPEED_MIN),
          })
        }

        // Coin drop
        if (Math.random() < CFG.COIN_DROP_CHANCE || e.isElite) {
          state.coinPickups.push({
            x:  e.x + (Math.random() - 0.5) * CFG.COIN_SPREAD_X,
            y:  e.y,
            vy: CFG.COIN_SPEED_MIN + Math.random() * (CFG.COIN_SPEED_MAX - CFG.COIN_SPEED_MIN),
          })
        }
      }

      // Pierce logic
      if (b.pierceLeft > 0) {
        b.pierceLeft -= 1
      } else {
        state.bullets.splice(bi, 1)
        break
      }
    }
  }
}

function updateCrystals(dt) {
  const tx = state.turret.x
  const ty = state.turret.y - CFG.TURRET_HEIGHT / 2
  const tw = CFG.TURRET_WIDTH / 2
  const pr = CFG.CRYSTAL_PICKUP_RADIUS

  for (let i = state.crystalPickups.length - 1; i >= 0; i--) {
    const c = state.crystalPickups[i]

    if (state.inRunUpgrades.magnet > 0) {
      c.x  += (tx - c.x) * CFG.CRYSTAL_MAGNET_PULL * dt
      c.vy  = Math.min(c.vy + CFG.CRYSTAL_MAGNET_ACCEL * dt, CFG.CRYSTAL_MAGNET_MAX_VY)
    }
    c.y += c.vy * dt

    if (c.y + pr >= ty - 4 &&
        c.y - pr <= ty + CFG.TURRET_HEIGHT + 4 &&
        c.x >= tx - tw - pr &&
        c.x <= tx + tw + pr) {
      state.crystalPickups.splice(i, 1)
      state.crystals += 1
      if (state.crystals >= CFG.CRYSTAL_THRESHOLD && state.screen === SCREEN.PLAYING) {
        state.screen = SCREEN.PLAYING  // keep playing, just pause for menu
        showUpgradeMenu()
      }
      continue
    }

    if (c.y - pr > world.h) state.crystalPickups.splice(i, 1)
  }
}

function updateCoins(dt) {
  const tx = state.turret.x
  const ty = state.turret.y - CFG.TURRET_HEIGHT / 2
  const tw = CFG.TURRET_WIDTH / 2
  const pr = CFG.COIN_PICKUP_RADIUS

  for (let i = state.coinPickups.length - 1; i >= 0; i--) {
    const c = state.coinPickups[i]
    c.y += c.vy * dt

    if (c.y + pr >= ty - 4 &&
        c.y - pr <= ty + CFG.TURRET_HEIGHT + 4 &&
        c.x >= tx - tw - pr &&
        c.x <= tx + tw + pr) {
      state.coinPickups.splice(i, 1)
      state.money += CFG.COIN_VALUE
      continue
    }

    if (c.y - pr > world.h) state.coinPickups.splice(i, 1)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  In-run upgrade menu
// ─────────────────────────────────────────────────────────────────────────────
let upgradePaused = false

function showUpgradeMenu() {
  upgradePaused = true
  upgradeMenuEl.classList.remove('hidden')
  upgradeChoicesEl.innerHTML = ''

  const pool = IN_RUN_UPGRADE_DEFS.filter(u =>
    !(u.key === 'magnet' && state.inRunUpgrades.magnet > 0)
  )
  const choices = [...pool].sort(() => Math.random() - 0.5).slice(0, 3)

  for (const upg of choices) {
    const btn = document.createElement('button')
    btn.className = 'shop-btn upgrade-choice-btn'
    btn.innerHTML = `<span class="upg-label">${upg.label}</span><span class="upg-desc">${upg.desc()}</span>`
    btn.addEventListener('click', () => {
      applyInRunUpgrade(upg.key)
      state.crystals -= CFG.CRYSTAL_THRESHOLD
      upgradeMenuEl.classList.add('hidden')
      upgradePaused = false
    })
    upgradeChoicesEl.appendChild(btn)
  }
}

function applyInRunUpgrade(key) {
  if (key === 'shield') {
    state.inRunUpgrades.shield += CFG.SHIELD_STACKS_PER_PICK
  } else {
    state.inRunUpgrades[key] += 1
  }
}

upgradeSkipBtn.addEventListener('click', () => {
  upgradeMenuEl.classList.add('hidden')
  upgradePaused = false
})

// ─────────────────────────────────────────────────────────────────────────────
//  HUD
// ─────────────────────────────────────────────────────────────────────────────
function updateHUD() {
  moneyEl.textContent = `💰 ${state.money}`
  crystalsHudEl.textContent = `💎 ${state.crystals}`

  const cPct = state.castle.hp / CFG.CASTLE_MAX_HP
  castleHpHudEl.textContent = `🏰 Kale: ${Math.ceil(state.castle.hp)}`
  castleHpHudEl.style.color = cPct <= 0.25 ? '#ef4444' : cPct <= 0.5 ? '#f97316' : ''
}

function renderShopButtons() {
  const fc = getCost('fireRate')
  const dc = getCost('bulletDmg')
  const pc = getCost('pierce')

  buyFireRateBtn.textContent  = `🔥 Atış Hızı  Sv.${state.upgrades.fireRate}  (+${CFG.BULLET_FIRE_RATE_PER_LVL}/s) — 💰${fc}`
  buyBulletDmgBtn.textContent = `💥 Mermi Hasarı Sv.${state.upgrades.bulletDmg} (+${CFG.BULLET_DAMAGE_PER_LVL}) — 💰${dc}`
  buyPierceBtn.textContent    = `🎯 Delici Mermi Sv.${state.upgrades.pierce}  (+1 geçiş) — 💰${pc}`

  buyFireRateBtn.disabled  = state.money < fc
  buyBulletDmgBtn.disabled = state.money < dc
  buyPierceBtn.disabled    = state.money < pc
}

// ─────────────────────────────────────────────────────────────────────────────
//  Drawing helpers
// ─────────────────────────────────────────────────────────────────────────────
function drawCastle() {
  const cY = world.h - CFG.CASTLE_H
  const cW = world.w

  ctx.fillStyle = '#1e1050'
  ctx.fillRect(0, cY, cW, CFG.CASTLE_H)

  ctx.strokeStyle = '#2d1a70'
  ctx.lineWidth = 1
  for (let row = 0; row < 3; row++) {
    const rowY = cY + 6 + row * 17
    const off  = row % 2 === 0 ? 0 : 26
    for (let bx = -off; bx < cW; bx += 52) ctx.strokeRect(bx + 1, rowY, 50, 15)
  }

  ctx.fillStyle = '#251560'
  const battW = 28, battGap = 18, period = battW + battGap
  for (let bx = 4; bx < cW - battW; bx += period)
    ctx.fillRect(bx, cY - CFG.CASTLE_BATT_H, battW, CFG.CASTLE_BATT_H)

  const tW = 54, tH = CFG.CASTLE_H + 28
  ctx.fillStyle = '#180e45'
  ctx.fillRect(0,       cY - 28, tW, tH)
  ctx.fillRect(cW - tW, cY - 28, tW, tH)

  ctx.fillStyle = '#251560'
  const tBatt = 12, tGap = 8
  for (let tx = 4; tx < tW - tBatt; tx += tBatt + tGap) {
    ctx.fillRect(tx,           cY - 28 - 12, tBatt, 12)
    ctx.fillRect(cW - tW + tx, cY - 28 - 12, tBatt, 12)
  }

  ctx.fillStyle = '#7c3aed44'
  const winW = 10, winH = 22
  ctx.fillRect(tW / 2 - winW / 2,           cY - 14, winW, winH)
  ctx.fillRect(cW - tW + tW / 2 - winW / 2, cY - 14, winW, winH)

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

  ctx.fillStyle = '#a78bfa'
  ctx.font = 'bold 13px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`🏰 KOZMİK KALE  ${Math.ceil(state.castle.hp)} / ${CFG.CASTLE_MAX_HP}`, cW / 2, cY + 26)
  ctx.textAlign = 'left'
}

function drawCrystalBar() {
  const fill   = Math.min(1, state.crystals / CFG.CRYSTAL_THRESHOLD)
  const barH   = 14
  const barY   = 3
  const margin = 4
  const barX   = margin
  const barW   = world.w - margin * 2

  ctx.fillStyle = '#0a1628'
  ctx.fillRect(barX, barY, barW, barH)

  if (fill > 0) {
    const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0)
    grad.addColorStop(0, '#0369a1')
    grad.addColorStop(0.6, '#0ea5e9')
    grad.addColorStop(1, '#22d3ee')
    ctx.fillStyle = grad
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

  ctx.strokeStyle = '#1e3a5f'
  ctx.lineWidth   = 1
  ctx.strokeRect(barX, barY, barW, barH)

  ctx.strokeStyle = '#0f172a'
  for (let i = 1; i < CFG.CRYSTAL_THRESHOLD; i++) {
    const tx = barX + (barW / CFG.CRYSTAL_THRESHOLD) * i
    ctx.beginPath()
    ctx.moveTo(tx, barY)
    ctx.lineTo(tx, barY + barH)
    ctx.stroke()
  }

  ctx.fillStyle    = fill >= 0.8 ? '#ffffff' : '#94a3b8'
  ctx.font         = `bold ${barH - 4}px Inter, system-ui, sans-serif`
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`💎 ${state.crystals} / ${CFG.CRYSTAL_THRESHOLD}  —  YÜKSELTME`, world.w / 2, barY + barH / 2)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign    = 'left'
}

function drawTurret() {
  const t   = state.turret
  const tx  = t.x
  const ty  = t.y
  const tw  = CFG.TURRET_WIDTH
  const th  = CFG.TURRET_HEIGHT
  const bw  = CFG.TURRET_BARREL_W
  const bh  = CFG.TURRET_BARREL_H

  // HP bar above turret
  const hpPct = t.hp / CFG.TURRET_MAX_HP
  const hpBarW = tw + 12
  const hpBarX = tx - hpBarW / 2
  const hpBarY = ty - th / 2 - 12
  ctx.fillStyle = '#1e293b'
  ctx.fillRect(hpBarX, hpBarY, hpBarW, 8)
  ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#f97316' : '#ef4444'
  ctx.fillRect(hpBarX, hpBarY, hpBarW * hpPct, 8)

  // Shield glow
  if (state.inRunUpgrades.shield > 0) {
    ctx.save()
    ctx.strokeStyle = '#60a5fa'
    ctx.lineWidth   = 3
    ctx.shadowBlur  = 14
    ctx.shadowColor = '#60a5fa'
    ctx.strokeRect(tx - tw / 2 - 6, ty - th / 2 - 6, tw + 12, th + 12)
    ctx.restore()
  }

  // Barrel
  ctx.save()
  ctx.shadowBlur  = 8
  ctx.shadowColor = '#38bdf8'
  ctx.fillStyle   = '#38bdf8'
  ctx.fillRect(tx - bw / 2, ty - th / 2 - bh, bw, bh)
  ctx.restore()

  // Base body
  ctx.fillStyle = state.inRunUpgrades.shield > 0 ? '#93c5fd' : '#7dd3fc'
  ctx.fillRect(tx - tw / 2, ty - th / 2, tw, th)

  // Base accent stripe
  ctx.fillStyle = '#0ea5e9'
  ctx.fillRect(tx - tw / 2, ty, tw, 4)

  // HP text (shield count)
  if (state.inRunUpgrades.shield > 0) {
    ctx.fillStyle    = '#fff'
    ctx.font         = 'bold 11px Inter, system-ui, sans-serif'
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`🛡${state.inRunUpgrades.shield}`, tx, ty - th / 2 + th / 2)
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign    = 'left'
  }
}

function drawEnemies() {
  for (const e of state.enemies) {
    const hpPct = e.hp / e.maxHp

    if (e.breaching) {
      ctx.save()
      ctx.shadowBlur  = 14 + 6 * Math.sin(state.time * 12)
      ctx.shadowColor = '#ff6600'
      ctx.fillStyle   = '#ff4422'
      ctx.fillRect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2)
      ctx.restore()
    } else {
      // Body
      if (e.isElite) {
        ctx.save()
        ctx.shadowBlur  = 10 + 4 * Math.sin(state.time * 6)
        ctx.shadowColor = e.color
        ctx.fillStyle   = e.color
        ctx.fillRect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2)
        ctx.restore()
        // Elite crown indicator
        ctx.fillStyle = '#fbbf24'
        ctx.font      = `bold ${Math.max(10, e.r - 4)}px Inter, system-ui`
        ctx.textAlign    = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('★', e.x, e.y)
        ctx.textBaseline = 'alphabetic'
        ctx.textAlign    = 'left'
      } else {
        ctx.fillStyle = e.color
        ctx.fillRect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2)
      }
    }

    // HP bar (all enemies)
    const barW  = e.r * 2
    const barH  = 4
    const barX  = e.x - e.r
    const barY  = e.y - e.r - barH - 2
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(barX, barY, barW, barH)
    ctx.fillStyle = e.isElite
      ? (hpPct > 0.5 ? '#c084fc' : hpPct > 0.25 ? '#f97316' : '#ef4444')
      : (hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#f97316' : '#ef4444')
    ctx.fillRect(barX, barY, barW * hpPct, barH)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Screen drawing functions
// ─────────────────────────────────────────────────────────────────────────────
function drawBackground() {
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, world.w, world.h)
}

function drawMenuScreen() {
  drawBackground()

  // Subtle starfield
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  // We use deterministic positions based on index so they don't flicker
  for (let i = 0; i < 80; i++) {
    const sx = ((i * 137.5) % world.w)
    const sy = ((i * 91.3)  % world.h)
    const r  = 0.5 + (i % 3) * 0.5
    ctx.beginPath()
    ctx.arc(sx, sy, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // Title
  ctx.save()
  ctx.shadowBlur  = 24
  ctx.shadowColor = '#7c3aed'
  ctx.fillStyle   = '#c4b5fd'
  ctx.font        = 'bold 64px Inter, system-ui, sans-serif'
  ctx.textAlign   = 'center'
  ctx.fillText('TOPÇU SURVIVORS', world.w / 2, 140)
  ctx.restore()

  ctx.fillStyle = '#94a3b8'
  ctx.font      = '22px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Kaleyi savunun. Düşmanları durdurun.', world.w / 2, 185)

  // Stats row
  ctx.fillStyle = '#64748b'
  ctx.font      = '18px Inter, system-ui, sans-serif'
  ctx.fillText(`💰 Altın: ${state.money}   |   🔥 Atış: Sv.${state.upgrades.fireRate}   |   💥 Hasar: Sv.${state.upgrades.bulletDmg}   |   🎯 Delici: Sv.${state.upgrades.pierce}`, world.w / 2, 220)

  // Play button (drawn on canvas)
  drawCanvasButton(world.w / 2, 310, 220, 60, '▶  OYNA', '#16a34a', '#bbf7d0')

  // Shop button
  drawCanvasButton(world.w / 2, 390, 220, 52, '⚙  YÜKSELTMELER', '#1d4ed8', '#bfdbfe')

  // Controls hint
  ctx.fillStyle = '#475569'
  ctx.font      = '15px Inter, system-ui, sans-serif'
  ctx.fillText('Fare / Dokunmatik ile hareket · Otomatik ateş', world.w / 2, 470)

  ctx.textAlign = 'left'
}

// Hit areas for canvas buttons (set each draw, read in click handler)
const canvasBtns = {}
function drawCanvasButton(cx, cy, w, h, label, bg, textColor) {
  const x = cx - w / 2
  const y = cy - h / 2
  ctx.save()
  ctx.shadowBlur  = 12
  ctx.shadowColor = bg
  ctx.fillStyle   = bg
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, 10)
  ctx.fill()
  ctx.restore()
  ctx.fillStyle    = textColor
  ctx.font         = 'bold 22px Inter, system-ui, sans-serif'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, cx, cy)
  ctx.textBaseline = 'alphabetic'
  return { x, y, w, h }
}

function drawCountdownScreen() {
  drawBackground()
  drawCastle()

  // Objective text
  ctx.fillStyle = '#e2e8f0'
  ctx.font      = 'bold 26px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('🎯 GÖREV: Düşmanları toplarla durdur, kaleyi koru!', world.w / 2, 180)

  ctx.fillStyle = '#94a3b8'
  ctx.font      = '20px Inter, system-ui, sans-serif'
  ctx.fillText('Fare / parmakla topçuyu hareket ettir · Otomatik ateş eder', world.w / 2, 220)
  ctx.fillText('Kristalleri topla → Yükseltme aç  |  Altınları topla → Mağaza', world.w / 2, 248)

  // Countdown number
  const tick = Math.ceil(state.countdownTimer)
  const frac = state.countdownTimer - Math.floor(state.countdownTimer) // 0→1 within each second (inverted)
  const scale = 1 + (1 - frac) * 0.6  // big when just changed, shrinks as next tick approaches

  ctx.save()
  ctx.translate(world.w / 2, 340)
  ctx.scale(scale, scale)
  ctx.shadowBlur  = 40
  ctx.shadowColor = tick > 1 ? '#f97316' : '#22c55e'
  ctx.fillStyle   = tick > 1 ? '#fb923c' : '#4ade80'
  ctx.font        = 'bold 120px Inter, system-ui, sans-serif'
  ctx.textAlign   = 'center'
  ctx.textBaseline= 'middle'
  ctx.fillText(tick <= 0 ? 'GİT!' : String(tick), 0, 0)
  ctx.textBaseline= 'alphabetic'
  ctx.restore()

  ctx.textAlign = 'left'
}

function drawEndScreen() {
  drawBackground()

  // Dim overlay
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(0, 0, world.w, world.h)

  // Result title
  const lost = state.castle.hp <= 0
  ctx.save()
  ctx.shadowBlur  = 24
  ctx.shadowColor = lost ? '#ef4444' : '#22c55e'
  ctx.fillStyle   = lost ? '#f87171' : '#4ade80'
  ctx.font        = 'bold 60px Inter, system-ui, sans-serif'
  ctx.textAlign   = 'center'
  ctx.fillText(lost ? '🏚 KALE DÜŞTÜ' : '⚔ TUR SONA ERDİ', world.w / 2, 200)
  ctx.restore()

  ctx.fillStyle = '#e2e8f0'
  ctx.font      = '28px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`Öldürülen düşman: ${state.runKills}`, world.w / 2, 262)
  ctx.fillText(`Toplanan altın: 💰 ${state.money}`, world.w / 2, 300)

  // Buttons
  const r1 = drawCanvasButton(world.w / 2 - 130, 390, 220, 58, '🔄 TEKRAR', '#16a34a', '#bbf7d0')
  const r2 = drawCanvasButton(world.w / 2 + 130, 390, 220, 58, '🏠 ANA MENÜ', '#1d4ed8', '#bfdbfe')

  canvasBtns.endRestart  = r1
  canvasBtns.endMainMenu = r2

  ctx.textAlign = 'left'
}

function drawPlayingScreen() {
  drawBackground()
  drawCastle()

  // Danger-zone tint between turret bottom and breach line
  const tBottom = state.turret.y + CFG.TURRET_HEIGHT / 2 + 4
  ctx.fillStyle = 'rgba(220, 38, 38, 0.06)'
  ctx.fillRect(0, tBottom, world.w, BREACH_Y - tBottom)

  // Breach line
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

  ctx.fillStyle = 'rgba(220, 38, 38, 0.8)'
  ctx.font      = 'bold 12px Inter, system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('⚠ KALEYİ SAVUNUN — DÜŞMANLARı DURDURUN', 10, BREACH_Y - 4)

  ctx.strokeStyle = '#334155'
  ctx.lineWidth   = 2
  ctx.setLineDash([])
  ctx.strokeRect(1, 1, world.w - 2, world.h - 2)

  drawEnemies()
  drawTurret()

  // Bullets
  for (const b of state.bullets) {
    ctx.save()
    ctx.shadowBlur  = 10
    ctx.shadowColor = '#fbbf24'
    ctx.fillStyle   = '#fde68a'
    ctx.beginPath()
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // Crystal pickups
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

  // Coin pickups
  for (const c of state.coinPickups) {
    ctx.save()
    ctx.shadowBlur  = 8
    ctx.shadowColor = '#fbbf24'
    ctx.beginPath()
    ctx.arc(c.x, c.y, CFG.COIN_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = '#fbbf24'
    ctx.fill()
    ctx.strokeStyle = '#d97706'
    ctx.lineWidth   = 2
    ctx.stroke()
    ctx.fillStyle    = '#78350f'
    ctx.font         = `bold ${CFG.COIN_RADIUS + 1}px Inter, system-ui`
    ctx.textAlign    = 'center'
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

  // Crystal progress bar (top)
  drawCrystalBar()
}

// ─────────────────────────────────────────────────────────────────────────────
//  Master draw
// ─────────────────────────────────────────────────────────────────────────────
function draw() {
  ctx.clearRect(0, 0, world.w, world.h)

  switch (state.screen) {
    case SCREEN.MENU:      drawMenuScreen();      break
    case SCREEN.COUNTDOWN: drawCountdownScreen(); break
    case SCREEN.PLAYING:   drawPlayingScreen();   break
    case SCREEN.END:       drawEndScreen();        break
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Game loop
// ─────────────────────────────────────────────────────────────────────────────
let last = performance.now()

function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000)
  last = now

  // ── MENU ──────────────────────────────────────────────────────────────────
  if (state.screen === SCREEN.MENU) {
    draw()
    requestAnimationFrame(loop)
    return
  }

  // ── COUNTDOWN ─────────────────────────────────────────────────────────────
  if (state.screen === SCREEN.COUNTDOWN) {
    state.countdownTimer -= dt
    if (state.countdownTimer <= 0) startPlaying()
    draw()
    requestAnimationFrame(loop)
    return
  }

  // ── END ───────────────────────────────────────────────────────────────────
  if (state.screen === SCREEN.END) {
    draw()
    requestAnimationFrame(loop)
    return
  }

  // ── PLAYING ───────────────────────────────────────────────────────────────
  if (!upgradePaused) {
    state.time += dt

    updateTurret(dt)
    updateTurretHP(dt)

    // Auto-fire
    state.fireTimer -= dt
    if (state.fireTimer <= 0) {
      fireBullet()
      state.fireTimer = 1 / getFireRate()
    }

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
    updateBullets(dt)
    handleBulletEnemyCollisions()
    updateCrystals(dt)
    updateCoins(dt)
    updateExplosions(dt)

    // End condition
    if (state.turret.hp <= 0 || state.castle.hp <= 0) endRun()
  }

  updateHUD()
  draw()
  requestAnimationFrame(loop)
}

// ─────────────────────────────────────────────────────────────────────────────
//  Input handlers
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft'  || e.key.toLowerCase() === 'a') keys.left  = true
  if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = true
})
document.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft'  || e.key.toLowerCase() === 'a') keys.left  = false
  if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = false
})

// Mouse tracking on canvas
function canvasMouseX(e) {
  const rect  = canvas.getBoundingClientRect()
  const scaleX = world.w / rect.width
  return (e.clientX - rect.left) * scaleX
}
canvas.addEventListener('mousemove', (e) => { mouseX = canvasMouseX(e) })

// Canvas clicks — menu/end screen buttons
canvas.addEventListener('click', (e) => {
  const rect  = canvas.getBoundingClientRect()
  const scaleX = world.w / rect.width
  const scaleY = world.h / rect.height
  const cx = (e.clientX - rect.left) * scaleX
  const cy = (e.clientY - rect.top)  * scaleY

  if (state.screen === SCREEN.MENU) {
    // Play button area: center 310, 220×60
    if (cx >= world.w / 2 - 110 && cx <= world.w / 2 + 110 && cy >= 280 && cy <= 340) {
      startCountdown()
      return
    }
    // Shop button area: center 390, 220×52
    if (cx >= world.w / 2 - 110 && cx <= world.w / 2 + 110 && cy >= 364 && cy <= 416) {
      openShop()
      return
    }
  }

  if (state.screen === SCREEN.END) {
    const r = canvasBtns.endRestart
    const m = canvasBtns.endMainMenu
    if (r && cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) {
      startCountdown()
      return
    }
    if (m && cx >= m.x && cx <= m.x + m.w && cy >= m.y && cy <= m.y + m.h) {
      goToMenu()
      return
    }
  }
})

// Touch tracking on canvas (for turret movement)
function canvasTouchX(touch) {
  const rect   = canvas.getBoundingClientRect()
  const scaleX = world.w / rect.width
  return (touch.clientX - rect.left) * scaleX
}
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault()
  if (e.touches.length > 0) mouseX = canvasTouchX(e.touches[0])
}, { passive: false })
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault()
  if (e.touches.length > 0) {
    mouseX = canvasTouchX(e.touches[0])
    // Tap on menu/end buttons
    const rect   = canvas.getBoundingClientRect()
    const scaleX = world.w / rect.width
    const scaleY = world.h / rect.height
    const cx = (e.touches[0].clientX - rect.left) * scaleX
    const cy = (e.touches[0].clientY - rect.top)  * scaleY

    if (state.screen === SCREEN.MENU) {
      if (cx >= world.w / 2 - 110 && cx <= world.w / 2 + 110 && cy >= 280 && cy <= 340) {
        startCountdown(); return
      }
      if (cx >= world.w / 2 - 110 && cx <= world.w / 2 + 110 && cy >= 364 && cy <= 416) {
        openShop(); return
      }
    }
    if (state.screen === SCREEN.END) {
      const r = canvasBtns.endRestart
      const m = canvasBtns.endMainMenu
      if (r && cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) { startCountdown(); return }
      if (m && cx >= m.x && cx <= m.x + m.w && cy >= m.y && cy <= m.y + m.h) { goToMenu(); return }
    }
  }
}, { passive: false })

// Hold buttons for keyboard-style control (still useful on mobile side buttons)
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

// ─────────────────────────────────────────────────────────────────────────────
//  Permanent shop (HTML overlay)
// ─────────────────────────────────────────────────────────────────────────────
function buyUpgrade(type) {
  const cost = getCost(type)
  if (state.money < cost) return
  state.money -= cost
  state.upgrades[type] += 1
  saveUpgrades()
  renderShopButtons()
  shopSummaryEl.textContent = `💰 Toplam Altın: ${state.money}`
}
buyFireRateBtn.addEventListener('click',  () => buyUpgrade('fireRate'))
buyBulletDmgBtn.addEventListener('click', () => buyUpgrade('bulletDmg'))
buyPierceBtn.addEventListener('click',    () => buyUpgrade('pierce'))

shopBackBtn.addEventListener('click', () => {
  shopEl.classList.add('hidden')
  saveUpgrades()
})

// ─────────────────────────────────────────────────────────────────────────────
//  roundRect polyfill (Safari < 15.4, older Chrome)
// ─────────────────────────────────────────────────────────────────────────────
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2)
    this.moveTo(x + r, y)
    this.lineTo(x + w - r, y)
    this.quadraticCurveTo(x + w, y, x + w, y + r)
    this.lineTo(x + w, y + h - r)
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    this.lineTo(x + r, y + h)
    this.quadraticCurveTo(x, y + h, x, y + h - r)
    this.lineTo(x, y + r)
    this.quadraticCurveTo(x, y, x + r, y)
    this.closePath()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Bootstrap
// ─────────────────────────────────────────────────────────────────────────────
loadUpgrades()
mainHudEl.style.display = 'none'  // hide HUD until a run starts
goToMenu()
requestAnimationFrame(loop)
