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
    weight: () => CFG.WEIGHT_FIRE_RATE,
    label: '🌧️ Mermi Yağmuru',
    desc: () => {
      const cur = getFireRate()
      const next = cur * CFG.BULLET_FIRE_RATE_MULT
      return `Saniyede edilen ateş miktarı ${cur.toFixed(1)}/s → +${((CFG.BULLET_FIRE_RATE_MULT - 1) * 100).toFixed(0)}%'a çıkar!`
    },
  },
  {
    key: 'bulletDmg',
    weight: () => CFG.WEIGHT_BULLET_DMG,
    label: '💪 Mermi Gücü',
    desc: () => {
      const cur = getBulletDmg()
      const next = Math.round(cur * CFG.BULLET_DAMAGE_MULT)
      return `Mevcut: ${cur} hasar → +${((CFG.BULLET_DAMAGE_MULT - 1) * 100).toFixed(0)}%`
    },
  },
  {
    key: 'pierce',
    weight: () => CFG.WEIGHT_PIERCE,
    label: '👻 Deler Geçer',
    desc: () => `${getPierceLevel()} +1 delicilik geliştirmesi!`,
  },
  {
    key: 'shield',
    weight: () => CFG.WEIGHT_SHIELD,
    label: '🛡️ Ekstra Surlar',
    desc: () => `${state.inRunUpgrades.shield} +${CFG.SHIELD_STACKS_PER_PICK} sur ekle!`,
  },
  {
    key: 'magnet',
    weight: () => state.inRunUpgrades.magnet > 0 ? 0 : CFG.WEIGHT_MAGNET,
    label: '🧲 Kristal Mıknatısı',
    desc: () => 'Kristaller sana gelsin!',
  },
  {
    key: 'doubleGems',
    weight: () => CFG.WEIGHT_DOUBLE_GEMS,
    label: '💎 Jeoloji Mühendisi',
    desc: () => `${state.inRunUpgrades.doubleGems} => Daha çok, daha çok...`,
  },
  {
    key: 'bulletCount',
    weight: () => CFG.WEIGHT_BULLET_COUNT,
    label: '➕2️⃣ Çoklu Mermi',
    desc: () => `Tek seferde atılan mermi: ${getTotalBullets()} +2 mermi, gerisini onlar düşünsün!`,
  },
  {
    key: 'ammoCapacity',
    weight: () => CFG.WEIGHT_AMMO_CAPACITY,
    label: '⛽ Şarjör Boyutu',
    desc: () => `Toplam ${getMaxAmmo() + CFG.AMMO_CAPACITY_PER_UPGRADE} mermiye çık!`,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
//  HTML scaffold  — portrait canvas 540 × 960  (9:16)
// ─────────────────────────────────────────────────────────────────────────────
const app = document.querySelector('#app')
app.innerHTML = `
  <div class="layout">
    <div class="canvas-wrap">
      <canvas id="game" width="540" height="960" aria-label="Oyun alanı"></canvas>

      <!-- Permanent inter-run shop (shown from main menu) -->
      <div id="shop" class="shop hidden" role="dialog" aria-modal="true">
        <h2>⚙️ Kalıcı Yükseltmeler</h2>
        <p id="shop-summary"></p>
        <div class="shop-actions">
          <button id="buy-fire-rate"    class="shop-btn"></button>
          <button id="buy-bullet-dmg"   class="shop-btn"></button>
          <button id="buy-pierce"       class="shop-btn"></button>
          <button id="buy-bullet-count" class="shop-btn"></button>
        </div>
        <button id="shop-back" class="start-btn">← Geri Dön</button>
      </div>

      <!-- In-run upgrade choice panel -->
      <div id="upgrade-menu" class="upgrade-panel hidden" role="dialog" aria-modal="true">
        <h2 id="upgrade-menu-h2">Yükseltme Seç</h2>
        <div class="shop-actions" id="upgrade-choices"></div>
        <div class="rarity-legend">
          <span class="legend-label">SIRADAN</span>
          <div id="legend-bar" class="legend-bar"></div>
          <span class="legend-label">NADİR</span>
        </div>
      </div>

      <!-- Dev controls overlay -->
      <div id="dev-controls" class="dev-controls hidden">
        <label for="dev-timewarp-input">HIZ:</label>
        <input type="number" id="dev-timewarp-input" step="0.5" min="0.1" max="20">
      </div>
    </div>
  </div>
`

// ─────────────────────────────────────────────────────────────────────────────
//  DOM refs
// ─────────────────────────────────────────────────────────────────────────────
const canvas          = document.querySelector('#game')
const ctx             = canvas.getContext('2d')
const shopEl          = document.querySelector('#shop')
const shopSummaryEl   = document.querySelector('#shop-summary')
const buyFireRateBtn    = document.querySelector('#buy-fire-rate')
const buyBulletDmgBtn   = document.querySelector('#buy-bullet-dmg')
const buyPierceBtn      = document.querySelector('#buy-pierce')
const buyBulletCountBtn = document.querySelector('#buy-bullet-count')
const shopBackBtn       = document.querySelector('#shop-back')
const upgradeMenuEl     = document.querySelector('#upgrade-menu')
const upgradeMenuH2El   = document.querySelector('#upgrade-menu-h2')
const upgradeChoicesEl  = document.querySelector('#upgrade-choices')
const legendBarEl       = document.querySelector('#legend-bar')
const devControlsEl     = document.querySelector('#dev-controls')
const devTimewarpInp    = document.querySelector('#dev-timewarp-input')

// Initialize dev input
if (devTimewarpInp) {
  devTimewarpInp.value = CFG.DEV_TIMEWARP_MULT
  devTimewarpInp.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value)
    if (!isNaN(val) && val > 0) CFG.DEV_TIMEWARP_MULT = val
  })
}

// ─────────────────────────────────────────────────────────────────────────────
//  World + layout  (derived from canvas intrinsic size)
// ─────────────────────────────────────────────────────────────────────────────
const world = { w: canvas.width, h: canvas.height }  // 540 × 960

const BREACH_Y       = world.h - CFG.CASTLE_H - CFG.CASTLE_BATT_H - CFG.BREACH_Y_OFFSET
const TURRET_START_Y = world.h - CFG.CASTLE_H - CFG.CASTLE_BATT_H - CFG.TURRET_START_Y_OFFSET

// ─────────────────────────────────────────────────────────────────────────────
//  Input state
// ─────────────────────────────────────────────────────────────────────────────
const keys     = { left: false, right: false, shoot: false }
let mouseX     = world.w / 2   // latest pointer x in canvas coords
let mouseDown  = false          // true only while mouse button / finger is held

// ─────────────────────────────────────────────────────────────────────────────
//  Canvas button hit rects (populated each draw frame, read in input handlers)
// ─────────────────────────────────────────────────────────────────────────────
const canvasBtns = {}

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
  countdownTimer: 0,
  bestScore: 0,
  isNewRecord: false,

  upgrades:          { fireRate: 0, bulletDmg: 0, pierce: 0, bulletCount: 0 },
  inRunUpgrades:     { fireRate: 0, bulletDmg: 0, pierce: 0, shield: 0, magnet: 0, doubleGems: 0, bulletCount: 0, ammoCapacity: 0 },
  inRunUpgradesCount: 0,

  bullets:        [],
  enemies:        [],
  crystalPickups: [],
  coinPickups:    [],
  explosions:     [],

  fireTimer:    0,
  ammo:         CFG.AMMO_MAX_BASE,
  lastFireTime: -999,
  emptyAmmoHoldTime: 0,
  emptyAmmoWarnShown: false,

  // ── Boss / horde / tier / notification ──────────────────────────────────
  boss:          null,               // boss object while alive, null otherwise
  bossNextTime:  CFG.BOSS_FIRST_TIME,
  bossCount:     0,                  // bosses spawned this run (drives HP scaling)
  horde:         { active: false, timer: 0, nextTime: CFG.HORDE_FIRST_TIME },
  lastEventTime: 0,
  enemyTier:     0,                  // current tier (increments at TIER_FIRST_TIME + k*TIER_PERIOD)
  tierNextTime:  CFG.TIER_FIRST_TIME,
  notification:  null,               // { text, color, timer } or null

  devTimewarp:   false,
  devMagnet:     false,

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
  const level = state.upgrades.fireRate + state.inRunUpgrades.fireRate
  return CFG.BULLET_BASE_FIRE_RATE * Math.pow(CFG.BULLET_FIRE_RATE_MULT, level)
}
function getBulletDmg() {
  const level = state.upgrades.bulletDmg + state.inRunUpgrades.bulletDmg
  return Math.round(CFG.BULLET_BASE_DAMAGE * Math.pow(CFG.BULLET_DAMAGE_MULT, level))
}
function getPierceLevel() {
  return CFG.BULLET_PIERCE_BASE + state.upgrades.pierce + state.inRunUpgrades.pierce
}
function getTotalBullets() {
  return 1
    + 2 * state.upgrades.bulletCount
    + 2 * state.inRunUpgrades.bulletCount
}
function getMaxAmmo() {
  return CFG.AMMO_MAX_BASE + state.inRunUpgrades.ammoCapacity * CFG.AMMO_CAPACITY_PER_UPGRADE
}
// Crystal cost for the next in-run upgrade (exponential like Vampire Survivors)
// n=0→5, n=1→8, n=2→12, n=3→18, n=4→28, n=5→44 … (×1.55 each step)
function getNextUpgradeCost() {
  return Math.round(CFG.CRYSTAL_BASE_COST * Math.pow(CFG.CRYSTAL_COST_MULT, state.inRunUpgradesCount))
}
function getCost(type) {
  const bases = {
    fireRate:    CFG.COST_BASE_FIRE_RATE,
    bulletDmg:   CFG.COST_BASE_BULLET_DMG,
    pierce:      CFG.COST_BASE_PIERCE,
    bulletCount: CFG.COST_BASE_BULLET_COUNT,
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
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.upgrades) {
        state.upgrades.fireRate    = Number(parsed.upgrades.fireRate)    || 0
        state.upgrades.bulletDmg   = Number(parsed.upgrades.bulletDmg)   || 0
        state.upgrades.pierce      = Number(parsed.upgrades.pierce)      || 0
        state.upgrades.bulletCount = Number(parsed.upgrades.bulletCount) || 0
      }
      state.money = Number(parsed?.money) || 0
    }

    const bestRaw = localStorage.getItem(CFG.BEST_SCORE_KEY)
    state.bestScore = bestRaw ? Number(bestRaw) : 0
  } catch { /* ignore broken saves */ }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Screen transitions
