// Game Colors
export const COLORS = {
  background: 0x121224,
  peg: 0x3a3a5a,
  pegHighlight: 0x5a5a7a,
  triangle: 0xffffff,
  square: 0x00d4ff,
  circle: 0xff6b9d,
  diamond: 0xffd93d,
  pentagon: 0xff8844,
  hexagon: 0x4488ff,
  star: 0xdd88ff,
  slotLow: 0x1a1a32,
  slotMid: 0x2a2a4a,
  slotHigh: 0x3a2a4a,
  text: 0xffffff,
  uiBg: 0x1a1a32,
  uiBorder: 0x2a2a4a,
  gold: 0xffd93d,
  cyan: 0x00d4ff,
  green: 0x44ff88,
  purple: 0xcc66ff,
  red: 0xff4466,
  orange: 0xff8844,
  blue: 0x4488ff,
  violet: 0xdd88ff,
} as const;

// Board config
export const BOARD = {
  pegRows: 9,
  pegCols: 13,
  pegRadius: 5,
  pegSpacing: 50,
  pegWallGap: 30,
  wallThickness: 6,
  pegStartY: 120,
  slotCount: 9,
  slotHeight: 40,
  height: 650,
} as const;

const _b = BOARD;
export const PEG_SPAN = (_b.pegCols - 1) * _b.pegSpacing;
export const PEG_EXTENT = PEG_SPAN + _b.pegRadius * 2;
export const PLAY_AREA_WIDTH = PEG_EXTENT + _b.pegWallGap * 2;
export const BOARD_WIDTH = PLAY_AREA_WIDTH + _b.wallThickness * 2;

export const TOTAL_PEGS = BOARD.pegRows % 2 === 0
  ? (BOARD.pegRows / 2) * (BOARD.pegCols + (BOARD.pegCols - 1))
  : (Math.floor(BOARD.pegRows / 2)) * (BOARD.pegCols + (BOARD.pegCols - 1)) + BOARD.pegCols;

// Blob Types
export interface BlobType {
  name: string;
  value: number;
  color: number;
  radius: number;
  restitution: number;
}

export const BLOB_TYPES: Record<string, BlobType> = {
  triangle: { name: "triangle", value: 1, color: COLORS.triangle, radius: 7, restitution: 0.6 },
  square: { name: "square", value: 2, color: COLORS.square, radius: 9, restitution: 0.5 },
  circle: { name: "circle", value: 3, color: COLORS.circle, radius: 10, restitution: 0.8 },
  diamond: { name: "diamond", value: 4, color: COLORS.diamond, radius: 9, restitution: 0.7 },
  pentagon: { name: "pentagon", value: 5, color: COLORS.pentagon, radius: 10, restitution: 0.6 },
  hexagon: { name: "hexagon", value: 6, color: COLORS.hexagon, radius: 11, restitution: 0.7 },
  star: { name: "star", value: 7, color: COLORS.star, radius: 10, restitution: 0.9 },
};

// Slot Colors
export const SLOT_COLORS = [
  0x2d2d4a, 0x2d4a6a, 0x3d5a4a, 0x5a4a3a,
  0x7a5a2a, 0x5a4a3a, 0x3d5a4a, 0x2d4a6a,
  0x2d2d4a,
];

// Slot Multipliers
export const SLOT_MULTIPLIERS = [0.5, 1, 2, 3, 5, 3, 2, 1, 0.5];

// Dropper Settings
export const DROPPER = {
  baseInterval: 1000,
  minInterval: 200,
  spawnY: 0,
} as const;

// Shape unlock chain — ordered linearly
export const SHAPE_UNLOCK_CHAIN = [
  "unlockSquare",
  "unlockCircle",
  "unlockDiamond",
  "unlockPentagon",
  "unlockHexagon",
  "unlockStar",
] as const;

// Shape unlock upgrade keys mapped to the type they unlock
export const SHAPE_UNLOCK_TO_TYPE: Record<string, string> = {
  unlockSquare: "square",
  unlockCircle: "circle",
  unlockDiamond: "diamond",
  unlockPentagon: "pentagon",
  unlockHexagon: "hexagon",
  unlockStar: "star",
};

// Combo config
export const COMBO = {
  perHitIncrement: 0.1,
  maxMultiplier: 5.0,
} as const;

// Prestige config
export const PRESTIGE = {
  thresholdBase: 100000,
  thresholdGrowth: 3.0,
  multiplierPerLevel: 0.5,
  maxLevel: 10,
} as const;

