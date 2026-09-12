import blessed from 'neo-blessed';
import { AppStore } from '../store/AppStore.js';
import { getTheme } from './Theme.js';

export class VisualizerView {
  private box: blessed.Widgets.BoxElement;
  private appStore: AppStore;
  private timer: NodeJS.Timeout | null = null;
  private numBars: number = 32;
  private phase: number = 0;

  constructor(parent: blessed.Widgets.BoxElement, appStore: AppStore) {
    this.appStore = appStore;
    const theme = getTheme(this.appStore.getConfig().theme);

    this.box = blessed.box({
      parent,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      label: ' Real-Time Audio Spectrum Visualizer ',
      border: { type: 'line' },
      style: {
        fg: theme.fg,
        bg: theme.bg,
        border: { fg: theme.borderFg },
      },
      tags: true,
      content: this.renderSpectrum(),
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
    this.box.setContent(this.renderSpectrum());
  }

  private startAnimation(): void {
    if (this.timer) clearInterval(this.timer);

    this.timer = setInterval(() => {
      const state = this.appStore.getAudioEngine().getState();
      if (state.isPlaying && !state.isPaused) {
        this.phase += 0.2;
        this.box.setContent(this.renderSpectrum());
        if (this.box.screen) {
          this.box.screen.render();
        }
      }
    }, 50); // ~20 updates/sec for smooth non-blocking TUI rendering
  }

  private renderSpectrum(): string {
    const state = this.appStore.getAudioEngine().getState();
    const blocks = [' ', ' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const track = state.currentTrack;

    if (!state.isPlaying || !track) {
      return `\n\n  {gray-fg}Audio spectrum visualizer idle. Select a track in Library and press Enter to play.{/gray-fg}`;
    }

    const lines: string[] = [];
    lines.push(`\n  {bold}${track.title}{/bold} - ${track.artist} (${track.format} ${track.bitrate ? track.bitrate + 'kbps' : ''})\n`);

    const maxHeight = 12;
    const barValues: number[] = [];

    for (let i = 0; i < this.numBars; i++) {
      let val = Math.sin(this.phase + i * 0.4) * 0.4 + 0.5;
      val += Math.cos(this.phase * 1.5 + i * 0.2) * 0.3;
      val = Math.max(0.1, Math.min(1.0, val * (state.volume / 100)));
      barValues.push(val);
    }

    // Render bar matrix from top to bottom
    for (let h = maxHeight; h >= 1; h--) {
      let rowStr = '  ';
      for (let i = 0; i < this.numBars; i++) {
        const scaledVal = barValues[i] * maxHeight;
        if (scaledVal >= h) {
          rowStr += '{magenta-fg}█{/magenta-fg} ';
        } else if (scaledVal >= h - 0.5) {
          rowStr += '{cyan-fg}▄{/cyan-fg} ';
        } else {
          rowStr += '  ';
        }
      }
      lines.push(rowStr);
    }

    // Frequency labels
    let freqRow = '  ';
    for (let i = 0; i < this.numBars; i++) {
      freqRow += '{gray-fg}▔{/gray-fg} ';
    }
    lines.push(freqRow);
    lines.push('  60Hz 125Hz 250Hz 500Hz 1kHz 2kHz 4kHz 8kHz 16kHz');

    return lines.join('\n');
  }

  public destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}
