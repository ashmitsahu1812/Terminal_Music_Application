import blessed from 'neo-blessed';
import { AppStore } from '../store/AppStore.js';
import { HeaderComponent } from './Header.js';
import { FooterComponent } from './Footer.js';
import { LibraryView } from './LibraryView.js';
import { PlaylistView } from './PlaylistView.js';
import { QueueView } from './QueueView.js';
import { VisualizerView } from './VisualizerView.js';
import { AlbumArtView } from './AlbumArtView.js';
import { LyricsView } from './LyricsView.js';
import { RadioView } from './RadioView.js';
import { EqualizerView } from './EqualizerView.js';
import { StatsView } from './StatsView.js';
import { SmartPlaylistView } from './SmartPlaylistView.js';
import { MiniPlayerView } from './MiniPlayerView.js';
import { KeybindingsView } from './KeybindingsView.js';
import { ToastManager, ToastConfig } from './ToastManager.js';
import { CommandPalette } from './CommandPalette.js';
import { ShortcutsBar } from './ShortcutsBar.js';
import { getTheme } from './Theme.js';
import { ViewTab } from '../types/index.js';

export class UIManager {
  private screen: blessed.Widgets.Screen;
  private appStore: AppStore;
  private header: HeaderComponent;
  private footer: FooterComponent;
  private shortcutsBar: ShortcutsBar;
  private commandPalette: CommandPalette;
  private mainBox: blessed.Widgets.BoxElement;

  private libraryView: LibraryView;
  private playlistView: PlaylistView;
  private queueView: QueueView;
  private visualizerView: VisualizerView;
  private albumArtView: AlbumArtView;
  private lyricsView: LyricsView;
  private radioView: RadioView;
  private equalizerView: EqualizerView;
  private statsView: StatsView;
  private smartPlaylistView: SmartPlaylistView;
  private miniPlayerView: MiniPlayerView;
  private keybindingsView: KeybindingsView;
  private toastManager: ToastManager;

  private tabBoxes: Record<ViewTab, blessed.Widgets.BoxElement>;