// ─────────────────────────────────────────────────────────────────────────────
function goToMenu() {
  state.screen = SCREEN.MENU
  shopEl.classList.add('hidden')
  upgradeMenuEl.classList.add('hidden')
  if (devControlsEl) {
    if (CFG.DEV_ENABLED) devControlsEl.classList.remove('hidden')
    else devControlsEl.classList.add('hidden')
  }
}

function openShop() {
  shopEl.classList.remove('hidden')
  shopSummaryEl.textContent = `💰 Bakiye: ${state.money}`
  if (devControlsEl) devControlsEl.classList.add('hidden')
  renderShopButtons()
}

function startCountdown() {
  shopEl.classList.add('hidden')
  upgradeMenuEl.classList.add('hidden')
  if (devControlsEl) devControlsEl.classList.add('hidden')
  resetRun()
  state.screen         = SCREEN.COUNTDOWN
  state.countdownTimer = CFG.COUNTDOWN_TIMER_START
}

function startPlaying() {
  state.screen = SCREEN.PLAYING
}

function endRun() {
  state.screen = SCREEN.END
  upgradeMenuEl.classList.add('hidden')
  if (devControlsEl) devControlsEl.classList.add('hidden')

  // Score tracking
  const currentScore = Math.floor(state.time)
  state.isNewRecord = currentScore > state.bestScore
  if (state.isNewRecord) {
    state.bestScore = currentScore
    localStorage.setItem(CFG.BEST_SCORE_KEY, String(state.bestScore))
  }

  saveUpgrades()
}

// ─────────────────────────────────────────────────────────────────────────────
//  Run lifecycle
// ─────────────────────────────────────────────────────────────────────────────
function resetRun() {
  state.runKills       = 0
  state.crystals       = 0
  state.spawnTimer     = 0
  state.time           = 0
  state.fireTimer      = 0
  state.enemies        = []
  state.bullets        = []
  state.crystalPickups = []
  state.coinPickups    = []
  state.explosions     = []
  state.lastFireTime   = -999
  state.emptyAmmoHoldTime = 0
  state.emptyAmmoWarnShown = false

  state.inRunUpgrades      = { fireRate: 0, bulletDmg: 0, pierce: 0, shield: 0, magnet: 0, doubleGems: 0, bulletCount: 0, ammoCapacity: 0 }
  state.inRunUpgradesCount = 0
  state.ammo               = getMaxAmmo()

  state.boss          = null
  state.bossNextTime  = CFG.BOSS_FIRST_TIME
  state.bossCount     = 0
  state.horde         = { active: false, timer: 0, nextTime: CFG.HORDE_FIRST_TIME }
  state.lastEventTime = 0
  state.enemyTier     = 0
  state.tierNextTime  = CFG.TIER_FIRST_TIME
  state.notification  = null

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
  state.turret.hp          = Math.max(0, state.turret.hp - dmg)
  state.turret.lastHitTime = state.time
}
function applyCastleDamage(dmg) {
  if (state.inRunUpgrades.shield > 0) {
    state.inRunUpgrades.shield -= 1
  } else {
    state.castle.hp = Math.max(0, state.castle.hp - dmg)
  }
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
  const keyDir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0)
  let mouseDir = 0
  if (mouseDown && keyDir === 0) {
    const diff = mouseX - state.turret.x
    if (Math.abs(diff) > CFG.TURRET_STEER_DEADZONE) mouseDir = Math.sign(diff)
  }
  const finalDir = keyDir !== 0 ? keyDir : mouseDir
  const rate     = finalDir !== 0 ? CFG.TURRET_ACCEL_RATE : CFG.TURRET_DECEL_RATE
  state.turret.vx += (finalDir * CFG.TURRET_BASE_SPEED - state.turret.vx) * Math.min(1, rate * dt)
  if (mouseDown && keyDir === 0) {
    const diff = mouseX - state.turret.x
    if (Math.abs(diff) <= Math.abs(state.turret.vx * dt) + CFG.TURRET_SNAP_MARGIN) {
      const half = CFG.TURRET_WIDTH / 2
      state.turret.x  = Math.max(half, Math.min(world.w - half, mouseX))
      state.turret.vx = 0
      return
    }
  }
  state.turret.x += state.turret.vx * dt
  const half = CFG.TURRET_WIDTH / 2
  state.turret.x = Math.max(half, Math.min(world.w - half, state.turret.x))
}

function updateAmmo(dt) {
  if (state.time - state.lastFireTime >= CFG.AMMO_REGEN_DELAY) {
    state.ammo = Math.min(getMaxAmmo(), state.ammo + CFG.AMMO_REGEN_RATE * dt)
  }
}

function updateOutOfAmmoWarning(dt) {
  const tryingToShoot = mouseDown || keys.shoot
  const isOutOfAmmo = state.ammo < CFG.AMMO_COST_PER_VOLLEY
  if (tryingToShoot && isOutOfAmmo) {
    state.emptyAmmoHoldTime += dt
    if (!state.emptyAmmoWarnShown && state.emptyAmmoHoldTime >= CFG.AMMO_EMPTY_WARN_HOLD) {
      triggerNotification('🚫 MERMİ BİTTİ!', '#ef4444', { yFrac: 0.5, font: 44, duration: 1.2 })
      state.emptyAmmoWarnShown = true
    }
    return
  }
  state.emptyAmmoHoldTime = 0
  if (!tryingToShoot) state.emptyAmmoWarnShown = false
}

function fireBullets() {
  const count    = getTotalBullets()
  const halfSpan = (count - 1) / 2
  const fireY    = state.turret.y - CFG.TURRET_HEIGHT / 2 - CFG.TURRET_BARREL_H
  const dmg      = getBulletDmg()
  const pierce   = getPierceLevel()
  for (let i = 0; i < count; i++) {
    const step     = i - halfSpan
    const offsetX  = step * CFG.BULLET_SPREAD_PX
    const angleRad = step * CFG.BULLET_SIDE_ANGLE_DEG * (Math.PI / 180)
    state.bullets.push({
      x:          state.turret.x + offsetX,
      y:          fireY,
      vx:          Math.sin(angleRad) * CFG.BULLET_SPEED,
      vy:         -Math.cos(angleRad) * CFG.BULLET_SPEED,
      dmg,
      pierceLeft: pierce,
      r:          CFG.BULLET_RADIUS,
      hitIds:     new Set(),
    })
  }
}

function updateBullets(dt) {
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i]
    b.x += (b.vx || 0) * dt
    b.y += b.vy * dt
    if (b.y + b.r < 0 || b.x - b.r > world.w || b.x + b.r < 0) state.bullets.splice(i, 1)
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
  const isElite    = Math.random() < CFG.ELITE_SPAWN_CHANCE
  const isSprinter = !isElite && Math.random() < CFG.SPRINTER_SPAWN_CHANCE
  const baseR = CFG.ENEMY_BASE_RADIUS + Math.floor((Math.random() - 0.5) * CFG.ENEMY_RADIUS_VARIANCE)
  const r     = isElite ? Math.round(baseR * CFG.ELITE_RADIUS_MULT) : baseR
  const addBonus  = Math.min(CFG.ENEMY_SPEED_TIME_CAP, state.time * CFG.ENEMY_SPEED_TIME_SCALE)
  const rampT     = Math.min(1, state.time / CFG.ENEMY_SPEED_MULT_RAMP_TIME)
  const globalMult = CFG.ENEMY_SPEED_MULT_START + (CFG.ENEMY_SPEED_MULT_MAX - CFG.ENEMY_SPEED_MULT_START) * rampT
  const tierSpeedMult = 1 + state.enemyTier * CFG.TIER_SPEED_MULT_PER_TIER
  let baseSpeed = (CFG.ENEMY_BASE_SPEED + Math.random() * CFG.ENEMY_SPEED_VARIANCE + addBonus) * globalMult * tierSpeedMult
  if (isElite)    baseSpeed *= CFG.ELITE_SPEED_MULT
  if (isSprinter) baseSpeed *= CFG.SPRINTER_SPEED_MULT
  const speed = baseSpeed
  const tierHpMult = 1 + state.enemyTier * CFG.TIER_HP_MULT_PER_TIER
  const rawHp  = (CFG.ENEMY_BASE_HP + Math.min(CFG.ENEMY_HP_TIME_CAP, state.time * CFG.ENEMY_HP_TIME_SCALE)) * tierHpMult
  let maxHp    = Math.round(isElite ? rawHp * CFG.ELITE_HP_MULT : isSprinter ? rawHp * CFG.SPRINTER_HP_MULT : rawHp)
  let color
  if (isElite) {
    color = `hsl(${Math.round(270 + (Math.random() - 0.5) * 30)},${Math.round(80 + Math.random() * 20)}%,${Math.round(45 + Math.random() * 10)}%)`
  } else if (isSprinter) {
    color = `hsl(${Math.round(185 + (Math.random() - 0.5) * 20)},${Math.round(80 + Math.random() * 15)}%,${Math.round(48 + Math.random() * 10)}%)`
  } else {
    const tierHue = (355 + state.enemyTier * 20) % 360
    color = `hsl(${Math.round(tierHue + (Math.random() - 0.5) * 16)},${Math.round(70 + Math.random() * 20)}%,${Math.round(45 + Math.random() * 10)}%)`
  }
  const sprintExtra = isSprinter ? { isSprinting: false, sprintTimer: Math.random() * CFG.SPRINTER_REST_DURATION } : {}
  state.enemies.push({ x, y, r, color, speed, hp: maxHp, maxHp, isElite, isSprinter, breaching: false, ...sprintExtra })
}

