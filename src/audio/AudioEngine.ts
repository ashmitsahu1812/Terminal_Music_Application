import { EventEmitter } from 'events';
import { spawn, ChildProcess, execSync } from 'child_process';
import { Track, PlaybackState, LoopMode } from '../types/index.js';
import fs from 'fs';
import path from 'path';

export class AudioEngine extends EventEmitter {
  private childProcess: ChildProcess | null = null;
  private currentTrack: Track | null = null;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private position: number = 0; // elapsed seconds
  private duration: number = 0;
  private volume: number = 80; // 0 - 100
  private isMuted: boolean = false;
  private previousVolume: number = 80;
  private loopMode: LoopMode = 'off';
  private isShuffle: boolean = false;
  private backend: string = 'afplay';
  private ticker: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private pausedDuration: number = 0;
  private pauseStartTime: number = 0;

  constructor(preferredBackend?: string) {
    super();
    this.backend = preferredBackend || this.detectBackend();
  }

  private detectBackend(): string {
    try {
      if (process.platform === 'darwin') {
        return 'afplay';
      }
      try {
        execSync('which mpv', { stdio: 'ignore' });
        return 'mpv';
      } catch {
        try {
          execSync('which ffplay', { stdio: 'ignore' });
          return 'ffplay';
        } catch {
          return 'afplay';
        }
      }
    } catch {
      return 'afplay';
    }
  }

  public getBackend(): string {
    return this.backend;
  }

  public getState(): PlaybackState {
    return {
      currentTrack: this.currentTrack,
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      position: Math.min(Math.floor(this.position), this.duration),
      duration: this.duration,
      volume: this.volume,
      isMuted: this.isMuted,
      previousVolume: this.previousVolume,
      loopMode: this.loopMode,
      isShuffle: this.isShuffle,
      audioBackend: this.backend,
    };
  }

  public async play(track: Track, startOffset: number = 0): Promise<void> {
    this.stopProcessOnly();

    if (!fs.existsSync(track.filePath)) {
      this.emit('error', new Error(`Audio file not found: ${track.filePath}`));
      return;
    }

    this.currentTrack = track;
    this.duration = Math.floor(track.duration || 0);
    this.position = startOffset;
    this.isPlaying = true;
    this.isPaused = false;
    this.startTime = Date.now() - startOffset * 1000;
    this.pausedDuration = 0;

    const volScale = this.isMuted ? 0 : this.getScaledVolume();

    try {
      if (this.backend === 'afplay') {
        const args: string[] = ['-v', volScale.toFixed(2)];
        if (startOffset > 0) {
          // afplay supports -s <seconds> for start time or we pass position calculation
          args.push('-s', startOffset.toString());
        }
        args.push(track.filePath);
        this.childProcess = spawn('afplay', args, { stdio: 'ignore' });
      } else if (this.backend === 'mpv') {
        const args: string[] = [
          '--no-terminal',
          '--no-video',
          `--volume=${Math.floor(this.volume)}`,
        ];
        if (startOffset > 0) {
          args.push(`--start=${startOffset}`);
        }
        args.push(track.filePath);
        this.childProcess = spawn('mpv', args, { stdio: 'ignore' });
      } else if (this.backend === 'ffplay') {
        const args: string[] = ['-nodisp', '-autoexit', '-volume', `${Math.floor(this.volume)}`];
        if (startOffset > 0) {
          args.push('-ss', startOffset.toString());
        }
        args.push(track.filePath);
        this.childProcess = spawn('ffplay', args, { stdio: 'ignore' });
      } else {
        // Fallback afplay
        this.childProcess = spawn('afplay', ['-v', volScale.toFixed(2), track.filePath], { stdio: 'ignore' });
      }

      this.startTicker();

      this.childProcess.on('exit', (code) => {
        this.stopTicker();
        if (this.isPlaying && !this.isPaused) {
          this.isPlaying = false;
          this.isPaused = false;
          this.position = this.duration;
          this.emit('state-changed', this.getState());
          this.emit('track-ended', this.currentTrack);
        }
      });

      this.childProcess.on('error', (err) => {
        this.emit('error', err);
      });

      this.emit('state-changed', this.getState());
    } catch (err: any) {
      this.emit('error', err);
    }
  }

