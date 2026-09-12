import { EqualizerBand, EQPreset } from '../types/index.js';

export const EQ_FREQUENCIES: { freq: number; label: string }[] = [
  { freq: 32, label: '32Hz' },
  { freq: 64, label: '64Hz' },
  { freq: 125, label: '125Hz' },
  { freq: 250, label: '250Hz' },
  { freq: 500, label: '500Hz' },
  { freq: 1000, label: '1kHz' },
  { freq: 2000, label: '2kHz' },
  { freq: 4000, label: '4kHz' },
  { freq: 8000, label: '8kHz' },
  { freq: 16000, label: '16kHz' },
];

export const EQ_PRESETS: Record<EQPreset, number[]> = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  bass_boost: [8, 7, 5, 2, 0, 0, 0, 0, 0, 0],
  treble_boost: [0, 0, 0, 0, 0, 1, 3, 6, 8, 9],
  electronic: [6, 5, 2, 0, -1, 1, 3, 5, 6, 5],
  rock: [5, 4, 2, -1, -2, 1, 3, 5, 6, 6],
  vocal: [-3, -2, 0, 3, 6, 6, 4, 2, 0, -2],
  lofi: [-4, 3, 4, 2, 0, -2, -3, -5, -8, -10],
  acoustic: [4, 3, 1, 0, 1, 2, 3, 4, 3, 2],
  custom: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};

export class EqualizerManager {
  private bands: EqualizerBand[];
  private currentPreset: EQPreset = 'flat';

  constructor(initialPreset: EQPreset = 'flat', initialBands?: number[]) {
    this.currentPreset = initialPreset;
    const values = initialBands || EQ_PRESETS[initialPreset] || EQ_PRESETS.flat;
    this.bands = EQ_FREQUENCIES.map((f, i) => ({
      frequency: f.freq,
      label: f.label,
      gain: Math.max(-12, Math.min(12, values[i] ?? 0)),
    }));
  }

  public getBands(): EqualizerBand[] {
    return this.bands;
  }

  public getGains(): number[] {
    return this.bands.map((b) => b.gain);
  }

  public setBandGain(index: number, gain: number): void {
    if (index >= 0 && index < this.bands.length) {
      this.bands[index].gain = Math.max(-12, Math.min(12, Math.round(gain)));
      this.currentPreset = 'custom';
    }
  }

  public adjustBandGain(index: number, delta: number): void {
    if (index >= 0 && index < this.bands.length) {
      this.setBandGain(index, this.bands[index].gain + delta);
    }
  }

  public setPreset(preset: EQPreset): void {
    this.currentPreset = preset;
    const presetValues = EQ_PRESETS[preset] || EQ_PRESETS.flat;
    this.bands.forEach((b, i) => {
      b.gain = presetValues[i] ?? 0;
    });
  }

  public getPreset(): EQPreset {
    return this.currentPreset;
  }

  public getPresetList(): { name: EQPreset; label: string }[] {
    return [
      { name: 'flat', label: 'Flat (Default)' },
      { name: 'bass_boost', label: 'Bass Boost (+8dB)' },
      { name: 'treble_boost', label: 'Treble Boost (+9dB)' },
      { name: 'electronic', label: 'Electronic & EDM' },
      { name: 'rock', label: 'Rock & Metal' },
      { name: 'vocal', label: 'Vocal Presence' },
      { name: 'lofi', label: 'Lo-Fi Chill & Warmth' },
      { name: 'acoustic', label: 'Acoustic & Unplugged' },
      { name: 'custom', label: 'Custom User EQ' },
    ];
  }

  /**
   * Generates FFmpeg lavfi equalizer filter string for audio backends
   */
  public getFFmpegFilterString(): string {
    const filters = this.bands
      .filter((b) => b.gain !== 0)
      .map((b) => `equalizer=f=${b.frequency}:width_type=o:w=1:g=${b.gain}`);
    return filters.length > 0 ? filters.join(',') : 'anull';
  }
}
