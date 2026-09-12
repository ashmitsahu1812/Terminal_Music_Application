import { RadioStation, Track } from '../types/index.js';
import https from 'https';
import http from 'http';
import { URL } from 'url';

export const DEFAULT_RADIO_STATIONS: RadioStation[] = [
  {
    id: 'soma-groovesalad',
    name: 'SomaFM: Groove Salad',
    genre: 'Ambient / Chillout / Downtempo',
    streamUrl: 'https://ice4.somafm.com/groovesalad-128-mp3',
    description: 'A nicely chilled plate of ambient/downtempo beats and grooves.',
    bitrate: '128 kbps',
    country: 'US',
  },
  {
    id: 'soma-secretagent',
    name: 'SomaFM: Secret Agent',
    genre: 'Lounge / Spy / Trip-Hop',
    streamUrl: 'https://ice4.somafm.com/secretagent-128-mp3',
    description: 'The soundtrack for your stylish, mysterious adventure.',
    bitrate: '128 kbps',
    country: 'US',
  },
  {
    id: 'soma-dronezone',
    name: 'SomaFM: Drone Zone',
    genre: 'Ambient / Space / Deep Focus',
    streamUrl: 'https://ice4.somafm.com/dronezone-128-mp3',
    description: 'Served best chilled, safe with most medications. Atmospheric textures.',
    bitrate: '128 kbps',
    country: 'US',
  },
  {
    id: 'soma-defcon',
    name: 'SomaFM: DEF CON Radio',
    genre: 'Cyberpunk / Hacker / Techno',
    streamUrl: 'https://ice4.somafm.com/defcon-128-mp3',
    description: 'Music for hacking, coding, and high-energy cyber operations.',
    bitrate: '128 kbps',
    country: 'US',
  },
  {
    id: 'soma-synphaera',
    name: 'SomaFM: Synphaera Radio',
    genre: 'Synthwave / Chillwave / Space Ambient',
    streamUrl: 'https://ice4.somafm.com/synphaera-128-mp3',
    description: 'Modern neo-ambient, electronic and space music from the Synphaera label.',
    bitrate: '128 kbps',
    country: 'US',
  },
  {
    id: 'soma-vaporwaves',
    name: 'SomaFM: Vaporwaves',
    genre: 'Vaporwave / Mallsoft / Retro',
    streamUrl: 'https://ice4.somafm.com/vaporwaves-128-mp3',
    description: 'Chill aesthetics, nostalgic vapor sounds, and dreamy retro frequencies.',
    bitrate: '128 kbps',
    country: 'US',
  },
  {
    id: 'plaza-one',
    name: 'Nightwave Plaza',
    genre: 'Vaporwave / Future Funk',
    streamUrl: 'http://radio.plaza.one/mp3',
    description: 'The premier 24/7 online vaporwave and future funk radio station.',
    bitrate: '192 kbps',
    country: 'JP',
  },
  {
    id: 'lofi-girl',
    name: 'Lo-Fi Chill Hop Stream',
    genre: 'Lo-Fi / Study Beats',
    streamUrl: 'https://stream.zeno.fm/f3wvbbqmdg8uv',
    description: '24/7 relaxed beats to study, relax, and code to.',
    bitrate: '128 kbps',
    country: 'FR',
  },
  {
    id: 'jazz-cafe',
    name: 'Smooth Jazz Cafe',
    genre: 'Jazz / Instrumental',
    streamUrl: 'https://stream.zeno.fm/0r0xa792kwzuv',
    description: 'Warm acoustic jazz, classic sax solos, and late-night lounge coffee tunes.',
    bitrate: '128 kbps',
    country: 'UK',
  },
];

export class RadioManager {
  private stations: RadioStation[] = [];
  private customStations: RadioStation[] = [];

  constructor(customStations: RadioStation[] = []) {
    this.customStations = customStations;
    this.stations = [...DEFAULT_RADIO_STATIONS, ...customStations];
  }

  public getAllStations(): RadioStation[] {
    return this.stations;
  }

  public filterStations(query: string): RadioStation[] {
    if (!query || !query.trim()) return this.stations;
    const q = query.toLowerCase().trim();
    return this.stations.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.genre.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        (s.country && s.country.toLowerCase().includes(q))
    );
  }

  public getStationById(id: string): RadioStation | undefined {
    return this.stations.find((s) => s.id === id);
  }

  public addStation(station: Omit<RadioStation, 'id'>): RadioStation {
    const newStation: RadioStation = {
      ...station,
      id: `custom-radio-${Date.now()}`,
    };
    this.customStations.push(newStation);
    this.stations = [...DEFAULT_RADIO_STATIONS, ...this.customStations];
    return newStation;
  }

  public removeCustomStation(id: string): boolean {
    const idx = this.customStations.findIndex((s) => s.id === id);
    if (idx !== -1) {
      this.customStations.splice(idx, 1);
      this.stations = [...DEFAULT_RADIO_STATIONS, ...this.customStations];
      return true;
    }
    return false;
  }

  public getCustomStations(): RadioStation[] {
    return this.customStations;
  }

  public static stationToTrack(station: RadioStation): Track {
    return {
      id: `radio-${station.id}`,
      filePath: station.streamUrl,
      fileName: `${station.name}.stream`,
      title: station.name,
      artist: `📡 [LIVE RADIO] ${station.genre}`,
      album: station.description,
      genre: station.genre,
      duration: 0, // Live stream (indefinite duration)
      format: 'STREAM',
      addedAt: new Date().toISOString(),
    };
  }

  /**
   * Fetches ICY metadata / stream title if supported by the server.
   */
  public static async fetchStreamTitle(streamUrl: string): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        const parsed = new URL(streamUrl);
        const client = parsed.protocol === 'https:' ? https : http;

        const req = client.get(
          streamUrl,
          {
            headers: {
              'Icy-MetaData': '1',
              'User-Agent': 'TerminalMusicPlayer/1.0',
            },
            timeout: 3000,
          },
          (res) => {
            const icyMetaInt = parseInt(res.headers['icy-metaint'] as string, 10);
            const icyName = (res.headers['icy-name'] as string) || (res.headers['icy-description'] as string);

            if (!icyMetaInt) {
              req.destroy();
              resolve(icyName || null);
              return;
            }

            let byteCount = 0;
            res.on('data', (chunk: Buffer) => {
              byteCount += chunk.length;
              if (byteCount >= icyMetaInt) {
                const metaOffset = icyMetaInt;
                if (chunk.length > metaOffset) {
                  const metaLength = chunk[metaOffset] * 16;
                  if (metaLength > 0 && chunk.length >= metaOffset + 1 + metaLength) {
                    const metaStr = chunk.subarray(metaOffset + 1, metaOffset + 1 + metaLength).toString('utf-8');
                    const match = metaStr.match(/StreamTitle='(.*?)';/);
                    if (match && match[1]) {
                      req.destroy();
                      resolve(match[1]);
                      return;
                    }
                  }
                }
                req.destroy();
                resolve(icyName || null);
              }
            });

            res.on('error', () => resolve(null));
          }
        );

        req.on('error', () => resolve(null));
        req.on('timeout', () => {
          req.destroy();
          resolve(null);
        });
      } catch {
        resolve(null);
      }
    });
  }
}
