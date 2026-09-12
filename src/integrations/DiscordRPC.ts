import net from 'net';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { AppStore } from '../store/AppStore.js';
import { Track } from '../types/index.js';

export class DiscordRPC {
  private socket: net.Socket | null = null;
  private appStore: AppStore;
  private isConnected: boolean = false;
  private clientId: string = '123456789012345678'; // Default Discord App ID
  private retryTimer: NodeJS.Timeout | null = null;

  constructor(appStore: AppStore) {
    this.appStore = appStore;

    if (this.appStore.getConfig().discordRpcEnabled) {
      this.connect();
    }

    this.appStore.on('updated', () => {
      this.updateActivity();
    });

    this.appStore.on('position', () => {
      // Throttle updates
    });
  }

  private getIpcPath(index: number = 0): string {
    if (process.platform === 'win32') {
      return `\\\\?\\pipe\\discord-ipc-${index}`;
    }
    const envPath = process.env.XDG_RUNTIME_DIR || process.env.TMPDIR || process.env.TMP || '/tmp';
    return path.join(envPath, `discord-ipc-${index}`);
  }

  public connect(): void {
    if (this.isConnected || this.socket) return;

    const ipcPath = this.getIpcPath(0);
    this.socket = net.createConnection(ipcPath);

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.sendHandshake();
      this.updateActivity();
    });

    this.socket.on('data', () => {
      // Handshake ack or frame response
    });

    this.socket.on('error', () => {
      this.disconnect();
    });

    this.socket.on('close', () => {
      this.disconnect();
    });
  }

  private sendHandshake(): void {
    if (!this.socket || !this.isConnected) return;
    const payload = JSON.stringify({
      v: 1,
      client_id: this.clientId,
    });
    this.send(0, payload); // Opcode 0 = Handshake
  }

  public updateActivity(): void {
    if (!this.isConnected || !this.socket) return;

    const state = this.appStore.getAudioEngine().getState();
    const track = state.currentTrack;

    if (!state.isPlaying || !track) {
      const payload = {
        cmd: 'SET_ACTIVITY',
        args: {
          pid: process.pid,
          activity: {
            details: 'Browsing Library',
            state: 'Idle in Terminal',
            assets: {
              large_image: 'terminal_music_logo',
              large_text: 'Terminal Music Player',
            },
          },
        },
        nonce: Date.now().toString(),
      };
      this.send(1, JSON.stringify(payload));
      return;
    }

    const elapsed = Math.floor(state.position);
    const duration = Math.floor(state.duration);
    const now = Math.floor(Date.now() / 1000);

    const activity: any = {
      details: `${track.title}`,
      state: `by ${track.artist}`,
      timestamps: {
        start: now - elapsed,
      },
      assets: {
        large_image: 'terminal_music_logo',
        large_text: track.album || 'Terminal Music Player',
        small_image: state.isPaused ? 'pause_icon' : 'play_icon',
        small_text: state.isPaused ? 'Paused' : `Playing (${state.speed}x)`,
      },
    };

    if (duration > 0 && !state.isPaused) {
      activity.timestamps.end = now + (duration - elapsed);
    }

    const payload = {
      cmd: 'SET_ACTIVITY',
      args: {
        pid: process.pid,
        activity,
      },
      nonce: Date.now().toString(),
    };

    this.send(1, JSON.stringify(payload)); // Opcode 1 = Frame
  }

  private send(opcode: number, payload: string): void {
    if (!this.socket || !this.isConnected) return;
    try {
      const length = Buffer.byteLength(payload, 'utf8');
      const packet = Buffer.alloc(8 + length);
      packet.writeInt32LE(opcode, 0);
      packet.writeInt32LE(length, 4);
      packet.write(payload, 8, 'utf8');
      this.socket.write(packet);
    } catch {}
  }

  public disconnect(): void {
    this.isConnected = false;
    if (this.socket) {
      try {
        this.socket.removeAllListeners();
        this.socket.end();
        this.socket.destroy();
      } catch {}
      this.socket = null;
    }
  }
}
