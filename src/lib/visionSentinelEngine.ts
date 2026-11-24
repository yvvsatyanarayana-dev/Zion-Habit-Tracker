export type SentinelFocusState = 'LOCKED_IN' | 'DRIFTING' | 'AWAY' | 'INITIALIZING';

export interface SentinelTelemetry {
  focusState: SentinelFocusState;
  attentionScore: number; // 0 - 100%
  movementVelocity: number; // 0 - 100
  facePresent: boolean;
  totalSeconds: number;
  lockedInSeconds: number;
  driftingSeconds: number;
  awaySeconds: number;
  integrityPercentage: number;
}

export interface ProofOfWorkReceipt {
  certificateId: string;
  sha256Hash: string;
  habitId: string;
  habitName: string;
  dateStr: string;
  timestamp: string;
  durationMinutes: number;
  integrityScore: number;
  verifiedStatus: 'AI_CERTIFIED_OFFLINE';
}

export class VisionSentinelEngine {
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private stream: MediaStream | null = null;
  private prevFrameData: Uint8ClampedArray | null = null;
  private processInterval: NodeJS.Timeout | null = null;
  private isStopping: boolean = false;
  private isDisposed: boolean = false;
  private isShutterClosed: boolean = false;

  private telemetry: SentinelTelemetry = {
    focusState: 'INITIALIZING',
    attentionScore: 92,
    movementVelocity: 10,
    facePresent: true,
    totalSeconds: 0,
    lockedInSeconds: 0,
    driftingSeconds: 0,
    awaySeconds: 0,
    integrityPercentage: 100,
  };

  private onUpdateCallback: ((telemetry: SentinelTelemetry) => void) | null = null;

  public async start(
    videoEl: HTMLVideoElement,
    onUpdate: (telemetry: SentinelTelemetry) => void
  ): Promise<boolean> {
    this.videoElement = videoEl;
    this.onUpdateCallback = onUpdate;
    this.isStopping = false;
    this.isDisposed = false;

    if (!navigator?.mediaDevices?.getUserMedia) {
      console.warn('VisionSentinel: MediaDevices API not available');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, frameRate: 15 },
        audio: false,
      });

      // Guard: If stop was called while getUserMedia was pending, immediately shut down hardware tracks
      if (this.isStopping || this.isDisposed || !this.videoElement) {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
            track.enabled = false;
          } catch {}
        });
        return false;
      }

      this.stream = stream;
      this.videoElement.srcObject = stream;
      await this.videoElement.play().catch(() => {});

      this.canvas = document.createElement('canvas');
      this.canvas.width = 160;
      this.canvas.height = 120;
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

      if (this.processInterval) {
        clearInterval(this.processInterval);
      }

      this.processInterval = setInterval(() => {
        this.processFrame();
      }, 1000);

      return true;
    } catch (err) {
      console.warn('VisionSentinel camera access not available or denied:', err);
      return false;
    }
  }

  public toggleShutter(): boolean {
    this.isShutterClosed = !this.isShutterClosed;
    if (this.stream) {
      this.stream.getVideoTracks().forEach((track) => {
        track.enabled = !this.isShutterClosed;
      });
    }
    return this.isShutterClosed;
  }

  public getShutterState(): boolean {
    return this.isShutterClosed;
  }

  public stop(): void {
    this.isStopping = true;
    this.isDisposed = true;

    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }

    // Forcefully stop and disable all stream tracks
    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        try {
          track.stop();
          track.enabled = false;
        } catch {}
      });
      this.stream = null;
    }

    // Double-check video element stream tracks and detach
    if (this.videoElement) {
      if (this.videoElement.srcObject) {
        try {
          const ms = this.videoElement.srcObject as MediaStream;
          ms.getTracks().forEach((track) => {
            track.stop();
            track.enabled = false;
          });
        } catch {}
        this.videoElement.pause();
        this.videoElement.srcObject = null;
      }
      this.videoElement = null;
    }

    this.prevFrameData = null;
    this.ctx = null;
    this.canvas = null;
  }

  private processFrame(): void {
    if (!this.ctx || !this.videoElement || !this.canvas) return;

    this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);
    const imgData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imgData.data;

    let totalDiff = 0;
    let totalLuminance = 0;
    const len = data.length;

    if (this.prevFrameData) {
      // Sample every 4th pixel for high performance
      for (let i = 0; i < len; i += 16) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        totalLuminance += lum;

        const prevLum =
          0.299 * this.prevFrameData[i] +
          0.587 * this.prevFrameData[i + 1] +
          0.114 * this.prevFrameData[i + 2];

        totalDiff += Math.abs(lum - prevLum);
      }
    }

    this.prevFrameData = new Uint8ClampedArray(data);

    const pixelCount = len / 16;
    const avgDiff = totalDiff / pixelCount;
    const avgLum = totalLuminance / pixelCount;

    // Movement velocity heuristic
    const movementVelocity = Math.min(100, Math.round(avgDiff * 4));

    // Determine state
    let state: SentinelFocusState = 'LOCKED_IN';
    let facePresent = true;
    let attentionScore = 95;

    if (avgLum < 12 || avgDiff < 0.2) {
      // Zero movement & extreme darkness -> away from desk
      state = 'AWAY';
      facePresent = false;
      attentionScore = 10;
    } else if (movementVelocity > 45) {
      // Rapid fidgeting or head turning away
      state = 'DRIFTING';
      attentionScore = 60;
    } else {
      state = 'LOCKED_IN';
      attentionScore = Math.max(80, 100 - movementVelocity);
    }

    // Accumulate telemetry
    this.telemetry.totalSeconds += 1;
    if (state === 'LOCKED_IN') this.telemetry.lockedInSeconds += 1;
    else if (state === 'DRIFTING') this.telemetry.driftingSeconds += 1;
    else if (state === 'AWAY') this.telemetry.awaySeconds += 1;

    const integrity = Math.round(
      (this.telemetry.lockedInSeconds / Math.max(1, this.telemetry.totalSeconds)) * 100
    );

    this.telemetry = {
      ...this.telemetry,
      focusState: state,
      movementVelocity,
      facePresent,
      attentionScore,
      integrityPercentage: Math.max(0, Math.min(100, integrity)),
    };

    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.telemetry);
    }
  }

  public async generateProofOfWork(
    habitId: string,
    habitName: string
  ): Promise<ProofOfWorkReceipt> {
    const durationMinutes = Math.max(1, Math.round(this.telemetry.totalSeconds / 60));
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timestamp = now.toLocaleTimeString();

    const rawPayload = `${habitId}:${habitName}:${dateStr}:${durationMinutes}:${this.telemetry.integrityPercentage}:${Date.now()}`;

    // SHA-256 generation using Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(rawPayload);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha256Hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    const certId = `POW-${sha256Hash.substring(0, 12).toUpperCase()}`;

    return {
      certificateId: certId,
      sha256Hash,
      habitId,
      habitName,
      dateStr,
      timestamp,
      durationMinutes,
      integrityScore: this.telemetry.integrityPercentage,
      verifiedStatus: 'AI_CERTIFIED_OFFLINE',
    };
  }

  public getTelemetry(): SentinelTelemetry {
    return this.telemetry;
  }
}