function handleEnemyMovement(dt) {
  for (const e of state.enemies) {
    let effectiveSpeed = e.speed
    if (e.isSprinter && !e.breaching) {
      e.sprintTimer -= dt
      if (e.sprintTimer <= 0) {
        e.isSprinting = !e.isSprinting
        e.sprintTimer = e.isSprinting ? CFG.SPRINTER_SPRINT_DURATION : CFG.SPRINTER_REST_DURATION
      }
      if (e.isSprinting) effectiveSpeed = e.speed * CFG.SPRINTER_SPRINT_SPEED_MULT
    }
    if (e.breaching) {
      e.speed = Math.max(0, e.speed - CFG.ENEMY_BREACH_DECEL * dt)
      effectiveSpeed = e.speed
    }
    e.y += effectiveSpeed * dt
  }
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i]
    if (e.x + e.r <= 0 || e.x - e.r >= world.w) { state.enemies.splice(i, 1); continue }
    if (!e.breaching) {
      const t = state.turret
      if (e.y + e.r >= t.y - CFG.TURRET_HEIGHT / 2 &&
          e.y - e.r <= t.y + CFG.TURRET_HEIGHT / 2 &&
          e.x >= t.x - CFG.TURRET_WIDTH / 2 &&
          e.x <= t.x + CFG.TURRET_WIDTH / 2) {
        state.enemies.splice(i, 1)
        applyTurretHit(CFG.TURRET_HP_PER_HIT)
        spawnExplosion(e.x, e.y, CFG.EXPLOSION_HIT_TURRET_MAXR, true)
        continue
      }
      if (e.y + e.r >= BREACH_Y) e.breaching = true
    }
    if (e.breaching && (e.speed <= 0 || e.y + e.r >= world.h - CFG.CASTLE_H)) {
      state.enemies.splice(i, 1)
      applyCastleDamage(e.isElite ? Math.round(CFG.ENEMY_CASTLE_DAMAGE * CFG.ELITE_CASTLE_DAMAGE_MULT) : CFG.ENEMY_CASTLE_DAMAGE)
      spawnExplosion(e.x, Math.min(e.y, world.h - CFG.CASTLE_H - CFG.ENEMY_BREACH_EXPLOSION_MARGIN), e.isElite ? CFG.EXPLOSION_BREACH_ELITE_MAXR : CFG.EXPLOSION_BREACH_NORMAL_MAXR, false)
    }
  }
}

function spawnExplosion(x, y, maxR, isPaddle) {
  state.explosions.push({ x, y, r: CFG.EXPLOSION_INIT_R, maxR, age: 0, maxAge: CFG.EXPLOSION_MAX_AGE, isPaddle })
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
      const dx = b.x - e.x, dy = b.y - e.y
      if (dx * dx + dy * dy > (b.r + e.r) * (b.r + e.r)) continue
      if (b.hitIds.has(e)) continue
      b.hitIds.add(e)
      e.hp -= b.dmg
      spawnExplosion(b.x, b.y, CFG.EXPLOSION_HIT_BULLET_MAXR, true)
      if (e.hp <= 0) {
        state.enemies.splice(ei, 1)
        state.runKills += 1
        state.money    += 1
        const base  = crystalDropCount()
        let bonus = 0
        for (let dg = 0; dg < state.inRunUpgrades.doubleGems; dg++) {
          if (Math.random() < CFG.DOUBLE_GEMS_CHANCE) bonus++
        }
        const count = base + bonus
        for (let c = 0; c < count; c++) {
          state.crystalPickups.push({
            x:  e.x + (Math.random() - 0.5) * CFG.CRYSTAL_SPREAD_X,
            y:  e.y + (Math.random() - 0.5) * CFG.CRYSTAL_SPREAD_Y,
            vy: CFG.CRYSTAL_SPEED_MIN + Math.random() * (CFG.CRYSTAL_SPEED_MAX - CFG.CRYSTAL_SPEED_MIN),
          })
        }
        if (e.isElite) {
          const coinCount = CFG.ELITE_COIN_MIN + (Math.random() < CFG.ELITE_COIN_CHANCE_2ND ? 1 : 0) + (Math.random() < CFG.ELITE_COIN_CHANCE_3RD ? 1 : 0)
          for (let cc = 0; cc < coinCount; cc++) {
            state.coinPickups.push({ x: e.x + (Math.random() - 0.5) * CFG.COIN_SPREAD_X * CFG.COIN_ELITE_SPREAD_MULT, y: e.y, vy: CFG.COIN_SPEED_MIN + Math.random() * (CFG.COIN_SPEED_MAX - CFG.COIN_SPEED_MIN) })
          }
        } else if (Math.random() < CFG.COIN_DROP_CHANCE) {
          state.coinPickups.push({ x: e.x + (Math.random() - 0.5) * CFG.COIN_SPREAD_X, y: e.y, vy: CFG.COIN_SPEED_MIN + Math.random() * (CFG.COIN_SPEED_MAX - CFG.COIN_SPEED_MIN) })
        }
      }
      if (b.pierceLeft > 0) { b.pierceLeft -= 1 } else { state.bullets.splice(bi, 1); break }
    }
  }
}

