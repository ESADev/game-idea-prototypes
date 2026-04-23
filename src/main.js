import './style.css'

const BOARD_SIZE = 10
const BASE_COOLDOWN_MS = 550
const ENEMY_TICK_MS = 1000
const POWERUP_SPAWN_MS = 6500
const WAVE_MS = 9000
const MAX_POWERUPS = 3

const PIECE_ICONS = {
  knight: '♞',
  rook: '♜',
  bishop: '♝',
  queen: '♛',
  king: '♚',
}

const POWERUP_LABEL = {
  cooldown: '⏱',
  shield: '🛡',
  queen: '��',
}

const state = {
  phase: 'select',
  now: Date.now(),
  startedAt: 0,
  selectedPiece: null,
  player: null,
  enemies: [],
  powerups: [],
  nextEnemyId: 1,
  nextPowerupId: 1,
  score: 0,
  waves: 0,
  cursor: { x: 0, y: 0 },
  threatSet: new Set(),
  message: 'Pick your piece to start.',
}

const app = document.querySelector('#app')

function key(pos) {
  return `${pos.x},${pos.y}`
}

function inBounds(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE
}

function samePos(a, b) {
  return a.x === b.x && a.y === b.y
}

function clonePos(p) {
  return { x: p.x, y: p.y }
}

function randomInt(max) {
  return Math.floor(Math.random() * max)
}

function randomChoice(arr) {
  return arr[randomInt(arr.length)]
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

function buildEnemyMap(excludeId = null) {
  const map = new Map()
  for (const enemy of state.enemies) {
    if (enemy.id !== excludeId) {
      map.set(key(enemy.pos), enemy)
    }
  }
  return map
}

function slideMoves(from, deltas, blockedSet, includeEnemies = false, enemyMap = null) {
  const out = []
  for (const [dx, dy] of deltas) {
    let x = from.x + dx
    let y = from.y + dy
    while (inBounds(x, y)) {
      const k = `${x},${y}`
      if (blockedSet.has(k)) {
        if (includeEnemies && enemyMap?.has(k)) {
          out.push({ x, y })
        }
        break
      }
      out.push({ x, y })
      x += dx
      y += dy
    }
  }
  return out
}

function getMoves(pieceType, from, context = {}) {
  const { enemyMap = buildEnemyMap(), includeEnemies = true } = context
  const blocked = new Set()

  if (context.playerPos) {
    blocked.add(key(context.playerPos))
  }

  for (const enemy of state.enemies) {
    if (!context.excludeEnemyId || enemy.id !== context.excludeEnemyId) {
      blocked.add(key(enemy.pos))
    }
  }

  const addLeaperMoves = (deltas) => {
    const out = []
    for (const [dx, dy] of deltas) {
      const x = from.x + dx
      const y = from.y + dy
      if (!inBounds(x, y)) continue
      const k = `${x},${y}`
      if (blocked.has(k) && !(includeEnemies && enemyMap.has(k))) continue
      out.push({ x, y })
    }
    return out
  }

  switch (pieceType) {
    case 'knight':
      return addLeaperMoves([
        [1, 2],
        [2, 1],
        [-1, 2],
        [-2, 1],
        [1, -2],
        [2, -1],
        [-1, -2],
        [-2, -1],
      ])
    case 'rook':
      return slideMoves(
        from,
        [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ],
        blocked,
        includeEnemies,
        enemyMap,
      )
    case 'bishop':
      return slideMoves(
        from,
        [
          [1, 1],
          [-1, 1],
          [1, -1],
          [-1, -1],
        ],
        blocked,
        includeEnemies,
        enemyMap,
      )
    case 'queen':
      return slideMoves(
        from,
        [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
          [1, 1],
          [-1, 1],
          [1, -1],
          [-1, -1],
        ],
        blocked,
        includeEnemies,
        enemyMap,
      )
    case 'king':
      return addLeaperMoves([
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [-1, 1],
        [1, -1],
        [-1, -1],
      ])
    default:
      return []
  }
}

function getPlayerType() {
  if (!state.player) return 'knight'
  return state.player.queenTurns > 0 ? 'queen' : state.player.baseType
}

function computeThreatSet() {
  const threat = new Set()
  const enemyMap = buildEnemyMap()
  for (const enemy of state.enemies) {
    const moves = getMoves(enemy.type, enemy.pos, {
      playerPos: state.player?.pos,
      excludeEnemyId: enemy.id,
      enemyMap,
      includeEnemies: false,
    })
    for (const move of moves) threat.add(key(move))
  }
  return threat
}

function getPlayerMoves() {
  if (!state.player) return []
  const pieceType = getPlayerType()
  return getMoves(pieceType, state.player.pos, {
    enemyMap: buildEnemyMap(),
    includeEnemies: true,
  })
}

function isCellOccupied(pos) {
  if (state.player && samePos(state.player.pos, pos)) return true
  if (state.enemies.some((enemy) => samePos(enemy.pos, pos))) return true
  if (state.powerups.some((item) => samePos(item.pos, pos))) return true
  return false
}

function randomEmptyCell(maxAttempts = 80) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const pos = { x: randomInt(BOARD_SIZE), y: randomInt(BOARD_SIZE) }
    if (!isCellOccupied(pos)) return pos
  }
  return null
}

