import { EventEmitter } from 'events';
import { AppStore } from '../store/AppStore.js';

export type PomodoroPhase = 'idle' | 'work' | 'break' | 'long-break';

export interface PomodoroState {
  phase: PomodoroPhase;
  remainingSeconds: number;
  totalSeconds: number;
  completedCycles: number;
  isActive: boolean;
}

export interface SleepTimerState {
  isActive: boolean;
  remainingSeconds: number;
  totalSeconds: number;
  initialVolume: number;
}

export class TimerManager extends EventEmitter {
  private appStore: AppStore;
  private ticker: NodeJS.Timeout | null = null;

  // Pomodoro Settings (in seconds)
  private workDuration: number = 25 * 60; // 25 min
  private breakDuration: number = 5 * 60; // 5 min
  private longBreakDuration: number = 15 * 60; // 15 min
  private pomoPhase: PomodoroPhase = 'idle';
  private pomoRemaining: number = 0;
  private pomoCompletedCycles: number = 0;
  private pomoActive: boolean = false;

  // Sleep Timer Settings
  private sleepActive: boolean = false;
  private sleepRemaining: number = 0;
  private sleepTotal: number = 0;
  private sleepInitialVolume: number = 80;
  private fadeDurationSeconds: number = 120; // Fade out over last 2 minutes

  constructor(appStore: AppStore) {
    super();
    this.appStore = appStore;
    this.startMasterTicker();
  }

  private startMasterTicker(): void {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = setInterval(() => {
      let updated = false;

      // 1. Tick Pomodoro
      if (this.pomoActive && this.pomoRemaining > 0) {
        this.pomoRemaining--;
        updated = true;
        if (this.pomoRemaining <= 0) {
          this.handlePomodoroPhaseEnd();
        }
      }

      // 2. Tick Sleep Timer
      if (this.sleepActive && this.sleepRemaining > 0) {
        this.sleepRemaining--;
        updated = true;

        // Apply progressive smooth volume fade-out in the final 2 minutes
        if (this.sleepRemaining <= this.fadeDurationSeconds && this.sleepRemaining > 0) {
          const fadeRatio = this.sleepRemaining / this.fadeDurationSeconds;
          const targetVol = Math.max(0, Math.floor(this.sleepInitialVolume * fadeRatio));
          this.appStore.setVolume(targetVol);
        } else if (this.sleepRemaining <= 0) {
          this.handleSleepTimerExpired();
        }
      }

      if (updated) {
        this.emit('tick');
      }
    }, 1000);
  }

  // Pomodoro Actions
  public startPomodoro(workMinutes: number = 25, breakMinutes: number = 5): void {
    this.workDuration = workMinutes * 60;
    this.breakDuration = breakMinutes * 60;
    this.pomoPhase = 'work';
    this.pomoRemaining = this.workDuration;
    this.pomoActive = true;
    this.emit('pomodoro-updated', this.getPomodoroState());
  }

  public pausePomodoro(): void {
    this.pomoActive = false;
    this.emit('pomodoro-updated', this.getPomodoroState());
  }

  public resumePomodoro(): void {
    if (this.pomoPhase !== 'idle') {
      this.pomoActive = true;
      this.emit('pomodoro-updated', this.getPomodoroState());
    } else {
      this.startPomodoro();
    }
  }

  public resetPomodoro(): void {
    this.pomoPhase = 'idle';
    this.pomoActive = false;
    this.pomoRemaining = 0;
    this.emit('pomodoro-updated', this.getPomodoroState());
  }

  public skipPomodoroPhase(): void {
    this.handlePomodoroPhaseEnd();
  }

  private handlePomodoroPhaseEnd(): void {
    if (this.pomoPhase === 'work') {
      this.pomoCompletedCycles++;
      if (this.pomoCompletedCycles % 4 === 0) {
        this.pomoPhase = 'long-break';
        this.pomoRemaining = this.longBreakDuration;
      } else {
        this.pomoPhase = 'break';
        this.pomoRemaining = this.breakDuration;
      }
      // Auto-switch to ambient rain sound on break for relaxation
      this.appStore.setAmbientSound('rain');
    } else if (this.pomoPhase === 'break' || this.pomoPhase === 'long-break') {
      this.pomoPhase = 'work';
      this.pomoRemaining = this.workDuration;
      // Turn off ambient rain sound upon returning to work focus
      this.appStore.setAmbientSound('none');
    }
    this.emit('pomodoro-phase-changed', this.pomoPhase);
    this.emit('pomodoro-updated', this.getPomodoroState());
  }

  public getPomodoroState(): PomodoroState {
    const total = this.pomoPhase === 'work' ? this.workDuration : this.breakDuration;
    return {
      phase: this.pomoPhase,
      remainingSeconds: this.pomoRemaining,
      totalSeconds: total,
      completedCycles: this.pomoCompletedCycles,
      isActive: this.pomoActive,
    };
  }

  // Sleep Timer Actions
  public startSleepTimer(minutes: number): void {
    const secs = Math.max(1, Math.floor(minutes * 60));
    this.sleepTotal = secs;
    this.sleepRemaining = secs;
    this.sleepActive = true;
    this.sleepInitialVolume = this.appStore.getAudioEngine().getState().volume || 80;
    this.emit('sleep-updated', this.getSleepTimerState());
  }

  public cancelSleepTimer(): void {
    this.sleepActive = false;
    this.sleepRemaining = 0;
    this.sleepTotal = 0;
    this.emit('sleep-updated', this.getSleepTimerState());
  }

  private handleSleepTimerExpired(): void {
    this.sleepActive = false;
    this.sleepRemaining = 0;
    this.appStore.getAudioEngine().stop();
    this.appStore.setAmbientSound('none');
    this.emit('sleep-expired');
    this.emit('sleep-updated', this.getSleepTimerState());
  }

  public getSleepTimerState(): SleepTimerState {
    return {
      isActive: this.sleepActive,
      remainingSeconds: this.sleepRemaining,
      totalSeconds: this.sleepTotal,
      initialVolume: this.sleepInitialVolume,
    };
  }

  public destroy(): void {
    if (this.ticker) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
  }
}