// Peg Effect configs
export interface PegEffectConfig {
  id: string;
  name: string;
  desc: string;
  color: number;
  bgColor: string;
  baseDuration: number;
  baseCooldown: number;
  durationUpgrade: number;
  cooldownUpgrade: number;
  basePegCount: number;
  pegCountUpgrade: number;
}

export const PEG_EFFECTS: PegEffectConfig[] = [
  {
    id: "goldTouch", name: "Gold Touch", desc: "+3 value per enchanted peg hit",
    color: COLORS.gold, bgColor: "#5a4a1a",
    baseDuration: 30000, baseCooldown: 45000, durationUpgrade: 5000, cooldownUpgrade: 4000,
    basePegCount: 6, pegCountUpgrade: 2,
  },
  {
    id: "splitShot", name: "Split Shot", desc: "Blobs split in two on hit",
    color: COLORS.cyan, bgColor: "#1a3a5a",
    baseDuration: 20000, baseCooldown: 60000, durationUpgrade: 3000, cooldownUpgrade: 5000,
    basePegCount: 4, pegCountUpgrade: 1,
  },
  {
    id: "treasure", name: "Treasure", desc: "+1-5 random value per enchanted peg hit",
    color: COLORS.green, bgColor: "#1a4a2a",
    baseDuration: 25000, baseCooldown: 50000, durationUpgrade: 4000, cooldownUpgrade: 4000,
    basePegCount: 5, pegCountUpgrade: 2,
  },
  {
    id: "doubleDown", name: "Double Down", desc: "2x multiplier per enchanted peg hit",
    color: COLORS.purple, bgColor: "#3a1a5a",
    baseDuration: 15000, baseCooldown: 75000, durationUpgrade: 3000, cooldownUpgrade: 6000,
    basePegCount: 3, pegCountUpgrade: 1,
  },
  {
    id: "jackpot", name: "Jackpot", desc: "+8 value per enchanted peg hit",
    color: COLORS.red, bgColor: "#5a1a1a",
    baseDuration: 10000, baseCooldown: 90000, durationUpgrade: 2000, cooldownUpgrade: 7000,
    basePegCount: 2, pegCountUpgrade: 1,
  },
  {
    id: "luckySlot", name: "Lucky Slot", desc: "Random slot gets 5x multiplier",
    color: COLORS.gold, bgColor: "#5a5a1a",
    baseDuration: 15000, baseCooldown: 80000, durationUpgrade: 2000, cooldownUpgrade: 6000,
    basePegCount: 4, pegCountUpgrade: 1,
  },
  {
    id: "magnet", name: "Magnet", desc: "Briefly pulls blobs toward center",
    color: COLORS.blue, bgColor: "#1a1a5a",
    baseDuration: 1000, baseCooldown: 80000, durationUpgrade: 100, cooldownUpgrade: 5000,
    basePegCount: 5, pegCountUpgrade: 2,
  },
  {
    id: "goldenHour", name: "Golden Hour", desc: "All pegs +1 value, slots +1x",
    color: COLORS.gold, bgColor: "#5a5a0a",
    baseDuration: 10000, baseCooldown: 120000, durationUpgrade: 1500, cooldownUpgrade: 8000,
    basePegCount: 0, pegCountUpgrade: 0,
  },
  {
    id: "bumper", name: "Power Bumpers", desc: "Enchanted pegs fling blobs outward",
    color: COLORS.orange, bgColor: "#5a3a1a",
    baseDuration: 20000, baseCooldown: 60000, durationUpgrade: 3000, cooldownUpgrade: 5000,
    basePegCount: 4, pegCountUpgrade: 1,
  },
  {
    id: "portal", name: "Portal Pegs", desc: "Paired wormholes teleport blobs across the board",
    color: COLORS.violet, bgColor: "#3a1a4a",
    baseDuration: 25000, baseCooldown: 70000, durationUpgrade: 3000, cooldownUpgrade: 5000,
    basePegCount: 6, pegCountUpgrade: 2,
  },
];

// ── Peg Effect additions: bumper + portal ──

export const BUMPER_FORCE = 0.08;

// ── Shard config ──

export const SHARDS = {
  baseDropChance: 0.05,
  enchantedDropChance: 0.15,
  prestigeDropBonus: 0.02,
} as const;

// ── Relic configs ──

export interface RelicConfig {
  id: string;
  name: string;
  desc: string;
  cost: number;
  effect: string;
  value: number;
}

