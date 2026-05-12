# Game Design Document: Mega Pong (Prototype)

## 1. Overview
**Mega Pong** is a portrait-mode, endless survival defense game. It combines the horizontal movement of a paddle from *Pong* with the exponential power scaling and horde mechanics of the survivor genre. The player controls a turret moving along a horizontal rail to defend a castle from descending waves of enemies.

## 2. Core Gameplay Loop
1. **Defend:** Move the turret horizontally to shoot and destroy enemies before they breach the castle at the bottom of the screen.
2. **Resource Collection:** Gather **Crystals** (dropped by defeated enemies) for immediate, temporary power-ups, and **Coins** (dropped by Elites and Bosses) for permanent upgrades.
3. **In-Run Progression:** Collect enough Crystals to fill the XP bar, pausing the game to choose one of three randomized upgrades.
4. **Ammo Management:** Shooting consumes ammo. The player must stop shooting to allow their ammo gauge to recharge.
5. **Meta-Progression:** Between runs, spend accumulated Coins in the Atölye (Shop) to permanently increase base stats.

## 3. Controls & Mechanics
*   **Perspective:** 2D Top-down, Portrait orientation (9:16).
*   **Movement:** The turret moves horizontally along a fixed axis near the bottom. Controlled by touch-dragging or A/D keyboard keys.
    *   **Turret Base Speed:** 1400 pixels/sec.
    *   **Turret Acceleration Rate:** 48.
    *   **Turret Deceleration Rate:** 20.
*   **Combat:** Firing is automatic while input (screen touch or Spacebar) is held.
*   **Ammo System:** 
    *   Firing depletes the ammo gauge. (Cost: 1 Ammo per volley).
    *   Ammo only regenerates when the player is **not** firing.
    *   Attempting to fire with an empty gauge triggers a visual and text warning.

## 4. Entities & Scaling Balance
All difficulty and progression are driven by time-based formulas and exponential scaling.

### 4.1 The Player (Turret & Arsenal)
Player power is the sum of Meta-Progression (Permanent) and In-Run (Temporary) levels.
*   **Fire Rate (Daha Hızlı Ateş Et):** `3 * (1.15 ^ Total Level)` shots per second.
*   **Bullet Damage (Daha Güçlü Mermiler):** `45 * (1.20 ^ Total Level)`.
*   **Pierce (Delici Mermi):** `0 + Total Level` enemies penetrated per bullet.
*   **Bullet Spread (Daha Çok Mermi At):** `1 + (2 * Total Level)` total bullets fired simultaneously in a fan pattern.
    *   **Bullet Spread Distance:** 15 pixels between bullets.
    *   **Bullet Angle:** 10-degree increments per step outward.
*   **Bullet Speed:** 700 pixels/sec.
*   **Ammo Capacity:** `35 + (25 * Meta Level)` total ammo.
*   **Ammo Reload Speed:** `15 + (8 * In-Run Level)` ammo regenerated per second (0.0s delay after stopping fire).
*   **Castle Shields (Kaleye Sur Ekle):** Adds +3 layers per in-run upgrade.

### 4.2 Enemy Spawning & Difficulty
Difficulty increases smoothly over time and in sharp bursts ("Tiers").
*   **Spawn Rate:** Decreases over time. `Interval = Max(0.05, 1.45 - (TimeInSeconds * 0.0055))` seconds between spawns. Max enemy cap is 600.
*   **Global Speed Multiplier:** A background multiplier that ramps linearly from `1.25x` to `2.5x` over the first 20 minutes (1200 seconds) of the run.
*   **Tiers (Aşama):** Starts at 180 seconds, then every 180 seconds, the Tier increases by 1.
    *   **HP Tier Multiplier:** `1 + (Tier * 0.40)`.
    *   **Speed Tier Multiplier:** `1 + (Tier * 0.20)`.

