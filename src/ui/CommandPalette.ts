import blessed from 'neo-blessed';
import { AppStore } from '../store/AppStore.js';
import { MetadataParser } from '../parser/MetadataParser.js';
import { getTheme } from './Theme.js';

export class CommandPalette {
  private form: blessed.Widgets.FormElement<any>;
  private input: blessed.Widgets.TextboxElement;
  private appStore: AppStore;
  private screen: blessed.Widgets.Screen;
  private mode: 'command' | 'search' = 'command';

  constructor(screen: blessed.Widgets.Screen, appStore: AppStore) {
    this.screen = screen;
    this.appStore = appStore;

    const theme = getTheme(this.appStore.getConfig().theme);

    this.form = blessed.form({
      parent: screen,
      bottom: 4,
      left: 0,
      width: '100%',
      height: 3,
      border: { type: 'line' },
      hidden: true,
      style: {
        fg: theme.fg,
        bg: theme.bg,
        border: { fg: theme.accentFg },
      },
    });

    this.input = blessed.textbox({
      parent: this.form,
      top: 0,
      left: 0,
      width: '100%-2',
      height: 1,
      inputOnFocus: true,
      style: {
        fg: theme.fg,
        bg: theme.bg,
      },
    });

    this.input.on('submit', (value: string) => {
      this.handleInput(value);
      this.hide();
    });

    this.input.on('cancel', () => {
      this.hide();
    });

    // Real-time fuzzy search updates when in search mode
    this.input.on('keypress', () => {
      if (this.mode === 'search') {
        setTimeout(() => {
          this.appStore.setSearchQuery(this.input.getValue());
        }, 10);
      }
    });
  }

  public showCommand(): void {
    this.mode = 'command';
    this.form.setLabel(' Command Palette (e.g. :play <name>, :theme cyberpunk, :volume 80, :help) ');
    this.input.setValue(':');
    this.form.show();
    this.input.focus();
    this.screen.render();
  }

  public showSearch(): void {
    this.mode = 'search';
    this.form.setLabel(' Fuzzy Search Library (Press ESC to exit search) ');
    this.input.setValue('/');
    this.form.show();
    this.input.focus();
    this.screen.render();
  }

  public hide(): void {
    this.form.hide();
    this.screen.render();
  }

  public isVisible(): boolean {
    return !this.form.hidden;
  }

  private async handleInput(raw: string): Promise<void> {
    const text = raw.trim();
    if (text.startsWith('/')) {
      const query = text.slice(1);
      this.appStore.setSearchQuery(query);
      return;
    }

    if (!text.startsWith(':')) return;

    const parts = text.slice(1).trim().split(' ');
    const cmd = parts[0]?.toLowerCase();
    const arg = parts.slice(1).join(' ');

    switch (cmd) {
      case 'play': {
        if (!arg) break;
        const tracks = this.appStore.getAllTracks();
        const found = tracks.find(
          (t) =>
            t.title.toLowerCase().includes(arg.toLowerCase()) ||
            t.artist.toLowerCase().includes(arg.toLowerCase())
        );
        if (found) {
          this.appStore.playTrack(found);
        }
        break;
      }
      case 'queue': {
        const sub = parts[1]?.toLowerCase();
        const target = parts.slice(2).join(' ');
        if (sub === 'add' && target) {
          const tracks = this.appStore.getAllTracks();
          const found = tracks.find((t) =>
            t.title.toLowerCase().includes(target.toLowerCase())
          );
          if (found) {
            this.appStore.addToQueue(found);
          }
        } else if (sub === 'clear') {
          this.appStore.clearQueue();
        }
        break;
      }
      case 'playlist': {
        const sub = parts[1]?.toLowerCase();
        const name = parts.slice(2).join(' ');
        if (sub === 'create' && name) {
          this.appStore.createPlaylist(name);
        }
        break;
      }
      case 'theme': {
        if (arg) {
          this.appStore.setTheme(arg.toLowerCase());
        }
        break;
      }
      case 'volume': {
        const vol = parseInt(arg, 10);
        if (!isNaN(vol)) {
          this.appStore.setVolume(vol);
        }
        break;
      }
      case 'seek': {
        const val = parseInt(arg, 10);
        if (!isNaN(val)) {
          this.appStore.getAudioEngine().seek(val);
        }
        break;
      }
      case 'scan': {
        if (arg) {
          const newTracks = await MetadataParser.scanDirectory(arg);
          for (const track of newTracks) {
            this.appStore.addTrack(track);
          }
        }
        break;
      }
      case 'q':
      case 'quit': {
        process.exit(0);
        break;
      }
    }
  }
}
