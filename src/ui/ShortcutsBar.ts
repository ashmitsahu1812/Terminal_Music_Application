import blessed from 'neo-blessed';
import { AppStore } from '../store/AppStore.js';
import { getTheme } from './Theme.js';

export class ShortcutsBar {
  private box: blessed.Widgets.BoxElement;
  private appStore: AppStore;

  constructor(screen: blessed.Widgets.Screen, appStore: AppStore) {
    this.appStore = appStore;
    const theme = getTheme(this.appStore.getConfig().theme);

    this.box = blessed.box({
      parent: screen,
      bottom: 4,
      left: 0,
      width: '100%',
      height: 1,
      style: {
        fg: theme.headerFg,
        bg: theme.headerBg,
      },
      tags: true,
      content: this.getContent(),
    });

    this.appStore.on('updated', () => {
      this.box.setContent(this.getContent());
      screen.render();
    });
  }

  public updateTheme(): void {
    const theme = getTheme(this.appStore.getConfig().theme);
    this.box.style.fg = theme.headerFg;
    this.box.style.bg = theme.headerBg;
    this.box.setContent(this.getContent());
  }

  private getContent(): string {
    const activeTab = this.appStore.getActiveTab();
    let tabInfo = '';
    if (activeTab === 'library') {
      tabInfo = '[Enter] Play [a] Add Queue';
    } else if (activeTab === 'queue') {
      tabInfo = '[J/K] Move [d] Remove';
    } else if (activeTab === 'playlists') {
      tabInfo = '[:playlist create] New';
    } else if (activeTab === 'visualizer') {
      tabInfo = '{yellow-fg}[v]{/yellow-fg} Switch Mode';
    } else if (activeTab === 'lyrics') {
      tabInfo = 'Karaoke Synced';
    } else if (activeTab === 'radio') {
      tabInfo = '📡 [Enter] Stream Radio Station';
    } else if (activeTab === 'equalizer') {
      tabInfo = '🎛 [←/→] Band  [↑/↓] ±1dB  [f/b/t/r…] Preset';
    } else if (activeTab === 'stats') {
      tabInfo = '📊 Listening Analytics  [r] Refresh  [:stats clear] Reset';
    } else if (activeTab === 'smart') {
      tabInfo = '✨ [Enter] Save Playlist  [a] Add to Queue';
    } else {
      tabInfo = '24-bit ANSI Art';
    }

    return ` {bold}[Space]{/bold} Play/Pause │ {bold}[1-9,0]{/bold} Tabs │ {bold}[n]{/bold} Mini │ {bold}[[/]]{/bold} Speed │ {bold}[v]{/bold} Vis │ {bold}[w]{/bold} Ambient │ {bold}[/]{/bold} Search │ {bold}[:]{/bold} Cmd │ ${tabInfo}`;
  }
}
