import { EventEmitter } from 'events';
import Fuse from 'fuse.js';
import { Track, Playlist, AppConfig, LoopMode, ViewTab, VisualizerMode, AmbientSoundType, EQPreset, RadioStation } from '../types/index.js';
import { AudioEngine } from '../audio/AudioEngine.js';
import { StorageManager } from '../storage/StorageManager.js';
import { AmbientSoundManager } from '../audio/AmbientSoundManager.js';
import { DiscordRPC } from '../integrations/DiscordRPC.js';
import { RadioManager } from '../radio/RadioManager.js';
import { LyricsCacheManager } from '../lyrics/LyricsCacheManager.js';
import { TimerManager } from '../timer/TimerManager.js';
import { EqualizerManager } from '../audio/EqualizerManager.js';
import { StatsManager } from '../stats/StatsManager.js';
import { PlaylistIO } from '../io/PlaylistIO.js';

export class AppStore extends EventEmitter {
  private audioEngine: AudioEngine;
  private storageManager: StorageManager;
  private ambientManager: AmbientSoundManager;
  private radioManager: RadioManager;
  private lyricsCacheManager: LyricsCacheManager;
  private timerManager: TimerManager;
  private equalizerManager: EqualizerManager;
  private statsManager: StatsManager;
  private discordRpc: DiscordRPC | null = null;

  private tracks: Track[] = [];
  private filteredTracks: Track[] = [];
  private queue: Track[] = [];
  private history: Track[] = [];
  private playlists: Playlist[] = [];
  private config: AppConfig;
  private activeTab: ViewTab = 'library';
  private searchQuery: string = '';
  private fuse: Fuse<Track> | null = null;
  private isShuffled: boolean = false;
  private unShuffledQueue: Track[] = [];

  constructor(audioEngine: AudioEngine, storageManager: StorageManager) {
    super();
    this.audioEngine = audioEngine;
    this.storageManager = storageManager;
    this.config = this.storageManager.loadConfig();
    this.playlists = this.storageManager.loadPlaylists();
    this.tracks = this.storageManager.loadLibraryTracks();
    this.filteredTracks = [...this.tracks];
    this.initFuse();

    this.ambientManager = new AmbientSoundManager(this);
    this.radioManager = new RadioManager();
    this.lyricsCacheManager = new LyricsCacheManager();
    this.timerManager = new TimerManager(this);
    this.equalizerManager = new EqualizerManager(
      this.config.eqPreset || 'flat',
      this.config.eqBands,
    );
    this.statsManager = new StatsManager(this.storageManager.getConfigDir());

    this.timerManager.on('tick', () => {
      this.emit('timer-tick');
    });
    this.timerManager.on('pomodoro-updated', () => {
      this.emit('updated');
    });
    this.timerManager.on('sleep-updated', () => {
      this.emit('updated');
    });

    // Sync Audio Engine settings from persisted config
    this.audioEngine.setVolume(this.config.volume);
    this.audioEngine.setLoopMode(this.config.loopMode);
    this.audioEngine.setShuffle(this.config.isShuffle);
    this.audioEngine.setSpeed(this.config.speed || 1.0);
    this.audioEngine.setVisualizerMode(this.config.visualizerMode || 'bars');
    this.isShuffled = this.config.isShuffle;

    // Initialize Discord RPC
    if (this.config.discordRpcEnabled) {
      try {
        this.discordRpc = new DiscordRPC(this);
      } catch {}
    }

    // Listen to Audio Engine events
    this.audioEngine.on('track-ended', (endedTrack: Track | null) => {
      if (endedTrack) this.statsManager.endSession();
      this.handleTrackEnded(endedTrack);
    });

    this.audioEngine.on('state-changed', () => {
      this.emit('updated');
    });

    this.audioEngine.on('position', (pos) => {
      this.emit('position', pos);
    });
  }