### 4.3 Enemy Types & Formulas
*   **Normal:** Standard enemies moving downwards.
    *   **HP:** `(20 + Min(1000, TimeInSeconds * 0.5)) * HP Tier Multiplier`.
    *   **Speed:** `(25 + Random(0 to 20) + Min(90, TimeInSeconds * 1.8)) * Global Speed Multiplier * Speed Tier Multiplier`.
    *   **Castle Damage:** Deals 15 damage on breach.
    *   **Drop Rates:** 100% chance to drop 1-3 Crystals. 30% chance to drop 1 Coin (Value: 2).
*   **Elite:** 15% spawn chance.
    *   **Stats:** HP is `3.5x` Normal. Speed is `0.65x` Normal. Size is `1.45x` Normal.
    *   **Castle Damage:** Deals 30 damage (2.0x standard).
    *   **Drop Rates:** Drops 1 guaranteed Coin, 55% chance for a 2nd Coin, 25% chance for a 3rd Coin.
*   **Sprinter:** 7% spawn chance (if not Elite).
    *   **Stats:** HP is `0.55x` Normal. Base speed is `1.1x` Normal.
    *   **Behavior:** Rests for 2.2 seconds, then sprints at `3.2x` its base speed for 0.7 seconds.
*   **Boss:** 
    *   **Stats:** `1000 + (Bosses Defeated * 600)` Max HP.
    *   **Behavior:** Phase 1 tracks player at 45 speed. Phase 2 (at 50% HP) gains a 2.5-second shield. Charges at the player every 4.5 seconds (initial charge at 5.0s) with 320 speed. Enrages after 30 seconds (tracking speed multiplied by 3.5x).
    *   **Turret Collision Damage:** 40.
    *   **Loot:** Drops 14 Crystals, 3 guaranteed Coins (+80% chance for 4th, +50% chance for 5th), and 8 immediate Money reward.

### 4.4 The Castle
*   **Max HP:** 300.
*   Takes damage when enemies pass the turret and breach the bottom line. Game over when HP reaches 0.

## 5. Economy & Progression Math
### 5.1 In-Run Upgrades (Crystals)
Crystals drop from enemies. The cost to level up scales exponentially.
*   **Level Up Cost Formula:** `5 * (1.55 ^ Current In-Run Level)`.
*   **Upgrade Probability (Weights):** When presenting 3 options, the game uses weighted random selection:
    *   Fire Rate: 10
    *   Bullet Damage: 10
    *   Shield: 8
    *   Reload Speed: 8
    *   Pierce: 6
    *   Double Gems (Extra Crystal): 4 (Adds a 50% chance per upgrade level for each crystal drop to duplicate).
    *   Bullet Count (+2 Spread): 4

### 5.2 Permanent Upgrades (Coins)
Coins are used in the main menu shop. Costs double with every purchase.
*   **Cost Formula:** `Base Cost * (2 ^ Meta Level)`.
*   **Base Costs:**
    *   Fire Rate: 64
    *   Bullet Damage: 80
    *   Pierce: 120
    *   Bullet Count: 120
    *   Ammo Capacity: 100

## 6. Events Schedule
The run follows a strict timeline loop:
*   **Boss:** First boss spawns at `60s`, then every `180s`.
*   **Horde (Sürü):** First horde at `120s`, then every `180s`. Overrides spawn interval to a flat `0.25s` for 30 seconds.
*   **Tier Upgrade:** First tier upgrade at `180s`, then every `180s`.

## 7. UI & Feedback
*   **Visual Style:** Dark background with bright, neon-colored geometric shapes and glowing shadows.
*   **Color Coding:** Crystals are cyan, Coins are gold, Upgrades are color-coded by rarity weight (Common/Rare gradients).
*   **Floating Text:** Used heavily for warnings ("MERMİ BİTTİ"), event announcements ("BOSS GELİYOR"), and boss states.
*   **Particle Effects:** Explosive bursts on enemy death or castle damage. Castle HP bar pulses red when below 25%.