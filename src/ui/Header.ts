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

    this.appStore.on('updated', () => {
      this.box.setContent(this.getContent());
      screen.render();
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

    // Speed badge
    let speedStr = `{white-fg}${state.speed}x{/white-fg}`;
    if (state.speed === 1.25) speedStr = `{bold}{magenta-fg}1.25x [NIGHTCORE]{/magenta-fg}{/bold}`;
    else if (state.speed === 0.8) speedStr = `{bold}{cyan-fg}0.8x [VAPORWAVE]{/cyan-fg}{/bold}`;
    else if (state.speed !== 1.0) speedStr = `{yellow-fg}${state.speed}x{/yellow-fg}`;

    // Ambient badge
    let ambientStr = '';
    if (state.ambientSound !== 'none') {
      const iconMap: Record<string, string> = {
        rain: '🌧️ RAIN',
        vinyl: '📻 VINYL',
        fire: '🔥 FIRE',
        cafe: '☕ CAFE',
      };
      ambientStr = `  │  {blue-fg}${iconMap[state.ambientSound] || state.ambientSound.toUpperCase()}{/blue-fg}`;
    }

    // Pomodoro badge
    let pomoStr = '';
    const pomo = this.appStore.getTimerManager().getPomodoroState();
    if (pomo.phase !== 'idle') {
      const pMins = Math.floor(pomo.remainingSeconds / 60);
      const pSecs = pomo.remainingSeconds % 60;
      const timeFormatted = `${pMins.toString().padStart(2, '0')}:${pSecs.toString().padStart(2, '0')}`;
      if (pomo.phase === 'work') {
        pomoStr = `  │  {bold}{red-fg}🍅 [FOCUS ${timeFormatted}]{/red-fg}{/bold}`;
      } else {
        pomoStr = `  │  {bold}{green-fg}☕ [BREAK ${timeFormatted}]{/green-fg}{/bold}`;
      }
    }

    // Sleep timer badge
    let sleepStr = '';
    const sleep = this.appStore.getTimerManager().getSleepTimerState();
    if (sleep.isActive) {
      const sMins = Math.floor(sleep.remainingSeconds / 60);
      const sSecs = sleep.remainingSeconds % 60;
      const sleepFormatted = `${sMins.toString().padStart(2, '0')}:${sSecs.toString().padStart(2, '0')}`;
      sleepStr = `  │  {bold}{blue-fg}💤 [SLEEP ${sleepFormatted}]{/blue-fg}{/bold}`;
    }

    const themeStr = `{yellow-fg}Theme:{/yellow-fg} ${config.theme}`;
    const clockStr = `{white-fg}${timeStr}{/white-fg}`;

    return ` ${titleLogo}  │  ${deviceStr}  │  ${speedStr}${ambientStr}${pomoStr}${sleepStr}  │  ${themeStr}  │  ${clockStr}`;
  }

  public destroy(): void {
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
    }
  }
}