  private initFuse(): void {
    this.fuse = new Fuse(this.tracks, {
      keys: ['title', 'artist', 'album', 'genre'],
      threshold: 0.4,
    });
  }

  public setTracks(tracks: Track[]): void {
    this.tracks = tracks;
    this.initFuse();
    this.applySearchQuery(this.searchQuery);
    this.storageManager.saveLibraryTracks(tracks);
    this.emit('updated');
  }

  public addTrack(track: Track): void {
    if (!this.tracks.some((t) => t.id === track.id)) {
      this.tracks.push(track);
      this.initFuse();
      this.applySearchQuery(this.searchQuery);
      this.storageManager.saveLibraryTracks(this.tracks);
      this.emit('updated');
    }
  }

  public getTracks(): Track[] {
    return this.filteredTracks;
  }

  public getAllTracks(): Track[] {
    return this.tracks;
  }

  public setSearchQuery(query: string): void {
    this.searchQuery = query;
    this.applySearchQuery(query);
    this.emit('updated');
  }

  private applySearchQuery(query: string): void {
    if (!query || query.trim() === '') {
      this.filteredTracks = [...this.tracks];
    } else if (this.fuse) {
      const results = this.fuse.search(query);
      this.filteredTracks = results.map((res) => res.item);
    }
  }

  // Queue Operations
  public getQueue(): Track[] {
    return this.queue;
  }

  public addToQueue(track: Track): void {
    this.queue.push(track);
    this.emit('updated');
  }

  public playTrack(track: Track): void {
    const currentState = this.audioEngine.getState();
    if (currentState.currentTrack) {
      this.history.push(currentState.currentTrack);
      this.statsManager.endSession();
    }
    this.audioEngine.play(track);
    this.statsManager.startSession(track.id, track.title, track.artist, track.album, track.filePath);
    this.emit('updated');
  }

  public playQueueIndex(index: number): void {
    if (index < 0 || index >= this.queue.length) return;
    const track = this.queue.splice(index, 1)[0];
    this.playTrack(track);
  }

  public moveQueueTrack(fromIndex: number, toIndex: number): void {
    if (
      fromIndex < 0 ||
      fromIndex >= this.queue.length ||
      toIndex < 0 ||
      toIndex >= this.queue.length
    ) {
      return;
    }
    const [moved] = this.queue.splice(fromIndex, 1);
    this.queue.splice(toIndex, 0, moved);
    this.emit('updated');
  }

  public removeFromQueue(index: number): void {
    if (index >= 0 && index < this.queue.length) {
      this.queue.splice(index, 1);
      this.emit('updated');
    }
  }

  public clearQueue(): void {
    this.queue = [];
    this.emit('updated');
  }

  public toggleShuffle(): void {
    this.isShuffled = !this.isShuffled;
    this.config.isShuffle = this.isShuffled;
    this.storageManager.saveConfig(this.config);
    this.audioEngine.setShuffle(this.isShuffled);

    if (this.isShuffled && this.queue.length > 0) {
      this.unShuffledQueue = [...this.queue];
      this.shuffleQueueFisherYates();
    } else if (!this.isShuffled && this.unShuffledQueue.length > 0) {
      this.queue = [...this.unShuffledQueue];
    }
    this.emit('updated');
  }

