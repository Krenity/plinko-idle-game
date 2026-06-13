import { Application } from "pixi.js";
import { SaveSystem } from "../systems/SaveSystem";
import { ScoreSystem } from "../systems/ScoreSystem";
import { ShardSystem } from "../systems/ShardSystem";
import { UpgradeSystem } from "../systems/UpgradeSystem";
import { HUD } from "../ui/HUD";
import { SidePanel } from "../ui/SidePanel";
import { BOARD, BOARD_WIDTH, COLORS, COMBO, DROPPER, PEG_EFFECTS, PLAY_AREA_WIDTH, PRESTIGE, SLOT_COLORS, BUMPER_FORCE, SHARDS, RELICS } from "../utils/constants";
import { Board } from "./Board";
import { Dropper } from "./Dropper";
import { FloatingTextManager } from "./FloatingText";
import { MultiplierSlot } from "./MultiplierSlot";
import { ParticleSystem } from "./ParticleSystem";
import { PegEffectManager } from "./PegEffectManager";
import { Physics } from "./Physics";
import Matter from "matter-js";

export class Game {
  app!: Application;
  physics: Physics;
  board: Board;
  dropper: Dropper;
  slots: MultiplierSlot[];
  scoreSystem: ScoreSystem;
  upgradeSystem: UpgradeSystem;
  saveSystem: SaveSystem;
  hud: HUD;
  sidePanel!: SidePanel;
  particles!: ParticleSystem;
  floatingTexts!: FloatingTextManager;
  effectManager!: PegEffectManager;
  shardSystem!: ShardSystem;
  private sensorToSlot: Map<Matter.Body, MultiplierSlot> = new Map();

  comboCount: number = 0;
  comboMultiplier: number = 1;

  prestigeLevel: number = 0;
  prestigeMultiplier: number = 1;

  // Relics
  equippedRelics: string[] = [];
  purchasedRelics: string[] = [];
  playTime: number = 0;

  private luckySlotIndex: number = -1;
  private luckySlotTimer: number = 0;
  private luckySlotActive: boolean = false;

  private goldenHourActive: boolean = false;
  private magnetActive: boolean = false;

  constructor() {
    this.physics = new Physics();
    this.board = new Board();
    this.dropper = new Dropper(this);
    this.slots = [];
    this.scoreSystem = new ScoreSystem();
    this.upgradeSystem = new UpgradeSystem(this.scoreSystem);
    this.saveSystem = new SaveSystem(this.scoreSystem, this.upgradeSystem);
    this.hud = new HUD(this);
  }

  async init(): Promise<void> {
    this.app = new Application({
      resizeTo: window,
      backgroundColor: COLORS.background,
      antialias: false,
      resolution: 1,
    });

    const container = document.getElementById("game-container");
    if (container) {
      container.appendChild(this.app.view as HTMLCanvasElement);
    }

    this.scoreSystem.init();
    this.shardSystem = new ShardSystem();
    this.effectManager = new PegEffectManager();
    this.saveSystem.setEffectManager(this.effectManager);
    this.saveSystem.setPrestigeLevelCallbacks(
      () => this.prestigeLevel,
      (v: number) => { this.prestigeLevel = v; },
    );
    this.saveSystem.setShardSystem(this.shardSystem);
    this.saveSystem.setRelicCallbacks(
      () => this.equippedRelics,
      (v: string[]) => { this.equippedRelics = v; },
      () => this.purchasedRelics,
      (v: string[]) => { this.purchasedRelics = v; },
    );
    this.physics.init();
    this.board.init(this.app.stage, this);
    this.createBoardWalls();
    this.particles = new ParticleSystem(this.app.stage);
    this.floatingTexts = new FloatingTextManager(this.app.stage);
    this.createSlots();
    this.setupCollisionHandler();
    this.dropper.init();
    this.hud.init(this.app.stage);
    this.sidePanel = new SidePanel(this);
    this.sidePanel.init();

    this.saveSystem.load();
    // Sync: any equipped relic must also be in purchased (fixes old saves)
    for (const id of this.equippedRelics) {
      if (!this.purchasedRelics.includes(id)) {
        this.purchasedRelics.push(id);
      }
    }
    this.applySavedEffectLevels();
    this.applySlotBonus();
    // Restore dropper speed from loaded upgrade level
    const speedReduction = this.upgradeSystem.getSpeedReduction();
    if (speedReduction > 0) {
      this.dropper.setSpeed(DROPPER.baseInterval - speedReduction);
    }
    this.prestigeMultiplier = 1 + this.prestigeLevel * PRESTIGE.multiplierPerLevel;

    // Auto-drop pattern is restored via saveSystem callbacks

    this.app.ticker.add(() => {
      this.update(this.app.ticker.deltaMS);
    });

    window.addEventListener("beforeunload", () => {
      this.saveSystem.save();
    });
  }

