import type { SoundscapeType } from './types';

/**
 * 100% Offline Ambient Soundscape Synthesizer using Web Audio API.
 * Generates brown noise, rainfall, 40Hz gamma focus waves, and ambient pads
 * without any external audio files or network requests.
 */
class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: AudioNode[] = [];
  private activeSource: AudioBufferSourceNode | null = null;
  private activeType: SoundscapeType = 'none';
  private volume: number = 0.45;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public getActiveType(): SoundscapeType {
    return this.activeType;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.masterGain) {
      try {
        this.masterGain.gain.setTargetAtTime(this.volume * 0.35, this.ctx.currentTime, 0.05);
      } catch {
        // Ignore audio scheduling errors
      }
    }
  }

  public stop(): void {
    this.activeType = 'none';

    if (this.activeSource) {
      try {
        this.activeSource.stop();
        this.activeSource.disconnect();
      } catch {
        // Already stopped
      }
      this.activeSource = null;
    }

    for (const node of this.activeNodes) {
      try {
        if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
          (node as OscillatorNode).stop();
        }
        node.disconnect();
      } catch {
        // Ignore cleanup errors
      }
    }
    this.activeNodes = [];

    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {
        // Ignore
      }
      this.masterGain = null;
    }
  }

  public play(type: SoundscapeType): void {
    if (type === this.activeType && type !== 'none') return;
    this.stop();

    if (type === 'none') return;

    const ctx = this.getContext();
    if (!ctx) return;

    this.activeType = type;

    try {
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, ctx.currentTime);
      master.gain.linearRampToValueAtTime(this.volume * 0.35, ctx.currentTime + 0.6);
      master.connect(ctx.destination);
      this.masterGain = master;

      if (type === 'brown_noise') {
        this.startBrownNoise(ctx, master);
      } else if (type === 'rain') {
        this.startRainNoise(ctx, master);
      } else if (type === 'gamma_40hz') {
        this.startGammaFocus(ctx, master);
      } else if (type === 'lofi_pad') {
        this.startAmbientPad(ctx, master);
      }
    } catch {
      this.stop();
    }
  }

  private createNoiseBuffer(ctx: AudioContext, seconds = 4): AudioBuffer {
    const bufferSize = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.2;
    }
    return buffer;
  }

  private startBrownNoise(ctx: AudioContext, dest: AudioNode): void {
    const buffer = this.createNoiseBuffer(ctx, 5);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 340;

    source.connect(filter);
    filter.connect(dest);
    source.start();

    this.activeSource = source;
    this.activeNodes.push(filter);
  }

  private startRainNoise(ctx: AudioContext, dest: AudioNode): void {
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Pink-ish noise algorithm for natural rain texture
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
      b6 = white * 0.115926;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 1100;
    bandpass.Q.value = 0.5;

    source.connect(bandpass);
    bandpass.connect(dest);
    source.start();

    this.activeSource = source;
    this.activeNodes.push(bandpass);
  }

  private startGammaFocus(ctx: AudioContext, dest: AudioNode): void {
    // Carrier at 200Hz + 240Hz = 40Hz Gamma beat + soft warm sub at 100Hz
    const freqs = [
      { f: 200, gain: 0.18, type: 'sine' as OscillatorType },
      { f: 240, gain: 0.18, type: 'sine' as OscillatorType },
      { f: 100, gain: 0.12, type: 'sine' as OscillatorType },
    ];

    for (const item of freqs) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = item.type;
      osc.frequency.value = item.f;
      gain.gain.value = item.gain;
      osc.connect(gain);
      gain.connect(dest);
      osc.start();
      this.activeNodes.push(osc, gain);
    }
  }

  private startAmbientPad(ctx: AudioContext, dest: AudioNode): void {
    // Warm Cmaj9 soft ambient drone (C3, G3, D4, E4)
    const freqs = [130.81, 196.0, 293.66, 329.63];
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    filter.connect(dest);
    this.activeNodes.push(filter);

    for (const f of freqs) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      gain.gain.value = 0.09;
      osc.connect(gain);
      gain.connect(filter);
      osc.start();
      this.activeNodes.push(osc, gain);
    }
  }
}

export const soundscapeEngine = new SoundscapeEngine();
