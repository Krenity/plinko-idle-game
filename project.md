# Plinko Idle Game

## Overview
Idle/incremental plinko game. A dropper spawns colored shapes that bounce through pegs into multiplier slots. Earn currency, buy upgrades, unlock effects, prestige for permanent multipliers.

## Tech Stack
- **Runtime:** Bun
- **Rendering:** PixiJS 7 (avoided PixiJS 8 due to `extensions2 is not defined` when bundled by Bun)
- **Physics:** Matter.js
- **Linting:** Biome
- **Build:** `bun run build` → tsc + bun build → `dist/main.js`
- **Server:** `bun run server` → http://localhost:3000 serves `public/` then `dist/`
- **Save:** LocalStorage

## Project Structure
```
src/
├── main.ts                  Entry point
├── game/
│   ├── Game.ts              Main loop, collision handlers, effect wiring, combo/prestige
│   ├── Board.ts             Peg grid, walls, peg flash/repaint
│   ├── Blob.ts              Shape drawing (7 types), die animation
│   ├── Dropper.ts           Blob spawning, sweep animation, shape unlock chain
│   ├── Physics.ts           Matter.js engine, collision events
│   ├── MultiplierSlot.ts    Slot visuals, flash overlay, drop bounce animation
│   ├── ParticleSystem.ts    Ring + fountain + spark particles on collection
│   ├── FloatingText.ts      "+amount" text with oscillation + fade
│   └── PegEffectManager.ts  Effect lifecycle, enchanted peg tracking, earnings
├── systems/
│   ├── ScoreSystem.ts       Currency, total earned, rolling gains (/s /m /h)
│   ├── UpgradeSystem.ts     Cost calc, purchase, merge-on-load save fix
│   └── SaveSystem.ts        LocalStorage save/load
├── ui/
│   ├── HUD.ts               Blob count, FPS display (PixiJS)
│   ├── SidePanel.ts         Right panel: Effects tab + Upgrades tab (DOM)
│   └── index.html           HTML shell
└── utils/
    └── constants.ts         All balance configs, shapes, effects, upgrades
```

## Visual Style
- Dark background `#1a1a2e`
- Flat colors, simple shapes
- 7 blob shapes: triangle, square, circle, diamond, pentagon, hexagon, star
- Side panel (right, 240px) replaces popup UI
- Custom scrollbar styling (6px, dark track/thumb)

## Game Mechanics

### Core Loop
1. Dropper sweeps side-to-side, spawning blobs
2. Blobs fall through pegs with Matter.js physics
3. Multiplier slots collect at bottom
4. Currency = blobValue × pendingMult × slotMult × comboMult × prestigeMult
5. Currency buys upgrades, unlocks shapes/effects, enables prestige

### Fixed Timestep
Game uses 16.667ms fixed timestep accumulator to keep physics consistent regardless of FPS.

### Gravity
`PHYSICS.gravity = 0.6` (settled after testing 1 and 5)

### Combo
- +0.1x per peg hit, max 5x
- Resets when any blob lands in a slot
- Displayed in ScoreSystem left panel

### Shapes (7)
| Shape    | Value | Color  | Radius |
|----------|-------|--------|--------|
| Triangle | 1     | White  | 7      |
| Square   | 2     | Cyan   | 9      |
| Circle   | 3     | Pink   | 10     |
| Diamond  | 4     | Gold   | 9      |
| Pentagon | 5     | Orange | 10     |
| Hexagon  | 6     | Blue   | 11     |
| Star     | 7     | Violet | 10     |

Linear unlock chain: triangle→square→circle→diamond→pentagon→hexagon→star.

### Multiplier Slots (9)
`[0.5, 1, 2, 3, 5, 3, 2, 1, 0.5]`
- Center has highest (5x), edges lowest (0.5x)
- Permanent bonus from Slot Multiplier upgrade
- Temporary +1x from Golden Hour
- One slot gets 5x from Lucky Slot effect
- White flash overlay + drop bounce animation on collection

### Particles (Slot Collection)
Triple effect:
1. Expanding golden ring (shockwave)
2. Fountain particles arc upward and fall with gravity
3. Quick white spark streaks

### Floating Text
"+amount" floats up from slot, oscillates, fades, decays velocity.

### Peg Effects (8)
| Effect      | Duration | Cooldown | Pegs | Description |
|-------------|----------|----------|------|-------------|
| Gold Touch  | 30s+5s   | 45s-4s   | 6+2  | +3 value per hit |
| Split Shot  | 20s+3s   | 60s-5s   | 4+1  | Blob splits in two (once per blob) |
| Treasure    | 25s+4s   | 50s-4s   | 5+2  | +1-5 random value per hit |
| Double Down | 15s+3s   | 75s-6s   | 3+1  | 2x pending multiplier per hit |
| Jackpot     | 10s+2s   | 90s-7s   | 2+1  | +8 value per hit |
| Lucky Slot  | 15s+2s   | 80s-6s   | 4+1  | Random slot gets 5x |
| Magnet      | 1s+0.1s  | 80s-5s   | 5+2  | Pulls all blobs toward center |
| Golden Hour | 10s+1.5s | 120s-8s  | 0+0  | All pegs +1 value, slots +1x |

- Effects auto-activate (no button), cycle cooldown→ready→active
- Random subset of pegs enchanted per effect, replenish on hit
- Pegs colored by active effect, flash ring on hit
- Session earnings tracked per effect, displayed in Effects panel
- Golden Hour has pegCount 0 (affects all pegs globally)

### Upgrades (17)
General: Dropper Speed (10 levels), Slot Multiplier (10 levels)
Shapes: 6 one-time unlocks (square→circle→diamond→pentagon→hexagon→star)
Effects: All 8 effects, 5 levels each (duration/cooldown/peg count scale)

### Prestige
- Threshold: `100000 × 3^level`
- Gain: +0.5x permanent multiplier per level
- Max: 10 levels
- Resets currency, upgrades, effect levels; resets dropper speed and slot bonuses
- Custom modal dialog (no browser `confirm()`)

### Currency Gains Display
Left-side panel shows: current currency, total earned, `/s /m /h` rates.

## Key Design Decisions
- **PixiJS 7 over 8**: PixiJS 8 caused `extensions2 is not defined` when bundled by Bun
- **Fixed timestep**: 16.667ms accumulator prevents variable FPS from changing physics speed
- **Side panel over popup**: Right-side fixed panel (240px) with Effects/Upgrades tabs
- **Effects auto-activate**: No manual button, cycle cooldown→ready→active automatically
- **Random enchanted pegs**: Each effect enchants a subset (not all), replenish on hit
- **Split once flag**: Prevents recursive splitting of split blobs
- **UpgradeSystem merge-on-load**: New keys added to defaults survive old saves

## Running
```bash
bun run build      # typecheck + bundle
bun run server     # http://localhost:3000
bun run dev        # build + server
```
