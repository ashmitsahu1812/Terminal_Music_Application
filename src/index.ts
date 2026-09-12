#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { AudioEngine } from './audio/AudioEngine.js';
import { StorageManager } from './storage/StorageManager.js';
import { AppStore } from './store/AppStore.js';
import { MetadataParser } from './parser/MetadataParser.js';
import { UIManager } from './ui/UIManager.js';

const program = new Command();

program
  .name('terminal-music')
  .description('Production-grade, feature-rich Terminal/CLI Music Player application')
  .version('1.0.0')
  .option('-d, --dir <path>', 'Directory containing audio files to scan')
  .option('-p, --play <file>', 'Play a specific audio file directly')
  .option('-b, --backend <backend>', 'Force specific audio backend (afplay, mpv, ffplay)');

program.parse(process.argv);
const options = program.opts();

async function main() {
  const storageManager = new StorageManager();
  const audioEngine = new AudioEngine(options.backend);
  const appStore = new AppStore(audioEngine, storageManager);

  // Scan music files
  let scanDir = options.dir;
  if (!scanDir) {
    // Check if sample_music directory exists, or current directory
    const sampleDir = path.join(process.cwd(), 'sample_music');
    if (fs.existsSync(sampleDir)) {
      scanDir = sampleDir;
    } else {
      scanDir = process.cwd();
    }
  }

  if (fs.existsSync(scanDir)) {
    const tracks = await MetadataParser.scanDirectory(scanDir);
    appStore.setTracks(tracks);
  }

  // Play specific file if requested via CLI option
  if (options.play && fs.existsSync(options.play)) {
    const track = await MetadataParser.parseTrack(options.play);
    if (track) {
      appStore.addTrack(track);
      appStore.playTrack(track);
    }
  }

  // Launch TUI Manager
  new UIManager(appStore);
}

main().catch((err) => {
  console.error('Fatal error launching Terminal Music Player:', err);
  process.exit(1);
});