function updateCrystals(dt) {
  const tx = state.turret.x
  const ty = state.turret.y - CFG.TURRET_HEIGHT / 2
  const tw = CFG.TURRET_WIDTH / 2
  const pr = CFG.CRYSTAL_PICKUP_RADIUS
  const mg = CFG.CRYSTAL_PICKUP_MARGIN
  for (let i = state.crystalPickups.length - 1; i >= 0; i--) {
    const c = state.crystalPickups[i]
    if (state.inRunUpgrades.magnet > 0 || state.devMagnet) {
      const pull = state.devMagnet ? 15 : CFG.CRYSTAL_MAGNET_PULL
      c.x  += (tx - c.x) * pull * dt
      c.vy  = Math.min(c.vy + CFG.CRYSTAL_MAGNET_ACCEL * dt, CFG.CRYSTAL_MAGNET_MAX_VY)
      if (state.devMagnet) c.y += (ty - c.y) * pull * dt
    }
    c.y += c.vy * dt
    if (c.y + pr >= ty - mg && c.y - pr <= ty + CFG.TURRET_HEIGHT + mg &&
        c.x >= tx - tw - pr && c.x <= tx + tw + pr) {
      state.crystalPickups.splice(i, 1)
      state.crystals += 1
      if (state.crystals >= getNextUpgradeCost() && state.screen === SCREEN.PLAYING && !upgradePaused) showUpgradeMenu()
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
  const mg = CFG.COIN_PICKUP_MARGIN
  for (let i = state.coinPickups.length - 1; i >= 0; i--) {
    const c = state.coinPickups[i]
    c.y += c.vy * dt
    if (c.y + pr >= ty - mg && c.y - pr <= ty + CFG.TURRET_HEIGHT + mg &&
        c.x >= tx - tw - pr && c.x <= tx + tw + pr) {
      state.coinPickups.splice(i, 1)
      state.money += CFG.COIN_VALUE
      continue
    }
    if (c.y - pr > world.h) state.coinPickups.splice(i, 1)
  }
}

function triggerNotification(text, color, opts = {}) {
  state.notification = { text, color, timer: opts.duration ?? CFG.NOTIF_DURATION, font: opts.font ?? CFG.NOTIF_FONT, yFrac: opts.yFrac ?? CFG.NOTIF_Y_FRAC }
}
function updateNotification(dt) {
  if (state.notification) {
    state.notification.timer -= dt
    if (state.notification.timer <= 0) state.notification = null
  }
}
function drawNotification() {
  const n = state.notification
  if (!n || n.timer <= 0) return
  const alpha = Math.min(1, n.timer / 0.4)
  const y     = Math.round(world.h * n.yFrac)
  ctx.save()
  ctx.globalAlpha  = alpha
  ctx.font         = `bold ${n.font}px Inter, system-ui, sans-serif`
  ctx.fillStyle    = 'rgba(0,0,0,0.55)'
  const tw         = ctx.measureText(n.text).width + 40
  ctx.fillRect(world.w / 2 - tw / 2, y - n.font - CFG.NOTIF_BG_PAD_TOP, tw, n.font + CFG.NOTIF_BG_PAD_TOP + CFG.NOTIF_BG_PAD_BOTTOM)
  ctx.shadowBlur   = 18; ctx.shadowColor  = n.color; ctx.fillStyle    = n.color
  ctx.textAlign    = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(n.text, world.w / 2, y)
  ctx.textBaseline = 'alphabetic'; ctx.textAlign    = 'left'
  ctx.restore()
}

function spawnBoss() {
  const hoverY = state.turret.y - CFG.TURRET_HEIGHT / 2 - CFG.BOSS_RADIUS - CFG.BOSS_HOVER_OFFSET
  const hp     = CFG.BOSS_HP_BASE + state.bossCount * CFG.BOSS_HP_PER_WAVE
  state.boss   = { x: world.w / 2, y: -CFG.BOSS_RADIUS, hoverY, r: CFG.BOSS_RADIUS, hp, maxHp: hp, phase: 1, shieldActive: false, shieldTimer: 0, chargeTimer: CFG.BOSS_CHARGE_INTERVAL_INIT, isCharging: false, chargeTargetX: world.w / 2, chargeVx: 0, aliveTimer: 0, enraged: false }
}

function updateBoss(dt) {
  const b = state.boss
  if (!b) return
  b.aliveTimer += dt
  if (b.phase === 1 && b.hp <= b.maxHp * 0.5) { b.phase = 2; b.shieldActive = true; b.shieldTimer = CFG.BOSS_SHIELD_DURATION; triggerNotification('🛡 BOSS — 2. AŞAMA!', '#60a5fa') }
  if (b.shieldActive) { b.shieldTimer -= dt; if (b.shieldTimer <= 0) b.shieldActive = false }
  if (!b.enraged && b.aliveTimer >= CFG.BOSS_ENRAGE_TIME) { b.enraged = true; triggerNotification('😡 BOSS ÖFKELI!', '#ef4444') }
  if (b.y < b.hoverY) { b.y = Math.min(b.hoverY, b.y + CFG.BOSS_DESCENT_SPEED * dt); return }
  b.chargeTimer -= dt
  if (!b.isCharging && b.chargeTimer <= 0) { b.isCharging = true; b.chargeTargetX = CFG.BOSS_RADIUS + Math.random() * (world.w - CFG.BOSS_RADIUS * 2); b.chargeVx = Math.sign(b.chargeTargetX - b.x) * CFG.BOSS_CHARGE_SPEED; b.chargeTimer = CFG.BOSS_CHARGE_INTERVAL }
  if (b.isCharging) { b.x += b.chargeVx * dt; const reached = b.chargeVx >= 0 ? b.x >= b.chargeTargetX : b.x <= b.chargeTargetX; if (reached) { b.x = b.chargeTargetX; b.isCharging = false } } else {
    const trackSpeed = b.enraged ? CFG.BOSS_TRACK_SPEED * CFG.BOSS_ENRAGE_TRACK_MULT : CFG.BOSS_TRACK_SPEED
    const diff = state.turret.x - b.x
    if (Math.abs(diff) > 1) b.x += Math.sign(diff) * Math.min(Math.abs(diff), trackSpeed * dt)
  }
  b.x = Math.max(b.r, Math.min(world.w - b.r, b.x))
  const t = state.turret; const bdx = b.x - t.x, bdy = b.y - t.y
  if (bdx * bdx + bdy * bdy < (b.r + CFG.TURRET_WIDTH / 2) * (b.r + CFG.TURRET_WIDTH / 2)) { applyTurretHit(CFG.BOSS_TURRET_DAMAGE); b.x += Math.sign(bdx || 1) * 30 }
}

function handleBossBulletCollisions() {
  const b = state.boss
  if (!b || b.shieldActive) return
  for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
    const bul = state.bullets[bi]
    if (bul.hitIds.has(b)) continue
    const dx = bul.x - b.x, dy = bul.y - b.y
    if (dx * dx + dy * dy > (bul.r + b.r) * (bul.r + b.r)) continue
    bul.hitIds.add(b); b.hp -= bul.dmg; spawnExplosion(bul.x, bul.y, CFG.EXPLOSION_HIT_BULLET_MAXR, true)
    if (b.hp <= 0) {
      spawnExplosion(b.x, b.y, 120, false)
      for (let i = 0; i < CFG.BOSS_CRYSTAL_DROP; i++) state.crystalPickups.push({ x: b.x + (Math.random() - 0.5) * 80, y: b.y + (Math.random() - 0.5) * 40, vy: CFG.CRYSTAL_SPEED_MIN + Math.random() * (CFG.CRYSTAL_SPEED_MAX - CFG.CRYSTAL_SPEED_MIN) })
      const coinCount = CFG.BOSS_COIN_DROP_MIN + (Math.random() < CFG.BOSS_COIN_CHANCE_EXTRA_1 ? 1 : 0) + (Math.random() < CFG.BOSS_COIN_CHANCE_EXTRA_2 ? 1 : 0)
      for (let i = 0; i < coinCount; i++) state.coinPickups.push({ x: b.x + (Math.random() - 0.5) * 60, y: b.y, vy: CFG.COIN_SPEED_MIN + Math.random() * (CFG.COIN_SPEED_MAX - CFG.COIN_SPEED_MIN) })
      state.runKills++; state.money += CFG.BOSS_MONEY_REWARD; state.bossNextTime = state.time + CFG.BOSS_PERIOD; state.boss = null; triggerNotification('💀 BOSS YENİLDİ!', '#22c55e'); return
    }
    if (bul.pierceLeft > 0) { bul.pierceLeft -= 1 } else { state.bullets.splice(bi, 1); break }
  }
}

function drawBoss() {
  const b = state.boss; if (!b) return
  const pulse = Math.sin(state.time * CFG.ANIM_BOSS_PULSE_FREQ)
  if (b.shieldActive) { ctx.save(); ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 5; ctx.shadowBlur = 24; ctx.shadowColor = '#60a5fa'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 10 + 4 * Math.sin(state.time * 12), 0, Math.PI * 2); ctx.stroke(); ctx.restore() }
  ctx.save(); const bossColor = b.enraged ? '#ff2200' : '#7c3aed'; ctx.shadowBlur = CFG.ANIM_BOSS_PULSE_BASE + CFG.ANIM_BOSS_PULSE_AMP * pulse; ctx.shadowColor = bossColor; ctx.fillStyle = bossColor; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 8, 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = '#fff'; ctx.font = `bold ${b.enraged ? 22 : 18}px Inter, system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.enraged ? '😡' : '👑', b.x, b.y); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'
  const hpPct = b.hp / b.maxHp; const barW = b.r * 3, barH = 8, barX = b.x - barW / 2, barY = b.y - b.r - barH - 6
  ctx.fillStyle = '#1e293b'; ctx.fillRect(barX, barY, barW, barH)
  ctx.fillStyle = hpPct > 0.5 ? '#c084fc' : hpPct > 0.25 ? '#f97316' : '#ef4444'; ctx.fillRect(barX, barY, barW * hpPct, barH)
  ctx.strokeStyle = '#4c1d95'; ctx.lineWidth = 1; ctx.strokeRect(barX, barY, barW, barH)
  ctx.fillStyle = '#e9d5ff'; ctx.font = 'bold 10px Inter, system-ui'; ctx.textAlign = 'center'; ctx.fillText(`BOSS  ${Math.ceil(b.hp)} / ${b.maxHp}`, b.x, barY - 3); ctx.textAlign = 'left'
}

function drawHordeBanner() {
  if (!state.horde.active) return
  const alpha = Math.min(1, state.horde.timer / 1.0) * 0.7
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#7f1d1d'; ctx.fillRect(0, 85, world.w, 22)
  ctx.globalAlpha = Math.min(1, state.horde.timer / 1.0); ctx.fillStyle = '#fca5a5'; ctx.font = 'bold 12px Inter, system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`⚔ SÜRÜ — ${Math.ceil(state.horde.timer)}s`, world.w / 2, 96); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.restore()
}

function startHorde() {
  state.horde.active = true; state.horde.timer = CFG.HORDE_DURATION; state.horde.nextTime = state.time + CFG.HORDE_PERIOD; triggerNotification('⚔ SÜRÜ SALDIRISI!', '#ef4444')
}

function checkSchedule() {
  if (state.boss === null && state.time >= state.bossNextTime) { spawnBoss(); state.lastEventTime = state.time; state.bossNextTime = state.time + CFG.BOSS_PERIOD; state.bossCount++; triggerNotification('⚔ BOSS GELİYOR!', '#f97316') }
  if (!state.horde.active && state.time >= state.horde.nextTime) { state.lastEventTime = state.time; startHorde() }
  if (state.time >= state.tierNextTime) { state.enemyTier++; state.tierNextTime += CFG.TIER_PERIOD; triggerNotification(`⬆ YENİ DÜŞMANLAR — AŞAMA ${state.enemyTier}`, '#eab308') }
}

let upgradePaused = false; let currentUpgradeCost = 0
function getUpgradeRarityColor(weight) {
  const weights = IN_RUN_UPGRADE_DEFS.map(u => u.weight()).filter(w => w > 0); const minW = Math.min(...weights), maxW = Math.max(...weights)
  const t = (maxW === minW) ? 1 : Math.max(0, Math.min(1, (weight - minW) / (maxW - minW)))
  const h = CFG.RARITY_RARE_HUE - t * (CFG.RARITY_RARE_HUE - CFG.RARITY_COMMON_HUE); const s = CFG.RARITY_RARE_SAT - t * (CFG.RARITY_RARE_SAT - CFG.RARITY_COMMON_SAT); const l = CFG.RARITY_RARE_LIGHT - t * (CFG.RARITY_RARE_LIGHT - CFG.RARITY_COMMON_LIGHT)
  return `hsl(${h}, ${s}%, ${l}%)`
}

function showUpgradeMenu() {
  currentUpgradeCost = getNextUpgradeCost(); upgradeMenuH2El.textContent = `Seviye Atla! (Sv. ${state.inRunUpgradesCount + 1}) 💎 ${currentUpgradeCost}`; upgradePaused = true; upgradeMenuEl.classList.remove('hidden'); upgradeChoicesEl.innerHTML = ''
  const choices = []; const available = [...IN_RUN_UPGRADE_DEFS]
  for (let i = 0; i < 3; i++) {
    if (available.length === 0) break
    let totalWeight = 0; available.forEach(u => { totalWeight += u.weight() }); if (totalWeight <= 0) break
    let roll = Math.random() * totalWeight, cumulative = 0
    for (let j = 0; j < available.length; j++) { cumulative += available[j].weight(); if (roll <= cumulative) { choices.push(available[j]); available.splice(j, 1); break } }
  }
  for (const upg of choices) {
    const btn = document.createElement('button'); btn.className = 'shop-btn upgrade-choice-btn'; const color = getUpgradeRarityColor(upg.weight())
    btn.style.backgroundColor = color; btn.style.backgroundImage = 'none'; btn.style.borderColor = '#ffffff44'; btn.style.borderWidth = '2px'; btn.style.borderStyle = 'solid'; btn.style.boxShadow = `0 4px 15px ${color}66`
    btn.innerHTML = `<span class="upg-label" style="color:#fff; text-shadow: 0 1px 2px rgba(0,0,0,0.5)">${upg.label}</span><span class="upg-desc" style="color:rgba(255,255,255,0.8)">${upg.desc()}</span>`
    btn.addEventListener('click', () => { applyInRunUpgrade(upg.key); state.crystals = Math.max(0, state.crystals - currentUpgradeCost); state.inRunUpgradesCount += 1; upgradeMenuEl.classList.add('hidden'); upgradePaused = false })
    upgradeChoicesEl.appendChild(btn)
  }
}

function applyInRunUpgrade(key) {
  if (key === 'shield') state.inRunUpgrades.shield += CFG.SHIELD_STACKS_PER_PICK
  else state.inRunUpgrades[key] += 1
}

function mkShopBtnHTML(emoji, name, level, detail, cost) {
  return `<span class="shop-btn-title">${emoji} ${name}</span><span class="shop-btn-sub">Seviye ${level} · ${detail} · 💰 ${cost}</span>`
}

function renderShopButtons() {
  const fc = getCost('fireRate'), dc = getCost('bulletDmg'), pc = getCost('pierce'), bc = getCost('bulletCount')
  buyFireRateBtn.innerHTML = mkShopBtnHTML('🌧️', 'Mermi Yağmuru', state.upgrades.fireRate, `+%${((CFG.BULLET_FIRE_RATE_MULT - 1) * 100).toFixed(0)} hız`, fc)
  buyBulletDmgBtn.innerHTML = mkShopBtnHTML('💪', 'Mermi Gücü', state.upgrades.bulletDmg, `+%${((CFG.BULLET_DAMAGE_MULT - 1) * 100).toFixed(0)} hasar`, dc)
  buyPierceBtn.innerHTML = mkShopBtnHTML('👻', 'Deler Geçer', state.upgrades.pierce, '+1 delici', pc)
  buyBulletCountBtn.innerHTML = mkShopBtnHTML('➕2️⃣', 'Çoklu Mermi', state.upgrades.bulletCount, '+2 mermi', bc)
  buyFireRateBtn.disabled = state.money < fc; buyBulletDmgBtn.disabled = state.money < dc; buyPierceBtn.disabled = state.money < pc; buyBulletCountBtn.disabled = state.money < bc
}

function drawCastle() {
  const cY = world.h - CFG.CASTLE_H, cW = world.w
  ctx.fillStyle = '#310a8e'; ctx.fillRect(0, cY, cW, CFG.CASTLE_H)
  ctx.strokeStyle = '#4c17c5'; ctx.lineWidth = 1
  for (let row = 0; row < CFG.CASTLE_GRID_ROWS; row++) {
    const rowY = cY + CFG.CASTLE_GRID_ROW_Y + row * CFG.CASTLE_GRID_ROW_H; const off = row % 2 === 0 ? 0 : CFG.CASTLE_GRID_ODD_OFFSET
    for (let bx = -off; bx < cW; bx += CFG.CASTLE_GRID_PERIOD) ctx.strokeRect(bx + 1, rowY, CFG.CASTLE_GRID_BLOCK_W, CFG.CASTLE_GRID_BLOCK_H)
  }
  ctx.fillStyle = '#410fb3'
  const period = CFG.CASTLE_BATT_W + CFG.CASTLE_BATT_GAP
  for (let bx = CFG.CASTLE_BATT_X_START; bx < cW - CFG.CASTLE_BATT_W; bx += period) ctx.fillRect(bx, cY - CFG.CASTLE_BATT_H, CFG.CASTLE_BATT_W, CFG.CASTLE_BATT_H)
  const tW = CFG.CASTLE_TOWER_W, tH = CFG.CASTLE_H + CFG.CASTLE_TOWER_EXTRA_H
  ctx.fillStyle = '#23076e'; ctx.fillRect(0, cY - CFG.CASTLE_TOWER_EXTRA_H, tW, tH); ctx.fillRect(cW - tW, cY - CFG.CASTLE_TOWER_EXTRA_H, tW, tH)
  ctx.fillStyle = '#410fb3'
  const tPeriod = CFG.CASTLE_TOWER_BATT_W + CFG.CASTLE_TOWER_BATT_GAP
  for (let tx2 = CFG.CASTLE_TOWER_BATT_X_START; tx2 < tW - CFG.CASTLE_TOWER_BATT_W; tx2 += tPeriod) { ctx.fillRect(tx2, cY - CFG.CASTLE_TOWER_EXTRA_H - CFG.CASTLE_TOWER_BATT_H, CFG.CASTLE_TOWER_BATT_W, CFG.CASTLE_TOWER_BATT_H); ctx.fillRect(cW - tW + tx2, cY - CFG.CASTLE_TOWER_EXTRA_H - CFG.CASTLE_TOWER_BATT_H, CFG.CASTLE_TOWER_BATT_W, CFG.CASTLE_TOWER_BATT_H) }
  ctx.fillStyle = '#b780ff88'; const wW = CFG.CASTLE_WINDOW_W, wH = CFG.CASTLE_WINDOW_H; ctx.fillRect(tW / 2 - wW / 2, cY - CFG.CASTLE_WINDOW_Y_OFFSET, wW, wH); ctx.fillRect(cW - tW + tW / 2 - wW / 2, cY - CFG.CASTLE_WINDOW_Y_OFFSET, wW, wH)
  const gateW = CFG.CASTLE_GATE_W, gX = cW / 2 - gateW / 2
  ctx.fillStyle = '#0a052e'; ctx.fillRect(gX, cY, gateW, CFG.CASTLE_GATE_H); ctx.beginPath(); ctx.arc(cW / 2, cY, gateW / 2, Math.PI, 0); ctx.fill()
  const hpPct = state.castle.hp / CFG.CASTLE_MAX_HP; const barX = tW + CFG.CASTLE_HP_BAR_INSET, barW = cW - tW * 2 - CFG.CASTLE_HP_BAR_INSET * 2, barY = cY + CFG.CASTLE_HP_BAR_Y_OFFSET, barH = CFG.CASTLE_HP_BAR_H
  ctx.fillStyle = '#0a0624'; ctx.fillRect(barX, barY, barW, barH)
  const barColor = hpPct > CFG.HUD_HP_MID ? '#7c3aed' : hpPct > CFG.HUD_HP_LOW ? '#f97316' : '#ef4444'; ctx.fillStyle = barColor; ctx.fillRect(barX, barY, barW * hpPct, barH)
  if (hpPct <= CFG.HUD_HP_LOW) { ctx.save(); ctx.shadowBlur = CFG.ANIM_CASTLE_HP_PULSE_SHADOW_BASE + CFG.ANIM_CASTLE_HP_PULSE_SHADOW_AMP * Math.sin(state.time * CFG.ANIM_CASTLE_HP_PULSE_FREQ); ctx.shadowColor = '#ef4444'; ctx.fillRect(barX, barY, barW * hpPct, barH); ctx.restore() }
  ctx.fillStyle = '#a78bfa'; ctx.font = `bold ${CFG.CASTLE_HP_LABEL_FONT}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillText(`🏰 KALE  ${Math.ceil(state.castle.hp)} / ${CFG.CASTLE_MAX_HP}`, cW / 2, cY + CFG.CASTLE_HP_LABEL_Y_OFFSET); ctx.textBaseline = 'alphabetic'
  if (state.inRunUpgrades.shield > 0) { ctx.save(); ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 4; ctx.shadowBlur = 20; ctx.shadowColor = '#60a5fa'; const shieldY = cY - CFG.CASTLE_BATT_H - 10; ctx.beginPath(); ctx.moveTo(0, shieldY); ctx.lineTo(cW, shieldY); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Inter, system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(`${state.inRunUpgrades.shield} Sur`, 10, shieldY + 18); ctx.restore() }
  ctx.textAlign = 'left'
}

