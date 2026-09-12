import blessed from 'neo-blessed';
import { AppStore } from '../store/AppStore.js';
import { SmartPlaylistEngine } from '../playlist/SmartPlaylistEngine.js';
import { getTheme } from './Theme.js';

export class SmartPlaylistView {
  private box: blessed.Widgets.BoxElement;
  private list: blessed.Widgets.ListElement;
  private appStore: AppStore;
  private presets = SmartPlaylistEngine.getPresets();
  private selectedIdx: number = 0;
  private statusMsg: string = '';

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

    // Title header
    blessed.box({
      parent: this.box,
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      tags: true,
      content: '\n{center}{bold}{magenta-fg}✨  Smart Playlist Generator{/magenta-fg}{/bold}{/center}',
      style: { fg: theme.headerFg, bg: theme.headerBg },
    });

    // Preset list
    this.list = blessed.list({
      parent: this.box,
      top: 3,
      left: 0,
      width: '55%',
      height: '100%-6',
      tags: true,
      keys: true,
      vi: true,
      mouse: true,
      border: { type: 'line' },
      label: ' {bold}Presets{/bold} ',
      style: {
        fg: theme.fg,
        bg: theme.bg,
        border: { fg: theme.borderFg },
        selected: { fg: theme.highlightFg, bg: theme.highlightBg, bold: true },
        item: { fg: theme.fg },
      },
      items: this.presets.map((p) => ` ✨ ${p.name}`),
    });

    // Description panel
    const descBox = blessed.box({
      parent: this.box,
      top: 3,
      left: '55%',
      width: '45%',
      height: '100%-6',
      tags: true,
      border: { type: 'line' },
      label: ' {bold}Details{/bold} ',
      style: { fg: theme.fg, bg: theme.bg, border: { fg: theme.accentFg } },
    });

    // Status bar at bottom
    const statusBar = blessed.box({
      parent: this.box,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 3,
      tags: true,
      style: { fg: theme.headerFg, bg: theme.headerBg },
    });

    const updateDesc = () => {
      const idx = (this.list as any).selected ?? 0;
      this.selectedIdx = idx;
      const preset = this.presets[idx];
      if (!preset) return;

      const allTracks = this.appStore.getAllTracks();
      const preview = SmartPlaylistEngine.generate(allTracks, preset.config);

      let content = `\n{bold}{yellow-fg}${preset.name}{/yellow-fg}{/bold}\n\n`;
      content += `{gray-fg}${preset.description}{/gray-fg}\n\n`;
      content += `{cyan-fg}Would generate: {bold}${preview.length} tracks{/bold}{/cyan-fg}\n`;
      content += `{gray-fg}(Limit: ${preset.config.limit ?? 30}, Shuffle: ${preset.config.shuffle ? 'Yes' : 'No'}){/gray-fg}\n\n`;

      if (preview.length === 0) {
        content += `{red-fg}No matching tracks in your library.\nAdd more music and scan your directories!{/red-fg}`;
      } else {
        content += `{bold}Preview:{/bold}\n`;
        preview.slice(0, 8).forEach((t, i) => {
          const title = t.title.length > 22 ? t.title.slice(0, 19) + '…' : t.title;
          content += `  {gray-fg}${i + 1}.{/gray-fg} {bold}${title}{/bold} – {italic}${t.artist}{/italic}\n`;
        });
        if (preview.length > 8) {
          content += `  {gray-fg}… and ${preview.length - 8} more{/gray-fg}\n`;
        }
      }

      descBox.setContent(content);
      statusBar.setContent(
        this.statusMsg
          ? `\n {green-fg}${this.statusMsg}{/green-fg}`
          : `\n {bold}[Enter]{/bold} Create Playlist  {bold}[a]{/bold} Add All to Queue  {bold}[r]{/bold} Refresh`,
      );
      (this.box.screen as any)?.render();
    };

    this.list.on('select item', updateDesc);
    this.list.on('keypress', updateDesc);

    // Enter: save as playlist
    this.list.key(['enter'], () => {
      const preset = this.presets[this.selectedIdx];
      if (!preset) return;
      const allTracks = this.appStore.getAllTracks();
      const generated = SmartPlaylistEngine.generate(allTracks, preset.config);
      if (generated.length === 0) {
        this.statusMsg = '⚠ No matching tracks found.';
      } else {
        const pl = SmartPlaylistEngine.toPlaylist(generated, preset.name, preset.description);
        this.appStore.saveSmartPlaylist(pl, generated);
        this.statusMsg = `✓ Saved "${preset.name}" (${generated.length} tracks) to Playlists!`;
      }
      setTimeout(() => { this.statusMsg = ''; updateDesc(); }, 3000);
      updateDesc();
    });

    // 'a': add all to queue
    this.list.key(['a'], () => {
      const preset = this.presets[this.selectedIdx];
      if (!preset) return;
      const allTracks = this.appStore.getAllTracks();
      const generated = SmartPlaylistEngine.generate(allTracks, preset.config);
      generated.forEach((t) => this.appStore.addToQueue(t));
      this.statusMsg = `✓ Added ${generated.length} tracks to queue.`;
      setTimeout(() => { this.statusMsg = ''; updateDesc(); }, 3000);
      updateDesc();
    });

    this.list.key(['r'], () => updateDesc());

    this.appStore.on('updated', () => {
      updateDesc();
    });

    updateDesc();
  }

  public focus(): void {
    this.list.focus();
  }

  public updateTheme(): void {
    const theme = getTheme(this.appStore.getConfig().theme);
    this.box.style.fg = theme.fg;
    this.box.style.bg = theme.bg;
  }
}