  private applySavedEffectLevels(): void {
    for (const cfg of PEG_EFFECTS) {
      const level = this.upgradeSystem.upgrades[cfg.id] || 0;
      this.effectManager.setLevel(cfg.id, level);
    }
  }

  private applySlotBonus(): void {
    const bonus = this.upgradeSystem.getMultiplierBonus();
    if (bonus > 0) {
      for (const slot of this.slots) {
        slot.addMultiplierBonus(bonus);
      }
    }
  }

  private createBoardWalls(): void {
    const offsetX = this.board.getOffsetX();
    const offsetY = this.board.getOffsetY();
    const topY = offsetY;
    const pegGridBottom = BOARD.pegStartY + (BOARD.pegRows - 1) * BOARD.pegSpacing + BOARD.pegRadius * 2;
    const bottomY = offsetY + pegGridBottom + 60;
    this.physics.createBoardWalls(offsetX, topY, bottomY);
    this.physics.onBlobWallCollision((_blob, side) => {
      this.board.pulseWall(side);
    });
  }

  private createSlots(): void {
    const slotWidth = PLAY_AREA_WIDTH / BOARD.slotCount;
    const offsetY = this.board.getOffsetY();
    const pegGridBottom = BOARD.pegStartY + (BOARD.pegRows - 1) * BOARD.pegSpacing + BOARD.pegRadius * 2;
    const slotY = offsetY + pegGridBottom + 20;
    const offsetX = this.board.getOffsetX();
    const playLeft = offsetX + BOARD.wallThickness;

    for (let i = 0; i < BOARD.slotCount; i++) {
      const slot = new MultiplierSlot(i, slotWidth, slotY, playLeft);
      slot.init(this.app.stage);

      const sensorX = playLeft + i * slotWidth + slotWidth / 2;
      const sensorY = slotY + BOARD.slotHeight / 2;
      const sensor = this.physics.createSlotSensor(sensorX, sensorY, slotWidth, BOARD.slotHeight);
      slot.setSensor(sensor);
      this.sensorToSlot.set(sensor, slot);

      this.slots.push(slot);
    }
  }

  private trackBlip(blob: Matter.Body, effectId: string, amount: number): void {
    if (!(blob as any).effectBumps) (blob as any).effectBumps = {};
    (blob as any).effectBumps[effectId] = ((blob as any).effectBumps[effectId] || 0) + amount;
  }