function drawCrystalBar() {
  const cost = getNextUpgradeCost(); const fill = Math.min(1, state.crystals / cost); const barH = CFG.CRYSTAL_BAR_H, barY = CFG.CRYSTAL_BAR_Y, margin = CFG.CRYSTAL_BAR_MARGIN, barX = margin, barW = world.w - margin * 2
  ctx.fillStyle = '#0a1628'; ctx.fillRect(barX, barY, barW, barH)
  if (fill > 0) {
    const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0); grad.addColorStop(0, '#0369a1'); grad.addColorStop(0.6, '#0ea5e9'); grad.addColorStop(1, '#22d3ee'); ctx.fillStyle = grad
    if (fill >= CFG.CRYSTAL_BAR_PULSE_THRESHOLD) { ctx.save(); ctx.shadowBlur = CFG.CRYSTAL_BAR_PULSE_SHADOW_BASE + CFG.CRYSTAL_BAR_PULSE_SHADOW_AMP * Math.sin(state.time * CFG.CRYSTAL_BAR_PULSE_FREQ); ctx.shadowColor = '#22d3ee'; ctx.fillRect(barX, barY, barW * fill, barH); ctx.restore() } else ctx.fillRect(barX, barY, barW * fill, barH)
  }
  ctx.strokeStyle = '#1e3a5f'; ctx.lineWidth = 1; ctx.strokeRect(barX, barY, barW, barH)
  if (cost <= CFG.CRYSTAL_BAR_TICK_MAX_COST) { ctx.strokeStyle = '#0f172a'; for (let i = 1; i < cost; i++) { const tx2 = barX + (barW / cost) * i; ctx.beginPath(); ctx.moveTo(tx2, barY); ctx.lineTo(tx2, barY + barH); ctx.stroke() } }
  ctx.fillStyle = fill >= CFG.CRYSTAL_BAR_PULSE_THRESHOLD ? '#ffffff' : '#94a3b8'; ctx.font = `bold ${barH - 4}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`💎 ${state.crystals} / ${cost}  —  SEVİYE ${state.inRunUpgradesCount + 1}`, world.w / 2, barY + barH / 2); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'
}

function drawAmmoBar() {
  const maxAmmo = getMaxAmmo(); const fill = state.ammo / maxAmmo; const barH = CFG.AMMO_BAR_H, barY = CFG.CRYSTAL_BAR_Y + CFG.CRYSTAL_BAR_H + CFG.AMMO_BAR_TOP_MARGIN, margin = CFG.CRYSTAL_BAR_MARGIN, barX = margin, barW = world.w - margin * 2
  ctx.fillStyle = '#0a1628'; ctx.fillRect(barX, barY, barW, barH)
  if (fill > 0) {
    const isLow = fill <= CFG.AMMO_LOW_THRESHOLD; const barColor = fill > CFG.HUD_HP_MID ? '#22c55e' : fill > CFG.AMMO_LOW_THRESHOLD ? '#f97316' : '#ef4444'
    if (isLow) { ctx.save(); ctx.shadowBlur = CFG.AMMO_BAR_PULSE_SHADOW_BASE + CFG.AMMO_BAR_PULSE_SHADOW_AMP * Math.sin(state.time * CFG.AMMO_BAR_PULSE_FREQ); ctx.shadowColor = '#ef4444'; ctx.fillStyle = barColor; ctx.fillRect(barX, barY, barW * fill, barH); ctx.restore() } else { ctx.fillStyle = barColor; ctx.fillRect(barX, barY, barW * fill, barH) }
  }
  ctx.strokeStyle = '#1e3a5f'; ctx.lineWidth = 1; ctx.strokeRect(barX, barY, barW, barH)
  ctx.fillStyle = fill <= CFG.AMMO_LOW_THRESHOLD ? '#ef4444' : '#94a3b8'; ctx.font = `bold ${barH - 4}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`🔫 ${Math.floor(state.ammo)} / ${maxAmmo}  —  MERMİ`, world.w / 2, barY + barH / 2); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'
}

