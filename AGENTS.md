# Plinko Idle Game

An idle/incremental game with plinko physics. Blobs fall through pegs, collect value from multiplier slots, and earn currency for upgrades.

## Build Commands

- `bun install` - Install dependencies
- `bun run dev` - Start dev server with hot reload
- `bun run build` - Build for production
- `bun run lint` - Run Biome linter
- `bun run format` - Run Biome formatter
- `bun run typecheck` - Run TypeScript type check

## Tech Stack

- **Runtime**: Bun
- **Rendering**: PixiJS 8
- **Physics**: Matter.js
- **Linting**: Biome
- **Save**: LocalStorage

## Project Structure

- `src/game/` - Core game logic (Game, Dropper, Blob, Board, Physics, MultiplierSlot)
- `src/systems/` - Systems (ScoreSystem, UpgradeSystem, SaveSystem)
- `src/ui/` - UI components (HUD, UpgradePanel)
- `src/utils/` - Constants and helpers

## Conventions

- TypeScript strict mode enabled
- Flat color shapes only (no textures, no gradients)
- Dark background color: #1a1a2e
- Simple pixel aesthetic inspired by The Gnorp Apologue
- OS-style windowed UI for upgrade panels
- All game state persisted to LocalStorage

## Game Design

- Dropper spawns blob shapes at top
- Blobs fall through peg grid (plinko physics)
- Multiplier slots at bottom collect blobs
- Currency earned based on shape value x slot multiplier
- Upgrades: dropper speed, new shapes, slot multipliers
