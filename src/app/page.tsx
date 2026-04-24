"use client";

import { useEffect, useRef } from "react";

type WeaponType = "blaster" | "laser" | "spread";
type ScreenState = "start" | "playing" | "gameover";

type Bullet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  fromEnemy: boolean;
  color: string;
};

type Drop = {
  id: number;
  x: number;
  y: number;
  vy: number;
  type: WeaponType;
};

type Part = {
  id: number;
  gx: number;
  gy: number;
  hp: number;
  maxHp: number;
  type: WeaponType;
  fireCooldown: number;
};

type Alien = {
  id: number;
  x: number;
  y: number;
  hp: number;
  type: WeaponType;
  fireCooldown: number;
};

type GameState = {
  status: ScreenState;
  score: number;
  wave: number;
  coreX: number;
  coreY: number;
  coreHp: number;
  coreFireCooldown: number;
  parts: Part[];
  bullets: Bullet[];
  aliens: Alien[];
  drops: Drop[];
  nextId: number;
};

const WIDTH = 820;
const HEIGHT = 620;
const CORE_SIZE = 30;
const CELL = 28;
const PART_SIZE = 24;
const SHIP_SPEED = 380;
const DROP_SPEED = 150;
const ALIEN_SPEED_BASE = 20;
const ENEMY_BULLET_SPEED = 210;
const MAX_DELTA_TIME = 0.034;
const CORE_FIRE_COOLDOWN = 0.11;
const BLASTER_PART_COOLDOWN = 0.45;
const LASER_PART_COOLDOWN = 0.34;
const SPREAD_PART_COOLDOWN = 0.68;
const BLASTER_ALIEN_COOLDOWN = 1.9;
const LASER_ALIEN_COOLDOWN = 1.4;
const SPREAD_ALIEN_COOLDOWN = 2.3;
const DROP_RATE_PROBABILITY = 0.9;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function weaponColor(type: WeaponType): string {
  if (type === "laser") return "#3bd8ff";
  if (type === "spread") return "#ffd43b";
  return "#7bff8a";
}

function weaponName(type: WeaponType): string {
  if (type === "laser") return "Laser";
  if (type === "spread") return "Spread";
  return "Blaster";
}

function makeInitialState(): GameState {
  return {
    status: "start",
    score: 0,
    wave: 0,
    coreX: WIDTH / 2,
    coreY: HEIGHT - 52,
    coreHp: 1,
    coreFireCooldown: 0,
    parts: [],
    bullets: [],
    aliens: [],
    drops: [],
    nextId: 1,
  };
}

function spawnWave(state: GameState): void {
  state.wave += 1;
  const cols = 8;
  const rows = 4;
  const spacingX = 82;
  const spacingY = 58;
  const startX = WIDTH / 2 - ((cols - 1) * spacingX) / 2;
  const startY = 70;

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const t = (c + r + state.wave) % 3;
      const type: WeaponType = t === 0 ? "blaster" : t === 1 ? "laser" : "spread";
      state.aliens.push({
        id: state.nextId++,
        x: startX + c * spacingX,
        y: startY + r * spacingY,
        hp: type === "laser" ? 3 : 2,
        type,
        fireCooldown: Math.random() * 1.6,
      });
    }
  }
}

function getPartWorldPosition(state: GameState, p: { gx: number; gy: number }): { x: number; y: number } {
  return {
    x: state.coreX + p.gx * CELL,
    y: state.coreY + p.gy * CELL,
  };
}

function rectHit(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function occupiedCells(state: GameState): Set<string> {
  const occ = new Set<string>();
  occ.add("0,0");
  for (const part of state.parts) occ.add(`${part.gx},${part.gy}`);
  return occ;
}

function findConnectionSlots(state: GameState): Array<{ gx: number; gy: number }> {
  const occ = occupiedCells(state);
  const result = new Map<string, { gx: number; gy: number }>();

  const all = [{ gx: 0, gy: 0 }, ...state.parts.map((p) => ({ gx: p.gx, gy: p.gy }))];
  for (const c of all) {
    const neighbors = [
      { gx: c.gx - 1, gy: c.gy },
      { gx: c.gx + 1, gy: c.gy },
      { gx: c.gx, gy: c.gy - 1 },
    ];

    for (const n of neighbors) {
      if (n.gy > 0) continue;
      const key = `${n.gx},${n.gy}`;
      if (!occ.has(key)) result.set(key, n);
    }
  }

  return [...result.values()];
}

function attachDropToShip(state: GameState, drop: Drop): boolean {
  const candidates = findConnectionSlots(state);
  if (!candidates.length) return false;

  let best = candidates[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const slot of candidates) {
    const world = getPartWorldPosition(state, slot);
    const d = (world.x - drop.x) ** 2 + (world.y - drop.y) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = slot;
    }
  }

  const maxHp = drop.type === "laser" ? 2 : 3;
  state.parts.push({
    id: state.nextId++,
    gx: best.gx,
    gy: best.gy,
    hp: maxHp,
    maxHp,
    type: drop.type,
    fireCooldown: 0.2,
  });

  return true;
}

