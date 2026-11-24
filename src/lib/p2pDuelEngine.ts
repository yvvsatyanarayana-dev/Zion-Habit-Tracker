import { Peer, type DataConnection } from 'peerjs';
import type { P2PDuel } from './types';

export interface DuelMessage {
  type: 'JOIN' | 'JOIN_ACK' | 'PROGRESS_UPDATE' | 'CHEER' | 'SYNC_STATE';
  payload: any;
  timestamp: number;
}

export interface PeerDuelState {
  roomId: string;
  isHost: boolean;
  connected: boolean;
  peerName: string;
  peerProgress: number;
  myProgress: number;
  targetDays: number;
  habitName: string;
  stakeXp: number;
  lastMessage?: string;
  recentCheers: Array<{ id: string; emoji: string; sender: string; timestamp: number }>;
}

export class P2PDuelManager {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private state: PeerDuelState = {
    roomId: '',
    isHost: false,
    connected: false,
    peerName: 'Waiting for peer...',
    peerProgress: 0,
    myProgress: 0,
    targetDays: 7,
    habitName: 'Daily Habit',
    stakeXp: 100,
    recentCheers: [],
  };

  private listeners: Set<(state: PeerDuelState) => void> = new Set();

  public subscribe(cb: (state: PeerDuelState) => void): () => void {
    this.listeners.add(cb);
    cb(this.state);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener({ ...this.state });
    }
  }

  public getState(): PeerDuelState {
    return { ...this.state };
  }

  /**
   * Initializes host room with a clean room ID (e.g. zion-duel-XYZ789)
   */
  public async createDuel(
    habitName: string,
    targetDays: number,
    stakeXp: number,
    userName: string
  ): Promise<string> {
    this.disconnect();

    const shortCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const roomId = `zion-duel-${shortCode.toLowerCase()}`;

    this.state = {
      roomId: shortCode,
      isHost: true,
      connected: false,
      peerName: 'Waiting for peer to join...',
      peerProgress: 0,
      myProgress: 0,
      targetDays,
      habitName,
      stakeXp,
      recentCheers: [],
    };
    this.notify();

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer(roomId, {
          debug: 1,
        });

        this.peer.on('open', (id) => {
          resolve(shortCode);
        });

        this.peer.on('connection', (connection) => {
          this.conn = connection;
          this.setupConnectionHandlers(userName);
        });

        this.peer.on('error', (err) => {
          console.warn('P2P Duel Peer Error:', err);
          if (!this.state.connected) {
            reject(err);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Joins an existing duel room using the 6-character room code.
   */
  public async joinDuel(roomCode: string, userName: string, myProgress = 0): Promise<void> {
    this.disconnect();

    const cleanCode = roomCode.trim().toUpperCase();
    const targetPeerId = `zion-duel-${cleanCode.toLowerCase()}`;
    const myClientId = `zion-peer-${Math.random().toString(36).substring(2, 8)}`;

    this.state = {
      roomId: cleanCode,
      isHost: false,
      connected: false,
      peerName: 'Connecting to room host...',
      peerProgress: 0,
      myProgress,
      targetDays: 7,
      habitName: 'Accountability Duel',
      stakeXp: 100,
      recentCheers: [],
    };
    this.notify();

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer(myClientId, { debug: 1 });

        this.peer.on('open', () => {
          if (!this.peer) return;
          const connection = this.peer.connect(targetPeerId, {
            reliable: true,
          });
          this.conn = connection;
          this.setupConnectionHandlers(userName);

          connection.on('open', () => {
            this.send('JOIN', {
              userName,
              myProgress,
            });
            resolve();
          });
        });

        this.peer.on('error', (err) => {
          console.warn('P2P Join Error:', err);
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  private setupConnectionHandlers(myName: string): void {
    if (!this.conn) return;

    this.conn.on('data', (data: any) => {
      this.handleIncomingMessage(data, myName);
    });

    this.conn.on('open', () => {
      this.state.connected = true;
      this.notify();
    });

    this.conn.on('close', () => {
      this.state.connected = false;
      this.state.peerName = `${this.state.peerName} (Disconnected)`;
      this.notify();
    });

    this.conn.on('error', (err) => {
      console.warn('Connection data error:', err);
    });
  }

  private handleIncomingMessage(msg: DuelMessage, myName: string): void {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'JOIN': {
        this.state.connected = true;
        this.state.peerName = msg.payload.userName || 'Challenger';
        this.state.peerProgress = msg.payload.myProgress || 0;
        this.notify();

        // Host responds with full duel specs
        if (this.state.isHost) {
          this.send('JOIN_ACK', {
            hostName: myName,
            habitName: this.state.habitName,
            targetDays: this.state.targetDays,
            stakeXp: this.state.stakeXp,
            hostProgress: this.state.myProgress,
          });
        }
        break;
      }

      case 'JOIN_ACK': {
        this.state.connected = true;
        this.state.peerName = msg.payload.hostName || 'Room Host';
        this.state.habitName = msg.payload.habitName || this.state.habitName;
        this.state.targetDays = msg.payload.targetDays || this.state.targetDays;
        this.state.stakeXp = msg.payload.stakeXp || this.state.stakeXp;
        this.state.peerProgress = msg.payload.hostProgress || 0;
        this.notify();
        break;
      }

      case 'PROGRESS_UPDATE': {
        this.state.peerProgress = msg.payload.progress;
        this.state.lastMessage = `${this.state.peerName} completed day ${msg.payload.progress} of ${this.state.targetDays}! (+${msg.payload.xp} XP)`;
        this.notify();
        break;
      }

      case 'CHEER': {
        const cheerItem = {
          id: Math.random().toString(36).substring(2, 9),
          emoji: msg.payload.emoji,
          sender: this.state.peerName,
          timestamp: Date.now(),
        };
        this.state.recentCheers = [cheerItem, ...this.state.recentCheers.slice(0, 5)];
        this.notify();
        break;
      }

      case 'SYNC_STATE': {
        if (msg.payload.peerProgress !== undefined) {
          this.state.peerProgress = msg.payload.peerProgress;
        }
        this.notify();
        break;
      }
    }
  }

  public sendProgressIncrement(newProgress: number, xp = 50): void {
    this.state.myProgress = newProgress;
    this.notify();
    this.send('PROGRESS_UPDATE', {
      progress: newProgress,
      xp,
    });
  }

  public sendCheer(emoji: string, senderName: string): void {
    const localCheer = {
      id: Math.random().toString(36).substring(2, 9),
      emoji,
      sender: senderName,
      timestamp: Date.now(),
    };
    this.state.recentCheers = [localCheer, ...this.state.recentCheers.slice(0, 5)];
    this.notify();

    this.send('CHEER', {
      emoji,
    });
  }

  private send(type: DuelMessage['type'], payload: any): void {
    if (this.conn && this.conn.open) {
      try {
        this.conn.send({
          type,
          payload,
          timestamp: Date.now(),
        } as DuelMessage);
      } catch (err) {
        console.warn('Failed to send P2P message:', err);
      }
    }
  }

  public disconnect(): void {
    if (this.conn) {
      try {
        this.conn.close();
      } catch {}
      this.conn = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {}
      this.peer = null;
    }
    this.state.connected = false;
    this.notify();
  }
}

export const p2pDuelManager = new P2PDuelManager();
