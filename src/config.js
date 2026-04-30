// ─────────────────────────────────────────────────────────────────────────────
//  src/config.js — Central game-balance configuration
//  Edit any value here to instantly tweak game feel.
//  All numbers are in SI units (pixels, seconds, pixels/second, etc.)
// ─────────────────────────────────────────────────────────────────────────────

export const CFG = {

  // ── Persistence ────────────────────────────────────────────────────────────
  STORAGE_KEY: 'pong-vs-swarm-upgrades-v2',

  // ── Crystal drops ──────────────────────────────────────────────────────────
  CRYSTAL_THRESHOLD:      6,     // crystals needed to open the upgrade menu
  CRYSTAL_DROP_CHANCE:    1.0,   // 1.0 = guaranteed drop every kill (no zero-crystal kills)
  CRYSTAL_VALUE_MIN:      1,     // minimum crystals per drop (triangular dist)
  CRYSTAL_VALUE_MAX:      3,     // maximum crystals per drop
  CRYSTAL_SPEED_MIN:      160,   // fall speed px/s (min)
  CRYSTAL_SPEED_MAX:      220,   // fall speed px/s (max)
  CRYSTAL_SPREAD_X:       44,    // ± horizontal scatter around kill point (px)
  CRYSTAL_SPREAD_Y:       22,    // ± vertical   scatter around kill point (px)
  CRYSTAL_MAGNET_PULL:    4,     // x-snap factor per second when magnet active
  CRYSTAL_MAGNET_ACCEL:   180,   // vy acceleration px/s² with magnet
  CRYSTAL_MAGNET_MAX_VY:  320,   // max fall speed px/s with magnet
  CRYSTAL_PICKUP_RADIUS:  12,    // collection hitbox half-size (px)

  // ── Coin drops ─────────────────────────────────────────────────────────────
  COIN_DROP_CHANCE:   0.3,   // probability a coin drops per kill
  COIN_SPEED_MIN:     290,   // fall speed px/s (min) — faster than crystals
  COIN_SPEED_MAX:     380,   // fall speed px/s (max)
  COIN_SPREAD_X:      24,    // ± horizontal scatter (px)
  COIN_VALUE:         2,     // bonus money awarded on pickup
  COIN_RADIUS:        9,     // visual + hitbox radius (px)
  COIN_PICKUP_RADIUS: 10,    // collection hitbox half-size (px)

  // ── Ball ───────────────────────────────────────────────────────────────────
  BALL_BASE_SPEED:            480,  // px/s  (0.75× of previous 640)
  BALL_RADIUS:                7,    // px
  BALL_RELAUNCH_DELAY:        1.0,  // seconds to wait before a missed ball relaunches
  BALL_MISS_VX_SPREAD:        180,  // ± vx spread on relaunch (actual = random*spread - spread/2)
  BALL_SPEED_BOOST_REFLECT:   1.02, // speed multiplier each time ball hits paddle
  BALL_REFLECT_CURVE:         0.95, // how strongly angle bends at paddle edges
  BALL_REFLECT_VY_CENTER:     0.62, // base vy fraction (center hit)
  BALL_REFLECT_VY_EDGE_BONUS: 0.38, // extra vy for edge → center hits
  BALL_SPREAD_INIT_FACTOR:    0.16, // spread between multiple balls at spawn
  BALL_SPREAD_X_OFFSET:       120,  // x offset multiplier for spread

  // ── Ball speed in-run upgrade ───────────────────────────────────────────────
  BALL_SPEED_PER_LEVEL:  0.15,  // +15% ball speed per ballSpeed upgrade level

  // ── Paddle ─────────────────────────────────────────────────────────────────
  PADDLE_MAX_HP:            100,
  PADDLE_HP_PER_HIT:        25,    // damage when enemy body contacts paddle
  PADDLE_HP_REGEN_RATE:     5,     // HP/s regained after regen delay
  PADDLE_HP_REGEN_DELAY:    2.5,   // seconds of no hits before regen kicks in
  PADDLE_BASE_WIDTH:        160,   // px
  PADDLE_WIDTH_PER_UPGRADE: 22,    // px added per width upgrade level
  PADDLE_HEIGHT:            16,    // px
  PADDLE_BASE_SPEED:        700,   // px/s
  PADDLE_ACCEL_RATE:        14,    // acceleration factor toward target velocity
  PADDLE_DECEL_RATE:        20,    // deceleration factor when no input
  PADDLE_SPEED_PER_LEVEL:   0.2,   // +20% paddle speed per speedBoost upgrade level

  // ── Enemy ──────────────────────────────────────────────────────────────────
  ENEMY_SPAWN_INTERVAL_START: 2.0,    // seconds between spawns at game start
  ENEMY_SPAWN_RATE_RAMP:      0.0014, // interval reduction per second of play
  ENEMY_SPAWN_INTERVAL_MIN:   0.028,  // hard floor for spawn interval (seconds)
  ENEMY_MAX_COUNT:            260,    // maximum simultaneous enemies on screen
  ENEMY_BASE_RADIUS:          21,     // px
  ENEMY_RADIUS_VARIANCE:      6,      // ± random radius variation (px)
  ENEMY_BASE_SPEED:           28,     // px/s
  ENEMY_SPEED_VARIANCE:       26,     // px/s random addition
  ENEMY_SPEED_TIME_SCALE:     1.8,    // px/s added per second of play time
  ENEMY_SPEED_TIME_CAP:       36,     // max px/s bonus from time scaling
  ENEMY_TOP_SPAWN_CHANCE:     0.65,   // fraction that spawn from the top edge
  ENEMY_LEFT_SPAWN_CHANCE:    0.82,   // cumulative fraction for left-side spawn
  ENEMY_SIDE_Y_FRACTION:      0.55,   // side enemies spawn in top X% of height
  ENEMY_BREACH_DECEL:         220,    // px/s² deceleration after crossing breach line
  ENEMY_CASTLE_DAMAGE:        20,     // HP removed from castle per enemy explosion

  // ── Castle ─────────────────────────────────────────────────────────────────
  CASTLE_MAX_HP:  300,
  CASTLE_H:       60,   // height of the castle body at the very bottom (px)
  CASTLE_BATT_H:  16,   // crenellation height above the castle body (px)

  // ── Layout (derived at runtime — see BREACH_Y / PADDLE_START_Y in main.js) ─
  // BREACH_Y      = canvas.height - CASTLE_H - CASTLE_BATT_H - 8   ≈ 516
  // PADDLE_START_Y= canvas.height - CASTLE_H - CASTLE_BATT_H - 62  ≈ 462

  // ── Permanent upgrade shop ─────────────────────────────────────────────────
  COST_SCALE_FACTOR:      1.65,
  COST_BASE_WIDTH:        7,
  COST_BASE_EXTRA_BALLS:  12,
  COST_BASE_PIERCE:       15,

  // ── In-run upgrade stacking ────────────────────────────────────────────────
  SHIELD_STACKS_PER_PICK:   3,    // shield charges added per shield pickup
  DOUBLE_GEMS_CHANCE:       0.5,  // probability of +1 bonus crystal when doubleGems active
  EXTRA_BALL_RUN_VX_SPREAD: 100,  // ± vx spread when extra ball spawns mid-run

  // ── Ball indicator HUD (drawn on canvas, bottom-right) ────────────────────
  BALL_HUD_RADIUS: 9,   // px — radius of each ball icon
  BALL_HUD_GAP:    6,   // px — gap between icons
}