export const RELICS: RelicConfig[] = [
  {
    id: "splittingHeadache",
    name: "Splitting Headache",
    desc: "Split Shot triggers twice, but split blobs have -30% base value",
    cost: 250,
    effect: "doubleSplit",
    value: 0.7,
  },
  {
    id: "centripetalPull",
    name: "Centripetal Pull",
    desc: "Magnet duration doubled, slots compressed closer to center",
    cost: 400,
    effect: "magnetDoubled",
    value: 2.0,
  },
  {
    id: "heavyMetal",
    name: "Heavy Metal",
    desc: "Blobs fall 50% faster, but slot baselines +2x",
    cost: 600,
    effect: "fastFall",
    value: 1.5,
  },
  {
    id: "shardMagnet",
    name: "Shard Magnet",
    desc: "Doubles shard drop chance",
    cost: 300,
    effect: "shardDoubled",
    value: 2.0,
  },
  {
    id: "comboExtender",
    name: "Combo Extender",
    desc: "Combo max raised to 7.5x instead of 5x",
    cost: 500,
    effect: "comboMax",
    value: 7.5,
  },
  {
    id: "goldenTouch2x",
    name: "Golden Touch 2x",
    desc: "Gold Touch adds +6 instead of +3",
    cost: 450,
    effect: "goldTouchDouble",
    value: 2.0,
  },
  {
    id: "timeFreeze",
    name: "Time Freeze",
    desc: "Pause all effects — cooldowns tick but nothing activates. Unpause fires all ready effects at once",
    cost: 800,
    effect: "timeFreeze",
    value: 1.0,
  },
];

// ── Auto-drop config ──

export interface AutoDropPattern {
  name: string;
  shapes: string[];
}

export const AUTO_DROP_PATTERNS: AutoDropPattern[] = [
  { name: "Triangle Spam", shapes: ["triangle", "triangle", "triangle", "triangle", "triangle"] },
  { name: "Combo Build", shapes: ["triangle", "square", "circle", "diamond", "pentagon"] },
  { name: "Value Rush", shapes: ["hexagon", "star", "hexagon", "star", "hexagon"] },
  { name: "Balanced", shapes: ["triangle", "square", "circle", "square", "triangle"] },
  { name: "Star Power", shapes: ["star", "star", "star", "star", "star"] },
];

// Upgrade configs
export const UPGRADES: Record<string, { baseCost: number; costMultiplier: number; effect: number; maxLevel: number }> = {
  dropperSpeed: { baseCost: 50, costMultiplier: 1.8, effect: 100, maxLevel: 15 },
  slotMultiplier: { baseCost: 500, costMultiplier: 2.5, effect: 0.5, maxLevel: 10 },
  unlockSquare: { baseCost: 100, costMultiplier: 2.0, effect: 1, maxLevel: 1 },
  unlockCircle: { baseCost: 250, costMultiplier: 2.0, effect: 1, maxLevel: 1 },
  unlockDiamond: { baseCost: 500, costMultiplier: 2.0, effect: 1, maxLevel: 1 },
  unlockPentagon: { baseCost: 1000, costMultiplier: 2.0, effect: 1, maxLevel: 1 },
  unlockHexagon: { baseCost: 2000, costMultiplier: 2.0, effect: 1, maxLevel: 1 },
  unlockStar: { baseCost: 4000, costMultiplier: 2.0, effect: 1, maxLevel: 1 },
  goldTouch: { baseCost: 300, costMultiplier: 2.0, effect: 1, maxLevel: 5 },
  splitShot: { baseCost: 500, costMultiplier: 2.2, effect: 1, maxLevel: 5 },
  treasure: { baseCost: 400, costMultiplier: 2.0, effect: 1, maxLevel: 5 },
  doubleDown: { baseCost: 800, costMultiplier: 2.5, effect: 1, maxLevel: 5 },
  jackpot: { baseCost: 1200, costMultiplier: 2.5, effect: 1, maxLevel: 5 },
  luckySlot: { baseCost: 1500, costMultiplier: 2.5, effect: 1, maxLevel: 5 },
  magnet: { baseCost: 1000, costMultiplier: 2.2, effect: 1, maxLevel: 5 },
  goldenHour: { baseCost: 2000, costMultiplier: 3.0, effect: 1, maxLevel: 5 },
  bumper: { baseCost: 1500, costMultiplier: 2.5, effect: 1, maxLevel: 5 },
  portal: { baseCost: 1800, costMultiplier: 2.8, effect: 1, maxLevel: 5 },
  relicSlots: { baseCost: 10000, costMultiplier: 3.5, effect: 1, maxLevel: 2 },
  shardChance: { baseCost: 2000, costMultiplier: 2.5, effect: 0.02, maxLevel: 10 },
};

// Physics
export const PHYSICS = {
  gravity: 0.6,
  timeScale: 1,
  blobDensity: 0.002,
  blobFrictionAir: 0.002,
  pegRestitution: 0.9,
} as const;