function drawCanvasButton(cx, cy, w, h, label, bg, textColor, fontSize) {
  const x = cx - w / 2, y = cy - h / 2
  ctx.save(); ctx.shadowBlur = CFG.CANVAS_BTN_SHADOW_BLUR; ctx.shadowColor = bg; ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(x, y, w, h, CFG.CANVAS_BTN_RADIUS); ctx.fill(); ctx.restore()
  ctx.fillStyle = textColor; ctx.font = `bold ${fontSize || CFG.CANVAS_BTN_DEFAULT_FONT}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, cx, cy); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'
  return { x, y, w, h }
}

function drawTurret() {
  const t = state.turret; const tw = CFG.TURRET_WIDTH, th = CFG.TURRET_HEIGHT, bw = CFG.TURRET_BARREL_W, bh = CFG.TURRET_BARREL_H
  const hpPct = t.hp / CFG.TURRET_MAX_HP, hpBarW = tw + CFG.TURRET_HP_BAR_EXTRA_W, hpBarX = t.x - hpBarW / 2, hpBarY = t.y + th / 2 + CFG.TURRET_HP_BAR_Y_GAP
  ctx.fillStyle = '#1e293b'; ctx.fillRect(hpBarX, hpBarY, hpBarW, CFG.TURRET_HP_BAR_H)
  ctx.fillStyle = hpPct > CFG.HUD_HP_MID ? '#22c55e' : hpPct > CFG.HUD_HP_LOW ? '#f97316' : '#ef4444'; ctx.fillRect(hpBarX, hpBarY, hpBarW * hpPct, CFG.TURRET_HP_BAR_H)
  ctx.save(); ctx.shadowBlur = CFG.TURRET_BARREL_SHADOW_BLUR; ctx.shadowColor = '#38bdf8'; ctx.fillStyle = '#38bdf8'; ctx.fillRect(t.x - bw / 2, t.y - th / 2 - bh, bw, bh); ctx.restore()
  ctx.fillStyle = '#7dd3fc'; ctx.fillRect(t.x - tw / 2, t.y - th / 2, tw, th); ctx.fillStyle = '#0ea5e9'; ctx.fillRect(t.x - tw / 2, t.y, tw, CFG.TURRET_ACCENT_STRIPE_H)
}

function drawEnemies() {
  for (const e of state.enemies) {
    const hpPct = e.hp / e.maxHp
    if (e.breaching) { ctx.save(); ctx.shadowBlur = CFG.ANIM_BREACH_PULSE_BASE + CFG.ANIM_BREACH_PULSE_AMP * Math.sin(state.time * CFG.ANIM_BREACH_PULSE_FREQ); ctx.shadowColor = '#ff6600'; ctx.fillStyle = '#ff4422'; ctx.fillRect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2); ctx.restore() }
    else if (e.isElite) { ctx.save(); ctx.shadowBlur = CFG.ANIM_ELITE_PULSE_BASE + CFG.ANIM_ELITE_PULSE_AMP * Math.sin(state.time * CFG.ANIM_ELITE_PULSE_FREQ); ctx.shadowColor = e.color; ctx.fillStyle = e.color; ctx.fillRect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2); ctx.restore(); ctx.fillStyle = '#fbbf24'; ctx.font = `bold ${Math.max(10, e.r - 4)}px Inter, system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('★', e.x, e.y); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left' }
    else if (e.isSprinter) { ctx.save(); if (e.isSprinting) { ctx.shadowBlur = CFG.ANIM_SPRINTER_PULSE_BASE + CFG.ANIM_SPRINTER_PULSE_AMP * Math.sin(state.time * CFG.ANIM_SPRINTER_PULSE_FREQ); ctx.shadowColor = '#22d3ee' }; ctx.fillStyle = e.color; ctx.fillRect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2); ctx.restore(); if (e.isSprinting) { ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.max(8, e.r - 2)}px Inter, system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('▼', e.x, e.y); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left' } }
    else { ctx.fillStyle = e.color; ctx.fillRect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2) }
    const barW = e.r * 2, barH = CFG.ENEMY_HP_BAR_H, barX = e.x - e.r, barY = e.y - e.r - barH - CFG.ENEMY_HP_BAR_GAP
    ctx.fillStyle = '#1e293b'; ctx.fillRect(barX, barY, barW, barH)
    ctx.fillStyle = e.isElite ? (hpPct > CFG.HUD_HP_MID ? '#c084fc' : hpPct > CFG.HUD_HP_LOW ? '#f97316' : '#ef4444') : (hpPct > CFG.HUD_HP_MID ? '#22c55e' : hpPct > CFG.HUD_HP_LOW ? '#f97316' : '#ef4444'); ctx.fillRect(barX, barY, barW * hpPct, barH)
  }
}

function drawBackground() { ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, world.w, world.h) }

function drawMenuScreen() {
  drawBackground()
  ctx.fillStyle = `rgba(255,255,255,${CFG.STARS_ALPHA})`
  for (let i = 0; i < CFG.STARS_COUNT; i++) { const sx = (i * 137.5) % world.w, sy = (i * 91.3) % world.h, r = 0.5 + (i % 3) * 0.5; ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill() }
  const titleY = Math.round(world.h * CFG.MENU_TITLE_Y_FRAC)
  ctx.save(); ctx.shadowBlur = 28; ctx.shadowColor = '#7c3aed'; ctx.fillStyle = '#c4b5fd'; ctx.textAlign = 'center'; ctx.font = `bold ${CFG.MENU_TITLE_FONT1}px Inter, system-ui, sans-serif`; ctx.fillText('MEGA', world.w / 2, titleY); ctx.font = `bold ${CFG.MENU_TITLE_FONT2}px Inter, system-ui, sans-serif`; ctx.fillText('PONG', world.w / 2, titleY + CFG.MENU_TITLE_LINE_GAP); ctx.restore()
  ctx.fillStyle = '#94a3b8'; ctx.font = `${CFG.MENU_SUB_FONT}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillText('', world.w / 2, Math.round(world.h * CFG.MENU_SUB_Y_FRAC))
  ctx.fillStyle = '#64748b'; ctx.font = `${CFG.MENU_STATS_FONT}px Inter, system-ui, sans-serif`; ctx.fillText(`💰 Altın: ${state.money}   ➕2️⃣ Çoklu Mermi: Sv.${state.upgrades.bulletCount}   👻 Delici: Sv.${state.upgrades.pierce}`, world.w / 2, Math.round(world.h * CFG.MENU_STATS1_Y_FRAC)); ctx.fillText(`🌧️ Mermi Yağmuru: Sv.${state.upgrades.fireRate}   💪 Güç: Sv.${state.upgrades.bulletDmg}`, world.w / 2, Math.round(world.h * CFG.MENU_STATS2_Y_FRAC))
  canvasBtns.menuPlay = drawCanvasButton(world.w / 2, Math.round(world.h * CFG.MENU_PLAY_Y_FRAC), CFG.MENU_PLAY_BTN_W, CFG.MENU_PLAY_BTN_H, '▶  OYNA', '#16a34a', '#bbf7d0', CFG.MENU_PLAY_BTN_FONT)
  canvasBtns.menuShop = drawCanvasButton(world.w / 2, Math.round(world.h * CFG.MENU_SHOP_Y_FRAC), CFG.MENU_SHOP_BTN_W, CFG.MENU_SHOP_BTN_H, '⚙  Atölye', '#1d4ed8', '#bfdbfe', CFG.MENU_SHOP_BTN_FONT)
  if (CFG.DEV_ENABLED) { canvasBtns.menuDev = drawCanvasButton(world.w / 2 - 110, Math.round(world.h * 0.95), 200, 30, `DEV: ${state.devTimewarp ? 'ON' : 'OFF'}`, '#475569', '#cbd5e1', 12); const resetLabel = state.devResetFeedback || 'KAYITLARI SİL'; const resetColor = state.devResetFeedback === 'TEMİZLENDİ' ? '#16a34a' : state.devResetFeedback === 'HATA' ? '#dc2626' : '#991b1b'; canvasBtns.menuDevReset = drawCanvasButton(world.w / 2 + 100, Math.round(world.h * 0.95), 180, 30, resetLabel, resetColor, '#fecaca', 12) }
  ctx.fillStyle = '#475569'; ctx.font = `${CFG.MENU_TIP_FONT}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillText('Ateş etmek için basılı tut', world.w / 2, Math.round(world.h * CFG.MENU_TIP1_Y_FRAC)); ctx.fillText('Hareket etmek için sürükle', world.w / 2, Math.round(world.h * CFG.MENU_TIP2_Y_FRAC)); ctx.textAlign = 'left'
}

