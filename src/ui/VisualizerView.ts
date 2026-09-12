import blessed from 'neo-blessed';
import { AppStore } from '../store/AppStore.js';
import { getTheme } from './Theme.js';
import { VisualizerMode } from '../types/index.js';

export class VisualizerView {
  private box: blessed.Widgets.BoxElement;
  private appStore: AppStore;
  private timer: NodeJS.Timeout | null = null;
  private numBars: number = 36;
  private phase: number = 0;
  private matrixDrops: { x: number; y: number; speed: number; char: string }[] = [];
  private fireBuffer: number[][] = [];

  constructor(parent: blessed.Widgets.BoxElement, appStore: AppStore) {
    this.appStore = appStore;
    const theme = getTheme(this.appStore.getConfig().theme);

    this.initMatrixDrops();
    this.initFireBuffer();

    this.box = blessed.box({
      parent,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      label: ' 🌊 Multi-Mode Audio Visualizer (Press "v" to switch modes) ',
      border: { type: 'line' },
      style: {
        fg: theme.fg,
        bg: theme.bg,
        border: { fg: theme.borderFg },
      },
      tags: true,
      content: this.renderVisualizer(),
    });

    this.startAnimation();
  }

  public focus(): void {
    this.box.focus();
  }

  public updateTheme(): void {
    const theme = getTheme(this.appStore.getConfig().theme);
    this.box.style.fg = theme.fg;
    this.box.style.bg = theme.bg;
    if (this.box.style.border) this.box.style.border.fg = theme.borderFg;
    this.box.setContent(this.renderVisualizer());
  }

  private initMatrixDrops(): void {
    const chars = '0123456789ABCDEF$#@%*+=-~<>:;|';
    this.matrixDrops = [];
    for (let x = 0; x < 40; x++) {
      this.matrixDrops.push({
        x,
        y: Math.floor(Math.random() * 12),
        speed: 0.5 + Math.random() * 1.5,
        char: chars[Math.floor(Math.random() * chars.length)],
      });
    }
  }

  private initFireBuffer(): void {
    const h = 12;
    const w = 40;
    this.fireBuffer = Array.from({ length: h }, () => Array(w).fill(0));
  }

  private startAnimation(): void {
    if (this.timer) clearInterval(this.timer);

    this.timer = setInterval(() => {
      const state = this.appStore.getAudioEngine().getState();
      if (state.isPlaying && !state.isPaused) {
        this.phase += 0.25 * (state.speed || 1.0);
        this.box.setContent(this.renderVisualizer());
        if (this.box.screen) {
          this.box.screen.render();
        }
      }
    }, 45); // ~22 FPS smooth non-blocking update
  }

  private renderVisualizer(): string {
    const state = this.appStore.getAudioEngine().getState();
    const track = state.currentTrack;
    const mode = state.visualizerMode || 'bars';

    if (!state.isPlaying || !track) {
      return (
        `\n\n  {gray-fg}Audio Visualizer Idle.{/gray-fg}\n` +
        `  {cyan-fg}Select a track in Library and press Enter to play.{/cyan-fg}\n` +
        `  {yellow-fg}Press [v] to cycle modes: Spectrum Bars → Waveform → Matrix Rain → Fire → VU Meters{/yellow-fg}`
      );
    }

    const header = `  {bold}${track.title}{/bold} - ${track.artist} │ Mode: {yellow-fg}${mode.toUpperCase()}{/yellow-fg} [Press 'v' to change] [Speed: ${state.speed}x]\n`;

    switch (mode) {
      case 'wave':
        return header + this.renderWaveform(state.volume);
      case 'matrix':
        return header + this.renderMatrixRain(state.volume);
      case 'fire':
        return header + this.renderFire(state.volume);
      case 'vumeter':
        return header + this.renderVUMeters(state.volume);
      case 'bars':
      default:
        return header + this.renderSpectrumBars(state.volume);
    }
  }