function spawnPowerup() {
  if (state.phase !== 'running' || state.powerups.length >= MAX_POWERUPS) return
  const pos = randomEmptyCell()
  if (!pos) return
  const type = randomChoice(['cooldown', 'shield', 'queen'])
  state.powerups.push({ id: state.nextPowerupId++, type, pos })
}

function spawnWave() {
  if (state.phase !== 'running') return
  state.waves += 1
  const spawnCount = Math.min(2 + Math.floor(state.waves / 2), 8)
  const enemyTypes = ['knight', 'rook', 'bishop', 'queen', 'king']

  for (let i = 0; i < spawnCount; i += 1) {
    const pos = randomEmptyCell(100)
    if (!pos) break
    state.enemies.push({
      id: state.nextEnemyId++,
      type: randomChoice(enemyTypes),
      pos,
    })
  }

  state.message = `Wave ${state.waves} arrived.`
}

function applyPowerup(power) {
  if (power.type === 'cooldown') {
    state.player.cooldownBuffTurns = Math.max(state.player.cooldownBuffTurns, 6)
    state.message = 'Cooldown boost! 6 faster turns.'
  } else if (power.type === 'shield') {
    state.player.shield += 1
    state.message = 'Shield gained. One hit blocked.'
  } else if (power.type === 'queen') {
    state.player.queenTurns = Math.max(state.player.queenTurns, 3)
    state.message = 'Queen mode! 3 turns.'
  }
}

function useTurnBuffs() {
  if (state.player.queenTurns > 0) state.player.queenTurns -= 1
  if (state.player.cooldownBuffTurns > 0) state.player.cooldownBuffTurns -= 1
}

function defeatPlayer(cause) {
  if (state.player.shield > 0) {
    state.player.shield -= 1
    state.message = `Shield blocked a ${cause} hit.`
    return false
  }
  state.phase = 'gameover'
  state.message = `Game Over: ${cause}`
  return true
}

function tryMovePlayer(to) {
  if (state.phase !== 'running') return
  const now = Date.now()
  if (now < state.player.cooldownUntil) {
    state.message = 'On cooldown...'
    render()
    return
  }

  const legal = getPlayerMoves()
  if (!legal.some((m) => samePos(m, to))) {
    state.message = 'Invalid move.'
    render()
    return
  }

  const enemyIndex = state.enemies.findIndex((enemy) => samePos(enemy.pos, to))
  if (enemyIndex >= 0) {
    state.enemies.splice(enemyIndex, 1)
    state.score += 1
    state.message = 'Enemy captured!'
  }

  const powerIndex = state.powerups.findIndex((item) => samePos(item.pos, to))
  if (powerIndex >= 0) {
    const [item] = state.powerups.splice(powerIndex, 1)
    applyPowerup(item)
  }

  state.player.pos = clonePos(to)
  state.cursor = clonePos(to)
  useTurnBuffs()

  const cooldownScale = state.player.cooldownBuffTurns > 0 ? 0.55 : 1
  state.player.cooldownUntil = now + BASE_COOLDOWN_MS * cooldownScale

  state.threatSet = computeThreatSet()

  if (state.threatSet.has(key(state.player.pos))) {
    state.message += ' You stepped into danger.'
  }

  render()
}

