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
}

export interface AppConfig {
  theme: string;
  volume: number;
  loopMode: LoopMode;
  isShuffle: boolean;
  libraryDirectories: string[];
  keybindings: Record<string, string>;
  audioBackendPreference?: string;
}

export type ViewTab = 'library' | 'playlists' | 'queue' | 'visualizer' | 'art';

export interface Command {
  name: string;
  description: string;
  execute: (args: string[]) => void | Promise<void>;
}
