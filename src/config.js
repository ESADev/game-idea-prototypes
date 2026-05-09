// ─────────────────────────────────────────────────────────────────────────────
//  src/config.js — Central game-balance configuration
//  Edit any value here to instantly tweak game feel.
//  All numbers are in SI units (pixels, seconds, pixels/second, etc.)
// ─────────────────────────────────────────────────────────────────────────────

export const CFG = {

  // ── Persistence ────────────────────────────────────────────────────────────
  STORAGE_KEY: 'turret-survivors-upgrades-v1',
  BEST_SCORE_KEY: 'turret-survivors-best-score-v1',

  // ── Best Score Animation ───────────────────────────────────────────────────
  ANIM_RECORD_INTENSITY:        1.0,  // GLOBAL MULTIPLIER (0.0 - 5.0+)
  ANIM_RECORD_PULSE_FREQ:       6.0,  // frequency of scale/glow pulse (rad/s)
  ANIM_RECORD_GLOW_MAX:         35,   // max shadowBlur for new record text
  ANIM_RECORD_SCALE_AMP:        0.12, // max scale deviation (1.0 ± this)
  ANIM_RECORD_SCREEN_FADE_FREQ: 2.5,  // frequency of background tint pulse
  ANIM_RECORD_SCREEN_FADE_MIN:  0.4,  // min alpha for background overlay
  ANIM_RECORD_SCREEN_FADE_MAX:  0.8,  // max alpha for background overlay

  // ── Game loop ──────────────────────────────────────────────────────────────
  LOOP_DT_CAP: 0.033,   // max frame delta-time (s) — caps spiral-of-death after tab switch

  // ── Crystal drops ──────────────────────────────────────────────────────────
  CRYSTAL_BASE_COST:      5,     // crystals needed for the very first in-run upgrade
  CRYSTAL_COST_MULT:      1.55,  // each upgrade makes the next one cost ×this much
                                  // NOTE: crystal income also scales ×5 with spawn rate, so this
                                  // curve stays balanced — ~5 upgrades per minute at target pace
  CRYSTAL_DROP_CHANCE:    1.0,   // 1.0 = guaranteed drop every kill
  CRYSTAL_VALUE_MIN:      1,     // minimum crystals per drop (triangular dist)
  CRYSTAL_VALUE_MAX:      3,     // maximum crystals per drop
  CRYSTAL_SPEED_MIN:      272,   // fall speed px/s (min)
  CRYSTAL_SPEED_MAX:      374,   // fall speed px/s (max)
  CRYSTAL_SPREAD_X:       44,    // ± horizontal scatter around kill point (px)
  CRYSTAL_SPREAD_Y:       22,    // ± vertical   scatter around kill point (px)
  CRYSTAL_MAGNET_PULL:    1.8,   // x-snap factor per second when magnet active
  CRYSTAL_MAGNET_ACCEL:   70,    // vy acceleration px/s² with magnet
  CRYSTAL_MAGNET_MAX_VY:  190,   // max fall speed px/s with magnet
  CRYSTAL_PICKUP_RADIUS:  12,    // collection hitbox half-size (px)
  CRYSTAL_PICKUP_MARGIN:  4,     // extra overlap margin when checking turret contact (px)
  CRYSTAL_VISUAL_HALF_H:  9,     // half-height of the diamond crystal sprite (px)
  CRYSTAL_VISUAL_HALF_W:  7,     // half-width  of the diamond crystal sprite (px)

  // ── Crystal bar UI ─────────────────────────────────────────────────────────
  CRYSTAL_BAR_H:                  14,   // height of crystal progress bar (px)
  CRYSTAL_BAR_Y:                  3,    // top-of-canvas y offset (px)
  CRYSTAL_BAR_MARGIN:             4,    // left/right canvas margin (px)
  CRYSTAL_BAR_TICK_MAX_COST:      15,   // only draw segment ticks when next cost ≤ this
  CRYSTAL_BAR_PULSE_THRESHOLD:    0.8,  // fill fraction at which bar starts glowing
  CRYSTAL_BAR_PULSE_FREQ:         10,   // glow oscillation frequency (rad/s)
  CRYSTAL_BAR_PULSE_SHADOW_BASE:  8,    // base shadowBlur when pulsing
  CRYSTAL_BAR_PULSE_SHADOW_AMP:   5,    // amplitude added to shadowBlur

  // ── Coin drops ─────────────────────────────────────────────────────────────
  COIN_DROP_CHANCE:        0.3,   // probability a coin drops per normal kill
  COIN_SPEED_MIN:          493,   // fall speed px/s (min)
  COIN_SPEED_MAX:          646,   // fall speed px/s (max)
  COIN_SPREAD_X:           24,    // ± horizontal scatter for normal enemies (px)
  COIN_ELITE_SPREAD_MULT:  1.5,   // scatter multiplier for elite enemy coin drops
  COIN_VALUE:              2,     // bonus money awarded on pickup
  COIN_RADIUS:             9,     // visual + hitbox radius (px)
  COIN_PICKUP_RADIUS:      10,    // collection hitbox half-size (px)
  COIN_PICKUP_MARGIN:      4,     // extra overlap margin when checking turret contact (px)

  // ── Ammo system ────────────────────────────────────────────────────────────
  AMMO_MAX_BASE:              35,   // base maximum ammo before any upgrade
  AMMO_COST_PER_VOLLEY:       1,    // ammo consumed per fireBullets() call
  AMMO_REGEN_RATE:            15,   // ammo per second regenerated when not holding fire
  AMMO_REGEN_DELAY:           0.6,  // seconds after releasing fire before regen begins
  AMMO_CAPACITY_PER_UPGRADE:  25,   // +max ammo per ammoCapacity in-run upgrade level
  AMMO_LOW_THRESHOLD:         0.25, // below this fill fraction the bar pulses red

  // ── Ammo bar UI ────────────────────────────────────────────────────────────
  AMMO_BAR_H:                   14,  // height of ammo bar (px)
  AMMO_BAR_TOP_MARGIN:          2,   // gap between crystal bar and ammo bar (px)
  AMMO_BAR_PULSE_FREQ:          14,  // glow oscillation frequency when low (rad/s)
  AMMO_BAR_PULSE_SHADOW_BASE:   8,   // base shadowBlur when ammo bar is pulsing
  AMMO_BAR_PULSE_SHADOW_AMP:    5,   // amplitude added to shadowBlur during low-ammo pulse

  // ── Bullet spread (multi-barrel) ───────────────────────────────────────────
  BULLET_SPREAD_PX:         15,  // px gap between adjacent bullets in a volley
  BULLET_SIDE_ANGLE_DEG:    10,  // degrees of outward angle per step away from center barrel

  // ── Turret ─────────────────────────────────────────────────────────────────
  TURRET_BASE_SPEED:         700,  // px/s horizontal movement at full steering input
  TURRET_ACCEL_RATE:         14,   // acceleration factor toward target speed
  TURRET_DECEL_RATE:         20,   // deceleration factor when no steering input
  TURRET_STEER_DEADZONE:     2,    // ignore pointer if |diff| ≤ this (px)
  TURRET_SNAP_MARGIN:        1,    // snap turret to pointer if within this distance (px)
  TURRET_WIDTH:              60,   // body width  (px)
  TURRET_HEIGHT:             28,   // body height (px)
  TURRET_BARREL_W:           10,   // barrel width  (px)
  TURRET_BARREL_H:           26,   // barrel height (px)
  TURRET_BARREL_SHADOW_BLUR: 8,    // shadowBlur on barrel glow
  TURRET_MAX_HP:             100,  // turret hit points
  TURRET_HP_PER_HIT:         15,   // damage when enemy body contacts turret (reduced for survivability)
  TURRET_HP_REGEN_RATE:      5,    // HP/s regained after regen delay
  TURRET_HP_REGEN_DELAY:     2.5,  // seconds of no hits before regen kicks in

  // ── Turret visual ──────────────────────────────────────────────────────────
  TURRET_HP_BAR_EXTRA_W:      12,  // extra width beyond body on each side for HP bar (px)
  TURRET_HP_BAR_Y_GAP:        5,   // gap between turret body bottom and HP bar top (px)
  TURRET_HP_BAR_H:            8,   // height of the turret HP bar (px)
  TURRET_SHIELD_INSET:        6,   // px the shield border extends beyond turret body edges
  TURRET_SHIELD_LINE_W:       3,   // stroke width of shield border (px)
  TURRET_SHIELD_SHADOW_BLUR:  14,  // shadowBlur for shield glow effect
  TURRET_ACCENT_STRIPE_H:     4,   // height of accent color stripe at bottom of body (px)
  TURRET_SHIELD_FONT:         11,  // font size for shield stack count label (px)

  // ── Bullets ────────────────────────────────────────────────────────────────
  BULLET_BASE_FIRE_RATE:    3,  // shots per second at base level
  BULLET_FIRE_RATE_MULT:    1.15, // multiplicative increase per level (~15%)
  BULLET_BASE_DAMAGE:       45,   // damage per bullet at base level
  BULLET_DAMAGE_MULT:       1.20, // multiplicative increase per level (~15%)
  BULLET_SPEED:             700,  // px/s upward
  BULLET_RADIUS:            5,    // collision and draw radius (px)
  BULLET_SHADOW_BLUR:       10,   // shadowBlur on bullet glow
  BULLET_PIERCE_BASE:       0,    // extra enemies a bullet passes through (base)
  BULLET_PIERCE_PER_LVL:    1,    // +1 pierce per in-run pierce upgrade level

  // ── Explosions ─────────────────────────────────────────────────────────────
  EXPLOSION_INIT_R:              4,    // starting radius of an explosion (px)
  EXPLOSION_MAX_AGE:             0.55, // seconds an explosion lasts
  EXPLOSION_HIT_BULLET_MAXR:    18,   // max radius for bullet-on-enemy hit explosion (px)
  EXPLOSION_HIT_TURRET_MAXR:    32,   // max radius for enemy-turret contact explosion (px)
  EXPLOSION_HIT_SHIELD_MAXR:    28,   // max radius for shield absorption explosion (px)
  EXPLOSION_BREACH_NORMAL_MAXR: 52,   // max radius for normal enemy breach (px)
  EXPLOSION_BREACH_ELITE_MAXR:  72,   // max radius for elite breach (px)

  // ── Enemy (base) ───────────────────────────────────────────────────────────
  // ★ All time-scale values are tuned for 5× faster progression than original.
  // Balance formula: PlayerDPS(upgrades) / (EnemyHP(t) × spawnRate(t)) ≈ const
  // Crystal income ∝ spawnRate, upgrade count ∝ log(crystals), so balance holds.
  ENEMY_SPAWN_INTERVAL_START:  1.5,    // seconds between spawns at game start (gentler opening)
  ENEMY_SPAWN_RATE_RAMP:       0.005,  // interval reduction per second
  ENEMY_SPAWN_INTERVAL_MIN:    0.05,   // hard floor — still reaches high density but not instant
  ENEMY_MAX_COUNT:             600,    // max simultaneous enemies (raised for horde effect)
  ENEMY_BASE_RADIUS:           21,     // base radius (px)
  ENEMY_RADIUS_VARIANCE:       6,      // ± random radius variation (px)
  ENEMY_BASE_SPEED:            25,     // base movement speed (px/s) — reduced for survivability
  ENEMY_SPEED_VARIANCE:        20,     // random speed addition per enemy (px/s)
  ENEMY_SPEED_TIME_SCALE:      1.8,    // px/s additive bonus per second (tamed — was 5.0)
  ENEMY_SPEED_TIME_CAP:        90,     // max additive speed bonus
  ENEMY_TOP_SPAWN_CHANCE:      0.65,   // fraction spawning from top edge
  ENEMY_LEFT_SPAWN_CHANCE:     0.82,   // cumulative fraction for left-side spawn
  ENEMY_SIDE_Y_FRACTION:       0.55,   // side enemies spawn in top this fraction of canvas
  ENEMY_SPAWN_MARGIN:          28,     // px kept from each side edge for top spawns
  ENEMY_BREACH_DECEL:          220,    // px/s² deceleration after breach line
  ENEMY_CASTLE_DAMAGE:         15,     // HP removed from castle per normal enemy explosion
  ENEMY_BASE_HP:               20,     // base hit points for a normal enemy (reduced for early kills)
  ENEMY_HP_TIME_SCALE:         0.5,    // +HP per second of play time (gentler curve)
  ENEMY_HP_TIME_CAP:           1000,    // max HP bonus from time scaling
  ENEMY_BREACH_EXPLOSION_MARGIN: 5,    // px above castle floor for breach explosion

  // ── Global speed multiplier ramp ───────────────────────────────────────────
  // On top of additive bonus; creates late-game escalation
  ENEMY_SPEED_MULT_START:      1.25,   // multiplier at t=0
  ENEMY_SPEED_MULT_MAX:        2.5,   // maximum multiplier (reduced ceiling)
  ENEMY_SPEED_MULT_RAMP_TIME:  1200,   // seconds to reach max — 5 min (gives player time to upgrade)

  // ── Enemy visual ───────────────────────────────────────────────────────────
  ENEMY_HP_BAR_H:   4,  // height of HP bar above enemy (px)
  ENEMY_HP_BAR_GAP: 2,  // gap between enemy top and HP bar (px)

  // ── Elite enemy ────────────────────────────────────────────────────────────
  ELITE_SPAWN_CHANCE:        0.15,
  ELITE_HP_MULT:             3.5,
  ELITE_SPEED_MULT:          0.65,
  ELITE_RADIUS_MULT:         1.45,
  ELITE_CASTLE_DAMAGE_MULT:  2.0,
  ELITE_COIN_MIN:            1,
  ELITE_COIN_CHANCE_2ND:     0.55,
  ELITE_COIN_CHANCE_3RD:     0.25,

  // ── Sprinter enemy ─────────────────────────────────────────────────────────
  // Rare, low-HP enemy that periodically bursts to 3× speed. Stresses multi-bullet upgrades.
  SPRINTER_SPAWN_CHANCE:      0.07,  // probability (of non-elite spawns) that enemy is a sprinter
  SPRINTER_HP_MULT:           0.55,  // HP multiplier vs normal enemy (fragile)
  SPRINTER_SPEED_MULT:        1.1,   // base speed multiplier (slightly faster baseline)
  SPRINTER_SPRINT_SPEED_MULT: 3.2,   // speed multiplier during a sprint burst
  SPRINTER_SPRINT_DURATION:   0.7,   // seconds of sprint burst
  SPRINTER_REST_DURATION:     2.2,   // seconds between sprint bursts

  // ── Enemy tier upgrades ────────────────────────────────────────────────────
  // Periodic enemy strengthening at t = 240 + 180k seconds (4:00, 7:00, 10:00 …)
  // Player should feel challenged but barely survive initial tier; feel strong before next tier.
  // HP×(1 + tier×0.40) and speed×(1 + tier×0.20) on top of time scaling.
  TIER_FIRST_TIME:         180,   // first tier upgrade at 4:00 (seconds)
  TIER_PERIOD:             180,   // tier upgrades every 3 min after that
  TIER_HP_MULT_PER_TIER:   0.40,  // +40% HP per tier level (additive multiplier delta)
  TIER_SPEED_MULT_PER_TIER: 0.20, // +20% speed per tier level

  // ── Boss system ────────────────────────────────────────────────────────────
  // Two mechanics: (1) phase-2 shield at 50% HP, (2) periodic charge dash.
  BOSS_FIRST_TIME:          60,   // first boss at 2:00 (seconds)
  BOSS_PERIOD:              180,   // new boss every 3 min (2, 5, 8...)
  BOSS_RADIUS:               48,   // boss circle radius (px)
  BOSS_HP_BASE:             1000,  // HP of the first boss
  BOSS_HP_PER_WAVE:          600,  // additional HP per subsequent boss
  BOSS_DESCENT_SPEED:        80,   // px/s downward while descending to hover height
  BOSS_HOVER_OFFSET:        130,   // px above turret to hover (from turret top edge)
  BOSS_TRACK_SPEED:          45,   // px/s horizontal tracking of turret (slow menace)
  BOSS_CHARGE_INTERVAL_INIT: 5.0,  // seconds until first charge (gives descent time)
  BOSS_CHARGE_INTERVAL:      4.5,  // seconds between subsequent charges
  BOSS_CHARGE_SPEED:         320,  // px/s horizontal charge speed
  BOSS_ENRAGE_TIME:          30,   // seconds after which boss enrages (gets faster)
  BOSS_ENRAGE_TRACK_MULT:    3.5,  // tracking speed multiplier when enraged
  BOSS_SHIELD_DURATION:      2.5,  // seconds of phase-2 invulnerability
  BOSS_TURRET_DAMAGE:        40,   // HP removed from turret on boss contact
  BOSS_CRYSTAL_DROP:         14,   // crystals dropped on boss death
  BOSS_COIN_DROP_MIN:         3,   // minimum coins on boss death
  BOSS_COIN_CHANCE_EXTRA_1:  0.8,  // chance of 4th coin
  BOSS_COIN_CHANCE_EXTRA_2:  0.5,  // chance of 5th coin
  BOSS_MONEY_REWARD:          8,   // flat money bonus on boss death

  // ── Horde system ───────────────────────────────────────────────────────────
  // Flood of enemies for a fixed duration; spawn interval overrides normal rate.
  HORDE_FIRST_TIME:      120,   // first horde at 3:00 (seconds)
  HORDE_PERIOD:          180,   // horde every 3 min (3, 6, 9...)
  HORDE_DURATION:         30,   // seconds the horde lasts (prolonged)
  HORDE_SPAWN_INTERVAL:  0.25,  // enemy spawn interval during horde (reduced intensity)

  // ── Developer tools ────────────────────────────────────────────────────────
  DEV_ENABLED:       true,  // show dev button in menu
  DEV_TIMEWARP_MULT: 2.5,   // speed multiplier for timewarp

  // ── Notification overlay ───────────────────────────────────────────────────
  NOTIF_DURATION:  3.2,  // seconds notification stays visible
  NOTIF_FONT:       28,  // font size (px)
  NOTIF_Y_FRAC:    0.38, // canvas-height fraction for notification center

  // ── Castle ─────────────────────────────────────────────────────────────────
  CASTLE_MAX_HP:  300,
  CASTLE_H:       60,
  CASTLE_BATT_H:  16,

  // ── Castle visual ──────────────────────────────────────────────────────────
  CASTLE_GRID_ROWS:          3,
  CASTLE_GRID_ROW_H:         17,
  CASTLE_GRID_ROW_Y:         6,
  CASTLE_GRID_ODD_OFFSET:    26,
  CASTLE_GRID_PERIOD:        52,
  CASTLE_GRID_BLOCK_W:       50,
  CASTLE_GRID_BLOCK_H:       15,
  CASTLE_BATT_W:             28,
  CASTLE_BATT_GAP:           18,
  CASTLE_BATT_X_START:       4,
  CASTLE_TOWER_W:            54,
  CASTLE_TOWER_EXTRA_H:      28,
  CASTLE_TOWER_BATT_W:       12,
  CASTLE_TOWER_BATT_GAP:     8,
  CASTLE_TOWER_BATT_H:       12,
  CASTLE_TOWER_BATT_X_START: 4,
  CASTLE_GATE_W:             60,
  CASTLE_GATE_H:             28,
  CASTLE_HP_BAR_INSET:       12,
  CASTLE_HP_BAR_Y_OFFSET:    6,
  CASTLE_HP_BAR_H:           10,
  CASTLE_HP_LABEL_Y_OFFSET:  26,
  CASTLE_HP_LABEL_FONT:      13,
  CASTLE_WINDOW_W:           10,
  CASTLE_WINDOW_H:           22,
  CASTLE_WINDOW_Y_OFFSET:    14,

  // ── Animation pulse frequencies ────────────────────────────────────────────
  ANIM_CASTLE_HP_PULSE_FREQ:        8,
  ANIM_CASTLE_HP_PULSE_SHADOW_BASE: 10,
  ANIM_CASTLE_HP_PULSE_SHADOW_AMP:  6,
  ANIM_BREACH_PULSE_FREQ:           12,
  ANIM_BREACH_PULSE_BASE:           14,
  ANIM_BREACH_PULSE_AMP:            6,
  ANIM_ELITE_PULSE_FREQ:            6,
  ANIM_ELITE_PULSE_BASE:            10,
  ANIM_ELITE_PULSE_AMP:             4,
  ANIM_SPRINTER_PULSE_FREQ:         16,  // fast glow when sprinting
  ANIM_SPRINTER_PULSE_BASE:         12,
  ANIM_SPRINTER_PULSE_AMP:          8,
  ANIM_BOSS_PULSE_FREQ:             5,
  ANIM_BOSS_PULSE_BASE:             20,
  ANIM_BOSS_PULSE_AMP:              10,

  // ── Breach line & danger zone ──────────────────────────────────────────────
  BREACH_Y_OFFSET:         8,
  BREACH_LINE_W:           2,
  BREACH_LINE_SHADOW_BLUR: 10,
  BREACH_DASH_ON:          14,
  BREACH_DASH_OFF:         7,
  BREACH_LABEL_X:          8,
  BREACH_LABEL_Y:          4,
  BREACH_LABEL_FONT:       11,
  BREACH_DANGER_ALPHA:     0.06,

  // ── Layout ─────────────────────────────────────────────────────────────────
  TURRET_START_Y_OFFSET: 52,

  // ── Canvas border ──────────────────────────────────────────────────────────
  CANVAS_BORDER_W:     2,
  CANVAS_BORDER_INSET: 1,

  // ── Canvas button ──────────────────────────────────────────────────────────
  CANVAS_BTN_SHADOW_BLUR:   14,
  CANVAS_BTN_RADIUS:        10,
  CANVAS_BTN_DEFAULT_FONT:  22,

  // ── Star field ─────────────────────────────────────────────────────────────
  STARS_COUNT: 100,
  STARS_ALPHA: 0.5,

  // ── HUD color thresholds ───────────────────────────────────────────────────
  HUD_HP_LOW: 0.25,
  HUD_HP_MID: 0.50,

  // ── Screen layout — menu ───────────────────────────────────────────────────
  MENU_TITLE_Y_FRAC:    0.20,
  MENU_SUB_Y_FRAC:      0.34,
  MENU_STATS1_Y_FRAC:   0.39,
  MENU_STATS2_Y_FRAC:   0.43,
  MENU_PLAY_Y_FRAC:     0.54,
  MENU_SHOP_Y_FRAC:     0.64,
  MENU_TIP1_Y_FRAC:     0.74,
  MENU_TIP2_Y_FRAC:     0.77,
  MENU_TITLE_LINE_GAP:  62,
  MENU_TITLE_FONT1:     56,
  MENU_TITLE_FONT2:     50,
  MENU_SUB_FONT:        19,
  MENU_STATS_FONT:      16,
  MENU_TIP_FONT:        14,
  MENU_PLAY_BTN_W:      230,
  MENU_PLAY_BTN_H:      66,
  MENU_PLAY_BTN_FONT:   24,
  MENU_SHOP_BTN_W:      230,
  MENU_SHOP_BTN_H:      58,
  MENU_SHOP_BTN_FONT:   20,

  // ── Screen layout — countdown ──────────────────────────────────────────────
  COUNTDOWN_TIMER_START:    3.99,
  COUNTDOWN_TIP_Y_FRAC:     0.24,
  COUNTDOWN_TIP2_Y_FRAC:    0.29,
  COUNTDOWN_TIP3_Y_FRAC:    0.33,
  COUNTDOWN_TIP4_Y_FRAC:    0.36,
  COUNTDOWN_NUM_Y_FRAC:     0.52,
  COUNTDOWN_NUM_FONT:       110,
  COUNTDOWN_SCALE_AMP:      0.55,
  COUNTDOWN_SHADOW_BLUR:    44,
  COUNTDOWN_HEADER_FONT:    22,
  COUNTDOWN_TIP_FONT:       17,

  // ── Screen layout — end ────────────────────────────────────────────────────
  END_OVERLAY_ALPHA:  0.55,
  END_TITLE_Y_FRAC:   0.33,
  END_KILLS_Y_FRAC:   0.42,
  END_MONEY_Y_FRAC:   0.48,
  END_BTN_Y_FRAC:     0.60,
  END_TITLE_FONT:     52,
  END_STATS_FONT:     26,
  END_SHADOW_BLUR:    28,
  END_BTN_W:          190,
  END_BTN_H:          60,
  END_BTN_FONT:       20,
  END_BTN_X_OFFSET:   108,

  // ── Permanent upgrade shop ─────────────────────────────────────────────────
  COST_SCALE_FACTOR:      2,
  COST_BASE_FIRE_RATE:    64,
  COST_BASE_BULLET_DMG:   80,
  COST_BASE_PIERCE:       120,
  COST_BASE_BULLET_COUNT: 120,

  // ── Rarity Colors ──────────────────────────────────────────────────────────
  RARITY_COMMON_HUE:    210,  // 
  RARITY_RARE_HUE:      300,  // 
  RARITY_COMMON_SAT:    70,   // % (Muted for common)
  RARITY_RARE_SAT:      95,   // % (Vibrant for rare)
  RARITY_COMMON_LIGHT:  25,   // % (Dark for common)
  RARITY_RARE_LIGHT:    35,   // % (Brighter for rare)

  // ── In-run upgrade weights (relative probability) ──────────────────────────
  WEIGHT_FIRE_RATE:     10,
  WEIGHT_BULLET_DMG:    10,
  WEIGHT_PIERCE:        6,
  WEIGHT_SHIELD:        8,
  WEIGHT_MAGNET:        3,
  WEIGHT_DOUBLE_GEMS:   4,
  WEIGHT_BULLET_COUNT:  4,
  WEIGHT_AMMO_CAPACITY: 10,

  // ── In-run upgrade stacking ────────────────────────────────────────────────
  SHIELD_STACKS_PER_PICK:  3,
  DOUBLE_GEMS_CHANCE:      0.5,
}
