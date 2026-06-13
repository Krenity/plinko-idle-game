# Plinko Idle

An idle/incremental game built with PixiJS and Matter.js. A dropper spawns colored shapes that bounce through pegs into multiplier slots. Earn currency, buy upgrades, unlock effects, collect shards, and prestige for permanent multipliers.

## Quick Start

```bash
bun install
bun run build
bun run server
```

Open `http://localhost:3000` in a browser (minimum 1215px wide).

## Tech Stack

| Layer | Library |
|-------|---------|
| Runtime | [Bun](https://bun.sh) |
| Rendering | PixiJS 7 |
| Physics | Matter.js |
| Audio | Web Audio API |
| Linting | Biome |
| Save | localStorage |

## Project Structure

```
src/
├── main.ts                     Entry point, loading screen, size warning
├── game/
│   ├── Game.ts                 Main loop, collision handlers, effects, prestige
│   ├── Board.ts                Peg grid, walls, peg flash/repaint
│   ├── Blob.ts                 Shape rendering (7 types), die animation
│   ├── Dropper.ts              Blob spawning, sweep animation
│   ├── Physics.ts              Matter.js engine, collision event dispatch
│   ├── MultiplierSlot.ts       Slot visuals, flash, drop bounce
│   ├── ParticleSystem.ts       Particle effects on collection
│   ├── FloatingText.ts         "+amount" text animation
│   └── PegEffectManager.ts     Effect lifecycle, enchanted peg tracking
├── systems/
│   ├── ScoreSystem.ts          Currency, total earned, rolling rates
│   ├── UpgradeSystem.ts        Cost calculation, purchase logic
│   ├── ShardSystem.ts          Shard balance and tracking
│   └── SaveSystem.ts           localStorage persistence
├── ui/
│   ├── LeftDashboard.ts        Stats panel (balance, rates, shards, recent drops)
│   ├── RightDashboard.ts       Effects / Upgrades / Relics tabs, help tooltip
│   └── LoadingScreen.ts        Splash screen with spinner progress
├── audio/
│   └── SoundManager.ts         Web Audio API pool with compressor, dampening, filters
└── utils/
    └── constants.ts            All game configuration
```

## Game Mechanics

### Core Loop

1. Dropper sweeps side-to-side spawning blobs
2. Blobs fall through pegs with Matter.js physics
3. Multiplier slots collect at bottom — earnings scale with blob value, slot multiplier, combo, and prestige
4. Currency buys upgrades: faster spawning, higher slot values, new shapes, and special effects

### Combo

- +0.1× per peg hit, max 5× (7.5× with Combo Extender relic)
- Resets when any blob lands in a slot

### Shapes (7)

Unlocked sequentially: Triangle → Square → Circle → Diamond → Pentagon → Hexagon → Star. Each has higher base value (1–7) and larger radius.

### Multiplier Slots (9)

`[0.5×, 1×, 2×, 3×, 5×, 3×, 2×, 1×, 0.5×]` — center highest, edges lowest. Slot Multiplier upgrade adds a permanent bonus.

### Peg Effects (8)

Effects auto-activate on cooldown cycles. Each enchants a random subset of pegs with visual feedback:

| Effect | Description |
|--------|-------------|
| Gold Touch | +3 value per hit |
| Split Shot | Blob splits in two on hit |
| Treasure | +1–5 random value per hit |
| Double Down | 2× pending multiplier per hit |
| Jackpot | +8 value per hit |
| Lucky Slot | Random slot gets 5× |
| Magnet | Pulls all blobs toward center |
| Golden Hour | All pegs +1 value, all slots +1× |

### Shards & Relics

- Peg hits have a 1% base chance to drop a shard (◆); enchanted pegs add extra chance
- Shards purchase relics from the Relics tab
- Equipped relics provide passive bonuses (e.g. Combo Extender, Shard Magnet, Lucky Coin)
- Relics tab sorted by cost: Equipped / Collection / For Sale sections

### Prestige

- Threshold: `100000 × 3^level`
- Gain: +0.5× permanent multiplier per level
- Max: 10 levels
- Resets currency, upgrades, effect levels

### Upgrades

General upgrades ordered: Dropper Speed → Upgrade Slots → Shard Chance → Relic Slots.

Effect upgrades appear in the Effects tab, sorted by cost ascending.

### Master Reset

Single-step dialog with "RESET" confirmation — erases all progress including prestige, relics, and shards.

## Audio

Built on Web Audio API with:
- **Master dynamics compressor** (−16dB threshold, 12:1 ratio) — prevents digital clipping
- **Dynamic dampening** — 350ms sliding window reduces volume during dense hit clusters (floor 35%)
- **Low-pass filter** (6500 Hz) — softens high-frequency harshness on collisions
- **Pitch variation** — random ±10% per hit for organic feel
- **Consecutive pitch ascension** — +3% per hit up to +15% during rapid hits
- **Per-sound throttling** — prevents overlap stacking on peg/wall/collect sounds
- **AudioContext unlock** on first user click for autoplay policy compliance

## UI Layout

- **Left sidebar** (200px, opaque `#16162e`): Balance, rates, total earned, active blobs, FPS, shards, recent drops
- **Right sidebar** (240px, opaque `#16162e`): Effects / Upgrades / Relics tabbed panel
- **Help button** (top-right, squared): Tooltip with combo, shard, effect, relic, prestige info
- **Mute button** (top-right, below help): Toggle sound on/off
- **Loading screen**: Blurred overlay with CSS spinner and percentage counter
- **Size warning**: Popup when viewport is narrower than 1215px

## Scripts

| Command | Description |
|---------|-------------|
| `bun run build` | Type-check + bundle to `dist/main.js` |
| `bun run server` | Start dev server at `localhost:3000` |
| `bun run dev` | Build + server |
| `bun run lint` | Biome lint |
| `bun run format` | Biome format |

## License

MIT
