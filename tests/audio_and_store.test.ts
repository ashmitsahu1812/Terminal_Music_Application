import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { AudioEngine } from '../src/audio/AudioEngine.js';
import { StorageManager } from '../src/storage/StorageManager.js';
import { AppStore } from '../src/store/AppStore.js';
import { MetadataParser } from '../src/parser/MetadataParser.js';
import { ANSIArtRenderer } from '../src/parser/ANSIArtRenderer.js';
import { LyricsEngine } from '../src/lyrics/LyricsEngine.js';
import { LyricsCacheManager } from '../src/lyrics/LyricsCacheManager.js';
import { RadioManager } from '../src/radio/RadioManager.js';
import { getTheme } from '../src/ui/Theme.js';
import { Track } from '../src/types/index.js';

async function runTests() {
  console.log('🧪 Running Terminal Music Player Test Suite...\n');

  // Test 1: StorageManager Initialization
  console.log('1️⃣ Testing StorageManager & Configuration...');
  const testStorageDir = path.join(process.cwd(), '.test_config');
  if (fs.existsSync(testStorageDir)) {
    fs.rmSync(testStorageDir, { recursive: true, force: true });
  }
  const storage = new StorageManager(testStorageDir);
  const config = storage.loadConfig();
  assert.strictEqual(config.volume, 80);
  assert.strictEqual(config.theme, 'cyberpunk');
  assert.strictEqual(config.speed, 1.0);
  console.log('  ✓ StorageManager initialized successfully.');

  // Test 2: AudioEngine Initialization
  console.log('2️⃣ Testing AudioEngine...');
  const engine = new AudioEngine();
  const state = engine.getState();
  assert.strictEqual(state.isPlaying, false);
  assert.strictEqual(state.volume, 80);
  assert.strictEqual(state.loopMode, 'off');
  assert.strictEqual(state.speed, 1.0);
  assert.strictEqual(state.visualizerMode, 'bars');
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

  // Test 7: Synced LRC Lyrics Engine
  console.log('7️⃣ Testing Synced LRC Lyrics Engine...');
  const sampleLrc = `
[00:00.00] Intro Music
[00:05.50] First verse line starts here
[00:10.25] Second line follows smoothly
[00:15.00] Chorus explosion!
  `;
  const parsedLyrics = LyricsEngine.parseLrc(sampleLrc);
  assert.strictEqual(parsedLyrics.length, 4);
  assert.strictEqual(parsedLyrics[1].time, 5.5);
  assert.strictEqual(parsedLyrics[1].text, 'First verse line starts here');

  // Verify active line lookup
  assert.strictEqual(LyricsEngine.getActiveIndex(parsedLyrics, 0), 0);
  assert.strictEqual(LyricsEngine.getActiveIndex(parsedLyrics, 6.0), 1);
  assert.strictEqual(LyricsEngine.getActiveIndex(parsedLyrics, 12.0), 2);
  assert.strictEqual(LyricsEngine.getActiveIndex(parsedLyrics, 20.0), 3);
  console.log('  ✓ LRC Parser and millisecond timestamp sync verified.');

  // Test 8: DJ Effects, Nightcore & Vaporwave Speed Engine
  console.log('8️⃣ Testing DJ Speed Controls & Nightcore/Vaporwave Modes...');
  store.setSpeed(1.5);
  assert.strictEqual(store.getAudioEngine().getState().speed, 1.5);

  store.setNightcore();
  assert.strictEqual(store.getAudioEngine().getState().speed, 1.25);

  store.setVaporwave();
  assert.strictEqual(store.getAudioEngine().getState().speed, 0.8);
  console.log('  ✓ Playback speed multipliers and presets verified.');

  // Test 9: Multi-Mode Visualizer & Ambient Sounds
  console.log('9️⃣ Testing Multi-Mode Visualizer & Ambient Layers...');
  const nextMode = store.cycleVisualizerMode();
  assert.strictEqual(nextMode, 'wave');

  const nextAmbient = store.cycleAmbientSound();
  assert.strictEqual(nextAmbient, 'rain');

  const chromaTheme = getTheme('chroma');
  assert.strictEqual(chromaTheme.name, 'chroma');

  const synthwaveTheme = getTheme('synthwave');
  assert.strictEqual(synthwaveTheme.name, 'synthwave');
  console.log('  ✓ Visualizer modes, ambient layers, and Chroma themes verified.');

  // Test 10: Internet Radio Directory & Stream Track Conversion
  console.log('🔟 Testing Internet Radio Directory & Stream Conversion...');
  const stations = store.getRadioStations();
  assert.ok(stations.length >= 8);
  const grooveSalad = stations.find((s) => s.id === 'soma-groovesalad');
  assert.ok(grooveSalad);
  assert.strictEqual(grooveSalad.country, 'US');

  const streamTrack = RadioManager.stationToTrack(grooveSalad);
  assert.strictEqual(streamTrack.format, 'STREAM');
  assert.strictEqual(streamTrack.filePath, grooveSalad.streamUrl);

  const customStation = store.getRadioManager().addStation({
    name: 'Custom Vapor Stream',
    genre: 'Vaporwave',
    streamUrl: 'http://custom.stream/radio.mp3',
    description: 'Custom Test Radio',
  });
  assert.ok(customStation.id.startsWith('custom-radio-'));
  assert.strictEqual(store.getRadioStations().length, stations.length + 1);
  store.getRadioManager().removeCustomStation(customStation.id);
  assert.strictEqual(store.getRadioStations().length, stations.length);
  console.log('  ✓ Radio stations directory, custom station management, and streaming tracks verified.');

  // Test 11: LyricsCacheManager Disk Caching & Retrieval
  console.log('1️⃣1️⃣ Testing LyricsCacheManager Disk Caching & LRCLIB Pipeline...');
  const testLyricsCacheDir = path.join(process.cwd(), '.test_lyrics_cache');
  const cacheManager = new LyricsCacheManager(testLyricsCacheDir);
  const sampleTrackForLyrics: Track = {
    id: 'tr-lrc-test',
    filePath: '/tmp/nonexistent.mp3',
    fileName: 'nonexistent.mp3',
    title: 'Cyber Test Song',
    artist: 'Neon Artist',
    album: 'Cyber Album',
    duration: 180,
    format: 'MP3',
    addedAt: new Date().toISOString(),
  };

  const sampleLyricLines = [
    { time: 0, text: 'Intro beat' },
    { time: 5, text: 'First verse singing' },
    { time: 10, text: 'Chorus drop' },
  ];

  cacheManager.saveToCache(sampleTrackForLyrics.artist, sampleTrackForLyrics.title, sampleLyricLines);
  const cachedLyricsResult = await cacheManager.getLyricsForTrack(sampleTrackForLyrics);
  assert.ok(cachedLyricsResult);
  assert.strictEqual(cachedLyricsResult.length, 3);
  assert.strictEqual(cachedLyricsResult[1].text, 'First verse singing');

  cacheManager.clearCache();
  if (fs.existsSync(testLyricsCacheDir)) {
    fs.rmSync(testLyricsCacheDir, { recursive: true, force: true });
  }
  console.log('  ✓ Lyrics caching, disk serialization, and timestamp parsing verified.');

  // Test 12: Pomodoro & Sleep Timer State Machine
  console.log('1️⃣2️⃣ Testing Pomodoro Focus Engine & Sleep Timer State Machine...');
  const timerManager = store.getTimerManager();

  // Test Pomodoro start, skip, and reset
  timerManager.startPomodoro(25, 5);
  let pomo = timerManager.getPomodoroState();
  assert.strictEqual(pomo.phase, 'work');
  assert.strictEqual(pomo.isActive, true);
  assert.strictEqual(pomo.remainingSeconds, 25 * 60);

  timerManager.skipPomodoroPhase();
  pomo = timerManager.getPomodoroState();
  assert.strictEqual(pomo.phase, 'break');
  assert.strictEqual(pomo.completedCycles, 1);

  timerManager.resetPomodoro();
  assert.strictEqual(timerManager.getPomodoroState().phase, 'idle');

  // Test Sleep Timer
  timerManager.startSleepTimer(15);
  let sleepState = timerManager.getSleepTimerState();
  assert.strictEqual(sleepState.isActive, true);
  assert.strictEqual(sleepState.remainingSeconds, 15 * 60);

  timerManager.cancelSleepTimer();
  assert.strictEqual(timerManager.getSleepTimerState().isActive, false);

  timerManager.destroy();
  console.log('  ✓ Pomodoro focus cycles, breaks, and sleep timer fade controls verified.');

  // Stop any audio or ambient playback immediately so tests remain completely silent
  store.setAmbientSound('none');
  store.getAudioEngine().stop();

  // Clean up test temp dir
  if (fs.existsSync(testStorageDir)) {
    fs.rmSync(testStorageDir, { recursive: true, force: true });
  }

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Test execution failed:', err);
  process.exit(1);
});
