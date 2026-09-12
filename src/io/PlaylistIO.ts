import fs from 'fs';
import path from 'path';
import { Track, Playlist } from '../types/index.js';

/**
 * Handles M3U/M3U8 playlist file import and export.
 * M3U extended format (#EXTM3U) is supported for rich metadata.
 */
export class PlaylistIO {

  // ─── EXPORT ──────────────────────────────────────────────────────────

  /**
   * Export a playlist to an M3U8 file with extended metadata.
   * Returns the file path written.
   */
  public static exportM3U(
    playlist: Playlist,
    tracks: Track[],
    outputDir: string,
  ): string {
    const trackMap = new Map(tracks.map((t) => [t.id, t]));
    const lines: string[] = ['#EXTM3U', `#PLAYLIST:${playlist.name}`];

    for (const id of playlist.trackIds) {
      const track = trackMap.get(id);
      if (!track) continue;
      const durationSecs = Math.round(track.duration);
      const displayName = `${track.artist} - ${track.title}`;
      lines.push(`#EXTINF:${durationSecs},${displayName}`);
      lines.push(track.filePath);
    }

    const safeName = playlist.name.replace(/[^a-zA-Z0-9_\- ]/g, '_');
    const outPath = path.join(outputDir, `${safeName}.m3u8`);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outPath, lines.join('\n'), 'utf-8');
    return outPath;
  }

  /**
   * Export all playlists to a directory as separate M3U8 files.
   */
  public static exportAll(
    playlists: Playlist[],
    tracks: Track[],
    outputDir: string,
  ): string[] {
    return playlists.map((pl) => PlaylistIO.exportM3U(pl, tracks, outputDir));
  }

  // ─── IMPORT ──────────────────────────────────────────────────────────

  /**
   * Parse an M3U or M3U8 file and return a Playlist + partial track stubs.
   * Full track metadata is populated from ID3 tags on first scan.
   */
  public static importM3U(filePath: string): { playlist: Playlist; trackPaths: string[] } {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    const trackPaths: string[] = [];
    let playlistName = path.basename(filePath, path.extname(filePath));

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('#PLAYLIST:')) {
        playlistName = line.replace('#PLAYLIST:', '').trim();
      } else if (line.startsWith('#EXTINF:')) {
        // Next non-comment line is the file path
        const nextLine = lines[i + 1];
        if (nextLine && !nextLine.startsWith('#')) {
          trackPaths.push(nextLine);
          i++;
        }
      } else if (!line.startsWith('#')) {
        // Plain M3U (no EXTINF) — just file paths
        trackPaths.push(line);
      }
    }

    const playlist: Playlist = {
      id: `import-${Date.now()}`,
      name: playlistName,
      description: `Imported from ${path.basename(filePath)} on ${new Date().toLocaleDateString()}`,
      trackIds: trackPaths.map((p, i) => `import-track-${i}`),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return { playlist, trackPaths };
  }

  /**
   * Scan an M3U file and attempt to resolve each path against an existing
   * track library, returning matched track IDs.
   */
  public static resolveImportedPaths(
    trackPaths: string[],
    libraryTracks: Track[],
  ): { matched: Track[]; unmatched: string[] } {
    const matched: Track[] = [];
    const unmatched: string[] = [];

    for (const filePath of trackPaths) {
      // Try exact match first
      const exact = libraryTracks.find((t) => t.filePath === filePath);
      if (exact) {
        matched.push(exact);
        continue;
      }
      // Try basename match (handles relocated libraries)
      const base = path.basename(filePath);
      const byBase = libraryTracks.find((t) => path.basename(t.filePath) === base);
      if (byBase) {
        matched.push(byBase);
        continue;
      }
      unmatched.push(filePath);
    }

    return { matched, unmatched };
  }

  /**
   * Generate a plain text summary of what would be imported.
   */
  public static previewImport(filePath: string): string {
    try {
      const { playlist, trackPaths } = PlaylistIO.importM3U(filePath);
      return [
        `📋 Playlist: ${playlist.name}`,
        `🎵 Tracks: ${trackPaths.length}`,
        `📁 File: ${path.basename(filePath)}`,
        ``,
        ...trackPaths.slice(0, 5).map((p, i) => `  ${i + 1}. ${path.basename(p)}`),
        trackPaths.length > 5 ? `  … and ${trackPaths.length - 5} more` : '',
      ].filter(Boolean).join('\n');
    } catch {
      return `❌ Could not read M3U file: ${filePath}`;
    }
  }
}
