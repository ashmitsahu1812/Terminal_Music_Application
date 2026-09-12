import blessed from 'neo-blessed';
import { AppStore } from '../store/AppStore.js';
import { getTheme } from './Theme.js';

export class FooterComponent {
  private box: blessed.Widgets.BoxElement;
  private appStore: AppStore;

  constructor(screen: blessed.Widgets.Screen, appStore: AppStore) {
    this.appStore = appStore;
    const theme = getTheme(this.appStore.getConfig().theme);

    this.box = blessed.box({
      parent: screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 4,
      style: {
        fg: theme.fg,
        bg: theme.bg,
        border: { fg: theme.borderFg },
      },
      border: { type: 'line' },
      tags: true,
      content: this.renderContent(),
    });

    this.appStore.on('updated', () => {
      this.box.setContent(this.renderContent());
      screen.render();
    });

    this.appStore.on('position', () => {
      this.box.setContent(this.renderContent());
      screen.render();
    });
  }

  public updateTheme(): void {
    const theme = getTheme(this.appStore.getConfig().theme);
    this.box.style.fg = theme.fg;
    this.box.style.bg = theme.bg;
    if (this.box.style.border) {
      this.box.style.border.fg = theme.borderFg;
    }
    this.box.setContent(this.renderContent());
  }

  private renderContent(): string {
    const state = this.appStore.getAudioEngine().getState();
    const track = state.currentTrack;

    let statusText = '{red-fg}◼ STOPPED{/red-fg}';
    if (state.isPlaying) {
      statusText = state.isPaused
        ? '{yellow-fg}❚❚ PAUSED{/yellow-fg}'
        : '{green-fg}▶ PLAYING{/green-fg}';
    }

    const titleStr = track
      ? `{bold}${track.title}{/bold} - ${track.artist}`
      : 'No Track Selected';

    const posStr = this.formatTime(state.position);
    const durStr = this.formatTime(state.duration);
    const progressBar = this.makeProgressBar(state.position, state.duration, 24);

    const volStr = state.isMuted
      ? '{red-fg}MUTE{/red-fg}'
      : `${state.volume}%`;

    const shuffleStr = state.isShuffle
      ? '{magenta-fg}🔀 SHUFFLE{/magenta-fg}'
      : '🔀 OFF';

    const loopStr =
      state.loopMode === 'track'
        ? '{cyan-fg}🔁 TRACK{/cyan-fg}'
        : state.loopMode === 'queue'
        ? '{cyan-fg}🔁 QUEUE{/cyan-fg}'
        : '🔁 OFF';

    const speedStr = state.speed !== 1.0 ? ` │ {yellow-fg}${state.speed}x{/yellow-fg}` : '';

    return ` ${statusText} │ ${titleStr}\n ${progressBar} [${posStr} / ${durStr}] │ Vol: ${volStr}${speedStr} │ ${shuffleStr} │ ${loopStr}`;
  }

  private makeProgressBar(pos: number, dur: number, width: number): string {
    if (dur <= 0) return `[${'-'.repeat(width)}]`;
    const ratio = Math.min(1, Math.max(0, pos / dur));
    const filled = Math.round(ratio * width);
    const empty = width - filled;
    return `[${'█'.repeat(filled)}${'-'.repeat(empty)}]`;
  }

  private formatTime(sec: number): string {
    const s = Math.floor(sec || 0);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  }
}