function resolveEnemyTurn() {
  if (state.phase !== 'running') return

  state.threatSet = computeThreatSet()

  const threateningEnemy = state.enemies.find((enemy) => {
    const moves = getMoves(enemy.type, enemy.pos, {
      playerPos: state.player.pos,
      excludeEnemyId: enemy.id,
      enemyMap: buildEnemyMap(enemy.id),
      includeEnemies: false,
    })
    return moves.some((m) => samePos(m, state.player.pos))
  })

  if (threateningEnemy) {
    if (defeatPlayer('enemy capture')) {
      render()
      return
    }
    state.enemies = state.enemies.filter((e) => e.id !== threateningEnemy.id)
  }

  const playerAttackSet = new Set(getPlayerMoves().map((p) => key(p)))

  for (const enemy of state.enemies) {
    const enemyMap = buildEnemyMap(enemy.id)
    const candidates = getMoves(enemy.type, enemy.pos, {
      playerPos: state.player.pos,
      excludeEnemyId: enemy.id,
      enemyMap,
      includeEnemies: false,
    })

    if (!candidates.length) continue

    let bestMove = enemy.pos
    let bestScore = -Infinity

    for (const move of candidates) {
      const k = key(move)
      if (samePos(move, state.player.pos)) {
        bestMove = move
        bestScore = Infinity
        break
      }

      const dist = manhattan(move, state.player.pos)
      const safeFromPlayer = !playerAttackSet.has(k)
      const centrality = 4 - (Math.abs(move.x - BOARD_SIZE / 2) + Math.abs(move.y - BOARD_SIZE / 2)) / 4
      const score = -dist * 2 + (safeFromPlayer ? 5 : -4) + centrality + Math.random()

      if (score > bestScore) {
        bestScore = score
        bestMove = move
      }
    }

    enemy.pos = clonePos(bestMove)

    if (samePos(enemy.pos, state.player.pos)) {
      if (defeatPlayer('enemy move capture')) {
        render()
        return
      }
      state.enemies = state.enemies.filter((e) => e.id !== enemy.id)
    }
  }

  state.threatSet = computeThreatSet()
  render()
}

function startGame(pieceType) {
  state.phase = 'running'
  state.selectedPiece = pieceType
  state.startedAt = Date.now()
  state.score = 0
  state.waves = 0
  state.enemies = []
  state.powerups = []
  state.nextEnemyId = 1
  state.nextPowerupId = 1

  const startPos = { x: Math.floor(BOARD_SIZE / 2), y: Math.floor(BOARD_SIZE / 2) }
  state.player = {
    baseType: pieceType,
    pos: startPos,
    cooldownUntil: Date.now(),
    shield: 0,
    queenTurns: 0,
    cooldownBuffTurns: 0,
  }
  state.cursor = clonePos(startPos)
  state.message = 'Survive and capture enemies.'

  spawnWave()
  state.threatSet = computeThreatSet()
  render()
}

function restart() {
  state.phase = 'select'
  state.selectedPiece = null
  state.player = null
  state.enemies = []
  state.powerups = []
  state.score = 0
  state.waves = 0
  state.message = 'Pick your piece to start again.'
  render()
}

function setupInput() {
  window.addEventListener('keydown', (event) => {
    if (state.phase !== 'running') return

    const keyName = event.key
    let moved = false
    if (keyName === 'ArrowUp' || keyName.toLowerCase() === 'w') {
      state.cursor.y = Math.max(0, state.cursor.y - 1)
      moved = true
    } else if (keyName === 'ArrowDown' || keyName.toLowerCase() === 's') {
      state.cursor.y = Math.min(BOARD_SIZE - 1, state.cursor.y + 1)
      moved = true
    } else if (keyName === 'ArrowLeft' || keyName.toLowerCase() === 'a') {
      state.cursor.x = Math.max(0, state.cursor.x - 1)
      moved = true
    } else if (keyName === 'ArrowRight' || keyName.toLowerCase() === 'd') {
      state.cursor.x = Math.min(BOARD_SIZE - 1, state.cursor.x + 1)
      moved = true
    } else if (keyName === 'Enter' || keyName === ' ') {
      event.preventDefault()
      tryMovePlayer(state.cursor)
      return
    }

    if (moved) {
      event.preventDefault()
      render()
    }
  })
}

function formatTime(ms) {
  return (ms / 1000).toFixed(1)
}