function drawCountdownScreen() {
  drawBackground(); drawCastle()
  const midW = world.w / 2
  ctx.fillStyle = '#e2e8f0'; ctx.font = `bold ${CFG.COUNTDOWN_HEADER_FONT}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillText('🎯 Düşmanları yok et, kaleyi koru!', midW, Math.round(world.h * CFG.COUNTDOWN_TIP_Y_FRAC))
  ctx.fillStyle = '#94a3b8'; ctx.font = `${CFG.COUNTDOWN_TIP_FONT}px Inter, system-ui, sans-serif`; ctx.fillText('Ateş etmek için basılı tut', midW, Math.round(world.h * CFG.COUNTDOWN_TIP2_Y_FRAC)); ctx.fillText('Hareket etmek için sürükle', midW, Math.round(world.h * CFG.COUNTDOWN_TIP3_Y_FRAC)); ctx.fillText('Kristalleri ve altınları topla, ihtiyacın olacak ☠️', midW, Math.round(world.h * CFG.COUNTDOWN_TIP4_Y_FRAC))
  const tick = Math.ceil(state.countdownTimer), frac = state.countdownTimer - Math.floor(state.countdownTimer), scale = 1 + (1 - frac) * CFG.COUNTDOWN_SCALE_AMP
  ctx.save(); ctx.translate(midW, Math.round(world.h * CFG.COUNTDOWN_NUM_Y_FRAC)); ctx.scale(scale, scale); ctx.shadowBlur = CFG.COUNTDOWN_SHADOW_BLUR; ctx.shadowColor = tick > 1 ? '#f97316' : '#22c55e'; ctx.fillStyle = tick > 1 ? '#fb923c' : '#4ade80'; ctx.font = `bold ${CFG.COUNTDOWN_NUM_FONT}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(tick <= 0 ? 'BAŞLA!' : String(tick), 0, 0); ctx.textBaseline = 'alphabetic'; ctx.restore(); ctx.textAlign = 'left'
}

function drawEndScreen() {
  drawBackground()
  const midW = world.w / 2, btnY = Math.round(world.h * CFG.END_BTN_Y_FRAC), lost = state.castle.hp <= 0, pulse = Math.sin(performance.now() / 1000 * CFG.ANIM_RECORD_PULSE_FREQ)
  if (state.isNewRecord) { const fade = CFG.ANIM_RECORD_SCREEN_FADE_MIN + (CFG.ANIM_RECORD_SCREEN_FADE_MAX - CFG.ANIM_RECORD_SCREEN_FADE_MIN) * (0.5 + 0.5 * Math.sin(performance.now() / 1000 * CFG.ANIM_RECORD_SCREEN_FADE_FREQ)); ctx.fillStyle = `rgba(22, 163, 74, ${fade * 0.3})`; ctx.fillRect(0, 0, world.w, world.h) }
  ctx.fillStyle = `rgba(0,0,0,${CFG.END_OVERLAY_ALPHA})`; ctx.fillRect(0, 0, world.w, world.h)
  const currentRunScore = Math.floor(state.time)
  if (state.isNewRecord) { ctx.save(); const scale = 1 + pulse * CFG.ANIM_RECORD_SCALE_AMP * CFG.ANIM_RECORD_INTENSITY; ctx.translate(midW, Math.round(world.h * (CFG.END_TITLE_Y_FRAC - 0.20))); ctx.scale(scale, scale); ctx.shadowBlur = CFG.ANIM_RECORD_GLOW_MAX * (0.5 + 0.5 * pulse) * CFG.ANIM_RECORD_INTENSITY; ctx.shadowColor = '#eab308'; ctx.fillStyle = '#facc15'; ctx.font = `bold ${CFG.END_RECORD_TITLE_FONT}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillText('Muhteşem!', 0, 0); ctx.fillText('Yeni Rekor:', 0, 34); ctx.font = `bold ${CFG.END_RECORD_VAL_FONT}px Inter, system-ui, sans-serif`; ctx.fillText(String(state.bestScore), 0, 68); ctx.restore() }
  else { ctx.fillStyle = '#94a3b8'; ctx.font = `bold ${CFG.END_RECORD_VAL_FONT + 4}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillText(`Skor: ${currentRunScore}`, midW, Math.round(world.h * (CFG.END_TITLE_Y_FRAC - 0.12))); ctx.font = `bold ${CFG.END_RECORD_TITLE_FONT - 8}px Inter, system-ui, sans-serif`; ctx.fillText(`Rekor: ${state.bestScore}`, midW, Math.round(world.h * (CFG.END_TITLE_Y_FRAC - 0.07))) }
  ctx.save(); ctx.shadowBlur = CFG.END_SHADOW_BLUR; ctx.shadowColor = lost ? '#ef4444' : '#22c55e'; ctx.fillStyle = lost ? '#f87171' : '#4ade80'; ctx.font = `bold ${CFG.END_TITLE_FONT}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillText(lost ? '🏚 KALE DÜŞTÜ' : '⚔ TUR BİTTİ', midW, Math.round(world.h * CFG.END_TITLE_Y_FRAC)); ctx.restore()
  ctx.fillStyle = '#e2e8f0'; ctx.font = `${CFG.END_STATS_FONT}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillText(`☠️ ${state.runKills} düşman yok edildi!`, midW, Math.round(world.h * CFG.END_KILLS_Y_FRAC)); ctx.fillText(`💰 ${state.money} altın toplandı!`, midW, Math.round(world.h * CFG.END_MONEY_Y_FRAC))
  canvasBtns.endRestart = drawCanvasButton(midW - CFG.END_BTN_X_OFFSET, btnY, CFG.END_BTN_W, CFG.END_BTN_H, '🔄 Tekrar', '#16a34a', '#bbf7d0', CFG.END_BTN_FONT); canvasBtns.endMainMenu = drawCanvasButton(midW + CFG.END_BTN_X_OFFSET, btnY, CFG.END_BTN_W, CFG.END_BTN_H, '🏠 Altınları harca', '#1d4ed8', '#bfdbfe', CFG.END_BTN_FONT); ctx.textAlign = 'left'
}

