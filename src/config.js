// ─────────────────────────────────────────────────────────────────────────────
//  src/config.js — Central game-balance configuration
//  Edit any value here to instantly tweak game feel.
//  All numbers are in SI units (pixels, seconds, pixels/second, etc.)
// ─────────────────────────────────────────────────────────────────────────────

export const CFG = {

  // ── Persistence ────────────────────────────────────────────────────────────
  STORAGE_KEY: 'turret-survivors-upgrades-v1',

  // ── Crystal drops ──────────────────────────────────────────────────────────
  CRYSTAL_THRESHOLD:      6,     // crystals needed to open the upgrade menu
  CRYSTAL_DROP_CHANCE:    1.0,   // 1.0 = guaranteed drop every kill
  CRYSTAL_VALUE_MIN:      1,     // minimum crystals per drop (triangular dist)
  CRYSTAL_VALUE_MAX:      3,     // maximum crystals per drop
  CRYSTAL_SPEED_MIN:      272,   // fall speed px/s (min)  — 1.7× original
  CRYSTAL_SPEED_MAX:      374,   // fall speed px/s (max)  — 1.7× original
  CRYSTAL_SPREAD_X:       44,    // ± horizontal scatter around kill point (px)
  CRYSTAL_SPREAD_Y:       22,    // ± vertical   scatter around kill point (px)
  CRYSTAL_MAGNET_PULL:    1.8,   // x-snap factor per second when magnet active
  CRYSTAL_MAGNET_ACCEL:   70,    // vy acceleration px/s² with magnet
  CRYSTAL_MAGNET_MAX_VY:  190,   // max fall speed px/s with magnet
  CRYSTAL_PICKUP_RADIUS:  12,    // collection hitbox half-size (px)

  // ── Coin drops ─────────────────────────────────────────────────────────────
  COIN_DROP_CHANCE:   0.3,   // probability a coin drops per kill
  COIN_SPEED_MIN:     493,   // fall speed px/s (min)  — 1.7× original
  COIN_SPEED_MAX:     646,   // fall speed px/s (max)  — 1.7× original
  COIN_SPREAD_X:      24,    // ± horizontal scatter (px)
  COIN_VALUE:         2,     // bonus money awarded on pickup
  COIN_RADIUS:        9,     // visual + hitbox radius (px)
  COIN_PICKUP_RADIUS: 10,    // collection hitbox half-size (px)

  // ── Turret ─────────────────────────────────────────────────────────────────
  TURRET_BASE_SPEED:        700,   // px/s horizontal movement
  TURRET_ACCEL_RATE:        14,    // acceleration factor toward target
  TURRET_DECEL_RATE:        20,    // deceleration factor when no input
  TURRET_WIDTH:             60,    // px
  TURRET_HEIGHT:            28,    // px
  TURRET_BARREL_W:          10,    // barrel width px
  TURRET_BARREL_H:          26,    // barrel height px
  TURRET_MAX_HP:            100,   // turret hit points
  TURRET_HP_PER_HIT:        25,    // damage when enemy body contacts turret
  TURRET_HP_REGEN_RATE:     5,     // HP/s regained after regen delay
  TURRET_HP_REGEN_DELAY:    2.5,   // seconds of no hits before regen kicks in

  // ── Bullets ────────────────────────────────────────────────────────────────
  BULLET_BASE_FIRE_RATE:    2.0,   // shots per second at base level
  BULLET_FIRE_RATE_PER_LVL: 0.5,   // +shots/s per fireRate upgrade level
  BULLET_BASE_DAMAGE:       34,    // damage per bullet at base level
  BULLET_DAMAGE_PER_LVL:    17,    // +damage per bulletDmg upgrade level
  BULLET_SPEED:             700,   // px/s upward
  BULLET_RADIUS:            5,     // px
  BULLET_PIERCE_BASE:       0,     // how many extra enemies bullet passes through (perm upgrade)
  BULLET_PIERCE_PER_LVL:    1,     // +1 pierce per in-run pierce upgrade level

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
  ENEMY_SPAWN_MARGIN:         28,     // px kept from each edge for top spawns
  ENEMY_BREACH_DECEL:         220,    // px/s² deceleration after crossing breach line
  ENEMY_CASTLE_DAMAGE:        20,     // HP removed from castle per enemy explosion
  ENEMY_BASE_HP:              50,     // base hit points for a normal enemy
  ENEMY_HP_TIME_SCALE:        0.5,    // +HP per second of play time
  ENEMY_HP_TIME_CAP:          80,     // max HP bonus from time scaling

  // ── Elite enemy ────────────────────────────────────────────────────────────
  ELITE_SPAWN_CHANCE:         0.15,   // probability any new spawn is an elite
  ELITE_HP_MULT:              3.5,    // HP multiplier vs normal enemy
  ELITE_SPEED_MULT:           0.65,   // speed multiplier (elites move slower)
  ELITE_RADIUS_MULT:          1.45,   // size multiplier
  ELITE_CASTLE_DAMAGE_MULT:   2.0,    // extra castle damage when elite breaches
  ELITE_COIN_MIN:             1,      // elite always drops at least this many coins
  ELITE_COIN_CHANCE_2ND:     0.55,   // chance of a 2nd coin drop
  ELITE_COIN_CHANCE_3RD:     0.25,   // chance of a 3rd coin drop

  // ── Castle ─────────────────────────────────────────────────────────────────
  CASTLE_MAX_HP:  300,
  CASTLE_H:       60,   // height of the castle body at the very bottom (px)
  CASTLE_BATT_H:  16,   // crenellation height above the castle body (px)

  // ── Permanent upgrade shop ─────────────────────────────────────────────────
  COST_SCALE_FACTOR:        1.65,
  COST_BASE_FIRE_RATE:      8,
  COST_BASE_BULLET_DMG:     10,
  COST_BASE_PIERCE:         15,

  // ── In-run upgrade stacking ────────────────────────────────────────────────
  SHIELD_STACKS_PER_PICK:   3,    // shield charges added per shield pickup
  DOUBLE_GEMS_CHANCE:       0.5,  // probability of +1 bonus crystal when doubleGems active
}
