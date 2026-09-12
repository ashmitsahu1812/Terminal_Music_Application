export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface Track {
  id: string;
  filePath: string;
  fileName: string;
  title: string;
  artist: string;
  album: string;
  year?: number;
  genre?: string;
  trackNumber?: number;
  duration: number; // in seconds
  bitrate?: number;
  sampleRate?: number;
  format: string; // mp3, wav, flac, ogg, etc.
  coverArt?: Buffer;
  lyrics?: LyricLine[];
  addedAt: string; // ISO date string
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  trackIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type LoopMode = 'off' | 'track' | 'queue';
export type VisualizerMode = 'bars' | 'wave' | 'matrix' | 'fire' | 'vumeter';
export type AmbientSoundType = 'none' | 'rain' | 'vinyl' | 'fire' | 'cafe';
export type EQPreset = 'flat' | 'bass_boost' | 'treble_boost' | 'electronic' | 'rock' | 'vocal' | 'lofi' | 'acoustic' | 'custom';

export interface EqualizerBand {
  frequency: number;
  label: string;
  gain: number; // in dB (-12 to +12)
}

export interface PlaybackState {
  currentTrack: Track | null;
  isPlaying: boolean;
  isPaused: boolean;
  position: number; // current elapsed time in seconds
  duration: number; // total track duration in seconds
  volume: number; // 0 to 100
  isMuted: boolean;
  previousVolume: number; // for restoring after unmute
  loopMode: LoopMode;
  isShuffle: boolean;
  audioBackend: string; // 'afplay' | 'mpv' | 'ffplay' | 'mock'
  speed: number; // 0.5 to 2.0 (1.0 = normal, 1.25 = nightcore, 0.8 = vaporwave)
  eqPreset: EQPreset;
  eqBands: number[]; // 10 gain values in dB
  ambientSound: AmbientSoundType;
  visualizerMode: VisualizerMode;
  lyrics?: LyricLine[];
}

export interface AppConfig {
  theme: string;
  volume: number;
  loopMode: LoopMode;
  isShuffle: boolean;
  libraryDirectories: string[];
  keybindings: Record<string, string>;
  audioBackendPreference?: string;
  speed: number;
  eqPreset: EQPreset;
  eqBands?: number[];
  ambientSound: AmbientSoundType;
  visualizerMode: VisualizerMode;
  discordRpcEnabled: boolean;
}

export interface RadioStation {
  id: string;
  name: string;
  genre: string;
  streamUrl: string;
  description: string;
  bitrate?: string;
  country?: string;
}

export type ViewTab = 'library' | 'playlists' | 'queue' | 'visualizer' | 'art' | 'lyrics' | 'radio' | 'equalizer' | 'stats' | 'smart';

export interface Command {
  name: string;
  description: string;
  execute: (args: string[]) => void | Promise<void>;
}
