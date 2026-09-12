import fs from 'fs';
import path from 'path';
import { LyricLine, Track } from '../types/index.js';
import { LyricsEngine } from './LyricsEngine.js';

export class LyricsCacheManager {
  private cacheDir: string;

  constructor(customCacheDir?: string) {
    this.cacheDir = customCacheDir || path.join(process.cwd(), '.lyrics_cache');
    if (!fs.existsSync(this.cacheDir)) {
      try {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      } catch {}
    }
  }

  private sanitizeFilename(input: string): string {
    return input.replace(/[/\\?%*:|"<>]/g, '_').toLowerCase().trim();
  }

  public getCachePath(artist: string, title: string): string {
    const safeName = `${this.sanitizeFilename(artist || 'unknown')}__${this.sanitizeFilename(title || 'unknown')}.lrc`;
    return path.join(this.cacheDir, safeName);
  }

  /**
   * Resolves lyrics for a track through:
   * 1. Track's pre-parsed lyrics
   * 2. Local sibling file (.lrc)
   * 3. Disk cache (.lyrics_cache/)
   * 4. LRCLIB Online API (auto-caches upon success)
   */
  public async getLyricsForTrack(track: Track): Promise<LyricLine[] | null> {
    if (track.lyrics && track.lyrics.length > 0) {
      return track.lyrics;
    }

    // 1. Check local audio file directory
    if (track.filePath && fs.existsSync(track.filePath)) {
      const localLyrics = LyricsEngine.loadLocalLyrics(track.filePath);
      if (localLyrics && localLyrics.length > 0) {
        track.lyrics = localLyrics;
        return localLyrics;
      }
    }

    // 2. Check persistent disk cache
    const cachePath = this.getCachePath(track.artist, track.title);
    if (fs.existsSync(cachePath)) {
      try {
        const cachedContent = fs.readFileSync(cachePath, 'utf-8');
        const parsed = LyricsEngine.parseLrc(cachedContent);
        if (parsed.length > 0) {
          track.lyrics = parsed;
          return parsed;
        }
      } catch {}
    }

    // 3. Query LRCLIB Online API
    try {
      const onlineLyrics = await LyricsEngine.fetchOnlineLyrics(track.title, track.artist, track.duration);
      if (onlineLyrics && onlineLyrics.length > 0) {
        track.lyrics = onlineLyrics;
        this.saveToCache(track.artist, track.title, onlineLyrics);
        return onlineLyrics;
      }
    } catch {}

    return null;
  }

  /**
   * Save parsed LyricLine array as LRC text to local disk cache
   */
  public saveToCache(artist: string, title: string, lyrics: LyricLine[]): void {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }

      const lrcContent = lyrics
        .map((line) => {
          const mins = Math.floor(line.time / 60);
          const secs = Math.floor(line.time % 60);
          const millis = Math.floor((line.time % 1) * 100);
          const tag = `[${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}]`;
          return `${tag} ${line.text}`;
        })
        .join('\n');

      const cachePath = this.getCachePath(artist, title);
      fs.writeFileSync(cachePath, lrcContent, 'utf-8');
    } catch {}
  }

  public clearCache(): void {
    try {
      if (fs.existsSync(this.cacheDir)) {
        const files = fs.readdirSync(this.cacheDir);
        for (const file of files) {
          fs.unlinkSync(path.join(this.cacheDir, file));
        }
      }
    } catch {}
  }
}
