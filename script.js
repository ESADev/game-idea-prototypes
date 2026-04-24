const CELL_EMPTY = 0;
const CELL_PLAYER = 1;
const CELL_ENEMY = 2;
const INVALID_CELL_SCORE = -999999;
const AI_MOVE_RANDOMNESS_FACTOR = 0.5;
const MAX_ENEMY_MOVES = 2;
const DIFFICULTY_SCALING_FACTOR = 3;
const BLOCK_PLAYER_THREE_SCORE = 1000;
const CREATE_ENEMY_THREE_SCORE = 300;
const PLAYER_NEIGHBOR_BLOCK_WEIGHT = 4;
const ENEMY_NEIGHBOR_GROUP_WEIGHT = 2;
const DEFAULT_RADIAL_ATTACK_RADIUS = 2;
const ENEMY_TURN_DELAY_MS = 180;
const DIRS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

const state = {
  gridSize: 15,
  maxGridSize: 20,
  difficulty: 1,
  wins: 0,
  points: 0,
  playerCharges: 0,
  board: [],
  turn: "player",
  mode: "normal",
  laserAxis: "row",
  playerMarksLeftThisTurn: 1,
  upgrades: {
    laser: false,
    doubleMark: false,
  },
  foundLines: new Set(),
  matchActive: false,
};

const el = {
  board: document.getElementById("board"),
  gridSize: document.getElementById("grid-size"),
  difficulty: document.getElementById("difficulty"),
  points: document.getElementById("points"),
  charges: document.getElementById("charges"),
  turn: document.getElementById("turn"),
  playerCells: document.getElementById("player-cells"),
  enemyCells: document.getElementById("enemy-cells"),
  emptyCells: document.getElementById("empty-cells"),
  info: document.getElementById("info"),
  modeNormal: document.getElementById("mode-normal"),
  modeRadial: document.getElementById("mode-radial"),
  modeLaser: document.getElementById("mode-laser"),
  laserAxis: document.getElementById("laser-axis"),
  menu: document.getElementById("menu"),
  menuTitle: document.getElementById("menu-title"),
  menuMessage: document.getElementById("menu-message"),
  buyLaser: document.getElementById("buy-laser"),
  buyDouble: document.getElementById("buy-double"),
  startNext: document.getElementById("start-next"),
};

function createEmptyBoard(gridSize) {
  return Array.from({ length: gridSize }, () =>
    Array(gridSize).fill(CELL_EMPTY),
  );
}

function inBounds(r, c) {
  return r >= 0 && c >= 0 && r < state.gridSize && c < state.gridSize;
}

function boardCounts() {
  let player = 0;
  let enemy = 0;
  let empty = 0;
  for (let r = 0; r < state.gridSize; r += 1) {
    for (let c = 0; c < state.gridSize; c += 1) {
      const v = state.board[r][c];
      if (v === CELL_PLAYER) player += 1;
      else if (v === CELL_ENEMY) enemy += 1;
      else empty += 1;
    }
  }
  return { player, enemy, empty };
}

function lineKey(coords) {
  return coords.map(([r, c]) => `${r},${c}`).sort().join("|");
}

function collectNewLinesOfThree(r, c, who) {
  const fresh = [];
  for (const [dr, dc] of DIRS) {
    for (let shift = -2; shift <= 0; shift += 1) {
      const coords = [];
      let ok = true;
      for (let i = 0; i < 3; i += 1) {
        const rr = r + (shift + i) * dr;
        const cc = c + (shift + i) * dc;
        if (!inBounds(rr, cc) || state.board[rr][cc] !== who) {
          ok = false;
          break;
        }
        coords.push([rr, cc]);
      }
      if (!ok) continue;
      const key = lineKey(coords);
      if (!state.foundLines.has(key)) fresh.push(key);
    }
  }
  return fresh;
}

function setInfo(message) {
  el.info.textContent = message;
}

function setMode(mode) {
  state.mode = mode;
  el.modeNormal.classList.toggle("active", mode === "normal");
  el.modeRadial.classList.toggle("active", mode === "radial");
  el.modeLaser.classList.toggle("active", mode === "laser");
}

function renderBoard() {
  el.board.style.setProperty("--size", String(state.gridSize));
  el.board.innerHTML = "";
  for (let r = 0; r < state.gridSize; r += 1) {
    for (let c = 0; c < state.gridSize; c += 1) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "cell";
      if (state.board[r][c] === CELL_PLAYER) b.classList.add("player");
      if (state.board[r][c] === CELL_ENEMY) b.classList.add("enemy");
      b.dataset.r = String(r);
      b.dataset.c = String(c);
      el.board.appendChild(b);
    }
  }
}