  /**
   * Mode 1: Frequency Spectrum Bars
   */
  private renderSpectrumBars(vol: number): string {
    const lines: string[] = [];
    const maxHeight = 10;
    const barValues: number[] = [];

    for (let i = 0; i < this.numBars; i++) {
      let val = Math.sin(this.phase + i * 0.35) * 0.45 + 0.5;
      val += Math.cos(this.phase * 1.6 + i * 0.18) * 0.25;
      val = Math.max(0.1, Math.min(1.0, val * (vol / 100)));
      barValues.push(val);
    }

    for (let h = maxHeight; h >= 1; h--) {
      let rowStr = '  ';
      for (let i = 0; i < this.numBars; i++) {
        const scaled = barValues[i] * maxHeight;
        if (scaled >= h) {
          rowStr += '{magenta-fg}█{/magenta-fg} ';
        } else if (scaled >= h - 0.5) {
          rowStr += '{cyan-fg}▄{/cyan-fg} ';
        } else {
          rowStr += '  ';
        }
      }
      lines.push(rowStr);
    }

    let freqRow = '  ';
    for (let i = 0; i < this.numBars; i++) {
      freqRow += '{gray-fg}▔{/gray-fg} ';
    }
    lines.push(freqRow);
    lines.push('  60Hz  125Hz  250Hz  500Hz  1kHz   2kHz   4kHz   8kHz   16kHz');
    return lines.join('\n');
  }

  /**
   * Mode 2: Oscilloscope Waveform
   */
  private renderWaveform(vol: number): string {
    const lines: string[] = [];
    const height = 11;
    const width = 50;
    const mid = Math.floor(height / 2);
    const grid: string[][] = Array.from({ length: height }, () => Array(width).fill(' '));

    const amplitude = (vol / 100) * 4.5;
    for (let x = 0; x < width; x++) {
      const y = Math.round(
        mid +
        Math.sin(this.phase + (x / width) * Math.PI * 4) * amplitude * 0.7 +
        Math.sin(this.phase * 2.2 + (x / width) * Math.PI * 8) * amplitude * 0.3
      );
      const clampedY = Math.max(0, Math.min(height - 1, y));
      grid[clampedY][x] = '{cyan-fg}●{/cyan-fg}';
    }

    for (let y = 0; y < height; y++) {
      lines.push('  ' + grid[y].join(''));
    }
    lines.push('  ' + '{gray-fg}──────────────────────────────────────────────────{/gray-fg}');
    lines.push('  {bold}{cyan-fg}OSCILLOSCOPE WAVEFORM MONITOR 44.1kHz{/cyan-fg}{/bold}');
    return lines.join('\n');
  }

  /**
   * Mode 3: Matrix Digital Rain
   */
  private renderMatrixRain(vol: number): string {
    const lines: string[] = [];
    const height = 11;
    const width = 40;
    const grid: string[][] = Array.from({ length: height }, () => Array(width).fill(' '));
    const chars = '0123456789ABCDEF$#@%*+=-~<>:;|';

    for (const drop of this.matrixDrops) {
      drop.y += drop.speed * (vol / 80);
      if (drop.y >= height) {
        drop.y = 0;
        drop.char = chars[Math.floor(Math.random() * chars.length)];
      }

      const currentY = Math.floor(drop.y);
      if (currentY >= 0 && currentY < height && drop.x < width) {
        grid[currentY][drop.x] = `{bold}{green-fg}${drop.char}{/green-fg}{/bold}`;
        if (currentY - 1 >= 0) {
          grid[currentY - 1][drop.x] = `{green-fg}${drop.char.toLowerCase()}{/green-fg}`;
        }
        if (currentY - 2 >= 0) {
          grid[currentY - 2][drop.x] = '{gray-fg}.{/gray-fg}';
        }
      }
    }

    for (let y = 0; y < height; y++) {
      lines.push('  ' + grid[y].join(' '));
    }
    lines.push('  {bold}{green-fg}SYSTEM MATRIX AUDIO FLUX DECODER{/green-fg}{/bold}');
    return lines.join('\n');
  }

