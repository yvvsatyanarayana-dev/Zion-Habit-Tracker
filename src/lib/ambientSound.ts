/**
 * Built-in Real-time Ambient Sound Synthesizer (Web Audio API)
 * 100% offline, zero audio asset downloads.
 */

export type AmbientSoundType = 'none' | 'brown_noise' | 'white_noise' | 'rain' | 'gamma_40hz';

class AmbientSoundEngine {
  private audioCtx: AudioContext | null = null;
  private currentType: AmbientSoundType = 'none';
  private gainNode: GainNode | null = null;
  private activeNodes: Array<AudioNode | { stop?: () => void; disconnect: () => void }> = [];
  private volume: number = 0.35;

  private initCtx(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public getCurrentType(): AmbientSoundType {
    return this.currentType;
  }

  public stop(): void {
    if (this.gainNode && this.audioCtx) {
      // Gentle fade out
      this.gainNode.gain.linearRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.3);
      setTimeout(() => {
        this.cleanup();
      }, 350);
    } else {
      this.cleanup();
    }
    this.currentType = 'none';
  }

  private cleanup(): void {
    for (const node of this.activeNodes) {
      try {
        if ('stop' in node && typeof node.stop === 'function') node.stop();
        node.disconnect();
      } catch {}
    }
    this.activeNodes = [];
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch {}
      this.gainNode = null;
    }
  }

  public play(type: AmbientSoundType): void {
    if (type === 'none') {
      this.stop();
      return;
    }

    this.cleanup();
    const ctx = this.initCtx();
    this.currentType = type;

    this.gainNode = ctx.createGain();
    this.gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(this.volume, ctx.currentTime + 0.6); // smooth fade in
    this.gainNode.connect(ctx.destination);

    if (type === 'white_noise') {
      this.generateWhiteNoise(ctx, this.gainNode);
    } else if (type === 'brown_noise') {
      this.generateBrownNoise(ctx, this.gainNode);
    } else if (type === 'rain') {
      this.generateRainSound(ctx, this.gainNode);
    } else if (type === 'gamma_40hz') {
      this.generateGammaBinaural(ctx, this.gainNode);
    }
  }

  private generateWhiteNoise(ctx: AudioContext, destination: GainNode): void {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    // Filter high piercing frequencies
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, ctx.currentTime);

    noise.connect(filter);
    filter.connect(destination);
    noise.start();
    this.activeNodes.push(noise, filter);
  }

  private generateBrownNoise(ctx: AudioContext, destination: GainNode): void {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5; // Compensate for volume drop
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, ctx.currentTime);

    noise.connect(filter);
    filter.connect(destination);
    noise.start();
    this.activeNodes.push(noise, filter);
  }

  private generateRainSound(ctx: AudioContext, destination: GainNode): void {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.05 * white) / 1.05;
      lastOut = data[i];
      data[i] *= 2.8;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(1400, ctx.currentTime);

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(180, ctx.currentTime);

    noise.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(destination);
    noise.start();
    this.activeNodes.push(noise, lowpass, highpass);
  }

  private generateGammaBinaural(ctx: AudioContext, destination: GainNode): void {
    // 210Hz left ear + 250Hz right ear = 40Hz Gamma Focus Frequency
    const baseFreq = 210;
    const beatFreq = 40;

    const merger = ctx.createChannelMerger(2);

    const oscLeft = ctx.createOscillator();
    oscLeft.type = 'sine';
    oscLeft.frequency.setValueAtTime(baseFreq, ctx.currentTime);

    const oscRight = ctx.createOscillator();
    oscRight.type = 'sine';
    oscRight.frequency.setValueAtTime(baseFreq + beatFreq, ctx.currentTime);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.18, ctx.currentTime);

    oscLeft.connect(merger, 0, 0);
    oscRight.connect(merger, 0, 1);
    merger.connect(subGain);
    subGain.connect(destination);

    oscLeft.start();
    oscRight.start();
    this.activeNodes.push(oscLeft, oscRight, merger, subGain);
  }
}

export const ambientSound = new AmbientSoundEngine();
