import blessed from 'neo-blessed';
import { AppStore } from '../store/AppStore.js';
import { getTheme } from './Theme.js';
import { AppConfig } from '../types/index.js';

export class KeybindingsView {
  private box: blessed.Widgets.BoxElement;
  private list: blessed.Widgets.ListElement;
  private appStore: AppStore;
  private keyMap: { action: keyof AppConfig['keybindings']; label: string }[] = [
    { action: 'togglePlay', label: 'Play / Pause' },
    { action: 'nextTrack', label: 'Next Track' },
    { action: 'prevTrack', label: 'Previous Track' },
    { action: 'seekForward', label: 'Seek Forward' },
    { action: 'seekBackward', label: 'Seek Backward' },
    { action: 'volumeUp', label: 'Volume Up' },
    { action: 'volumeDown', label: 'Volume Down' },
    { action: 'mute', label: 'Toggle Mute' },
    { action: 'shuffle', label: 'Toggle Shuffle' },
    { action: 'loop', label: 'Cycle Loop Mode' },
    { action: 'commandPalette', label: 'Command Palette' },
    { action: 'search', label: 'Search' },
    { action: 'quit', label: 'Quit App' },
  ];
  private selectedIdx: number = 0;
  private isEditing: boolean = false;

  constructor(parent: blessed.Widgets.BoxElement, appStore: AppStore) {
    this.appStore = appStore;
    const theme = getTheme(this.appStore.getConfig().theme);

    this.box = blessed.box({
      parent,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      tags: true,
      style: { fg: theme.fg, bg: theme.bg },
    });

    blessed.box({
      parent: this.box,
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      tags: true,
      content: '\n{center}{bold}{cyan-fg}⌨️  Keybindings Settings{/cyan-fg}{/bold}{/center}',
      style: { fg: theme.headerFg, bg: theme.headerBg },
    });

    this.list = blessed.list({
      parent: this.box,
      top: 4,
      left: 'center',
      width: '60%',
      height: '100%-6',
      tags: true,
      keys: true,
      vi: true,
      mouse: true,
      border: { type: 'line' },
      label: ' {bold}Remap Keys{/bold} ',
      style: {
        fg: theme.fg,
        bg: theme.bg,
        border: { fg: theme.borderFg },
        selected: { fg: theme.highlightFg, bg: theme.highlightBg, bold: true },
        item: { fg: theme.fg },
      },
      items: [],
    });

    this.list.on('select item', () => {
      this.selectedIdx = (this.list as any).selected ?? 0;
    });

    this.list.key(['enter'], () => {
      if (this.isEditing) return;
      this.isEditing = true;
      this.updateList();
      
      const prompt = blessed.box({
        parent: this.box,
        top: 'center',
        left: 'center',
        width: 40,
        height: 5,
        tags: true,
        border: { type: 'line' },
        content: '\n{center}Press the new key for:\n{bold}' + this.keyMap[this.selectedIdx].label + '{/bold}{/center}',
        style: {
          fg: theme.highlightFg,
          bg: theme.highlightBg,
          border: { fg: theme.accentFg },
        },
      });
      prompt.setFront();
      (this.box.screen as any)?.render();

      this.box.screen.once('keypress', (ch, key) => {
        this.isEditing = false;
        prompt.destroy();
        
        if (key && key.name && key.name !== 'escape' && key.name !== 'enter' && key.name !== 'return') {
          let newKey = key.name;
          if (key.shift && newKey.length === 1) newKey = newKey.toUpperCase();
          if (ch && !key.name) newKey = ch; // Fallback for raw chars

          // Check for conflicts
          const config = this.appStore.getConfig();
          const kb = { ...config.keybindings };
          for (const k in kb) {
            if ((kb as any)[k] === newKey && k !== this.keyMap[this.selectedIdx].action) {
              (kb as any)[k] = null; // Unbind conflict
            }
          }
          kb[this.keyMap[this.selectedIdx].action] = newKey;
          
          this.appStore.updateConfig({ keybindings: kb });
          this.appStore.emit('keybindings-changed');
        }
        
        this.updateList();
        this.list.focus();
        (this.box.screen as any)?.render();
      });
    });

    this.appStore.on('updated', () => {
      if (!this.isEditing) this.updateList();
    });

    this.updateList();
  }

  private updateList(): void {
    const kb = this.appStore.getConfig().keybindings;
    const items = this.keyMap.map((map, i) => {
      const currentKey = kb[map.action] || 'Unbound';
      const indicator = this.isEditing && i === this.selectedIdx ? ' > Press new key < ' : `[ ${currentKey} ]`;
      return ` ${map.label.padEnd(25, ' ')} ${indicator}`;
    });
    this.list.setItems(items as any);
    this.list.select(this.selectedIdx);
    (this.box.screen as any)?.render();
  }

  public focus(): void {
    this.list.focus();
  }

  public updateTheme(): void {
    const theme = getTheme(this.appStore.getConfig().theme);
    this.box.style.fg = theme.fg;
    this.box.style.bg = theme.bg;
    this.list.style.fg = theme.fg;
    this.list.style.bg = theme.bg;
    if (this.list.style.border) this.list.style.border.fg = theme.borderFg;
    if (this.list.style.selected) {
      this.list.style.selected.fg = theme.highlightFg;
      this.list.style.selected.bg = theme.highlightBg;
    }
  }
}
