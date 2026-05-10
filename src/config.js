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
  CRYSTAL_DROP_CHANCE:    1.0,   
  CRYSTAL_VALUE_MIN:      1,     
  CRYSTAL_VALUE_MAX:      3,     
  CRYSTAL_SPEED_MIN:      272,   
  CRYSTAL_SPEED_MAX:      374,   
  CRYSTAL_SPREAD_X:       44,    
  CRYSTAL_SPREAD_Y:       22,    
  CRYSTAL_MAGNET_PULL:    1.8,   
  CRYSTAL_MAGNET_ACCEL:   70,    
  CRYSTAL_MAGNET_MAX_VY:  190,   
  CRYSTAL_PICKUP_RADIUS:  12,    
  CRYSTAL_PICKUP_MARGIN:  4,     
  CRYSTAL_VISUAL_HALF_H:  9,     
  CRYSTAL_VISUAL_HALF_W:  7,     

  // ── Crystal bar UI ─────────────────────────────────────────────────────────
  CRYSTAL_BAR_H:                  14,   
  CRYSTAL_BAR_Y:                  3,    
  CRYSTAL_BAR_MARGIN:             4,    
  CRYSTAL_BAR_TICK_MAX_COST:      15,   
  CRYSTAL_BAR_PULSE_THRESHOLD:    0.8,  
  CRYSTAL_BAR_PULSE_FREQ:         10,   
  CRYSTAL_BAR_PULSE_SHADOW_BASE:  8,    
  CRYSTAL_BAR_PULSE_SHADOW_AMP:   5,    

  // ── Coin drops ─────────────────────────────────────────────────────────────
  COIN_DROP_CHANCE:        0.3,   
  COIN_SPEED_MIN:          493,   
  COIN_SPEED_MAX:          646,   
  COIN_SPREAD_X:           24,    
  COIN_ELITE_SPREAD_MULT:  1.5,   
  COIN_VALUE:              2,     
  COIN_RADIUS:             9,     
  COIN_PICKUP_RADIUS:      10,    
  COIN_PICKUP_MARGIN:      4,     

  // ── Ammo system ────────────────────────────────────────────────────────────
  AMMO_MAX_BASE:              35,   
  AMMO_COST_PER_VOLLEY:       1,    
  AMMO_REGEN_RATE_BASE:       15,   // base ammo per second regenerated
  AMMO_REGEN_RATE_INC:        8,    // additional regen per in-run upgrade level
  AMMO_REGEN_DELAY:           0.0,  // seconds after releasing fire before regen begins (tester: make 0)
  AMMO_CAPACITY_PER_UPGRADE:  25,   
  AMMO_LOW_THRESHOLD:         0.25, 
  AMMO_EMPTY_WARN_HOLD:       0.8,  

  // ── Ammo bar UI ────────────────────────────────────────────────────────────
  AMMO_BAR_H:                   14,  
  AMMO_BAR_TOP_MARGIN:          2,   
  AMMO_BAR_PULSE_FREQ:          14,  
  AMMO_BAR_PULSE_SHADOW_BASE:   8,   
  AMMO_BAR_PULSE_SHADOW_AMP:    5,   

  // ── Bullet spread (multi-barrel) ───────────────────────────────────────────
  BULLET_SPREAD_PX:         15,  
  BULLET_SIDE_ANGLE_DEG:    10,  

  // ── Turret ─────────────────────────────────────────────────────────────────
  TURRET_BASE_SPEED:         1400,  
  TURRET_ACCEL_RATE:         48,   
  TURRET_DECEL_RATE:         20,   
  TURRET_STEER_DEADZONE:     2,    
  TURRET_SNAP_MARGIN:        1,    
  TURRET_WIDTH:              60,   
  TURRET_HEIGHT:             28,   
  TURRET_BARREL_W:           10,   
  TURRET_BARREL_H:           26,   
  TURRET_BARREL_SHADOW_BLUR: 8,    
  TURRET_MAX_HP:             100,  
  TURRET_HP_PER_HIT:         15,   
  TURRET_HP_REGEN_RATE:      5,    
  TURRET_HP_REGEN_DELAY:     2.5,  

  // ── Turret visual ──────────────────────────────────────────────────────────
  TURRET_HP_BAR_EXTRA_W:      12,  
  TURRET_HP_BAR_Y_GAP:        5,   
  TURRET_HP_BAR_H:            8,   
  TURRET_SHIELD_INSET:        6,   
  TURRET_SHIELD_LINE_W:       3,   
  TURRET_SHIELD_SHADOW_BLUR:  14,  
  TURRET_ACCENT_STRIPE_H:     4,   
  TURRET_SHIELD_FONT:         11,  

  // ── Bullets ────────────────────────────────────────────────────────────────
  BULLET_BASE_FIRE_RATE:    3,  
  BULLET_FIRE_RATE_MULT:    1.15, 
  BULLET_BASE_DAMAGE:       45,   
  BULLET_DAMAGE_MULT:       1.20, 
  BULLET_SPEED:             700,  
  BULLET_RADIUS:            5,    
  BULLET_SHADOW_BLUR:       10,   
  BULLET_PIERCE_BASE:       0,    
  BULLET_PIERCE_PER_LVL:    1,    

  // ── Explosions ─────────────────────────────────────────────────────────────
  EXPLOSION_INIT_R:              4,    
  EXPLOSION_MAX_AGE:             0.55, 
  EXPLOSION_HIT_BULLET_MAXR:    18,   
  EXPLOSION_HIT_TURRET_MAXR:    32,   
  EXPLOSION_HIT_SHIELD_MAXR:    28,   
  EXPLOSION_BREACH_NORMAL_MAXR: 52,   
  EXPLOSION_BREACH_ELITE_MAXR:  72,   

  // ── Enemy (base) ───────────────────────────────────────────────────────────
  ENEMY_SPAWN_INTERVAL_START:  1.45,    
  ENEMY_SPAWN_RATE_RAMP:       0.0055,  
  ENEMY_SPAWN_INTERVAL_MIN:    0.05,   
  ENEMY_MAX_COUNT:             600,    
  ENEMY_BASE_RADIUS:           21,     
  ENEMY_RADIUS_VARIANCE:       6,      
  ENEMY_BASE_SPEED:            25,     
  ENEMY_SPEED_VARIANCE:        20,     
  ENEMY_SPEED_TIME_SCALE:      1.8,    
  ENEMY_SPEED_TIME_CAP:        90,     
  ENEMY_TOP_SPAWN_CHANCE:      0.65,   
  ENEMY_LEFT_SPAWN_CHANCE:     0.82,   
  ENEMY_SIDE_Y_FRACTION:       0.55,   
  ENEMY_SPAWN_MARGIN:          28,     
  ENEMY_BREACH_DECEL:          220,    
  ENEMY_CASTLE_DAMAGE:         15,     
  ENEMY_BASE_HP:               20,     
  ENEMY_HP_TIME_SCALE:         0.5,    
  ENEMY_HP_TIME_CAP:           1000,    
  ENEMY_BREACH_EXPLOSION_MARGIN: 5,    

  // ── Global speed multiplier ramp ───────────────────────────────────────────
  ENEMY_SPEED_MULT_START:      1.25,   
  ENEMY_SPEED_MULT_MAX:        2.5,   
  ENEMY_SPEED_MULT_RAMP_TIME:  1200,   

  // ── Enemy visual ───────────────────────────────────────────────────────────
  ENEMY_HP_BAR_H:   4,  
  ENEMY_HP_BAR_GAP: 2,  

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
  SPRINTER_SPAWN_CHANCE:      0.07,  
  SPRINTER_HP_MULT:           0.55,  
  SPRINTER_SPEED_MULT:        1.1,   
  SPRINTER_SPRINT_SPEED_MULT: 3.2,   
  SPRINTER_SPRINT_DURATION:   0.7,   
  SPRINTER_REST_DURATION:     2.2,   

  // ── Enemy tier upgrades ────────────────────────────────────────────────────
  TIER_FIRST_TIME:         180,   
  TIER_PERIOD:             180,   
  TIER_HP_MULT_PER_TIER:   0.40,  
  TIER_SPEED_MULT_PER_TIER: 0.20, 

  // ── Boss system ────────────────────────────────────────────────────────────
  BOSS_FIRST_TIME:          60,   
  BOSS_PERIOD:              180,   
  BOSS_RADIUS:               48,   
  BOSS_HP_BASE:             1000,  
  BOSS_HP_PER_WAVE:          600,  
  BOSS_DESCENT_SPEED:        80,   
  BOSS_HOVER_OFFSET:        130,   
  BOSS_TRACK_SPEED:          45,   
  BOSS_CHARGE_INTERVAL_INIT: 5.0,  
  BOSS_CHARGE_INTERVAL:      4.5,  
  BOSS_CHARGE_SPEED:         320,  
  BOSS_ENRAGE_TIME:          30,   
  BOSS_ENRAGE_TRACK_MULT:    3.5,  
  BOSS_SHIELD_DURATION:      2.5,  
  BOSS_TURRET_DAMAGE:        40,   
  BOSS_CRYSTAL_DROP:         14,   
  BOSS_COIN_DROP_MIN:         3,   
  BOSS_COIN_CHANCE_EXTRA_1:  0.8,  
  BOSS_COIN_CHANCE_EXTRA_2:  0.5,  
  BOSS_MONEY_REWARD:          8,   

  // ── Horde system ───────────────────────────────────────────────────────────
  HORDE_FIRST_TIME:      120,   
  HORDE_PERIOD:          180,   
  HORDE_DURATION:         30,   
  HORDE_SPAWN_INTERVAL:  0.25,  

  // ── Developer tools ────────────────────────────────────────────────────────
  DEV_ENABLED:       false,  
  DEV_TIMEWARP_MULT: 2.5,   

  // ── Notification overlay ───────────────────────────────────────────────────
  NOTIF_DURATION:       3.2,  
  NOTIF_FONT:            28,  
  NOTIF_Y_FRAC:         0.38, 
  NOTIF_BG_PAD_TOP:        8, 
  NOTIF_BG_PAD_BOTTOM:    18, 

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

  // ── Castle Damage Particles ────────────────────────────────────────────────
  CASTLE_PARTICLE_COUNT:    8,
  CASTLE_PARTICLE_MAX_AGE:  1.0,
  CASTLE_PARTICLE_SPEED:    150,

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
  ANIM_SPRINTER_PULSE_FREQ:         16,  
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
  MENU_TITLE_FONT1:     48,
  MENU_TITLE_FONT2:     42,
  MENU_SUB_FONT:        17,
  MENU_STATS_FONT:      14,
  MENU_TIP_FONT:        12,
  MENU_PLAY_BTN_W:      240,
  MENU_PLAY_BTN_H:      64,
  MENU_PLAY_BTN_FONT:   22,
  MENU_SHOP_BTN_W:      230,
  MENU_SHOP_BTN_H:      58,
  MENU_SHOP_BTN_FONT:   18,

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
  END_KILLS_Y_FRAC:   0.45,   
  END_MONEY_Y_FRAC:   0.50,
  END_BTN_Y_FRAC:     0.65,   
  END_TITLE_FONT:     44,     
  END_STATS_FONT:     22,     
  END_RECORD_TITLE_FONT: 24,  
  END_RECORD_VAL_FONT:   28,  
  END_SHADOW_BLUR:    28,
  END_BTN_W:          170,    
  END_BTN_H:          54,     
  END_BTN_FONT:       18,     
  END_BTN_X_OFFSET:   95,     

  // ── Permanent upgrade shop ─────────────────────────────────────────────────
  COST_SCALE_FACTOR:      2,
  COST_BASE_FIRE_RATE:    64,
  COST_BASE_BULLET_DMG:   80,
  COST_BASE_PIERCE:       120,
  COST_BASE_BULLET_COUNT: 120,
  COST_BASE_AMMO_CAP:     100,

  // ── Rarity Colors ──────────────────────────────────────────────────────────
  RARITY_COMMON_HUE:    145,  
  RARITY_RARE_HUE:      275,  
  RARITY_COMMON_SAT:    50,   
  RARITY_RARE_SAT:      85,   
  RARITY_COMMON_LIGHT:  22,   
  RARITY_RARE_LIGHT:    35,   

  // ── In-run upgrade weights (relative probability) ──────────────────────────
  WEIGHT_FIRE_RATE:     10,
  WEIGHT_BULLET_DMG:    10,
  WEIGHT_PIERCE:        6,
  WEIGHT_SHIELD:        8,
  WEIGHT_MAGNET:        0,  // Removed (tester feedback)
  WEIGHT_DOUBLE_GEMS:   4,
  WEIGHT_BULLET_COUNT:  4,
  WEIGHT_RELOAD_SPEED:  8,

  // ── In-run upgrade stacking ────────────────────────────────────────────────
  SHIELD_STACKS_PER_PICK:  3,
  DOUBLE_GEMS_CHANCE:      0.5,
}