  private shuffleQueueFisherYates(): void {
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }
  }

  public cycleLoopMode(): void {
    const modes: LoopMode[] = ['off', 'track', 'queue'];
    const currentIndex = modes.indexOf(this.config.loopMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    this.config.loopMode = nextMode;
    this.storageManager.saveConfig(this.config);
    this.audioEngine.setLoopMode(nextMode);
    this.emit('updated');
  }

  public nextTrack(): void {
    const state = this.audioEngine.getState();
    if (state.currentTrack && state.loopMode === 'track') {
      this.audioEngine.play(state.currentTrack);
      return;
    }

    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      this.playTrack(next);
    } else if (state.loopMode === 'queue' && this.history.length > 0) {
      this.queue = [...this.history];
      this.history = [];
      if (this.queue.length > 0) {
        const next = this.queue.shift()!;
        this.playTrack(next);
      }
    } else {
      this.audioEngine.stop();
    }
  }

  public previousTrack(): void {
    const state = this.audioEngine.getState();

    if (state.position > 3 && state.currentTrack) {
      this.audioEngine.play(state.currentTrack);
      return;
    }

    if (this.history.length > 0) {
      const prev = this.history.pop()!;
      if (state.currentTrack) {
        this.queue.unshift(state.currentTrack);
      }
      this.audioEngine.play(prev);
    } else if (state.currentTrack) {
      this.audioEngine.play(state.currentTrack);
    }
  }

  private handleTrackEnded(endedTrack: Track | null): void {
    const state = this.audioEngine.getState();
    if (state.loopMode === 'track' && endedTrack) {
      this.audioEngine.play(endedTrack);
    } else {
      this.nextTrack();
    }
  }

  // Playlist Management
  public getPlaylists(): Playlist[] {
    return this.playlists;
  }

  public createPlaylist(name: string, description?: string): Playlist {
    const playlist: Playlist = {
      id: `pl-${Date.now()}`,
      name,
      description,
      trackIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.playlists.push(playlist);
    this.storageManager.savePlaylists(this.playlists);
    this.emit('updated');
    return playlist;
  }

  public renamePlaylist(id: string, newName: string): void {
    const pl = this.playlists.find((p) => p.id === id);
    if (pl) {
      pl.name = newName;
      pl.updatedAt = new Date().toISOString();
      this.storageManager.savePlaylists(this.playlists);
      this.emit('updated');
    }
  }

  public deletePlaylist(id: string): void {
    this.playlists = this.playlists.filter((p) => p.id !== id);
    this.storageManager.savePlaylists(this.playlists);
    this.emit('updated');
  }

  public addTrackToPlaylist(playlistId: string, trackId: string): void {
    const pl = this.playlists.find((p) => p.id === playlistId);
    if (pl && !pl.trackIds.includes(trackId)) {
      pl.trackIds.push(trackId);
      pl.updatedAt = new Date().toISOString();
      this.storageManager.savePlaylists(this.playlists);
      this.emit('updated');
    }
  }

  // Active View Tab
  public getActiveTab(): ViewTab {
    return this.activeTab;
  }

  public setActiveTab(tab: ViewTab): void {
    this.activeTab = tab;
    this.emit('updated');
  }

  // DJ Speed and Effects Controls
  public setSpeed(speed: number): void {
    this.config.speed = speed;
    this.storageManager.saveConfig(this.config);
    this.audioEngine.setSpeed(speed);
    this.emit('updated');
  }

  public cycleSpeed(): number {
    const speeds = [0.75, 0.8, 1.0, 1.25, 1.5, 2.0];
    const current = this.audioEngine.getState().speed;
    const next = speeds.find((s) => s > current + 0.05) || speeds[0];
    this.setSpeed(next);
    return next;
  }

  public setNightcore(): void {
    this.setSpeed(1.25);
  }

  public setVaporwave(): void {
    this.setSpeed(0.8);
  }

  public setEQPreset(preset: EQPreset): void {
    this.config.eqPreset = preset;
    this.equalizerManager.setPreset(preset);
    this.config.eqBands = this.equalizerManager.getGains();
    this.storageManager.saveConfig(this.config);
    this.audioEngine.setEQPreset(preset);
    this.emit('updated');
  }

  public applyCustomEQBands(gains: number[]): void {
    gains.forEach((g, i) => this.equalizerManager.setBandGain(i, g));
    this.config.eqPreset = 'custom';
    this.config.eqBands = gains;
    this.storageManager.saveConfig(this.config);
    this.audioEngine.setEQBands?.(gains);
    this.emit('updated');
  }

  public getEqualizerManager(): EqualizerManager {
    return this.equalizerManager;
  }

  // Ambient Sound Manager
  public setAmbientSound(ambient: AmbientSoundType): void {
    this.config.ambientSound = ambient;
    this.storageManager.saveConfig(this.config);
    this.ambientManager.setAmbient(ambient);
    this.emit('updated');
  }

  public cycleAmbientSound(): AmbientSoundType {
    const next = this.ambientManager.cycleAmbient();
    this.config.ambientSound = next;
    this.storageManager.saveConfig(this.config);
    this.emit('updated');
    return next;
  }

  // Visualizer Mode
  public cycleVisualizerMode(): VisualizerMode {
    const next = this.audioEngine.cycleVisualizerMode();
    this.config.visualizerMode = next;
    this.storageManager.saveConfig(this.config);
    this.emit('updated');
    return next;
  }

  // Config & Audio Getters
  public getConfig(): AppConfig {
    return this.config;
  }

  public updateConfig(partial: Partial<AppConfig>): void {
    this.config = { ...this.config, ...partial };
    this.storageManager.saveConfig(this.config);
    this.emit('updated');
  }

  public setVolume(vol: number): void {
    this.config.volume = vol;
    this.storageManager.saveConfig(this.config);
    this.audioEngine.setVolume(vol);
    this.emit('updated');
  }

  public setTheme(themeName: string): void {
    this.config.theme = themeName;
    this.storageManager.saveConfig(this.config);
    this.emit('updated');
    this.emit('theme-changed', themeName);
  }

  public getAudioEngine(): AudioEngine {
    return this.audioEngine;
  }

  public getAmbientManager(): AmbientSoundManager {
    return this.ambientManager;
  }

  // Radio Management
  public getRadioStations(): RadioStation[] {
    return this.radioManager.getAllStations();
  }

  public playRadioStation(station: RadioStation): void {
    const track = RadioManager.stationToTrack(station);
    this.playTrack(track);
  }

  public getRadioManager(): RadioManager {
    return this.radioManager;
  }

  public getLyricsCacheManager(): LyricsCacheManager {
    return this.lyricsCacheManager;
  }

  public getTimerManager(): TimerManager {
    return this.timerManager;
  }

  public getStatsManager(): StatsManager {
    return this.statsManager;
  }

  public saveSmartPlaylist(playlist: Playlist, tracks: Track[]): void {
    // Add to playlists list
    this.playlists.push(playlist);
    this.storageManager.savePlaylists(this.playlists);
    // Add any tracks not already in library
    for (const track of tracks) {
      if (!this.tracks.some((t) => t.id === track.id)) {
        this.tracks.push(track);
      }
    }
    this.storageManager.saveLibraryTracks(this.tracks);
    this.emit('updated');
  }

  // ── M3U Import / Export ──────────────────────────────────────────────

  public exportPlaylist(playlistId: string, outputDir: string): string | null {
    const pl = this.playlists.find((p) => p.id === playlistId);
    if (!pl) return null;
    return PlaylistIO.exportM3U(pl, this.tracks, outputDir);
  }

  public exportAllPlaylists(outputDir: string): string[] {
    return PlaylistIO.exportAll(this.playlists, this.tracks, outputDir);
  }

  public importPlaylistFromM3U(filePath: string): { added: number; unmatched: number } {
    const { playlist, trackPaths } = PlaylistIO.importM3U(filePath);
    const { matched, unmatched } = PlaylistIO.resolveImportedPaths(trackPaths, this.tracks);
    const importedPlaylist: Playlist = {
      ...playlist,
      trackIds: matched.map((t) => t.id),
    };
    this.playlists.push(importedPlaylist);
    this.storageManager.savePlaylists(this.playlists);
    this.emit('updated');
    return { added: matched.length, unmatched: unmatched.length };
  }
}
