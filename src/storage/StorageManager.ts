import fs from 'fs';
import path from 'path';
import os from 'os';
import { AppConfig, Playlist, Track } from '../types/index.js';

export class StorageManager {
  private configDir: string;
  private configFile: string;
  private playlistsFile: string;
  private libraryFile: string;

  private defaultConfig: AppConfig = {
    theme: 'cyberpunk',
    volume: 80,
    loopMode: 'off',
    isShuffle: false,
    speed: 1.0,
    eqPreset: 'flat',
    ambientSound: 'none',
    visualizerMode: 'bars',
    discordRpcEnabled: true,
    libraryDirectories: [],
    keybindings: {
      togglePlay: 'space',
      nextTrack: 'n',
      prevTrack: 'p',
      seekForward: 'l',
      seekBackward: 'h',
      volumeUp: '+',
      volumeDown: '-',
      mute: 'm',
      shuffle: 's',
      loop: 'r',
      commandPalette: ':',
      search: '/',
      quit: 'q',
    },
  };

  constructor(customDir?: string) {
    this.configDir = customDir || path.join(os.homedir(), '.config', 'terminal-music');
    this.configFile = path.join(this.configDir, 'config.json');
    this.playlistsFile = path.join(this.configDir, 'playlists.json');
    this.libraryFile = path.join(this.configDir, 'library.json');
    this.ensureConfigDir();
  }

  private ensureConfigDir(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }

  public loadConfig(): AppConfig {
    try {
      if (fs.existsSync(this.configFile)) {
        const raw = fs.readFileSync(this.configFile, 'utf-8');
        return { ...this.defaultConfig, ...JSON.parse(raw) };
      }
    } catch {}
    return { ...this.defaultConfig };
  }

  public saveConfig(config: AppConfig): void {
    try {
      fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save config:', err);
    }
  }

  public loadPlaylists(): Playlist[] {
    try {
      if (fs.existsSync(this.playlistsFile)) {
        const raw = fs.readFileSync(this.playlistsFile, 'utf-8');
        return JSON.parse(raw);
      }
    } catch {}
    return [];
  }

  public savePlaylists(playlists: Playlist[]): void {
    try {
      fs.writeFileSync(this.playlistsFile, JSON.stringify(playlists, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save playlists:', err);
    }
  }

  public loadLibraryTracks(): Track[] {
    try {
      if (fs.existsSync(this.libraryFile)) {
        const raw = fs.readFileSync(this.libraryFile, 'utf-8');
        return JSON.parse(raw);
      }
    } catch {}
    return [];
  }

  public saveLibraryTracks(tracks: Track[]): void {
    try {
      // Strip Buffer coverArt for lightweight JSON caching
      const serializable = tracks.map(({ coverArt, ...rest }) => rest);
      fs.writeFileSync(this.libraryFile, JSON.stringify(serializable, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save library index:', err);
    }
  }
}