function renderHud() {
  const counts = boardCounts();
  el.gridSize.textContent = `${state.gridSize}x${state.gridSize}`;
  el.difficulty.textContent = String(state.difficulty);
  el.points.textContent = String(state.points);
  el.charges.textContent = String(state.playerCharges);
  el.turn.textContent = state.matchActive ? state.turn : "menu";
  el.playerCells.textContent = String(counts.player);
  el.enemyCells.textContent = String(counts.enemy);
  el.emptyCells.textContent = String(counts.empty);

  el.modeRadial.disabled = state.playerCharges <= 0 || !state.matchActive;
  el.modeLaser.disabled =
    state.playerCharges <= 0 || !state.matchActive || !state.upgrades.laser;
  el.laserAxis.disabled = !state.upgrades.laser || state.mode !== "laser";
  el.laserAxis.textContent = `Laser Axis: ${
    state.laserAxis === "row" ? "Row" : "Column"
  }`;

  el.buyLaser.disabled = state.upgrades.laser || state.points < 2;
  el.buyDouble.disabled = state.upgrades.doubleMark || state.points < 3;
}

function isBoardFull() {
  return boardCounts().empty === 0;
}

function endMatch() {
  state.matchActive = false;
  const { player, enemy } = boardCounts();
  let title = "Draw";
  let msg = `You controlled ${player} cells. Enemy controlled ${enemy}.`;
  if (player > enemy) {
    title = "Victory";
    state.points += 1;
    state.wins += 1;
    state.difficulty += 1;
    state.gridSize = Math.min(state.maxGridSize, 15 + state.wins);
    msg = `You win and gain 1 strategic point. Next match is harder and larger.`;
  } else if (enemy > player) {
    title = "Defeat";
    msg = `Enemy controlled more territory. Spend points on upgrades and try again.`;
  }

  el.menuTitle.textContent = title;
  el.menuMessage.textContent = msg;
  el.menu.classList.remove("hidden");
  renderHud();
}

function enemyMovesPerTurn() {
  return Math.min(
    MAX_ENEMY_MOVES,
    1 + Math.floor((state.difficulty - 1) / DIFFICULTY_SCALING_FACTOR),
  );
}

function wouldCreateThree(r, c, who) {
  if (state.board[r][c] !== CELL_EMPTY) return false;
  state.board[r][c] = who;
  const result = collectNewLinesOfThree(r, c, who).length > 0;
  state.board[r][c] = CELL_EMPTY;
  return result;
}

function evaluateEnemyCell(r, c) {
  if (state.board[r][c] !== CELL_EMPTY) return INVALID_CELL_SCORE;
  let score = 0;

  if (wouldCreateThree(r, c, CELL_PLAYER)) score += BLOCK_PLAYER_THREE_SCORE;
  if (wouldCreateThree(r, c, CELL_ENEMY)) score += CREATE_ENEMY_THREE_SCORE;

  for (let rr = r - 1; rr <= r + 1; rr += 1) {
    for (let cc = c - 1; cc <= c + 1; cc += 1) {
      if (!inBounds(rr, cc) || (rr === r && cc === c)) continue;
      if (state.board[rr][cc] === CELL_PLAYER) {
        score += PLAYER_NEIGHBOR_BLOCK_WEIGHT * state.difficulty;
      }
      if (state.board[rr][cc] === CELL_ENEMY) score += ENEMY_NEIGHBOR_GROUP_WEIGHT;
    }
  }

  score += Math.random() * AI_MOVE_RANDOMNESS_FACTOR;
  return score;
}

function pickEnemyMove() {
  let best = null;
  let bestScore = INVALID_CELL_SCORE;
  for (let r = 0; r < state.gridSize; r += 1) {
    for (let c = 0; c < state.gridSize; c += 1) {
      const sc = evaluateEnemyCell(r, c);
      if (sc > bestScore) {
        bestScore = sc;
        best = [r, c];
      }
    }
  }
  return best;
}

function placeMark(r, c, who) {
  if (!inBounds(r, c)) return false;
  if (state.board[r][c] !== CELL_EMPTY) return false;
  state.board[r][c] = who;
  if (who === CELL_PLAYER) {
    const fresh = collectNewLinesOfThree(r, c, who);
    if (fresh.length > 0) {
      fresh.forEach((key) => state.foundLines.add(key));
      state.playerCharges += fresh.length;
      setInfo(`Line formed! You gained ${fresh.length} charge.`);
    }
  }
  return true;
}

function useRadialAttack(
  centerR,
  centerC,
  radius = DEFAULT_RADIAL_ATTACK_RADIUS,
) {
  let removed = 0;
  for (let r = 0; r < state.gridSize; r += 1) {
    for (let c = 0; c < state.gridSize; c += 1) {
      if (state.board[r][c] !== CELL_ENEMY) continue;
      const dist = Math.hypot(r - centerR, c - centerC);
      if (dist <= radius) {
        state.board[r][c] = CELL_EMPTY;
        removed += 1;
      }
    }
  }
  return removed;
}

