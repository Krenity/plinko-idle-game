export class SoundManager {
  private ctx: AudioContext | null = null;
  private buffers: Record<string, AudioBuffer> = {};
  private ready = false;
  private loadedCount = 0;
  private readonly totalCount = 4;
  private muted = false;
  private readonly masterVolume = 0.85;

  private masterCompressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;

  private lastHitTimes: Record<string, number[]> = {
    peg: [],
    collect: [],
    wall: [],
    upgrade: [],
  };

  private static readonly MIN_GAP_MS: Record<string, number> = {
    peg: 60,
    collect: 150,
    wall: 50,
    upgrade: 0,
  };

  private readonly VOLUMES: Record<string, number> = {
    peg: 0.12,
    collect: 0.15,
    wall: 0.10,
    upgrade: 0.25,
  };

  private static readonly SOUNDS: Record<string, string> = {
    peg: "/sounds/peg-hit.mp3",
    collect: "/sounds/collect.mp3",
    wall: "/sounds/wall-hit.mp3",
    upgrade: "/sounds/upgrade.mp3",
  };

  init(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        console.warn("Web Audio API not available");
        setTimeout(() => { this.ready = true; }, 500);
        return;
      }
      this.ctx = new AudioContextClass();

      // Unlock AudioContext on first user interaction (browser autoplay policy)
      const unlock = () => {
        if (this.ctx?.state === "suspended") {
          this.ctx.resume();
          // Force unlock by playing a silent sound (some browsers require actual playback)
          try {
            const osc = this.ctx.createOscillator();
            const silent = this.ctx.createGain();
            silent.gain.value = 0;
            osc.connect(silent);
            silent.connect(this.ctx.destination);
            osc.start(0);
            osc.stop(0.001);
          } catch {}
        }
        document.removeEventListener("click", unlock);
        document.removeEventListener("touchstart", unlock);
        document.removeEventListener("keydown", unlock);
      };
      document.addEventListener("click", unlock, { once: true });
      document.addEventListener("touchstart", unlock, { once: true });
      document.addEventListener("keydown", unlock, { once: true });

      this.masterCompressor = this.ctx.createDynamicsCompressor();
      this.masterCompressor.threshold.setValueAtTime(-16, this.ctx.currentTime);
      this.masterCompressor.knee.setValueAtTime(12, this.ctx.currentTime);
      this.masterCompressor.ratio.setValueAtTime(12, this.ctx.currentTime);
      this.masterCompressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.masterCompressor.release.setValueAtTime(0.15, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

      this.masterCompressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      for (const [key, url] of Object.entries(SoundManager.SOUNDS)) {
        this.loadSound(key, url);
      }

      setTimeout(() => { this.ready = true; }, 3000);
    } catch (e) {
      console.warn("SoundManager init failed:", e);
      setTimeout(() => { this.ready = true; }, 500);
    }
  }

  private async loadSound(key: string, url: string): Promise<void> {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      if (this.ctx) {
        const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
        this.buffers[key] = audioBuffer;
        this.loadedCount++;
        if (this.loadedCount >= this.totalCount) {
          this.ready = true;
        }
      }
    } catch (e) {
      console.warn(`Failed to load sound "${key}":`, e);
    }
  }

  playPegHit(): void { this.playFrom("peg"); }
  playCollect(): void { this.playFrom("collect"); }
  playWallHit(): void { this.playFrom("wall"); }
  playUpgrade(): void { this.playFrom("upgrade"); }

  isReady(): boolean { return this.ready; }
  getLoadProgress(): number { return this.loadedCount / this.totalCount; }

  isMuted(): boolean { return this.muted; }

  toggleMuted(): void {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.masterVolume, this.ctx?.currentTime ?? 0);
    }
  }

  private async playFrom(key: string): Promise<void> {
    if (!this.ready || !this.ctx || !this.masterCompressor) return;

    if (this.ctx.state === "suspended") {
      try { await this.ctx.resume(); } catch {}
    }

    const now = performance.now();

    const times = this.lastHitTimes[key];
    const lastPlayed = times.length > 0 ? times[times.length - 1] : 0;
    const minGap = SoundManager.MIN_GAP_MS[key];
    if (now - lastPlayed < minGap) return;

    const recentHits = times.filter(t => now - t < 350);
    this.lastHitTimes[key] = [...recentHits, now];

    const densityCount = recentHits.length;
    let densityMultiplier = 1.0;
    if (densityCount > 0) {
      densityMultiplier = Math.max(0.35, 1.0 - (densityCount * 0.15));
    }

    const buffer = this.buffers[key];
    if (!buffer) return;

    try {
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      if (key === "peg" || key === "wall") {
        const pitchAscension = Math.min(0.15, densityCount * 0.03);
        const pitchVariation = 0.92 + pitchAscension + (Math.random() * 0.1);
        source.playbackRate.setValueAtTime(pitchVariation, this.ctx.currentTime);
      }

      const gainNode = this.ctx.createGain();
      const baseVolume = this.VOLUMES[key];
      const volumeVariation = baseVolume * (0.85 + Math.random() * 0.3) * densityMultiplier;
      gainNode.gain.setValueAtTime(volumeVariation, this.ctx.currentTime);

      if (key === "peg" || key === "wall") {
        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(6500, this.ctx.currentTime);

        source.connect(filter);
        filter.connect(gainNode);
      } else {
        source.connect(gainNode);
      }

      gainNode.connect(this.masterCompressor);
      source.start(0, 0, key === "peg" || key === "wall" ? 1 : undefined);
    } catch (e) {
      // Silently ignore playback errors (e.g. closed context)
    }
  }
}