function render() {
  state.now = Date.now()

  if (state.phase === 'select') {
    app.innerHTML = `
      <main class="ui-shell">
        <h1>Chess Survivor Prototype</h1>
        <p class="subtitle">Pick one piece. Move and attack using chess rules. Survive enemy waves.</p>
        <div class="piece-picker">
          <button data-piece="knight">${PIECE_ICONS.knight} Knight</button>
          <button data-piece="rook">${PIECE_ICONS.rook} Rook</button>
          <button data-piece="bishop">${PIECE_ICONS.bishop} Bishop</button>
        </div>
        <ul class="tips">
          <li>Click highlighted squares or use WASD/Arrows + Enter.</li>
          <li>Dark red squares are under enemy attack.</li>
          <li>Capture enemies and grab power-ups to survive longer.</li>
        </ul>
      </main>
    `

    app.querySelectorAll('[data-piece]').forEach((btn) => {
      btn.addEventListener('click', () => startGame(btn.dataset.piece))
    })
    return
  }

  const playerMoves = getPlayerMoves()
  const moveSet = new Set(playerMoves.map((p) => key(p)))
  const enemyMap = buildEnemyMap()
  const powerMap = new Map(state.powerups.map((item) => [key(item.pos), item]))

  const cooldownRemaining = Math.max(0, state.player.cooldownUntil - state.now)
  const survived = state.phase === 'running' ? state.now - state.startedAt : state.player ? state.now - state.startedAt : 0

  let cells = ''
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      const pos = { x, y }
      const k = key(pos)
      const playerHere = state.player && samePos(state.player.pos, pos)
      const enemy = enemyMap.get(k)
      const power = powerMap.get(k)
      const valid = moveSet.has(k)
      const danger = state.threatSet.has(k)
      const cursor = state.phase === 'running' && samePos(state.cursor, pos)

      let content = ''
      if (playerHere) content = `<span class="piece player">${PIECE_ICONS[getPlayerType()]}</span>`
      else if (enemy) content = `<span class="piece enemy">${PIECE_ICONS[enemy.type]}</span>`
      else if (power) content = `<span class="power">${POWERUP_LABEL[power.type]}</span>`

      const classes = [
        'cell',
        (x + y) % 2 === 0 ? 'light' : 'dark',
        valid ? 'valid' : '',
        danger ? 'danger' : '',
        cursor ? 'cursor' : '',
      ]
        .filter(Boolean)
        .join(' ')

      cells += `<button class="${classes}" data-x="${x}" data-y="${y}">${content}</button>`
    }
  }

  app.innerHTML = `
    <main class="ui-shell game-screen">
      <header class="hud">
        <div><strong>Piece:</strong> ${PIECE_ICONS[state.player.baseType]} ${state.player.baseType}</div>
        <div><strong>Mode:</strong> ${getPlayerType()}${state.player.queenTurns > 0 ? ` (${state.player.queenTurns})` : ''}</div>
        <div><strong>Score:</strong> ${state.score}</div>
        <div><strong>Wave:</strong> ${state.waves}</div>
        <div><strong>Shield:</strong> ${state.player.shield}</div>
        <div><strong>Cooldown:</strong> ${formatTime(cooldownRemaining)}s</div>
        <div><strong>Survival:</strong> ${formatTime(survived)}s</div>
      </header>
      <div class="status ${state.phase}">${state.message}</div>
      <section class="board" style="--size:${BOARD_SIZE}">${cells}</section>
      <footer class="controls">
        <span>Controls: Mouse or WASD/Arrows + Enter</span>
        ${state.phase === 'gameover' ? '<button id="restartBtn">Restart</button>' : ''}
      </footer>
    </main>
  `

  app.querySelectorAll('.cell').forEach((cell) => {
    cell.addEventListener('click', () => {
      const x = Number(cell.dataset.x)
      const y = Number(cell.dataset.y)
      const pos = { x, y }
      state.cursor = pos
      tryMovePlayer(pos)
    })
  })

  if (state.phase === 'gameover') {
    app.querySelector('#restartBtn')?.addEventListener('click', restart)
  }
}

setupInput()
setInterval(resolveEnemyTurn, ENEMY_TICK_MS)
setInterval(spawnPowerup, POWERUP_SPAWN_MS)
setInterval(spawnWave, WAVE_MS)
setInterval(() => {
  if (state.phase === 'running') render()
}, 100)

render()