  public pause(): void {
    if (!this.isPlaying || this.isPaused || !this.childProcess) return;

    try {
      this.childProcess.kill('SIGSTOP');
      this.isPaused = true;
      this.pauseStartTime = Date.now();
      this.stopTicker();
      this.emit('state-changed', this.getState());
    } catch (err: any) {
      this.emit('error', err);
    }
  }

  public resume(): void {
    if (!this.isPlaying || !this.isPaused || !this.childProcess) return;

    try {
      this.childProcess.kill('SIGCONT');
      this.isPaused = false;
      this.pausedDuration += Date.now() - this.pauseStartTime;
      this.startTicker();
      this.emit('state-changed', this.getState());
    } catch (err: any) {
      this.emit('error', err);
    }
  }

  public togglePlayPause(): void {
    if (!this.currentTrack) return;
    if (this.isPaused) {
      this.resume();
    } else if (this.isPlaying) {
      this.pause();
    }
  }

  public stop(): void {
    this.stopProcessOnly();
    this.isPlaying = false;
    this.isPaused = false;
    this.currentTrack = null;
    this.position = 0;
    this.duration = 0;
    this.emit('state-changed', this.getState());
  }

  public seek(offsetSeconds: number): void {
    if (!this.currentTrack) return;

    let target = this.position + offsetSeconds;
    if (target < 0) target = 0;
    if (target > this.duration) target = this.duration - 1;

    this.position = target;
    if (this.isPlaying) {
      this.play(this.currentTrack, target);
    } else {
      this.emit('state-changed', this.getState());
    }
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(100, vol));
    if (this.volume > 0 && this.isMuted) {
      this.isMuted = false;
    }
    // Re-apply if playing using logarithmic gain
    if (this.currentTrack && this.isPlaying) {
      this.seek(0); // Restart process with updated volume setting
    } else {
      this.emit('state-changed', this.getState());
    }
  }

  public toggleMute(): void {
    if (this.isMuted) {
      this.isMuted = false;
      this.volume = this.previousVolume > 0 ? this.previousVolume : 80;
    } else {
      this.previousVolume = this.volume;
      this.isMuted = true;
    }
    if (this.currentTrack && this.isPlaying) {
      this.seek(0);
    } else {
      this.emit('state-changed', this.getState());
    }
  }

  public setLoopMode(mode: LoopMode): void {
    this.loopMode = mode;
    this.emit('state-changed', this.getState());
  }

  public setShuffle(shuffle: boolean): void {
    this.isShuffle = shuffle;
    this.emit('state-changed', this.getState());
  }

  private getScaledVolume(): number {
    // Logarithmic volume scaling: (vol / 100) ^ 2
    const normalized = this.volume / 100;
    return Math.pow(normalized, 2);
  }

  private startTicker(): void {
    this.stopTicker();
    this.ticker = setInterval(() => {
      if (this.isPlaying && !this.isPaused) {
        const elapsed = (Date.now() - this.startTime - this.pausedDuration) / 1000;
        this.position = Math.min(elapsed, this.duration);
        this.emit('position', { position: this.position, duration: this.duration });
        this.emit('state-changed', this.getState());
      }
    }, 250);
  }

  private stopTicker(): void {
    if (this.ticker) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
  }

  private stopProcessOnly(): void {
    this.stopTicker();
    if (this.childProcess) {
      try {
        this.childProcess.removeAllListeners('exit');
        this.childProcess.removeAllListeners('error');
        this.childProcess.kill('SIGKILL');
      } catch {}
      this.childProcess = null;
    }
  }
}
