import fs from 'fs';
import path from 'path';

export interface TrackPlayRecord {
  trackId: string;
  title: string;
  artist: string;
  album: string;
  filePath: string;
  playCount: number;
  totalListenSeconds: number;
  lastPlayedAt: string;
  firstPlayedAt: string;
}

export interface PlaySession {
  trackId: string;
  title: string;
  artist: string;
  startedAt: string;
  durationSeconds: number;
}

export interface ListeningStats {
  totalTrackPlays: number;
  totalListenSeconds: number;
  uniqueTracksPlayed: number;
  topTracks: TrackPlayRecord[];
  recentSessions: PlaySession[];
  todayListenSeconds: number;
  streakDays: number;
}

const MAX_SESSIONS = 50;
const TOP_TRACKS_COUNT = 20;

export class StatsManager {
  private statsFile: string;
  private records: Map<string, TrackPlayRecord> = new Map();
  private sessions: PlaySession[] = [];
  private currentSession: { trackId: string; title: string; artist: string; startedAt: number } | null = null;

  constructor(dataDir: string) {
    this.statsFile = path.join(dataDir, 'play_stats.json');
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.statsFile)) {
        const raw = JSON.parse(fs.readFileSync(this.statsFile, 'utf-8'));
        if (raw.records) {
          for (const rec of raw.records) {
            this.records.set(rec.trackId, rec);
          }
        }
        if (raw.sessions) {
          this.sessions = raw.sessions.slice(-MAX_SESSIONS);
        }
      }
    } catch {
      // Fresh start
    }
  }

  private save(): void {
    try {
      const dir = path.dirname(this.statsFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.statsFile, JSON.stringify({
        records: Array.from(this.records.values()),
        sessions: this.sessions,
      }, null, 2), 'utf-8');
    } catch {
      // Non-fatal
    }
  }

  public startSession(trackId: string, title: string, artist: string, album: string, filePath: string): void {
    this.endSession();
    this.currentSession = { trackId, title, artist, startedAt: Date.now() };
    const existing = this.records.get(trackId);
    const now = new Date().toISOString();
    if (existing) {
      existing.playCount += 1;
      existing.lastPlayedAt = now;
      existing.title = title;
      existing.artist = artist;
    } else {
      this.records.set(trackId, {
        trackId, title, artist, album, filePath,
        playCount: 1,
        totalListenSeconds: 0,
        lastPlayedAt: now,
        firstPlayedAt: now,
      });
    }
    this.save();
  }

  public endSession(): void {
    if (!this.currentSession) return;
    const elapsed = Math.floor((Date.now() - this.currentSession.startedAt) / 1000);
    if (elapsed > 3) {
      const rec = this.records.get(this.currentSession.trackId);
      if (rec) rec.totalListenSeconds += elapsed;
      this.sessions.push({
        trackId: this.currentSession.trackId,
        title: this.currentSession.title,
        artist: this.currentSession.artist,
        startedAt: new Date(this.currentSession.startedAt).toISOString(),
        durationSeconds: elapsed,
      });
      if (this.sessions.length > MAX_SESSIONS) {
        this.sessions = this.sessions.slice(-MAX_SESSIONS);
      }
      this.save();
    }
    this.currentSession = null;
  }

  public getStats(): ListeningStats {
    const allRecords = Array.from(this.records.values());
    const totalListenSeconds = allRecords.reduce((s, r) => s + r.totalListenSeconds, 0);
    const totalTrackPlays = allRecords.reduce((s, r) => s + r.playCount, 0);
    const topTracks = [...allRecords].sort((a, b) => b.playCount - a.playCount).slice(0, TOP_TRACKS_COUNT);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayListenSeconds = this.sessions
      .filter((s) => new Date(s.startedAt) >= todayStart)
      .reduce((sum, s) => sum + s.durationSeconds, 0);
    return {
      totalTrackPlays,
      totalListenSeconds,
      uniqueTracksPlayed: allRecords.length,
      topTracks,
      recentSessions: [...this.sessions].reverse().slice(0, 10),
      todayListenSeconds,
      streakDays: this.calculateStreak(),
    };
  }

  private calculateStreak(): number {
    const days = new Set<string>();
    for (const s of this.sessions) {
      const d = new Date(s.startedAt);
      days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (days.has(key)) { streak++; } else if (i > 0) { break; }
    }
    return streak;
  }

  public formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  public getTrackRecord(trackId: string): TrackPlayRecord | undefined {
    return this.records.get(trackId);
  }

  public clearStats(): void {
    this.records.clear();
    this.sessions = [];
    this.currentSession = null;
    this.save();
  }
}
