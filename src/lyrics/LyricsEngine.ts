import fs from 'fs';
import path from 'path';
import { LyricLine, Track } from '../types/index.js';

export class LyricsEngine {
  /**
   * Parse standard LRC text into timestamped LyricLine objects
   */
  public static parseLrc(content: string): LyricLine[] {
    const lines = content.split(/\r?\n/);
    const result: LyricLine[] = [];
    const timeTagRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Extract all timestamps in the line (support multiple timestamps per line)
      const matches = Array.from(line.matchAll(timeTagRegex));
      if (matches.length === 0) continue;

      const text = line.replace(timeTagRegex, '').trim();
      if (!text && !line.includes(']')) continue;

      for (const match of matches) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const fractionStr = match[3] || '0';
        const fraction = parseFloat(`0.${fractionStr}`);
        const totalSeconds = minutes * 60 + seconds + fraction;

        result.push({
          time: totalSeconds,
          text: text || '♪ ♪ ♪',
        });
      }
    }

    // Sort chronologically
    return result.sort((a, b) => a.time - b.time);
  }

  /**
   * Load local LRC file from disk if available
   */
  public static loadLocalLyrics(audioFilePath: string): LyricLine[] | null {
    try {
      const parsedPath = path.parse(audioFilePath);
      const possiblePaths = [
        path.join(parsedPath.dir, `${parsedPath.name}.lrc`),
        `${audioFilePath}.lrc`,
      ];

      for (const lrcPath of possiblePaths) {
        if (fs.existsSync(lrcPath)) {
          const raw = fs.readFileSync(lrcPath, 'utf-8');
          const parsed = this.parseLrc(raw);
          if (parsed.length > 0) return parsed;
        }
      }
    } catch {}
    return null;
  }

  /**
   * Auto-fetch synced lyrics from public LRCLIB API with graceful fallback
   */
  public static async fetchOnlineLyrics(title: string, artist: string, duration?: number): Promise<LyricLine[] | null> {
    try {
      const params = new URLSearchParams({
        track_name: title,
        artist_name: artist,
      });
      if (duration) {
        params.append('duration', Math.round(duration).toString());
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

      const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'TerminalMusicPlayer/1.0 (https://github.com/ashmitsahu1812/Terminal_Music_Application)',
        },
      });
      clearTimeout(timeoutId);

      if (!res.ok) return null;
      const data: any = await res.json();

      if (data.syncedLyrics) {
        return this.parseLrc(data.syncedLyrics);
      } else if (data.plainLyrics) {
        // Generate pseudo-synced lines if only plain text is available
        const plainLines = data.plainLyrics.split(/\r?\n/).filter((l: string) => l.trim().length > 0);
        const interval = duration ? duration / Math.max(1, plainLines.length) : 4;
        return plainLines.map((text: string, i: number) => ({
          time: i * interval,
          text,
        }));
      }
    } catch {}
    return null;
  }

  /**
   * Get active lyric line index based on current playback timestamp
   */
  public static getActiveIndex(lyrics: LyricLine[], currentTime: number): number {
    if (!lyrics || lyrics.length === 0) return -1;

    let activeIdx = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time) {
        activeIdx = i;
      } else {
        break;
      }
    }
    return activeIdx;
  }
}