function addPlayerBullet(state: GameState, x: number, y: number, type: WeaponType | "core"): void {
  if (type === "core" || type === "blaster") {
    state.bullets.push({
      x,
      y,
      vx: 0,
      vy: -480,
      radius: 3,
      damage: 1,
      fromEnemy: false,
      color: type === "core" ? "#ffffff" : weaponColor("blaster"),
    });
    return;
  }

  if (type === "laser") {
    state.bullets.push({
      x,
      y,
      vx: 0,
      vy: -640,
      radius: 2,
      damage: 2,
      fromEnemy: false,
      color: weaponColor("laser"),
    });
    return;
  }

  const spread = [-0.26, 0, 0.26];
  for (const angle of spread) {
    state.bullets.push({
      x,
      y,
      vx: Math.sin(angle) * 300,
      vy: -Math.cos(angle) * 300,
      radius: 2.5,
      damage: 1,
      fromEnemy: false,
      color: weaponColor("spread"),
    });
  }
}

function alienShoot(state: GameState, alien: Alien): void {
  if (alien.type === "laser") {
    state.bullets.push({
      x: alien.x,
      y: alien.y + 15,
      vx: 0,
      vy: ENEMY_BULLET_SPEED + 80,
      radius: 2,
      damage: 1,
      fromEnemy: true,
      color: "#ff6b6b",
    });
    return;
  }

  if (alien.type === "spread") {
    for (const vx of [-60, 0, 60]) {
      state.bullets.push({
        x: alien.x,
        y: alien.y + 15,
        vx,
        vy: ENEMY_BULLET_SPEED,
        radius: 2.5,
        damage: 1,
        fromEnemy: true,
        color: "#ff8fab",
      });
    }
    return;
  }

  state.bullets.push({
    x: alien.x,
    y: alien.y + 15,
    vx: 0,
    vy: ENEMY_BULLET_SPEED,
    radius: 3,
    damage: 1,
    fromEnemy: true,
    color: "#ff9f43",
  });
}

function startRun(state: GameState): void {
  const fresh = makeInitialState();
  state.status = "playing";
  state.score = fresh.score;
  state.wave = fresh.wave;
  state.coreX = fresh.coreX;
  state.coreY = fresh.coreY;
  state.coreHp = fresh.coreHp;
  state.coreFireCooldown = fresh.coreFireCooldown;
  state.parts = fresh.parts;
  state.bullets = fresh.bullets;
  state.aliens = fresh.aliens;
  state.drops = fresh.drops;
  state.nextId = fresh.nextId;
  spawnWave(state);
}

