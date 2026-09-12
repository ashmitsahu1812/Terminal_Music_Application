import blessed from 'neo-blessed';
import { getTheme } from './Theme.js';

export interface ToastConfig {
  message: string;
  durationMs?: number;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export class ToastManager {
  private screen: blessed.Widgets.Screen;
  private currentToast: blessed.Widgets.BoxElement | null = null;
  private timeoutId: NodeJS.Timeout | null = null;
  private getThemeName: () => string;

  constructor(screen: blessed.Widgets.Screen, getThemeName: () => string) {
    this.screen = screen;
    this.getThemeName = getThemeName;
  }

  public show(config: ToastConfig): void {
    if (this.currentToast) {
      this.currentToast.destroy();
      this.currentToast = null;
      if (this.timeoutId) clearTimeout(this.timeoutId);
    }

    const theme = getTheme(this.getThemeName());
    const duration = config.durationMs || 3000;

    let fg = theme.fg;
    let prefix = 'ℹ';
    
    switch (config.type) {
      case 'success':
        fg = 'green';
        prefix = '✓';
        break;
      case 'error':
        fg = 'red';
        prefix = '✗';
        break;
      case 'warning':
        fg = 'yellow';
        prefix = '⚠';
        break;
      default:
        prefix = 'ℹ';
        fg = theme.accentFg || 'blue';
        break;
    }

    this.currentToast = blessed.box({
      parent: this.screen,
      bottom: 1,
      right: 1,
      width: config.message.length + 8,
      height: 3,
      tags: true,
      border: { type: 'line' },
      content: ` {bold}{${fg}-fg}${prefix}{/${fg}-fg}{/bold}  ${config.message}`,
      style: {
        fg: theme.fg,
        bg: theme.bg,
        border: { fg: fg },
      },
    });

    this.currentToast.setFront();
    this.screen.render();

    this.timeoutId = setTimeout(() => {
      if (this.currentToast) {
        this.currentToast.destroy();
        this.currentToast = null;
        this.screen.render();
      }
    }, duration);
  }
}