  private setupCollisionHandler(): void {
    this.physics.onBlobSlotCollision((blob: Matter.Body, slotBody: Matter.Body) => {
      const slot = this.sensorToSlot.get(slotBody);
      if (!slot) return;

      const value = (blob as any).blobValue || 1;
      const pendingMult = (blob as any).pendingMultiplier ?? 1;
      const baseSlotMult = slot.getMultiplier();
      let slotMult = baseSlotMult;

      if (this.luckySlotActive && slot.index === this.luckySlotIndex) {
        slotMult *= 5;
      }

      if (this.goldenHourActive) {
        slotMult += 1;
      }

      const earned = Math.round(value * pendingMult * slotMult * this.comboMultiplier * this.prestigeMultiplier);

      // Attribute earnings to effects
      const bumps: Record<string, number> = (blob as any).effectBumps || {};
      for (const [effId, bumpVal] of Object.entries(bumps)) {
        const contrib = Math.round(Number(bumpVal) * pendingMult * slotMult * this.comboMultiplier * this.prestigeMultiplier);
        this.effectManager.addEarnings(effId, contrib);
      }

      // Golden hour slot bonus
      if (this.goldenHourActive) {
        const ghExtra = Math.round(value * pendingMult * 1 * this.comboMultiplier * this.prestigeMultiplier);
        this.effectManager.addEarnings("goldenHour", ghExtra);
      }

      // Lucky slot 5x bonus
      if (this.luckySlotActive && slot.index === this.luckySlotIndex) {
        const lsExtra = earned - Math.round(value * pendingMult * baseSlotMult * this.comboMultiplier * this.prestigeMultiplier);
        if (lsExtra > 0) {
          this.effectManager.addEarnings("luckySlot", lsExtra);
        }
      }

      this.scoreSystem.addCurrency(earned);
      slot.flash();

      this.floatingTexts.emit(slot.getCenterX(), slot.getCenterY(), earned, 0xffd93d);

      const slotColors = [SLOT_COLORS[slot.index], 0xffffff, 0xffd93d];
      this.particles.emit(slot.getCenterX(), slot.getCenterY(), slotColors, 16);

      this.comboCount = 0;
      this.comboMultiplier = 1;
      this.board.updateCombo(1, false);

      this.dropper.removeBlob(blob);
    });

    this.physics.onBlobPegCollision((blob: Matter.Body, peg: Matter.Body) => {
      const pegIndex = this.board.getPegIndex(peg);
      if (pegIndex === -1) return;

      this.comboCount++;
      const comboMax = this.hasRelic("comboExtender") ? 7.5 : COMBO.maxMultiplier;
      this.comboMultiplier = Math.min(
        comboMax,
        1 + this.comboCount * COMBO.perHitIncrement
      );

      // ── Spring recoil ──
      this.board.onPegHit(pegIndex);
      // ── Combo counter ──
      this.board.updateCombo(this.comboMultiplier, true);

      // ── Shard drop ──
      const shardLevel = this.upgradeSystem.upgrades.shardChance ?? 0;
      let shardChance = SHARDS.baseDropChance + shardLevel * 0.02;
      if (this.hasRelic("shardMagnet")) shardChance *= 2;
      const enchantedMap = this.effectManager.getAllEnchantedPegIndices();
      if (enchantedMap.has(pegIndex)) shardChance += SHARDS.enchantedDropChance;
      if (Math.random() < shardChance) {
        this.shardSystem.addShards(1);
        this.particles.emitShard(peg.position.x, peg.position.y);
      }

      const effectIds = enchantedMap.get(pegIndex);

      if (this.goldenHourActive) {
        (blob as any).blobValue = ((blob as any).blobValue || 1) + 1;
        this.trackBlip(blob, "goldenHour", 1);
      }

      // ── Portal teleport ──
      const exitPegIndex = this.effectManager.getPortalExit(pegIndex);
      if (exitPegIndex !== null) {
        const exitPos = this.board.pegPositions[exitPegIndex];
        if (exitPos) {
          Matter.Body.setPosition(blob, { x: exitPos.x, y: exitPos.y });
          this.board.triggerPortalPulse(pegIndex);
          this.board.triggerPortalPulse(exitPegIndex);
        }
      }

      if (!effectIds || effectIds.length === 0) return;

      const firstColor = PEG_EFFECTS.find((e) => e.id === effectIds[0])?.color ?? COLORS.pegHighlight;
      this.board.flashPeg(pegIndex, firstColor);

      for (const id of effectIds) {
        this.applyPegEffect(id, blob, pegIndex);
        this.effectManager.onPegHit(id, pegIndex);
      }
    });
  }

  hasRelic(id: string): boolean {
    return this.equippedRelics.includes(id);
  }

