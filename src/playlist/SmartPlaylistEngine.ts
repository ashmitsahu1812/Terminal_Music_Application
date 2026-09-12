import { Track, Playlist } from '../types/index.js';

export type SmartPlaylistRule =
  | { type: 'genre'; value: string }
  | { type: 'decade'; value: number }           // e.g. 1990
  | { type: 'artist'; value: string }
  | { type: 'recently_added'; days: number }
  | { type: 'most_played'; trackIds: string[]; limit: number }
  | { type: 'similar_to'; trackId: string; tracks: Track[] }
  | { type: 'mood'; value: 'energetic' | 'chill' | 'focus' | 'sleep' }
  | { type: 'duration_max'; seconds: number }
  | { type: 'duration_min'; seconds: number };

export interface SmartPlaylistConfig {
  name: string;
  rules: SmartPlaylistRule[];
  limit?: number;      // max tracks (default 30)
  shuffle?: boolean;
}

/**
 * Mood fingerprint heuristics based on BPM/genre keywords in metadata.
 * Since we don't have real BPM data, we use genre keywords.
 */
const MOOD_GENRE_MAP: Record<string, string[]> = {
  energetic: ['rock', 'metal', 'punk', 'edm', 'electronic', 'dance', 'hiphop', 'hip-hop', 'rave', 'drum'],
  chill:     ['jazz', 'soul', 'rnb', 'r&b', 'lofi', 'lo-fi', 'blues', 'ambient', 'acoustic', 'folk'],
  focus:     ['classical', 'instrumental', 'ambient', 'study', 'piano', 'orchestra', 'cinematic'],
  sleep:     ['ambient', 'meditation', 'sleep', 'nature', 'drone', 'spa', 'relax', 'lullaby'],
};

export class SmartPlaylistEngine {

  /**
   * Generate a playlist from a config of rules applied to a track library.
   */
  public static generate(allTracks: Track[], config: SmartPlaylistConfig): Track[] {
    let candidates = [...allTracks];

    for (const rule of config.rules) {
      candidates = SmartPlaylistEngine.applyRule(candidates, rule, allTracks);
    }

    if (config.shuffle) {
      SmartPlaylistEngine.shuffle(candidates);
    }

    const limit = config.limit ?? 30;
    return candidates.slice(0, limit);
  }

  private static applyRule(candidates: Track[], rule: SmartPlaylistRule, allTracks: Track[]): Track[] {
    switch (rule.type) {
      case 'genre': {
        const q = rule.value.toLowerCase();
        return candidates.filter((t) => (t.genre ?? '').toLowerCase().includes(q));
      }

      case 'decade': {
        const start = rule.value;
        const end = start + 9;
        return candidates.filter((t) => t.year !== undefined && t.year >= start && t.year <= end);
      }

      case 'artist': {
        const q = rule.value.toLowerCase();
        return candidates.filter((t) => t.artist.toLowerCase().includes(q));
      }

      case 'recently_added': {
        const cutoff = Date.now() - rule.days * 86400 * 1000;
        return candidates.filter((t) => new Date(t.addedAt).getTime() >= cutoff);
      }

      case 'most_played': {
        // Re-order candidates so most-played appear first
        const playedSet = new Set(rule.trackIds);
        const playedOrder = rule.trackIds;
        const playedTracks = playedOrder
          .map((id) => allTracks.find((t) => t.id === id))
          .filter(Boolean) as Track[];
        const unplayed = candidates.filter((t) => !playedSet.has(t.id));
        return [...playedTracks, ...unplayed].slice(0, rule.limit);
      }

      case 'similar_to': {
        // Find tracks by same artist or genre as the seed track
        const seed = allTracks.find((t) => t.id === rule.trackId);
        if (!seed) return candidates;
        return candidates.filter(
          (t) =>
            t.id !== seed.id &&
            (t.artist.toLowerCase() === seed.artist.toLowerCase() ||
              (seed.genre && t.genre && t.genre.toLowerCase() === seed.genre.toLowerCase())),
        );
      }

      case 'mood': {
        const keywords = MOOD_GENRE_MAP[rule.value] ?? [];
        return candidates.filter((t) => {
          const g = (t.genre ?? '').toLowerCase();
          const title = t.title.toLowerCase();
          return keywords.some((kw) => g.includes(kw) || title.includes(kw));
        });
      }

      case 'duration_max': {
        return candidates.filter((t) => t.duration <= rule.seconds);
      }

      case 'duration_min': {
        return candidates.filter((t) => t.duration >= rule.seconds);
      }

      default:
        return candidates;
    }
  }

  /** Predefined smart playlist presets */
  public static getPresets(): { name: string; description: string; config: SmartPlaylistConfig }[] {
    return [
      {
        name: 'Top 25 Most Played',
        description: 'Your all-time most-played tracks',
        config: { name: 'Top 25 Most Played', rules: [{ type: 'most_played', trackIds: [], limit: 25 }], limit: 25 },
      },
      {
        name: 'Recently Added',
        description: 'Tracks added in the last 7 days',
        config: { name: 'Recently Added', rules: [{ type: 'recently_added', days: 7 }], limit: 30 },
      },
      {
        name: 'Chill Vibes',
        description: 'Jazz, soul, lo-fi, and acoustic',
        config: { name: 'Chill Vibes', rules: [{ type: 'mood', value: 'chill' }], limit: 25, shuffle: true },
      },
      {
        name: 'Energy Boost',
        description: 'Rock, EDM, and high-energy tracks',
        config: { name: 'Energy Boost', rules: [{ type: 'mood', value: 'energetic' }], limit: 25, shuffle: true },
      },
      {
        name: 'Deep Focus',
        description: 'Classical, instrumental & ambient for concentration',
        config: { name: 'Deep Focus', rules: [{ type: 'mood', value: 'focus' }], limit: 30, shuffle: false },
      },
      {
        name: 'Sleep Music',
        description: 'Ambient and relaxing tracks for sleep',
        config: { name: 'Sleep Music', rules: [{ type: 'mood', value: 'sleep' }, { type: 'duration_min', seconds: 180 }], limit: 20 },
      },
      {
        name: 'Quick Hits (<3 min)',
        description: 'Short tracks under 3 minutes',
        config: { name: 'Quick Hits', rules: [{ type: 'duration_max', seconds: 180 }], limit: 30, shuffle: true },
      },
    ];
  }

  /** Convert generated track list into a Playlist object */
  public static toPlaylist(tracks: Track[], name: string, description?: string): Playlist {
    return {
      id: `smart-${Date.now()}`,
      name,
      description: description ?? `Auto-generated on ${new Date().toLocaleDateString()}`,
      trackIds: tracks.map((t) => t.id),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private static shuffle<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}
