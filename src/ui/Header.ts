import blessed from 'neo-blessed';
import { AppStore } from '../store/AppStore.js';
import { getTheme } from './Theme.js';

export class HeaderComponent {
  private box: blessed.Widgets.BoxElement;
  private appStore: AppStore;
  private clockTimer: NodeJS.Timeout | null = null;

  constructor(screen: blessed.Widgets.Screen, appStore: AppStore) {
    this.appStore = appStore;

    const theme = getTheme(this.appStore.getConfig().theme);

    this.box = blessed.box({
      parent: screen,
      top: 0,
      left: 0,
      width: '100%',
      height: 4,
      style: {
        fg: theme.headerFg,
        bg: theme.headerBg,
        border: { fg: theme.borderFg },
      },
      border: { type: 'line' },
      tags: true,
      content: this.getContent(),
    });

    this.clockTimer = setInterval(() => {
      this.box.setContent(this.getContent());
      screen.render();
    }, 1000);
  }

  public updateTheme(): void {
    const theme = getTheme(this.appStore.getConfig().theme);
    this.box.style.fg = theme.headerFg;
    this.box.style.bg = theme.headerBg;
    if (this.box.style.border) {
      this.box.style.border.fg = theme.borderFg;
    }
    this.box.setContent(this.getContent());
  }

  private getContent(): string {
    const config = this.appStore.getConfig();
    const state = this.appStore.getAudioEngine().getState();
    const timeStr = new Date().toLocaleTimeString();

    const titleLogo = `{bold}{magenta-fg}♫ TERMINAL MUSIC PLAYER ♫{/magenta-fg}{/bold}`;
    const deviceStr = `{cyan-fg}Backend:{/cyan-fg} ${state.audioBackend.toUpperCase()}`;
    const themeStr = `{yellow-fg}Theme:{/yellow-fg} ${config.theme}`;
    const clockStr = `{white-fg}${timeStr}{/white-fg}`;

    return ` ${titleLogo}  │  ${deviceStr}  │  ${themeStr}  │  ${clockStr}`;
  }

  public destroy(): void {
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
    }
  }
}