  private applyPegEffect(effectId: string, blob: Matter.Body, pegIndex?: number): void {
    switch (effectId) {
      case "goldTouch": {
        const addVal = this.hasRelic("goldenTouch2x") ? 6 : 3;
        (blob as any).blobValue += addVal;
        this.trackBlip(blob, "goldTouch", addVal);
        break;
      }
      case "splitShot": {
        if ((blob as any).alreadySplit) break;
        (blob as any).alreadySplit = true;
        const v = (blob as any).blobValue || 1;
        const half = this.hasRelic("splittingHeadache")
          ? Math.max(1, Math.floor(v * 0.35))
          : Math.max(1, Math.floor(v / 2));
        (blob as any).blobValue = half;
        const splitType = (blob as any).blobType || "triangle";
        this.dropper.spawnBlobAt(blob.position.x, blob.position.y, half, splitType);
        // Splitting Headache: split twice
        if (this.hasRelic("splittingHeadache")) {
          this.dropper.spawnBlobAt(blob.position.x, blob.position.y, Math.max(1, Math.floor(half / 2)), splitType);
        }
        break;
      }
      case "treasure": {
        const bonus = 1 + Math.floor(Math.random() * 5);
        (blob as any).blobValue += bonus;
        this.trackBlip(blob, "treasure", bonus);
        break;
      }
      case "doubleDown": {
        const current = (blob as any).pendingMultiplier ?? 1;
        (blob as any).pendingMultiplier = current * 2;
        this.trackBlip(blob, "doubleDown", current);
        break;
      }
      case "jackpot": {
        (blob as any).blobValue += 8;
        this.trackBlip(blob, "jackpot", 8);
        break;
      }
      case "luckySlot": {
        if (!this.luckySlotActive) {
          this.luckySlotIndex = Math.floor(Math.random() * this.slots.length);
          this.luckySlotActive = true;
          this.luckySlotTimer = 15000;
          this.slots[this.luckySlotIndex].flash();
        }
        break;
      }
      case "magnet": {
        this.magnetActive = true;
        break;
      }
      case "goldenHour": {
        this.goldenHourActive = true;
        break;
      }
      case "bumper": {
        if (pegIndex === undefined) break;
        const pegPos = this.board.pegPositions[pegIndex];
        if (!pegPos) break;
        const angle = Math.atan2(blob.position.y - pegPos.y, blob.position.x - pegPos.x);
        this.board.triggerBumperPulse();
        Matter.Body.applyForce(blob, blob.position, {
          x: Math.cos(angle) * BUMPER_FORCE,
          y: Math.sin(angle) * BUMPER_FORCE,
        });
        break;
      }
      case "portal": {
        // Teleport handled in main collision handler via getPortalExit
        break;
      }
    }
  }

  getLuckySlotTimer(): number {
    return this.luckySlotActive ? this.luckySlotTimer : -1;
  }

  getLuckySlotIndex(): number {
    return this.luckySlotActive ? this.luckySlotIndex : -1;
  }

  isGoldenHourActive(): boolean {
    return this.goldenHourActive;
  }

  isMagnetActive(): boolean {
    return this.magnetActive;
  }

  // Prestige
  getPrestigeThreshold(): number {
    return Math.floor(PRESTIGE.thresholdBase * PRESTIGE.thresholdGrowth ** this.prestigeLevel);
  }

  canPrestige(): boolean {
    return this.scoreSystem.getTotalEarned() >= this.getPrestigeThreshold()
      && this.prestigeLevel < PRESTIGE.maxLevel;
  }

  doPrestige(): void {
    if (!this.canPrestige()) return;

    this.prestigeLevel++;
    this.prestigeMultiplier = 1 + this.prestigeLevel * PRESTIGE.multiplierPerLevel;

    this.dropper.killAllBlobs();
    this.scoreSystem.setCurrency(0);
    this.scoreSystem.setTotalEarned(0);
    this.shardSystem.setShards(0);
    this.shardSystem.setTotalEarned(0);

    const freshUpgrades: Record<string, number> = {};
    for (const key of Object.keys(this.upgradeSystem.upgrades)) {
      freshUpgrades[key] = 0;
    }
    this.upgradeSystem.setUpgrades(freshUpgrades);

    this.effectManager.reset();

    this.dropper.setSpeed(DROPPER.baseInterval);
    for (const slot of this.slots) {
      slot.resetMultiplierBonus();
    }

    this.comboCount = 0;
    this.comboMultiplier = 1;

    this.luckySlotActive = false;
    this.luckySlotTimer = 0;
    this.luckySlotIndex = -1;
    this.goldenHourActive = false;
    this.magnetActive = false;

    this.saveSystem.save();
  }

