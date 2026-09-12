import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { AudioEngine } from '../src/audio/AudioEngine.js';
import { StorageManager } from '../src/storage/StorageManager.js';
import { AppStore } from '../src/store/AppStore.js';
import { MetadataParser } from '../src/parser/MetadataParser.js';
import { ANSIArtRenderer } from '../src/parser/ANSIArtRenderer.js';
import { Track } from '../src/types/index.js';

async function runTests() {
  console.log('🧪 Running Terminal Music Player Test Suite...\n');

  // Test 1: StorageManager Initialization
  console.log('1️⃣ Testing StorageManager & Configuration...');
  const testStorageDir = path.join(process.cwd(), '.test_config');
  const storage = new StorageManager(testStorageDir);
  const config = storage.loadConfig();
  assert.strictEqual(config.volume, 80);
  assert.strictEqual(config.theme, 'cyberpunk');
  console.log('  ✓ StorageManager initialized successfully.');

  // Test 2: AudioEngine Initialization
  console.log('2️⃣ Testing AudioEngine...');
  const engine = new AudioEngine();
  const state = engine.getState();
  assert.strictEqual(state.isPlaying, false);
  assert.strictEqual(state.volume, 80);
  assert.strictEqual(state.loopMode, 'off');
  console.log(`  ✓ AudioEngine detected backend: ${engine.getBackend()}`);

  // Test 3: AppStore State Management & Queue Operations
  console.log('3️⃣ Testing AppStore & Queue State Transitions...');
  const store = new AppStore(engine, storage);

  const mockTrack1: Track = {
    id: 'tr-1',
    filePath: '/tmp/test1.wav',
    fileName: 'test1.wav',
    title: 'Test Song 1',
    artist: 'Test Artist',
    album: 'Test Album',
    duration: 120,
    format: 'WAV',
    addedAt: new Date().toISOString(),
  };

  const mockTrack2: Track = {
    id: 'tr-2',
    filePath: '/tmp/test2.wav',
    fileName: 'test2.wav',
    title: 'Alpha Beat',
    artist: 'Beat Maker',
    album: 'Vol 1',
    duration: 180,
    format: 'WAV',
    addedAt: new Date().toISOString(),
  };

  store.setTracks([mockTrack1, mockTrack2]);
  assert.strictEqual(store.getAllTracks().length, 2);

  // Search filtering
  store.setSearchQuery('Alpha');
  assert.strictEqual(store.getTracks().length, 1);
  assert.strictEqual(store.getTracks()[0].title, 'Alpha Beat');

  store.setSearchQuery('');
  assert.strictEqual(store.getTracks().length, 2);

  // Queue Operations
  store.addToQueue(mockTrack1);
  store.addToQueue(mockTrack2);
  assert.strictEqual(store.getQueue().length, 2);

  store.moveQueueTrack(0, 1);
  assert.strictEqual(store.getQueue()[0].id, 'tr-2');

  store.removeFromQueue(0);
  assert.strictEqual(store.getQueue().length, 1);
  assert.strictEqual(store.getQueue()[0].id, 'tr-1');

  store.clearQueue();
  assert.strictEqual(store.getQueue().length, 0);
  console.log('  ✓ Queue reordering, filtering, and state transitions verified.');

  // Test 4: Fisher-Yates Shuffle & Loop Modes
  console.log('4️⃣ Testing Fisher-Yates Shuffle & Loop Modes...');
  store.addToQueue(mockTrack1);
  store.addToQueue(mockTrack2);
  store.toggleShuffle();
  assert.strictEqual(store.getConfig().isShuffle, true);

  store.cycleLoopMode();
  assert.strictEqual(store.getConfig().loopMode, 'track');
  store.cycleLoopMode();
  assert.strictEqual(store.getConfig().loopMode, 'queue');
  store.cycleLoopMode();
  assert.strictEqual(store.getConfig().loopMode, 'off');
  console.log('  ✓ Shuffle and Loop mode cycles verified.');

  // Test 5: Playlist Operations
  console.log('5️⃣ Testing Playlist Creation & Editing...');
  const playlist = store.createPlaylist('Favorites', 'My favorite tracks');
  assert.strictEqual(playlist.name, 'Favorites');

  store.addTrackToPlaylist(playlist.id, mockTrack1.id);
  assert.strictEqual(store.getPlaylists()[0].trackIds.length, 1);

  store.renamePlaylist(playlist.id, 'Super Favorites');
  assert.strictEqual(store.getPlaylists()[0].name, 'Super Favorites');

  store.deletePlaylist(playlist.id);
  assert.strictEqual(store.getPlaylists().length, 0);
  console.log('  ✓ Playlist CRUD operations verified.');

  // Test 6: ANSI Art Renderer
  console.log('6️⃣ Testing ANSI Art Renderer...');
  const ansiArt = ANSIArtRenderer.renderFallbackArtwork(20, 10);
  assert.ok(ansiArt.includes('\x1b[38;2;')); // 24-bit TrueColor ANSI check
  console.log('  ✓ ANSI Art Renderer generated valid 24-bit RGB terminal graphics.');

  // Clean up test temp dir
  if (fs.existsSync(testStorageDir)) {
    fs.rmSync(testStorageDir, { recursive: true, force: true });
  }

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test execution failed:', err);
  process.exit(1);
});
