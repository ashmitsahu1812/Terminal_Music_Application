import path from 'path';
import fs from 'fs';
import { AppStore } from '../store/AppStore.js';
import { AmbientSoundType } from '../types/index.js';

export class AmbientSoundManager {
  private appStore: AppStore;
  private sampleDir: string;

  constructor(appStore: AppStore) {
    this.appStore = appStore;
    this.sampleDir = path.join(process.cwd(), 'sample_music');
  }

  public setAmbient(type: AmbientSoundType): void {
    if (type === 'none') {
      this.appStore.getAudioEngine().setAmbientSound('none');
      return;
    }

    const filePath = path.join(this.sampleDir, `ambient_${type}.wav`);
    this.appStore.getAudioEngine().setAmbientSound(type, filePath);
  }

  public cycleAmbient(): AmbientSoundType {
    const list: AmbientSoundType[] = ['none', 'rain', 'vinyl', 'fire', 'cafe'];
    const current = this.appStore.getAudioEngine().getState().ambientSound;
    const idx = list.indexOf(current);
    const next = list[(idx + 1) % list.length];
    this.setAmbient(next);
    return next;
  }
}
