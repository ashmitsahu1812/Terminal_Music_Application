import blessed from 'neo-blessed';
import { AppStore } from '../store/AppStore.js';
import { MetadataParser } from '../parser/MetadataParser.js';
import { YouTubeStreamer } from '../audio/YouTubeStreamer.js';
import { getTheme } from './Theme.js';
import { AmbientSoundType, VisualizerMode } from '../types/index.js';

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
    this.form.setLabel(' Command Palette (:yt <search>, :nightcore, :vaporwave, :ambient rain, :speed 1.5, :theme chroma, :help) ');
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
      case 'yt':
      case 'youtube': {
        if (!arg) break;
        try {
          const ytTrack = await YouTubeStreamer.resolveStream(arg);
          if (ytTrack) {
            this.appStore.addTrack(ytTrack);
            this.appStore.playTrack(ytTrack);
          }
        } catch (err: any) {
          console.error(err.message);
        }
        break;
      }
      case 'nightcore': {
        this.appStore.setNightcore();
        break;
      }
      case 'vaporwave': {
        this.appStore.setVaporwave();
        break;
      }
      case 'radio': {
        if (!arg) {
          this.appStore.setActiveTab('radio');
        } else {
          const stations = this.appStore.getRadioStations();
          const match = stations.find((s) => s.name.toLowerCase().includes(arg.toLowerCase()) || s.genre.toLowerCase().includes(arg.toLowerCase()));
          if (match) {
            this.appStore.playRadioStation(match);
          } else {
            this.appStore.setActiveTab('radio');
          }
        }
        break;
      }
      case 'lyrics': {
        const sub = arg.toLowerCase().trim();
        if (sub === 'clear') {
          this.appStore.getLyricsCacheManager().clearCache();
        } else if (sub === 'fetch' || sub === 'reload') {
          const currentTrack = this.appStore.getAudioEngine().getState().currentTrack;
          if (currentTrack) {
            currentTrack.lyrics = undefined;
            this.appStore.getLyricsCacheManager().getLyricsForTrack(currentTrack).then((lyrics) => {
              if (lyrics) {
                currentTrack.lyrics = lyrics;
                this.appStore.emit('updated');
              }
            });
          }
          this.appStore.setActiveTab('lyrics');
        } else {
          this.appStore.setActiveTab('lyrics');
        }
        break;
      }
      case 'pomo':
      case 'pomodoro': {
        const subParts = arg.trim().split(' ');
        const sub = subParts[0]?.toLowerCase();
        if (sub === 'pause') {
          this.appStore.getTimerManager().pausePomodoro();
        } else if (sub === 'resume') {
          this.appStore.getTimerManager().resumePomodoro();
        } else if (sub === 'reset' || sub === 'stop') {
          this.appStore.getTimerManager().resetPomodoro();
        } else if (sub === 'skip') {
          this.appStore.getTimerManager().skipPomodoroPhase();
        } else {
          // :pomo or :pomo start [workMin] [breakMin]
          const workMin = parseInt(subParts[1], 10) || parseInt(subParts[0], 10) || 25;
          const breakMin = parseInt(subParts[2], 10) || 5;
          this.appStore.getTimerManager().startPomodoro(workMin, breakMin);
        }
        break;
      }
      case 'sleep': {
        const sub = arg.toLowerCase().trim();
        if (sub === 'cancel' || sub === 'off' || sub === 'stop') {
          this.appStore.getTimerManager().cancelSleepTimer();
        } else {
          const mins = parseFloat(sub) || 30;
          this.appStore.getTimerManager().startSleepTimer(mins);
        }
        break;
      }
      case 'speed': {
        const val = parseFloat(arg);
        if (!isNaN(val)) {
          this.appStore.setSpeed(val);
        }
        break;
      }
      case 'ambient': {
        const raw = arg.toLowerCase();
        if (raw === 'off' || raw === 'stop' || raw === 'none' || !raw) {
          this.appStore.setAmbientSound('none');
        } else if (['rain', 'vinyl', 'fire', 'cafe'].includes(raw)) {
          this.appStore.setAmbientSound(raw as AmbientSoundType);
        }
        break;
      }
      case 'vis':
      case 'visualizer': {
        const sub = arg.toLowerCase() as VisualizerMode;
        if (['bars', 'wave', 'matrix', 'fire', 'vumeter'].includes(sub)) {
          this.appStore.getAudioEngine().setVisualizerMode(sub);
          this.appStore.setActiveTab('visualizer');
        }
        break;
      }
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
      case 'eq':
      case 'equalizer': {
        const sub = parts[1]?.toLowerCase();
        if (!sub) {
          // Open the EQ tab
          this.appStore.setActiveTab('equalizer');
        } else {
          // :eq preset <name>  or  :eq <preset-name>
          const presetArg = (sub === 'preset' ? parts[2] : sub)?.toLowerCase();
          const validPresets = ['flat', 'bass_boost', 'treble_boost', 'electronic', 'rock', 'vocal', 'lofi', 'acoustic'];
          if (presetArg && validPresets.includes(presetArg)) {
            this.appStore.setEQPreset(presetArg as any);
            this.appStore.setActiveTab('equalizer');
          }
        }
        break;
      }
      case 'stats':
      case 'analytics': {
        const sub = parts[1]?.toLowerCase();
        if (sub === 'clear') {
          this.appStore.getStatsManager().clearStats();
        }
        this.appStore.setActiveTab('stats');
        break;
      }
      case 'smart':
      case 'generate': {
        this.appStore.setActiveTab('smart');
        break;
      }
      case 'export': {
        const sub = parts[1]?.toLowerCase();
        const outDir = parts[2] || (process.env.HOME + '/Music/Playlists');
        if (sub === 'all') {
          const files = this.appStore.exportAllPlaylists(outDir);
          process.title = `Exported ${files.length} playlists to ${outDir}`;
        } else if (arg) {
          const pl = this.appStore.getPlaylists().find((p) => p.name.toLowerCase().includes(arg.toLowerCase()));
          if (pl) {
            const file = this.appStore.exportPlaylist(pl.id, outDir);
            if (file) process.title = `Exported: ${file}`;
          }
        }
        break;
      }
      case 'import': {
        if (arg) {
          try {
            const result = this.appStore.importPlaylistFromM3U(arg);
            process.title = `Imported: ${result.added} tracks (${result.unmatched} unmatched)`;
          } catch {
            process.title = `Import failed: ${arg}`;
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
