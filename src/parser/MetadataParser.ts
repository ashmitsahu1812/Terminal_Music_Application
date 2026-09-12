import * as parseFile from 'music-metadata';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Track } from '../types/index.js';

export class MetadataParser {
  private static SUPPORTED_EXTENSIONS = new Set(['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac']);

  public static isSupportedFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.SUPPORTED_EXTENSIONS.has(ext);
  }

  public static async parseTrack(filePath: string): Promise<Track | null> {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const ext = path.extname(filePath).toLowerCase();
    if (!this.isSupportedFile(filePath)) {
      return null;
    }

    const fileName = path.basename(filePath);
    const id = crypto.createHash('md5').update(filePath).digest('hex');

    try {
      const metadata = await parseFile.parseFile(filePath);
      const common = metadata.common;
      const format = metadata.format;

      let coverArtBuffer: Buffer | undefined;
      if (common.picture && common.picture.length > 0) {
        coverArtBuffer = Buffer.from(common.picture[0].data);
      }

      return {
        id,
        filePath,
        fileName,
        title: common.title || path.parse(fileName).name,
        artist: common.artist || common.albumartist || 'Unknown Artist',
        album: common.album || 'Unknown Album',
        year: common.year,
        genre: common.genre ? common.genre.join(', ') : undefined,
        trackNumber: common.track?.no || undefined,
        duration: Math.round(format.duration || 0),
        bitrate: format.bitrate ? Math.round(format.bitrate / 1000) : undefined, // in kbps
        sampleRate: format.sampleRate,
        format: ext.replace('.', '').toUpperCase(),
        coverArt: coverArtBuffer,
        addedAt: new Date().toISOString(),
      };
    } catch (err) {
      // Fallback for unparseable or minimal audio files
      const stat = fs.statSync(filePath);
      return {
        id,
        filePath,
        fileName,
        title: path.parse(fileName).name,
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        duration: 0,
        format: ext.replace('.', '').toUpperCase(),
        addedAt: stat.ctime.toISOString(),
      };
    }
  }

  public static async scanDirectory(dirPath: string): Promise<Track[]> {
    const tracks: Track[] = [];
    if (!fs.existsSync(dirPath)) return tracks;

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const subTracks = await this.scanDirectory(fullPath);
        tracks.push(...subTracks);
      } else if (entry.isFile() && this.isSupportedFile(fullPath)) {
        const track = await this.parseTrack(fullPath);
        if (track) {
          tracks.push(track);
        }
      }
    }

    return tracks;
  }
}