  constructor(appStore: AppStore) {
    this.appStore = appStore;

    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Terminal Music Player',
      fullUnicode: true,
    });

    const theme = getTheme(this.appStore.getConfig().theme);

    this.header = new HeaderComponent(this.screen, this.appStore);
    this.footer = new FooterComponent(this.screen, this.appStore);
    this.shortcutsBar = new ShortcutsBar(this.screen, this.appStore);
    this.commandPalette = new CommandPalette(this.screen, this.appStore);

    this.mainBox = blessed.box({
      parent: this.screen,
      top: 4,
      left: 0,
      width: '100%',
      height: '100%-9', // 4 top header, 5 bottom dock & shortcut bar
      style: {
        fg: theme.fg,
        bg: theme.bg,
      },
    });

    // Create container boxes for each view tab
    this.tabBoxes = {
      library: blessed.box({ parent: this.mainBox, width: '100%', height: '100%' }),
      playlists: blessed.box({ parent: this.mainBox, width: '100%', height: '100%', hidden: true }),
      queue: blessed.box({ parent: this.mainBox, width: '100%', height: '100%', hidden: true }),
      visualizer: blessed.box({ parent: this.mainBox, width: '100%', height: '100%', hidden: true }),
      art: blessed.box({ parent: this.mainBox, width: '100%', height: '100%', hidden: true }),
      lyrics: blessed.box({ parent: this.mainBox, width: '100%', height: '100%', hidden: true }),
      radio: blessed.box({ parent: this.mainBox, width: '100%', height: '100%', hidden: true }),
      equalizer: blessed.box({ parent: this.mainBox, width: '100%', height: '100%', hidden: true }),
      stats: blessed.box({ parent: this.mainBox, width: '100%', height: '100%', hidden: true }),
      smart: blessed.box({ parent: this.mainBox, width: '100%', height: '100%', hidden: true }),
      keys: blessed.box({ parent: this.mainBox, width: '100%', height: '100%', hidden: true }),
    };

    // Instantiate views inside container boxes
    this.libraryView = new LibraryView(this.tabBoxes.library, this.appStore);
    this.playlistView = new PlaylistView(this.tabBoxes.playlists, this.appStore);
    this.queueView = new QueueView(this.tabBoxes.queue, this.appStore);
    this.visualizerView = new VisualizerView(this.tabBoxes.visualizer, this.appStore);
    this.albumArtView = new AlbumArtView(this.tabBoxes.art, this.appStore);
    this.lyricsView = new LyricsView(this.tabBoxes.lyrics, this.appStore);
    this.radioView = new RadioView(this.tabBoxes.radio, this.appStore);
    this.equalizerView = new EqualizerView(this.tabBoxes.equalizer, this.appStore);
    this.statsView = new StatsView(this.tabBoxes.stats, this.appStore);
    this.smartPlaylistView = new SmartPlaylistView(this.tabBoxes.smart, this.appStore);
    this.keybindingsView = new KeybindingsView(this.tabBoxes.keys, this.appStore);
    this.miniPlayerView = new MiniPlayerView(this.screen, this.appStore);

    this.setupGlobalKeybindings();

    this.appStore.on('updated', () => {
      this.switchTab(this.appStore.getActiveTab());
      this.screen.render();
    });

    this.appStore.on('theme-changed', () => {
      this.applyTheme();
    });

    this.toastManager = new ToastManager(this.screen, () => this.appStore.getConfig().theme);
    this.appStore.on('toast', (config: ToastConfig) => {
      this.toastManager.show(config);
    });

    // Handle terminal resize (SIGWINCH) gracefully
    this.screen.on('resize', () => {
      this.screen.render();
    });

    // Initial render
    this.switchTab('library');
    this.screen.render();
  }

  private switchTab(tab: ViewTab): void {
    (Object.keys(this.tabBoxes) as ViewTab[]).forEach((key) => {
      if (key === tab) {
        this.tabBoxes[key].show();
      } else {
        this.tabBoxes[key].hide();
      }
    });

    switch (tab) {
      case 'library':
        this.libraryView.focus();
        break;
      case 'playlists':
        this.playlistView.focus();
        break;
      case 'queue':
        this.queueView.focus();
        break;
      case 'visualizer':
        this.visualizerView.focus();
        break;
      case 'art':
        this.albumArtView.focus();
        break;
      case 'lyrics':
        this.lyricsView.focus();
        break;
      case 'radio':
        this.radioView.focus();
        break;
      case 'equalizer':
        this.equalizerView.focus();
        break;
      case 'stats':
        this.statsView.focus();
        break;
      case 'smart':
        this.smartPlaylistView.focus();
        break;
      case 'keys':
        this.keybindingsView.focus();
        break;
    }
  }

  private applyTheme(): void {
    const theme = getTheme(this.appStore.getConfig().theme);
    this.header.updateTheme();
    this.footer.updateTheme();
    this.shortcutsBar.updateTheme();
    this.libraryView.updateTheme();
    this.playlistView.updateTheme();
    this.queueView.updateTheme();
    this.visualizerView.updateTheme();
    this.albumArtView.updateTheme();
    this.lyricsView.updateTheme();
    this.radioView.updateTheme();
    this.equalizerView.updateTheme();
    this.statsView.updateTheme();
    this.smartPlaylistView.updateTheme();
    this.keybindingsView.updateTheme();
    this.miniPlayerView.updateTheme();
    this.screen.render();
  }

  private setupGlobalKeybindings(): void {
    // Process termination signals
    this.screen.key(['C-c', 'q'], () => {
      if (this.commandPalette.isVisible()) {
        this.commandPalette.hide();
        return;
      }
      this.cleanupAndExit();
    });

    // Space: Play / Pause toggle
    this.screen.key(['space'], () => {
      if (this.commandPalette.isVisible()) return;
      this.appStore.getAudioEngine().togglePlayPause();
    });

    // Media Navigation: Next / Prev
    this.screen.key(['n'], () => {
      if (this.commandPalette.isVisible()) return;
      this.appStore.nextTrack();
    });

    this.screen.key(['p'], () => {
      if (this.commandPalette.isVisible()) return;
      this.appStore.previousTrack();
    });

    // Seeking: h / l (+/- 5s)
    this.screen.key(['l'], () => {
      if (this.commandPalette.isVisible()) return;
      this.appStore.getAudioEngine().seek(5);
    });

    this.screen.key(['h'], () => {
      if (this.commandPalette.isVisible()) return;
      this.appStore.getAudioEngine().seek(-5);
    });

    // Volume controls: + / - / m (mute)
    this.screen.key(['+', '='], () => {
      if (this.commandPalette.isVisible()) return;
      const cur = this.appStore.getAudioEngine().getState().volume;
      this.appStore.setVolume(cur + 5);
    });

    this.screen.key(['-'], () => {
      if (this.commandPalette.isVisible()) return;
      const cur = this.appStore.getAudioEngine().getState().volume;
      this.appStore.setVolume(cur - 5);
    });

    this.screen.key(['m'], () => {
      if (this.commandPalette.isVisible()) return;
      this.appStore.getAudioEngine().toggleMute();
    });

    // DJ Speed multiplier: [ / ]
    this.screen.key([']'], () => {
      if (this.commandPalette.isVisible()) return;
      const curSpeed = this.appStore.getAudioEngine().getState().speed;
      this.appStore.setSpeed(curSpeed + 0.1);
    });

    this.screen.key(['['], () => {
      if (this.commandPalette.isVisible()) return;
      const curSpeed = this.appStore.getAudioEngine().getState().speed;
      this.appStore.setSpeed(curSpeed - 0.1);
    });

    // Visualizer mode switcher: v
    this.screen.key(['v'], () => {
      if (this.commandPalette.isVisible()) return;
      this.appStore.cycleVisualizerMode();
      this.appStore.setActiveTab('visualizer');
    });

    // Ambient background sound mixer: w
    this.screen.key(['w'], () => {
      if (this.commandPalette.isVisible()) return;
      this.appStore.cycleAmbientSound();
    });

    // Loop & Shuffle toggles: r / s
    this.screen.key(['r'], () => {
      if (this.commandPalette.isVisible()) return;
      this.appStore.cycleLoopMode();
    });

    this.screen.key(['-'], () => {
      if (this.commandPalette.isVisible()) return;
      this.appStore.setActiveTab('keys');
    });

    this.screen.key(['n'], () => {
      if (this.commandPalette.isVisible()) return;
      this.miniPlayerView.toggle();
    });

    this.screen.key(['s'], () => {
      if (this.commandPalette.isVisible()) return;
      this.appStore.toggleShuffle();
    });

    // Tab view switching: 1, 2, 3, 4, 5, 6, 7
    this.screen.key(['1'], () => this.appStore.setActiveTab('library'));
    this.screen.key(['2'], () => this.appStore.setActiveTab('playlists'));
    this.screen.key(['3'], () => this.appStore.setActiveTab('queue'));
    this.screen.key(['4'], () => this.appStore.setActiveTab('visualizer'));
    this.screen.key(['5'], () => this.appStore.setActiveTab('art'));
    this.screen.key(['6'], () => this.appStore.setActiveTab('lyrics'));
    this.screen.key(['7'], () => this.appStore.setActiveTab('radio'));
    this.screen.key(['8'], () => this.appStore.setActiveTab('equalizer'));
    this.screen.key(['9'], () => this.appStore.setActiveTab('stats'));
    this.screen.key(['0'], () => this.appStore.setActiveTab('smart'));

    // Command palette and search triggers: : and /
    this.screen.key([':'], () => {
      this.commandPalette.showCommand();
    });

    this.screen.key(['/'], () => {
      this.commandPalette.showSearch();
    });

    // Context key action 'a' to add selected library track to queue
    this.screen.key(['a'], () => {
      if (this.commandPalette.isVisible()) return;
      if (this.appStore.getActiveTab() === 'library') {
        const track = this.libraryView.getSelectedTrack();
        if (track) {
          this.appStore.addToQueue(track);
        }
      }
    });
  }

  public toggleMiniPlayer(): void {
    this.miniPlayerView.toggle();
  }

  private cleanupAndExit(): void {
    this.appStore.getAudioEngine().stop();
    this.header.destroy();
    this.visualizerView.destroy();
    this.screen.destroy();
    process.stdin.setRawMode?.(false);
    process.stdout.write('\x1b[?25h\x1b[2J\x1b[1;1H'); // Restore cursor & clear screen
    process.exit(0);
  }
}
