import { execSync, spawn } from 'child_process';
import { Track } from '../types/index.js';

export class YouTubeStreamer {
  /**
   * Check if yt-dlp is available in PATH
   */
  public static isYtDlpAvailable(): boolean {
    try {
      execSync('which yt-dlp', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resolve YouTube URL or search query to playable stream and track metadata
   */
  public static async resolveStream(queryOrUrl: string): Promise<Track | null> {
    if (!this.isYtDlpAvailable()) {
      throw new Error(
        'yt-dlp is not installed. Install it via "brew install yt-dlp" or "pip install yt-dlp" to stream YouTube audio.'
      );
    }

    const target = queryOrUrl.startsWith('http')
      ? queryOrUrl
      : `ytsearch1:${queryOrUrl}`;

    return new Promise((resolve, reject) => {
      // Fetch direct audio stream URL and JSON metadata
      const args = [
        '--no-playlist',
        '--format', 'bestaudio',
        '--get-url',
        '--get-title',
        '--get-duration',
        '--get-id',
        target,
      ];

      const proc = spawn('yt-dlp', args);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0 || !stdout.trim()) {
          reject(new Error(stderr || 'Failed to resolve YouTube audio stream.'));
          return;
        }

        const lines = stdout.trim().split('\n');
        if (lines.length >= 2) {
          const title = lines[0]?.trim() || 'YouTube Audio';
          const streamUrl = lines[1]?.trim() || '';
          const durationStr = lines[2]?.trim() || '03:30';
          const videoId = lines[3]?.trim() || Date.now().toString();

          const durationParts = durationStr.split(':').map(Number);
          let durationSec = 180;
          if (durationParts.length === 2) {
            durationSec = durationParts[0] * 60 + durationParts[1];
          } else if (durationParts.length === 3) {
            durationSec = durationParts[0] * 3600 + durationParts[1] * 60 + durationParts[2];
          }

          const track: Track = {
            id: `yt-${videoId}`,
            filePath: streamUrl,
            fileName: `${title}.mp3`,
            title: title,
            artist: 'YouTube Stream',
            album: 'Online Stream',
            format: 'Stream (Web)',
            duration: durationSec,
            addedAt: new Date().toISOString(),
          };

          resolve(track);
        } else {
          reject(new Error('Invalid output received from yt-dlp.'));
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });
  }
}