function drawPlayingScreen() {
  drawBackground(); drawCastle(); ctx.strokeStyle = '#334155'; ctx.lineWidth = CFG.CANVAS_BORDER_W; ctx.setLineDash([]); ctx.strokeRect(CFG.CANVAS_BORDER_INSET, CFG.CANVAS_BORDER_INSET, world.w - CFG.CANVAS_BORDER_INSET * 2, world.h - CFG.CANVAS_BORDER_INSET * 2); drawEnemies(); drawBoss(); drawTurret()
  for (const b of state.bullets) { ctx.save(); ctx.shadowBlur = CFG.BULLET_SHADOW_BLUR; ctx.shadowColor = '#fbbf24'; ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
  for (const c of state.crystalPickups) { ctx.save(); ctx.shadowBlur = 6; ctx.shadowColor = '#7dd3fc'; ctx.fillStyle = '#7dd3fc'; ctx.beginPath(); ctx.moveTo(c.x, c.y - CFG.CRYSTAL_VISUAL_HALF_H); ctx.lineTo(c.x + CFG.CRYSTAL_VISUAL_HALF_W, c.y); ctx.lineTo(c.x, c.y + CFG.CRYSTAL_VISUAL_HALF_H); ctx.lineTo(c.x - CFG.CRYSTAL_VISUAL_HALF_W, c.y); ctx.closePath(); ctx.fill(); ctx.restore() }
  for (const c of state.coinPickups) { ctx.save(); ctx.shadowBlur = 8; ctx.shadowColor = '#fbbf24'; ctx.beginPath(); ctx.arc(c.x, c.y, CFG.COIN_RADIUS, 0, Math.PI * 2); ctx.fillStyle = '#fbbf24'; ctx.fill(); ctx.strokeStyle = '#d97706'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#78350f'; ctx.font = `bold ${CFG.COIN_RADIUS + 1}px Inter, system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', c.x, c.y); ctx.textBaseline = 'alphabetic'; ctx.restore() }
  for (const ex of state.explosions) {
    const alpha = 1 - ex.age / ex.maxAge; ctx.save(); ctx.globalAlpha = alpha; const grad = ctx.createRadialGradient(ex.x, ex.y, 0, ex.x, ex.y, Math.max(1, ex.r))
    if (ex.isPaddle) { grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.5, '#60a5fa'); grad.addColorStop(1, 'transparent') } else { grad.addColorStop(0, '#ffdd44'); grad.addColorStop(0.4, '#ff6600'); grad.addColorStop(1, 'transparent') }
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(ex.x, ex.y, Math.max(1, ex.r), 0, Math.PI * 2); ctx.fill(); ctx.restore()
  }
  drawCrystalBar(); drawAmmoBar(); drawEventProgressBar(); drawHordeBanner(); drawNotification()
}

function draw() { ctx.clearRect(0, 0, world.w, world.h); switch (state.screen) { case SCREEN.MENU: drawMenuScreen(); break; case SCREEN.COUNTDOWN: drawCountdownScreen(); break; case SCREEN.PLAYING: drawPlayingScreen(); break; case SCREEN.END: drawEndScreen(); break } }

let last = performance.now()
function formatTime(s) { const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${m}:${sec.toString().padStart(2, '0')}` }
function drawEventProgressBar() {
  const nextEventTime = Math.min(state.bossNextTime, state.horde.nextTime), isBossNext = state.bossNextTime <= state.horde.nextTime, totalNeeded = nextEventTime - state.lastEventTime, progress = totalNeeded > 0 ? (state.time - state.lastEventTime) / totalNeeded : 0, fill = Math.max(0, Math.min(1, progress))
  const barH = 12, barY = 60, margin = 40, barX = margin, barW = world.w - margin * 2
  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)'; ctx.fillRect(barX, barY, barW, barH)
  const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0)
  if (isBossNext) { grad.addColorStop(0, '#7c3aed'); grad.addColorStop(1, '#a78bfa') } else { grad.addColorStop(0, '#ef4444'); grad.addColorStop(1, '#f87171') }
  ctx.fillStyle = grad; ctx.fillRect(barX, barY, barW * fill, barH); ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.strokeRect(barX, barY, barW, barH)
  ctx.fillStyle = '#f1f5f9'; ctx.font = 'bold 12px Inter, system-ui'; ctx.textAlign = 'center'; ctx.fillText(`${isBossNext ? '👑 BOSS' : '💀 SÜRÜ'} GELİYOR! — ${formatTime(state.time)}`, world.w / 2, barY - 10); ctx.textAlign = 'left'
}

function loop(now) {
  let dt = Math.min(CFG.LOOP_DT_CAP, (now - last) / 1000); last = now
  if (state.devTimewarp) dt *= CFG.DEV_TIMEWARP_MULT
  if (state.screen === SCREEN.MENU || state.screen === SCREEN.END) { draw(); requestAnimationFrame(loop); return }
  if (state.screen === SCREEN.COUNTDOWN) { state.countdownTimer -= dt; if (state.countdownTimer <= 0) startPlaying(); draw(); requestAnimationFrame(loop); return }
  if (!upgradePaused) {
    state.time += dt; updateTurret(dt); updateTurretHP(dt)
    if (mouseDown || keys.shoot) state.lastFireTime = state.time
    state.fireTimer -= dt
    if (state.fireTimer <= 0) { state.fireTimer = 1 / getFireRate(); if ((mouseDown || keys.shoot) && state.ammo >= CFG.AMMO_COST_PER_VOLLEY) { fireBullets(); state.ammo -= CFG.AMMO_COST_PER_VOLLEY } }
    updateAmmo(dt); updateOutOfAmmoWarning(dt); checkSchedule()
    if (state.horde.active) { state.horde.timer -= dt; if (state.horde.timer <= 0) state.horde.active = false }
    const baseInterval = Math.max(CFG.ENEMY_SPAWN_INTERVAL_MIN, CFG.ENEMY_SPAWN_INTERVAL_START - state.time * CFG.ENEMY_SPAWN_RATE_RAMP), targetInterval = state.horde.active ? CFG.HORDE_SPAWN_INTERVAL : baseInterval; state.spawnTimer += dt
    while (state.spawnTimer >= targetInterval && state.enemies.length < CFG.ENEMY_MAX_COUNT) { spawnEnemy(); state.spawnTimer -= targetInterval }
    handleEnemyMovement(dt); updateBullets(dt); handleBulletEnemyCollisions(); handleBossBulletCollisions(); updateBoss(dt); updateCrystals(dt); updateCoins(dt); updateExplosions(dt); updateNotification(dt)
    if (state.turret.hp <= 0 || state.castle.hp <= 0) endRun()
  }
  draw(); requestAnimationFrame(loop)
}

function canvasXY(clientX, clientY) { const rect = canvas.getBoundingClientRect(); const scaleX = world.w / rect.width, scaleY = world.h / rect.height; return { cx: (clientX - rect.left) * scaleX, cy: (clientY - rect.top) * scaleY } }
function hitTest(btn, cx, cy) { return btn && cx >= btn.x && cx <= btn.x + btn.w && cy >= btn.y && cy <= btn.y + btn.h }
function handleCanvasTap(cx, cy) {
  if (state.screen === SCREEN.MENU) {
    if (hitTest(canvasBtns.menuPlay, cx, cy)) { startCountdown(); return true }
    if (hitTest(canvasBtns.menuShop, cx, cy)) { openShop(); return true }
    if (CFG.DEV_ENABLED && hitTest(canvasBtns.menuDev, cx, cy)) { state.devTimewarp = !state.devTimewarp; state.devMagnet = state.devTimewarp; return true }
    if (CFG.DEV_ENABLED && hitTest(canvasBtns.menuDevReset, cx, cy)) { try { localStorage.clear(); state.money = 0; state.upgrades = { fireRate: 0, bulletDmg: 0, pierce: 0, bulletCount: 0 }; state.bestScore = 0; state.devResetFeedback = 'TEMİZLENDİ' } catch { state.devResetFeedback = 'HATA' }; setTimeout(() => { state.devResetFeedback = null }, 2000); return true }
  }
  if (state.screen === SCREEN.END) { if (hitTest(canvasBtns.endRestart, cx, cy)) { startCountdown(); return true }; if (hitTest(canvasBtns.endMainMenu, cx, cy)) { goToMenu(); return true } }
  return false
}

document.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') keys.left = true; if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = true; if (e.key === ' ') { e.preventDefault(); keys.shoot = true } })
document.addEventListener('keyup', (e) => { if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') keys.left = false; if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = false; if (e.key === ' ') keys.shoot = false })
canvas.addEventListener('mousedown', (e) => { mouseDown = true; const { cx, cy } = canvasXY(e.clientX, e.clientY); mouseX = cx; handleCanvasTap(cx, cy) })
canvas.addEventListener('mousemove', (e) => { if (mouseDown) mouseX = canvasXY(e.clientX, e.clientY).cx })
canvas.addEventListener('mouseup', () => { mouseDown = false })
canvas.addEventListener('mouseleave', () => { mouseDown = false })
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); if (e.touches.length > 0) { mouseDown = true; const { cx, cy } = canvasXY(e.touches[0].clientX, e.touches[0].clientY); mouseX = cx; handleCanvasTap(cx, cy) } }, { passive: false })
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); if (e.touches.length > 0) { mouseX = canvasXY(e.touches[0].clientX, e.touches[0].clientY).cx } }, { passive: false })
canvas.addEventListener('touchend', (e) => { e.preventDefault(); if (e.touches.length === 0) mouseDown = false }, { passive: false })
canvas.addEventListener('touchcancel', () => { mouseDown = false })

function buyUpgrade(type) { const cost = getCost(type); if (state.money < cost) return; state.money -= cost; state.upgrades[type] += 1; saveUpgrades(); renderShopButtons(); shopSummaryEl.textContent = `💰 Bakiye: ${state.money}` }
buyFireRateBtn.addEventListener('click', () => buyUpgrade('fireRate'))
buyBulletDmgBtn.addEventListener('click', () => buyUpgrade('bulletDmg'))
buyPierceBtn.addEventListener('click', () => buyUpgrade('pierce'))
buyBulletCountBtn.addEventListener('click', () => buyUpgrade('bulletCount'))
shopBackBtn.addEventListener('click', () => { shopEl.classList.add('hidden'); saveUpgrades() })

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2); this.moveTo(x + r, y); this.lineTo(x + w - r, y); this.quadraticCurveTo(x + w, y, x + w, y + r); this.lineTo(x + w, y + h - r); this.quadraticCurveTo(x + w, y + h, x + w - r, y + h); this.lineTo(x + r, y + h); this.quadraticCurveTo(x, y + h, x, y + h - r); this.lineTo(x, y + r); this.quadraticCurveTo(x, y, x + r, y); this.closePath()
  }
}
function updateRarityLegend() { if (!legendBarEl) return; const c = `hsl(${CFG.RARITY_COMMON_HUE}, ${CFG.RARITY_COMMON_SAT}%, ${CFG.RARITY_COMMON_LIGHT}%)`, r = `hsl(${CFG.RARITY_RARE_HUE}, ${CFG.RARITY_RARE_SAT}%, ${CFG.RARITY_RARE_LIGHT}%)`; legendBarEl.style.background = `linear-gradient(to right, ${c}, ${r})` }

loadUpgrades()
updateRarityLegend()
goToMenu()
requestAnimationFrame(loop)