function drawGame(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.fillStyle = "#06080f";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (let i = 0; i < 90; i += 1) {
    const x = (i * 61) % WIDTH;
    const y = (i * 97 + state.wave * 13) % HEIGHT;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  ctx.fillStyle = "#c7d2fe";
  ctx.font = "16px Arial";
  ctx.fillText(`Score ${state.score}`, 18, 26);
  ctx.fillText(`Wave ${state.wave}`, 18, 48);
  ctx.fillText(`Parts ${state.parts.length}`, 18, 70);

  const legendX = WIDTH - 245;
  ctx.font = "13px Arial";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("Alien => Part drop", legendX, 24);
  const legend: WeaponType[] = ["blaster", "laser", "spread"];
  legend.forEach((type, i) => {
    const y = 44 + i * 20;
    ctx.fillStyle = weaponColor(type);
    ctx.fillRect(legendX, y - 9, 10, 10);
    ctx.fillStyle = "#dbeafe";
    ctx.fillText(weaponName(type), legendX + 16, y);
  });

  for (const alien of state.aliens) {
    ctx.fillStyle = weaponColor(alien.type);
    ctx.fillRect(alien.x - 13, alien.y - 11, 26, 22);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(alien.x - 8, alien.y - 4, 4, 4);
    ctx.fillRect(alien.x + 4, alien.y - 4, 4, 4);
  }

  for (const drop of state.drops) {
    ctx.fillStyle = weaponColor(drop.type);
    ctx.fillRect(drop.x - 8, drop.y - 8, 16, 16);
    ctx.strokeStyle = "#ffffff";
    ctx.strokeRect(drop.x - 8, drop.y - 8, 16, 16);
  }

  for (const part of state.parts) {
    const pos = getPartWorldPosition(state, part);
    ctx.fillStyle = weaponColor(part.type);
    ctx.fillRect(pos.x - PART_SIZE / 2, pos.y - PART_SIZE / 2, PART_SIZE, PART_SIZE);

    const hpRatio = part.hp / part.maxHp;
    ctx.fillStyle = "rgba(15,23,42,0.8)";
    ctx.fillRect(pos.x - PART_SIZE / 2, pos.y + PART_SIZE / 2 + 3, PART_SIZE, 4);
    ctx.fillStyle = "#22d3ee";
    ctx.fillRect(pos.x - PART_SIZE / 2, pos.y + PART_SIZE / 2 + 3, PART_SIZE * hpRatio, 4);
  }

  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(state.coreX - CORE_SIZE / 2, state.coreY - CORE_SIZE / 2, CORE_SIZE, CORE_SIZE);
  ctx.fillStyle = "#111827";
  ctx.fillRect(state.coreX - 5, state.coreY - 5, 10, 10);

  for (const b of state.bullets) {
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  if (state.status !== "playing") {
    ctx.fillStyle = "rgba(0,0,0,0.62)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "#f8fafc";
    ctx.textAlign = "center";
    ctx.font = "30px Arial";
    ctx.fillText("Build-Your-Ship Invaders", WIDTH / 2, HEIGHT / 2 - 58);

    ctx.font = "18px Arial";
    if (state.status === "start") {
      ctx.fillText("Move with A/D or Arrow keys. Hold Space to fire.", WIDTH / 2, HEIGHT / 2 - 8);
      ctx.fillText("Catch dropped parts to expand your ship and gain new weapons.", WIDTH / 2, HEIGHT / 2 + 20);
      ctx.fillText("Press Enter to start", WIDTH / 2, HEIGHT / 2 + 60);
    } else {
      ctx.fillText("Core destroyed. Run lost.", WIDTH / 2, HEIGHT / 2 - 8);
      ctx.fillText(`Final score: ${state.score}`, WIDTH / 2, HEIGHT / 2 + 20);
      ctx.fillText("Press Enter to restart from scratch", WIDTH / 2, HEIGHT / 2 + 60);
    }
    ctx.textAlign = "start";
  }
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState>(makeInitialState());
  const keysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const keyState = keysRef.current;

    const onDown = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "a", "d", " ", "Enter"].includes(e.key)) e.preventDefault();
      keyState.add(e.key.toLowerCase());
      if (e.key === " ") keyState.add("space");
      if (e.key === "Enter") {
        const state = gameRef.current;
        if (state.status !== "playing") startRun(state);
      }
    };

    const onUp = (e: KeyboardEvent) => {
      keyState.delete(e.key.toLowerCase());
      if (e.key === " ") keyState.delete("space");
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);

    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    let last = performance.now();
    let raf = 0;

    const loop = (t: number) => {
      const dt = clamp((t - last) / 1000, 0, MAX_DELTA_TIME);
      last = t;

      const state = gameRef.current;
      const keys = keyState;
      if (state.status === "playing") {
        const left = keys.has("arrowleft") || keys.has("a");
        const right = keys.has("arrowright") || keys.has("d");

        if (left) state.coreX -= SHIP_SPEED * dt;
        if (right) state.coreX += SHIP_SPEED * dt;

        const shipMinX = CORE_SIZE;
        const shipMaxX = WIDTH - CORE_SIZE;
        state.coreX = clamp(state.coreX, shipMinX, shipMaxX);

        state.coreFireCooldown -= dt;
        if (keys.has("space") && state.coreFireCooldown <= 0) {
          addPlayerBullet(state, state.coreX, state.coreY - CORE_SIZE / 2, "core");
          state.coreFireCooldown = CORE_FIRE_COOLDOWN;
        }

        for (const part of state.parts) {
          part.fireCooldown -= dt;
          if (part.fireCooldown <= 0) {
            const p = getPartWorldPosition(state, part);
            addPlayerBullet(state, p.x, p.y - PART_SIZE / 2, part.type);
            part.fireCooldown =
              part.type === "laser"
                ? LASER_PART_COOLDOWN
                : part.type === "spread"
                  ? SPREAD_PART_COOLDOWN
                  : BLASTER_PART_COOLDOWN;
          }
        }

        const waveSpeed = ALIEN_SPEED_BASE + state.wave * 4.5;
        for (const alien of state.aliens) {
          alien.y += waveSpeed * dt;
          alien.x += Math.sin((alien.id + t / 200) * 0.8) * 20 * dt;
          alien.fireCooldown -= dt;
          if (alien.fireCooldown <= 0) {
            alienShoot(state, alien);
            alien.fireCooldown =
              alien.type === "laser"
                ? LASER_ALIEN_COOLDOWN
                : alien.type === "spread"
                  ? SPREAD_ALIEN_COOLDOWN
                  : BLASTER_ALIEN_COOLDOWN;
          }
          if (alien.y > HEIGHT - 70) {
            state.status = "gameover";
          }
        }

        state.bullets = state.bullets.filter((b) => {
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          return b.x > -20 && b.x < WIDTH + 20 && b.y > -20 && b.y < HEIGHT + 20;
        });

        for (const drop of state.drops) {
          drop.y += drop.vy * dt;
        }

        const nextBullets: Bullet[] = [];
        const nextAliens = [...state.aliens];

        for (const b of state.bullets) {
          let consumed = false;

          if (!b.fromEnemy) {
            for (let i = 0; i < nextAliens.length; i += 1) {
              const a = nextAliens[i];
              if (rectHit(b.x - b.radius, b.y - b.radius, b.radius * 2, b.radius * 2, a.x - 13, a.y - 11, 26, 22)) {
                a.hp -= b.damage;
                consumed = true;
                if (a.hp <= 0) {
                  state.score += 100;
                  if (Math.random() < DROP_RATE_PROBABILITY) {
                    state.drops.push({
                      id: state.nextId++,
                      x: a.x,
                      y: a.y,
                      vy: DROP_SPEED,
                      type: a.type,
                    });
                  }
                  nextAliens.splice(i, 1);
                }
                break;
              }
            }
          } else {
            for (const part of state.parts) {
              const pos = getPartWorldPosition(state, part);
              if (rectHit(b.x - b.radius, b.y - b.radius, b.radius * 2, b.radius * 2, pos.x - PART_SIZE / 2, pos.y - PART_SIZE / 2, PART_SIZE, PART_SIZE)) {
                part.hp -= b.damage;
                consumed = true;
                break;
              }
            }

            if (!consumed) {
              if (
                rectHit(
                  b.x - b.radius,
                  b.y - b.radius,
                  b.radius * 2,
                  b.radius * 2,
                  state.coreX - CORE_SIZE / 2,
                  state.coreY - CORE_SIZE / 2,
                  CORE_SIZE,
                  CORE_SIZE,
                )
              ) {
                state.coreHp -= b.damage;
                consumed = true;
                if (state.coreHp <= 0) state.status = "gameover";
              }
            }
          }

          if (!consumed) nextBullets.push(b);
        }

        state.aliens = nextAliens;
        state.bullets = nextBullets;
        state.parts = state.parts.filter((p) => p.hp > 0);

        state.drops = state.drops.filter((drop) => {
          const coreCatch = rectHit(
            drop.x - 9,
            drop.y - 9,
            18,
            18,
            state.coreX - CORE_SIZE / 2,
            state.coreY - CORE_SIZE / 2,
            CORE_SIZE,
            CORE_SIZE,
          );

          let partCatch = false;
          for (const part of state.parts) {
            const pos = getPartWorldPosition(state, part);
            if (rectHit(drop.x - 9, drop.y - 9, 18, 18, pos.x - PART_SIZE / 2, pos.y - PART_SIZE / 2, PART_SIZE, PART_SIZE)) {
              partCatch = true;
              break;
            }
          }

          if (coreCatch || partCatch) {
            attachDropToShip(state, drop);
            return false;
          }

          return drop.y < HEIGHT + 20;
        });

        if (state.aliens.length === 0) spawnWave(state);
      }

      drawGame(ctx, state);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      keyState.clear();
    };
  }, []);

  return (
    <main className="game-shell">
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        className="game-canvas"
        aria-label="Build-Your-Ship Invaders game"
      />
    </main>
  );
}
