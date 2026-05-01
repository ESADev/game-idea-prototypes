// ─────────────────────────────────────────────────────────────────────────────
//  src/config.js — Central game-balance configuration
//  Edit any value here to instantly tweak game feel.
//  All numbers are in SI units (pixels, seconds, pixels/second, etc.)
// ─────────────────────────────────────────────────────────────────────────────

export const CFG = {

  // ── Persistence ────────────────────────────────────────────────────────────
  STORAGE_KEY: 'turret-survivors-upgrades-v1',

  // ── Game loop ──────────────────────────────────────────────────────────────
  LOOP_DT_CAP: 0.033,   // max frame delta-time (s) — caps spiral-of-death after tab switch

  // ── Crystal drops ──────────────────────────────────────────────────────────
  CRYSTAL_BASE_COST:      5,     // crystals needed for the very first in-run upgrade
  CRYSTAL_COST_MULT:      1.55,  // each upgrade makes the next one cost ×this much
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
  AMMO_MAX_BASE:              25,   // base maximum ammo before any upgrade
  AMMO_COST_PER_VOLLEY:       1,    // ammo consumed per fireBullets() call (one trigger press)
  AMMO_REGEN_RATE:            10,   // ammo per second regenerated when not actively shooting
  AMMO_REGEN_DELAY:           0.8,  // seconds of no shots fired before regeneration begins
  AMMO_CAPACITY_PER_UPGRADE:  15,   // +max ammo per ammoCapacity in-run upgrade level
  AMMO_LOW_THRESHOLD:         0.25, // below this fill fraction the bar pulses red warning

  // ── Ammo bar UI ────────────────────────────────────────────────────────────
  AMMO_BAR_H:                   14,  // height of ammo bar (px); drawn below crystal bar
  AMMO_BAR_TOP_MARGIN:          2,   // gap between crystal bar bottom and ammo bar top (px)
  AMMO_BAR_PULSE_FREQ:          14,  // glow oscillation frequency when ammo is low (rad/s)
  AMMO_BAR_PULSE_SHADOW_BASE:   8,   // base shadowBlur when ammo bar is pulsing
  AMMO_BAR_PULSE_SHADOW_AMP:    5,   // amplitude added to shadowBlur during low-ammo pulse

  // ── Bullet spread (multi-barrel) ───────────────────────────────────────────
  BULLET_SPREAD_PX:         18,  // px gap between adjacent bullets in a volley
  BULLET_SIDE_ANGLE_DEG:    12,  // degrees of outward angle per step away from center barrel
                                  // e.g. step=1 → 12°, step=2 → 24°; center bullet always 0°

  // ── Turret ─────────────────────────────────────────────────────────────────
  TURRET_BASE_SPEED:        700,  // px/s horizontal movement at full steering input
  TURRET_ACCEL_RATE:        14,   // acceleration factor toward target speed
  TURRET_DECEL_RATE:        20,   // deceleration factor when no steering input
  TURRET_STEER_DEADZONE:    2,    // ignore pointer if |diff| ≤ this (px) prevents jitter
  TURRET_SNAP_MARGIN:       1,    // snap turret to pointer if within this distance (px)
  TURRET_WIDTH:             60,   // body width  (px)
  TURRET_HEIGHT:            28,   // body height (px)
  TURRET_BARREL_W:          10,   // barrel width  (px)
  TURRET_BARREL_H:          26,   // barrel height (px)
  TURRET_BARREL_SHADOW_BLUR: 8,   // shadowBlur on barrel glow
  TURRET_MAX_HP:            100,  // turret hit points
  TURRET_HP_PER_HIT:        25,   // damage when enemy body contacts turret
  TURRET_HP_REGEN_RATE:     5,    // HP/s regained after regen delay
  TURRET_HP_REGEN_DELAY:    2.5,  // seconds of no hits before regen kicks in

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
  BULLET_BASE_FIRE_RATE:    2.0,  // shots per second at base level (fire rate upgrades add to this)
  BULLET_FIRE_RATE_PER_LVL: 0.5,  // +shots/s per fireRate upgrade level
  BULLET_BASE_DAMAGE:       34,   // damage per bullet at base level
  BULLET_DAMAGE_PER_LVL:    17,   // +damage per bulletDmg upgrade level
  BULLET_SPEED:             700,  // px/s upward
  BULLET_RADIUS:            5,    // collision and draw radius (px)
  BULLET_SHADOW_BLUR:       10,   // shadowBlur on bullet glow
  BULLET_PIERCE_BASE:       0,    // extra enemies a bullet passes through (base, before upgrades)
  BULLET_PIERCE_PER_LVL:    1,    // +1 pierce per in-run pierce upgrade level

  // ── Explosions ─────────────────────────────────────────────────────────────
  EXPLOSION_INIT_R:              4,    // starting radius of an explosion (px); grows to maxR
  EXPLOSION_MAX_AGE:             0.55, // seconds an explosion lasts before being removed
  EXPLOSION_HIT_BULLET_MAXR:    18,   // max radius for bullet-on-enemy hit explosion (px)
  EXPLOSION_HIT_TURRET_MAXR:    32,   // max radius for enemy-body-contact-turret explosion (px)
  EXPLOSION_HIT_SHIELD_MAXR:    28,   // max radius for shield absorption explosion (px)
  EXPLOSION_BREACH_NORMAL_MAXR: 52,   // max radius for normal enemy breaching castle (px)
  EXPLOSION_BREACH_ELITE_MAXR:  72,   // max radius for elite  enemy breaching castle (px)

  // ── Enemy ──────────────────────────────────────────────────────────────────
  ENEMY_SPAWN_INTERVAL_START:  2.0,    // seconds between spawns at game start
  ENEMY_SPAWN_RATE_RAMP:       0.0014, // interval reduction per second of play
  ENEMY_SPAWN_INTERVAL_MIN:    0.028,  // hard floor for spawn interval (seconds)
  ENEMY_MAX_COUNT:             260,    // maximum simultaneous enemies on screen
  ENEMY_BASE_RADIUS:           21,     // base radius (px)
  ENEMY_RADIUS_VARIANCE:       6,      // ± random radius variation (px)
  ENEMY_BASE_SPEED:            28,     // base movement speed (px/s)
  ENEMY_SPEED_VARIANCE:        26,     // random speed addition per enemy (px/s)
  ENEMY_SPEED_TIME_SCALE:      1.8,    // px/s speed bonus added per second of play time (additive)
  ENEMY_SPEED_TIME_CAP:        36,     // max additive speed bonus from time scaling (px/s)

  // Global speed multiplier — ramps from START → MAX over RAMP_DURATION seconds
  // Applied on top of the additive bonus; makes late-game enemies significantly faster
  ENEMY_SPEED_MULT_START:      1.0,   // multiplier at t=0 (no change from base)
  ENEMY_SPEED_MULT_MAX:        2.5,   // multiplier at full ramp (enemies are 2.5× base speed)
  ENEMY_SPEED_MULT_RAMP_TIME:  240,   // seconds of play time to reach MULT_MAX
  ENEMY_TOP_SPAWN_CHANCE:      0.65,   // fraction of enemies that spawn from the top edge
  ENEMY_LEFT_SPAWN_CHANCE:     0.82,   // cumulative fraction for left-side spawn (remaining are right)
  ENEMY_SIDE_Y_FRACTION:       0.55,   // side enemies spawn in top this fraction of canvas height
  ENEMY_SPAWN_MARGIN:          28,     // px kept from each side edge for top spawns
  ENEMY_BREACH_DECEL:          220,    // px/s² deceleration after crossing the breach line
  ENEMY_CASTLE_DAMAGE:         20,     // HP removed from castle per normal enemy explosion
  ENEMY_BASE_HP:               50,     // base hit points for a normal enemy
  ENEMY_HP_TIME_SCALE:         0.5,    // +HP per second of play time
  ENEMY_HP_TIME_CAP:           80,     // max HP bonus from time scaling
  ENEMY_BREACH_EXPLOSION_MARGIN: 5,    // px above castle-body floor where breach explosion spawns

  // ── Enemy visual ───────────────────────────────────────────────────────────
  ENEMY_HP_BAR_H:   4,  // height of the HP bar drawn above each enemy (px)
  ENEMY_HP_BAR_GAP: 2,  // gap between enemy top edge and HP bar bottom (px)

  // ── Elite enemy ────────────────────────────────────────────────────────────
  ELITE_SPAWN_CHANCE:        0.15,  // probability any new spawn is an elite
  ELITE_HP_MULT:             3.5,   // HP multiplier vs normal enemy
  ELITE_SPEED_MULT:          0.65,  // speed multiplier (elites move slower but are tankier)
  ELITE_RADIUS_MULT:         1.45,  // size multiplier
  ELITE_CASTLE_DAMAGE_MULT:  2.0,   // extra castle damage factor when elite breaches
  ELITE_COIN_MIN:            1,     // elite always drops at least this many coins
  ELITE_COIN_CHANCE_2ND:     0.55,  // chance of a 2nd coin drop from elite
  ELITE_COIN_CHANCE_3RD:     0.25,  // chance of a 3rd coin drop from elite

  // ── Castle ─────────────────────────────────────────────────────────────────
  CASTLE_MAX_HP:  300,
  CASTLE_H:       60,   // height of the castle body at the very bottom (px)
  CASTLE_BATT_H:  16,   // crenellation height above the castle body (px)

  // ── Castle visual ──────────────────────────────────────────────────────────
  CASTLE_GRID_ROWS:          3,   // number of decorative brick rows on castle body
  CASTLE_GRID_ROW_H:         17,  // pixel height per brick row
  CASTLE_GRID_ROW_Y:         6,   // y offset inside castle body for first row (px)
  CASTLE_GRID_ODD_OFFSET:    26,  // horizontal stagger for odd rows (brick bond pattern, px)
  CASTLE_GRID_PERIOD:        52,  // horizontal repeat period for bricks (px)
  CASTLE_GRID_BLOCK_W:       50,  // visual width of each brick (px)
  CASTLE_GRID_BLOCK_H:       15,  // visual height of each brick (px)
  CASTLE_BATT_W:             28,  // crenellation block width (px)
  CASTLE_BATT_GAP:           18,  // gap between crenellations (px)
  CASTLE_BATT_X_START:       4,   // x offset of first main-wall crenellation (px)
  CASTLE_TOWER_W:            54,  // width of each corner tower (px)
  CASTLE_TOWER_EXTRA_H:      28,  // how many px towers extend above the castle body
  CASTLE_TOWER_BATT_W:       12,  // tower crenellation width (px)
  CASTLE_TOWER_BATT_GAP:     8,   // gap between tower crenellations (px)
  CASTLE_TOWER_BATT_H:       12,  // tower crenellation height (px)
  CASTLE_TOWER_BATT_X_START: 4,   // x offset of first tower crenellation (px)
  CASTLE_GATE_W:             60,  // width of the gate arch at center (px)
  CASTLE_GATE_H:             28,  // height of rectangular gate portion (px)
  CASTLE_HP_BAR_INSET:       12,  // HP bar inset from each tower inner edge (px)
  CASTLE_HP_BAR_Y_OFFSET:    6,   // y offset inside castle body for HP bar (px)
  CASTLE_HP_BAR_H:           10,  // height of castle HP bar (px)
  CASTLE_HP_LABEL_Y_OFFSET:  26,  // y offset inside castle body for HP label text (px)
  CASTLE_HP_LABEL_FONT:      13,  // font size for castle HP label (px)
  CASTLE_WINDOW_W:           10,  // tower window width (px)
  CASTLE_WINDOW_H:           22,  // tower window height (px)
  CASTLE_WINDOW_Y_OFFSET:    14,  // y offset from castle-body top for tower windows (px)

  // ── Animation pulse frequencies & intensities ──────────────────────────────
  ANIM_CASTLE_HP_PULSE_FREQ:       8,   // low-HP castle bar pulse (rad/s)
  ANIM_CASTLE_HP_PULSE_SHADOW_BASE: 10, // base shadowBlur for castle HP pulse
  ANIM_CASTLE_HP_PULSE_SHADOW_AMP:  6,  // amplitude added to shadowBlur
  ANIM_BREACH_PULSE_FREQ:          12,  // breaching enemy glow oscillation (rad/s)
  ANIM_BREACH_PULSE_BASE:          14,  // base shadowBlur for breach enemy
  ANIM_BREACH_PULSE_AMP:           6,   // amplitude for breach shadowBlur
  ANIM_ELITE_PULSE_FREQ:           6,   // elite enemy glow oscillation (rad/s)
  ANIM_ELITE_PULSE_BASE:           10,  // base shadowBlur for elite enemy
  ANIM_ELITE_PULSE_AMP:            4,   // amplitude for elite shadowBlur

  // ── Breach line & danger zone visual ───────────────────────────────────────
  BREACH_Y_OFFSET:         8,    // px above castle-body top for the breach line position
  BREACH_LINE_W:           2,    // stroke width of breach line (px)
  BREACH_LINE_SHADOW_BLUR: 10,   // shadowBlur for breach line glow
  BREACH_DASH_ON:          14,   // dash on-length (px)
  BREACH_DASH_OFF:         7,    // dash off-length (px)
  BREACH_LABEL_X:          8,    // x offset for breach warning text (px from left)
  BREACH_LABEL_Y:          4,    // y offset above breach line for warning text (px)
  BREACH_LABEL_FONT:       11,   // font size for breach line label (px)
  BREACH_DANGER_GAP:       4,    // px gap between turret body bottom and top of danger tint (px)
  BREACH_DANGER_ALPHA:     0.06, // opacity of red danger-zone tint rectangle

  // ── Layout — turret start ──────────────────────────────────────────────────
  TURRET_START_Y_OFFSET: 52,  // px above castle-body top for turret initial Y position

  // ── Canvas border (drawn every playing frame) ──────────────────────────────
  CANVAS_BORDER_W:     2,  // stroke width (px)
  CANVAS_BORDER_INSET: 1,  // inset from canvas edge (px)

  // ── Canvas button rendering ────────────────────────────────────────────────
  CANVAS_BTN_SHADOW_BLUR:   14,  // shadowBlur for canvas-drawn button glow
  CANVAS_BTN_RADIUS:        10,  // corner radius of canvas buttons (px)
  CANVAS_BTN_DEFAULT_FONT:  22,  // default font size for button labels (px)

  // ── Star field (menu background) ───────────────────────────────────────────
  STARS_COUNT: 100,  // number of background star dots to draw
  STARS_ALPHA: 0.5,  // opacity of star dots

  // ── HUD color thresholds ───────────────────────────────────────────────────
  HUD_HP_LOW: 0.25,  // below this HP fraction → red color
  HUD_HP_MID: 0.50,  // below this HP fraction → orange color

  // ── Screen layout — menu (y positions as canvas-height fractions) ──────────
  MENU_TITLE_Y_FRAC:    0.20,  // main title first line
  MENU_SUB_Y_FRAC:      0.34,  // subtitle/tagline
  MENU_STATS1_Y_FRAC:   0.39,  // upgrade stats row 1
  MENU_STATS2_Y_FRAC:   0.43,  // upgrade stats row 2
  MENU_PLAY_Y_FRAC:     0.54,  // play button center
  MENU_SHOP_Y_FRAC:     0.64,  // shop button center
  MENU_TIP1_Y_FRAC:     0.74,  // control tip line 1
  MENU_TIP2_Y_FRAC:     0.77,  // control tip line 2
  MENU_TITLE_LINE_GAP:  62,    // px between first and second title lines
  MENU_TITLE_FONT1:     56,    // font size for title line 1 (px)
  MENU_TITLE_FONT2:     50,    // font size for title line 2 (px)
  MENU_SUB_FONT:        19,    // subtitle font size (px)
  MENU_STATS_FONT:      16,    // stats font size (px)
  MENU_TIP_FONT:        14,    // tip text font size (px)
  MENU_PLAY_BTN_W:      230,   // play button width (px)
  MENU_PLAY_BTN_H:      66,    // play button height (px)
  MENU_PLAY_BTN_FONT:   24,    // play button label font size (px)
  MENU_SHOP_BTN_W:      230,   // shop button width (px)
  MENU_SHOP_BTN_H:      58,    // shop button height (px)
  MENU_SHOP_BTN_FONT:   20,    // shop button label font size (px)

  // ── Screen layout — countdown ──────────────────────────────────────────────
  COUNTDOWN_TIMER_START:    3.99,  // initial countdown value (s); displays ceil() = 3,2,1
  COUNTDOWN_TIP_Y_FRAC:     0.24,  // main tip line
  COUNTDOWN_TIP2_Y_FRAC:    0.29,  // control tip 1
  COUNTDOWN_TIP3_Y_FRAC:    0.33,  // control tip 2
  COUNTDOWN_TIP4_Y_FRAC:    0.36,  // control tip 3
  COUNTDOWN_NUM_Y_FRAC:     0.52,  // countdown number center
  COUNTDOWN_NUM_FONT:       110,   // countdown number font size (px)
  COUNTDOWN_SCALE_AMP:      0.55,  // scale overshoot amplitude on new-number pop
  COUNTDOWN_SHADOW_BLUR:    44,    // shadowBlur for the countdown number glow
  COUNTDOWN_HEADER_FONT:    22,    // header line font size (px)
  COUNTDOWN_TIP_FONT:       17,    // tip lines font size (px)

  // ── Screen layout — end screen ─────────────────────────────────────────────
  END_OVERLAY_ALPHA:  0.55,  // opacity of the dark overlay behind end-screen UI
  END_TITLE_Y_FRAC:   0.33,  // win/lose heading
  END_KILLS_Y_FRAC:   0.42,  // kill count line
  END_MONEY_Y_FRAC:   0.48,  // money earned line
  END_BTN_Y_FRAC:     0.60,  // restart / main-menu buttons center
  END_TITLE_FONT:     52,    // heading font size (px)
  END_STATS_FONT:     26,    // stats line font size (px)
  END_SHADOW_BLUR:    28,    // shadowBlur for heading glow
  END_BTN_W:          190,   // each end-screen button width (px)
  END_BTN_H:          60,    // each end-screen button height (px)
  END_BTN_FONT:       20,    // end-screen button font size (px)
  END_BTN_X_OFFSET:   108,   // horizontal offset of each button from canvas center (px)

  // ── Permanent upgrade shop ─────────────────────────────────────────────────
  COST_SCALE_FACTOR:        1.65,
  COST_BASE_FIRE_RATE:      8,
  COST_BASE_BULLET_DMG:     10,
  COST_BASE_PIERCE:         15,
  COST_BASE_BULLET_COUNT:   12,

  // ── In-run upgrade stacking ────────────────────────────────────────────────
  SHIELD_STACKS_PER_PICK:  3,    // shield charges added per shield pickup
  DOUBLE_GEMS_CHANCE:      0.5,  // probability of +1 bonus crystal when doubleGems active
}