  /**
   * Mode 4: ASCII Fire / Flame Visualizer
   */
  private renderFire(vol: number): string {
    const lines: string[] = [];
    const height = 11;
    const width = 36;
    const firePalette = [' ', '░', '▒', '▓', '{red-fg}█{/red-fg}', '{yellow-fg}█{/yellow-fg}', '{white-fg}█{/white-fg}'];

    // Generate bottom heat row based on audio energy
    const bottomRow = this.fireBuffer[height - 1] || Array(width).fill(0);
    for (let x = 0; x < width; x++) {
      const beat = Math.abs(Math.sin(this.phase * 2 + x * 0.4));
      bottomRow[x] = Math.min(6, Math.floor(beat * 4 + (vol / 100) * 3));
    }

    // Propagate fire upward
    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width; x++) {
        const below = (this.fireBuffer[y + 1]?.[x] || 0) + (this.fireBuffer[y + 1]?.[(x + 1) % width] || 0);
        const decayed = Math.max(0, Math.floor(below / 2.1) - (Math.random() > 0.6 ? 1 : 0));
        this.fireBuffer[y][x] = decayed;
      }
    }

    for (let y = 0; y < height; y++) {
      let row = '  ';
      for (let x = 0; x < width; x++) {
        const val = this.fireBuffer[y][x] || 0;
        row += firePalette[Math.min(firePalette.length - 1, val)];
      }
      lines.push(row);
    }
    lines.push('  {bold}{yellow-fg}🔥 BASS THERMAL PLASMA EMITTER{/yellow-fg}{/bold}');
    return lines.join('\n');
  }

  /**
   * Mode 5: Dual Stereo Analog VU Meters
   */
  private renderVUMeters(vol: number): string {
    const lines: string[] = [];
    const meterWidth = 32;

    const leftEnergy = Math.max(0, Math.min(1, (Math.sin(this.phase * 1.8) * 0.4 + 0.6) * (vol / 100)));
    const rightEnergy = Math.max(0, Math.min(1, (Math.cos(this.phase * 2.1) * 0.4 + 0.6) * (vol / 100)));

    const leftFilled = Math.round(leftEnergy * meterWidth);
    const rightFilled = Math.round(rightEnergy * meterWidth);

    const makeBar = (filled: number) => {
      let bar = '';
      for (let i = 0; i < meterWidth; i++) {
        if (i < filled) {
          if (i > meterWidth * 0.8) bar += '{red-fg}█{/red-fg}';
          else if (i > meterWidth * 0.6) bar += '{yellow-fg}█{/yellow-fg}';
          else bar += '{green-fg}█{/green-fg}';
        } else {
          bar += '{gray-fg}░{/gray-fg}';
        }
      }
      return bar;
    };

    lines.push('\n');
    lines.push('  {bold}LEFT CHANNEL  [dB: ' + (leftEnergy * -3).toFixed(1) + ']{/bold}');
    lines.push(`  [ ${makeBar(leftFilled)} ]  {bold}${Math.round(leftEnergy * 100)}%{/bold}`);
    lines.push('');
    lines.push('  {bold}RIGHT CHANNEL [dB: ' + (rightEnergy * -3).toFixed(1) + ']{/bold}');
    lines.push(`  [ ${makeBar(rightFilled)} ]  {bold}${Math.round(rightEnergy * 100)}%{/bold}`);
    lines.push('');
    lines.push('  {gray-fg}  -40dB   -30dB   -20dB   -10dB   -6dB   -3dB   0dB   +3dB PEAK{/gray-fg}');
    lines.push('  {bold}{yellow-fg}ANALOG STEREO VU GAIN CALIBRATOR (DUAL BALANCED){/yellow-fg}{/bold}');

    return lines.join('\n');
  }

  public destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}
