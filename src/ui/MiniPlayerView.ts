import blessed from 'neo-blessed';
import { AppStore } from '../store/AppStore.js';
import { getTheme } from './Theme.js';

/**
 * A floating mini-player overlay that shows the currently playing track
 * and progress, independent of the active tab.
 */
export class MiniPlayerView {
  private box: blessed.Widgets.BoxElement;
  private appStore: AppStore;
  private isVisible: boolean = false;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(parent: blessed.Widgets.Screen, appStore: AppStore) {
    this.appStore = appStore;
    const theme = getTheme(this.appStore.getConfig().theme);

    this.box = blessed.box({
      parent,
      top: 1,
      right: 1,
      width: 40,
      height: 5,
      tags: true,
      border: { type: 'line' },
      hidden: true,
      style: {
        fg: theme.fg,
        bg: theme.bg,
        border: { fg: theme.accentFg },
      },
    });

    this.appStore.on('updated', () => {
      if (this.isVisible) this.renderContent();
    });

    this.appStore.on('position', () => {
      if (this.isVisible) this.renderContent();
    });
  }

  public toggle(): void {
    this.isVisible = !this.isVisible;
    if (this.isVisible) {
      this.box.show();
      this.renderContent();
      // Ensure it stays on top
      this.box.setFront();
    } else {
      this.box.hide();
    }
    (this.box.screen as any)?.render();
  }

  private renderContent(): void {
    const state = this.appStore.getAudioEngine().getState();
    const theme = getTheme(this.appStore.getConfig().theme);

    if (!state.currentTrack) {
      this.box.setContent('{center}No track playing{/center}');
      (this.box.screen as any)?.render();
      return;
    }

    const { currentTrack, position, duration, isPlaying } = state;
    const title = currentTrack.title.length > 20 ? currentTrack.title.substring(0, 17) + '...' : currentTrack.title;
    const artist = currentTrack.artist.length > 20 ? currentTrack.artist.substring(0, 17) + '...' : currentTrack.artist;

    const formatTime = (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = Math.floor(secs % 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const width = 36;
    const progress = duration > 0 ? position / duration : 0;
    const barChars = Math.floor(progress * (width - 12));
    const emptyChars = Math.max(0, width - 12 - barChars);
    const bar = '█'.repeat(barChars) + ' '.repeat(emptyChars);

    const playIcon = isPlaying ? '▶' : '⏸';

    let content = `{bold}${theme.highlightFg ? '{' + theme.highlightFg + '-fg}' : ''}${title}${theme.highlightFg ? '{/' + theme.highlightFg + '-fg}' : ''}{/bold}\n`;
    content += `{gray-fg}${artist}{/gray-fg}\n`;
    content += `${playIcon} ${formatTime(position)} [${bar}] ${formatTime(duration)}`;

    this.box.setContent(content);
    (this.box.screen as any)?.render();
  }

  public updateTheme(): void {
    const theme = getTheme(this.appStore.getConfig().theme);
    this.box.style.fg = theme.fg;
    this.box.style.bg = theme.bg;
    if (this.box.style.border) this.box.style.border.fg = theme.accentFg;
    if (this.isVisible) this.renderContent();
  }
}