function useLaserAttack(centerR, centerC) {
  let removed = 0;
  if (state.laserAxis === "row") {
    for (let c = 0; c < state.gridSize; c += 1) {
      if (state.board[centerR][c] === CELL_ENEMY) {
        state.board[centerR][c] = CELL_EMPTY;
        removed += 1;
      }
    }
  } else {
    for (let r = 0; r < state.gridSize; r += 1) {
      if (state.board[r][centerC] === CELL_ENEMY) {
        state.board[r][centerC] = CELL_EMPTY;
        removed += 1;
      }
    }
  }
  return removed;
}

function enemyTurn() {
  state.turn = "enemy";
  renderHud();
  const moves = enemyMovesPerTurn();
  for (let i = 0; i < moves; i += 1) {
    if (isBoardFull()) break;
    const move = pickEnemyMove();
    if (!move) break;
    const [r, c] = move;
    placeMark(r, c, CELL_ENEMY);
  }

  if (isBoardFull()) {
    renderBoard();
    renderHud();
    endMatch();
    return;
  }

  state.turn = "player";
  state.playerMarksLeftThisTurn = state.upgrades.doubleMark ? 2 : 1;
  renderBoard();
  renderHud();
  setInfo(
    state.playerMarksLeftThisTurn > 1
      ? `Your turn. Place ${state.playerMarksLeftThisTurn} marks or use a special attack.`
      : "Your turn. Place a mark or use a special attack.",
  );
}

function finishPlayerAction() {
  if (!state.matchActive) return;
  if (isBoardFull()) {
    endMatch();
    return;
  }
  setTimeout(enemyTurn, ENEMY_TURN_DELAY_MS);
}

function onPlayerBoardClick(r, c) {
  if (!state.matchActive || state.turn !== "player") return;

  if (state.mode === "radial" || state.mode === "laser") {
    if (state.playerCharges <= 0) {
      setInfo("No charges available.");
      setMode("normal");
      renderHud();
      return;
    }
    if (state.mode === "laser" && !state.upgrades.laser) {
      setInfo("Laser not unlocked.");
      setMode("normal");
      renderHud();
      return;
    }
    const removed =
      state.mode === "radial"
        ? useRadialAttack(r, c, DEFAULT_RADIAL_ATTACK_RADIUS)
        : useLaserAttack(r, c);
    state.playerCharges -= 1;
    setInfo(`Special attack used. Removed ${removed} enemy marks.`);
    setMode("normal");
    renderBoard();
    renderHud();
    finishPlayerAction();
    return;
  }

  const placed = placeMark(r, c, CELL_PLAYER);
  if (!placed) {
    setInfo("That cell is occupied.");
    return;
  }

  state.playerMarksLeftThisTurn -= 1;
  renderBoard();
  renderHud();
  if (state.playerMarksLeftThisTurn > 0) {
    setInfo(`Place ${state.playerMarksLeftThisTurn} more marks this turn.`);
    return;
  }

  finishPlayerAction();
}

function startMatch() {
  state.board = createEmptyBoard(state.gridSize);
  state.foundLines.clear();
  state.playerCharges = 0;
  state.turn = "player";
  state.mode = "normal";
  state.matchActive = true;
  state.playerMarksLeftThisTurn = state.upgrades.doubleMark ? 2 : 1;
  el.menu.classList.add("hidden");
  renderBoard();
  renderHud();
  setInfo("Your turn. Build lines of 3 to earn charges.");
}

function initControls() {
  el.board.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.classList.contains("cell")) return;
    const r = Number(target.dataset.r);
    const c = Number(target.dataset.c);
    onPlayerBoardClick(r, c);
  });

  el.modeNormal.addEventListener("click", () => setMode("normal"));
  el.modeRadial.addEventListener("click", () => setMode("radial"));
  el.modeLaser.addEventListener("click", () => {
    if (!state.upgrades.laser) return;
    setMode("laser");
  });

  el.laserAxis.addEventListener("click", () => {
    state.laserAxis = state.laserAxis === "row" ? "column" : "row";
    renderHud();
  });

  el.buyLaser.addEventListener("click", () => {
    if (state.upgrades.laser || state.points < 2) return;
    state.points -= 2;
    state.upgrades.laser = true;
    setInfo("Laser unlocked.");
    renderHud();
  });

  el.buyDouble.addEventListener("click", () => {
    if (state.upgrades.doubleMark || state.points < 3) return;
    state.points -= 3;
    state.upgrades.doubleMark = true;
    setInfo("Double Mark unlocked.");
    renderHud();
  });

  el.startNext.addEventListener("click", startMatch);
}

initControls();
renderHud();
setInfo("Start a match to play.");