  doMasterReset(): void {
    this.dropper.killAllBlobs();

    this.scoreSystem.setCurrency(0);
    this.scoreSystem.setTotalEarned(0);
    this.shardSystem.setShards(0);
    this.shardSystem.setTotalEarned(0);

    this.prestigeLevel = 0;
    this.prestigeMultiplier = 1;

    this.equippedRelics = [];
    this.purchasedRelics = [];

    const freshUpgrades: Record<string, number> = {};
    for (const key of Object.keys(this.upgradeSystem.upgrades)) {
      freshUpgrades[key] = 0;
    }
    this.upgradeSystem.setUpgrades(freshUpgrades);

    this.effectManager.reset();

    this.dropper.setSpeed(DROPPER.baseInterval);
    for (const slot of this.slots) {
      slot.resetMultiplierBonus();
    }

    this.comboCount = 0;
    this.comboMultiplier = 1;
    this.luckySlotActive = false;
    this.luckySlotTimer = 0;
    this.luckySlotIndex = -1;
    this.goldenHourActive = false;
    this.magnetActive = false;

    this.saveSystem.save();
  }

  private accumulateEnchantedPegMap(): Map<number, number[]> {
    const raw = this.effectManager.getAllEnchantedPegIndices();
    const colorMap = new Map<number, number[]>();
    for (const [pegIdx, effectIds] of raw) {
      const colors = effectIds.map((id) => PEG_EFFECTS.find((e) => e.id === id)?.color ?? COLORS.pegHighlight);
      colorMap.set(pegIdx, colors);
    }
    return colorMap;
  }

  private accumulator: number = 0;
  private readonly FIXED_DELTA: number = 16.667;

  update(delta: number): void {
    this.accumulator += Math.min(delta, 50);

    while (this.accumulator >= this.FIXED_DELTA) {
      this.physics.update(this.FIXED_DELTA);
      this.accumulator -= this.FIXED_DELTA;
    }

    this.effectManager.update(delta);

    // ── Sync bumper/portal pegs with Board ──
    const bumperState = this.effectManager.getState("bumper");
    if (bumperState?.status === "active") {
      this.board.setBumperPegs(bumperState.enchantedPegs);
    } else {
      this.board.setBumperPegs(new Set());
    }

    const portalState = this.effectManager.getState("portal");
    if (portalState?.status === "active") {
      this.board.setPortalPegs(portalState.enchantedPegs);
      // Update portal vortex positions
      const vortices = [];
      for (const idx of portalState.enchantedPegs) {
        const pos = this.board.pegPositions[idx];
        if (pos) vortices.push({ x: pos.x, y: pos.y, color: COLORS.violet });
      }
      this.particles.setPortalVortices(vortices);
    } else {
      this.board.setPortalPegs(new Set());
      this.particles.clearPortalVortices();
    }

    // ── Magnet ──
    const magnetState = this.effectManager.getState("magnet");
    this.magnetActive = magnetState?.status === "active";

    if (this.luckySlotActive) {
      this.luckySlotTimer -= delta;
      if (this.luckySlotTimer <= 0) {
        this.luckySlotActive = false;
        this.luckySlotTimer = 0;
        this.luckySlotIndex = -1;
      }
    }

    const goldenState = this.effectManager.getState("goldenHour");
    this.goldenHourActive = goldenState?.status === "active";

    if (this.magnetActive) {
      this.applyMagnetForce();
    }

    this.board.redrawPegs(this.accumulateEnchantedPegMap());

    this.dropper.update(delta);
    this.board.update(delta);

    for (const slot of this.slots) {
      slot.update(delta);
    }

    this.particles.update(delta);
    this.floatingTexts.update(delta);
    this.playTime += delta;
    this.hud.update();
  }

  private applyMagnetForce(): void {
    const offsetX = this.board.getOffsetX();
    const centerX = offsetX + BOARD_WIDTH / 2;
    const forceMagnitude = 0.0003;

    for (const body of this.physics.bodies) {
      if ((body as any).blobValue !== undefined) {
        const dx = centerX - body.position.x;
        const normalized = Math.sign(dx);
        Matter.Body.applyForce(body, body.position, {
          x: normalized * forceMagnitude,
          y: 0,
        });
      }
    }
  }
}
