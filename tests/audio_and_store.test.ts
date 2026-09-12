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
import { StatsManager } from '../src/stats/StatsManager.js';
import { SmartPlaylistEngine } from '../src/playlist/SmartPlaylistEngine.js';
import { PlaylistIO } from '../src/io/PlaylistIO.js';
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

  // Test 13: 10-Band Equalizer Manager & Preset System
  console.log('1️⃣3️⃣ Testing 10-Band Equalizer Manager & Preset System...');
  const eq = store.getEqualizerManager();
  // Default flat preset
  const flatGains = eq.getGains();
  assert.ok(flatGains.every((g) => g === 0), 'Flat preset should have 0dB on all bands');
  assert.strictEqual(eq.getPreset(), 'flat', 'Default preset should be flat');
  // Apply bass boost preset
  store.setEQPreset('bass_boost');
  const bbGains = eq.getGains();
  assert.ok(bbGains[0] > 0, 'Bass boost should boost 32Hz band');
  assert.strictEqual(eq.getPreset(), 'bass_boost');
  // Custom band adjustment
  store.setEQPreset('flat');
  eq.adjustBandGain(0, 5); // +5 on 32Hz
  eq.adjustBandGain(9, -3); // -3 on 16kHz
  store.applyCustomEQBands(eq.getGains());
  assert.strictEqual(eq.getPreset(), 'custom');
  assert.strictEqual(eq.getGains()[0], 5);
  assert.strictEqual(eq.getGains()[9], -3);
  // Gain clamping at ±12dB
  eq.setBandGain(0, 20);
  assert.strictEqual(eq.getGains()[0], 12, 'Gain should clamp to +12dB max');
  eq.setBandGain(0, -20);
  assert.strictEqual(eq.getGains()[0], -12, 'Gain should clamp to -12dB min');
  // FFmpeg filter string for non-zero bands
  store.setEQPreset('bass_boost');
  const filterStr = eq.getFFmpegFilterString();
  assert.ok(filterStr.includes('equalizer='), 'Bass boost should generate FFmpeg equalizer filters');
  // Flat preset yields anull (passthrough)
  store.setEQPreset('flat');
  const nullFilter = eq.getFFmpegFilterString();
  assert.strictEqual(nullFilter, 'anull', 'Flat preset should yield anull passthrough filter');
  // Preset list completeness
  const presets = eq.getPresetList();
  assert.strictEqual(presets.length, 9, 'Should have 9 EQ presets');
  console.log('  ✓ Equalizer bands, presets, gain clamping, and FFmpeg filter generation verified.');

  // Test 14: StatsManager Listening History & Analytics
  console.log('1⃣⃣4⃣ Testing StatsManager Play History & Listening Analytics...');
  const testDir2 = path.join(process.cwd(), '.test_stats_' + Date.now());
  fs.mkdirSync(testDir2, { recursive: true });
  const sm = new StatsManager(testDir2);
  // Record play sessions
  sm.startSession('tk-1', 'Song A', 'Artist 1', 'Album 1', '/tmp/a.mp3');
  await new Promise((r) => setTimeout(r, 50));
  sm.endSession();
  sm.startSession('tk-2', 'Song B', 'Artist 2', 'Album 2', '/tmp/b.mp3');
  sm.endSession();
  sm.startSession('tk-1', 'Song A', 'Artist 1', 'Album 1', '/tmp/a.mp3');
  sm.endSession();
  const stats2 = sm.getStats();
  assert.strictEqual(stats2.uniqueTracksPlayed, 2, 'Should have 2 unique tracks');
  assert.strictEqual(stats2.totalTrackPlays, 3, 'Should have 3 total plays');
  assert.strictEqual(stats2.topTracks[0].trackId, 'tk-1', 'Most played should be Song A');
  assert.strictEqual(stats2.topTracks[0].playCount, 2, 'Song A play count should be 2');
  assert.strictEqual(sm.formatDuration(0), '0s');
  assert.strictEqual(sm.formatDuration(65), '1m 5s');
  assert.strictEqual(sm.formatDuration(3661), '1h 1m');
  sm.clearStats();
  const cleared = sm.getStats();
  assert.strictEqual(cleared.totalTrackPlays, 0, 'Stats should be cleared after clearStats()');
  assert.strictEqual(cleared.uniqueTracksPlayed, 0);
  fs.rmSync(testDir2, { recursive: true, force: true });
  console.log('  ✓ Play history recording, top tracks ranking, duration formatting, and clear verified.');

  // Test 15: Smart Playlist Engine – Rule-Based Auto-Generation
  console.log('1⃣⃣5⃣ Testing Smart Playlist Engine...');
  const sampleTracks: Track[] = [
    { id: 'sp-1', filePath: '/a.mp3', fileName: 'a.mp3', title: 'Electric Dreams', artist: 'Synth Co', album: 'Neon', genre: 'Electronic', duration: 240, format: 'mp3', addedAt: new Date().toISOString(), year: 2020 },
    { id: 'sp-2', filePath: '/b.mp3', fileName: 'b.mp3', title: 'Rainy Cafe', artist: 'LoFi Guy', album: 'Chill', genre: 'Lo-Fi', duration: 120, format: 'mp3', addedAt: new Date().toISOString(), year: 1998 },
    { id: 'sp-3', filePath: '/c.mp3', fileName: 'c.mp3', title: 'Piano Sonata', artist: 'Mozart', album: 'Classical', genre: 'Classical', duration: 600, format: 'mp3', addedAt: new Date().toISOString(), year: 1785 },
    { id: 'sp-4', filePath: '/d.mp3', fileName: 'd.mp3', title: 'Heavy Riff', artist: 'Rock Band', album: 'Loud', genre: 'Rock', duration: 200, format: 'mp3', addedAt: new Date().toISOString(), year: 2005 },
    { id: 'sp-5', filePath: '/e.mp3', fileName: 'e.mp3', title: 'Ambient Rain', artist: 'Sleep Aid', album: 'Rest', genre: 'Ambient', duration: 1800, format: 'mp3', addedAt: new Date().toISOString() },
  ];
  // Genre filter
  const electronic = SmartPlaylistEngine.generate(sampleTracks, { name: 'Electronic', rules: [{ type: 'genre', value: 'Electronic' }] });
  assert.strictEqual(electronic.length, 1);
  assert.strictEqual(electronic[0].id, 'sp-1');
  // Decade filter
  const nineties = SmartPlaylistEngine.generate(sampleTracks, { name: '90s', rules: [{ type: 'decade', value: 1990 }] });
  assert.strictEqual(nineties.length, 1);
  assert.strictEqual(nineties[0].id, 'sp-2');
  // Mood: chill (lo-fi)
  const chill = SmartPlaylistEngine.generate(sampleTracks, { name: 'Chill', rules: [{ type: 'mood', value: 'chill' }] });
  assert.ok(chill.some((t) => t.id === 'sp-2'), 'Chill should include LoFi track');
  // Mood: focus (classical)
  const focus = SmartPlaylistEngine.generate(sampleTracks, { name: 'Focus', rules: [{ type: 'mood', value: 'focus' }] });
  assert.ok(focus.some((t) => t.id === 'sp-3'), 'Focus should include Classical track');
  // Duration max (< 3 minutes = 180s)
  const short = SmartPlaylistEngine.generate(sampleTracks, { name: 'Short', rules: [{ type: 'duration_max', seconds: 180 }] });
  assert.ok(short.every((t) => t.duration <= 180), 'All short tracks should be <= 180s');
  // toPlaylist conversion
  const pl2 = SmartPlaylistEngine.toPlaylist(electronic, 'Test Electronic');
  assert.strictEqual(pl2.trackIds.length, 1);
  assert.strictEqual(pl2.name, 'Test Electronic');
  // Presets exist
  const preset2 = SmartPlaylistEngine.getPresets();
  assert.ok(preset2.length >= 6, 'Should have at least 6 preset configs');
  console.log('  ✓ Genre, decade, mood, duration, and playlist conversion rules verified.');

  // Test 16: PlaylistIO (M3U Import/Export)
  console.log('1⃣⃣6⃣ Testing PlaylistIO M3U Import/Export...');
  const ioDir = path.join(process.cwd(), '.test_m3u_' + Date.now());
  fs.mkdirSync(ioDir, { recursive: true });
  
  const testTracks: Track[] = [
    { id: 'io-1', filePath: '/tmp/track1.mp3', fileName: 'track1.mp3', title: 'Song One', artist: 'Artist A', duration: 120, addedAt: new Date().toISOString() },
    { id: 'io-2', filePath: '/tmp/track2.mp3', fileName: 'track2.mp3', title: 'Song Two', artist: 'Artist B', duration: 180, addedAt: new Date().toISOString() }
  ];
  const testPl: Playlist = {
    id: 'pl-io-test', name: 'My Exported List', description: 'Test', trackIds: ['io-1', 'io-2'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };

  // Export
  const outPath = PlaylistIO.exportM3U(testPl, testTracks, ioDir);
  assert.ok(fs.existsSync(outPath), 'M3U file should be created');
  const m3uContent = fs.readFileSync(outPath, 'utf-8');
  assert.ok(m3uContent.includes('#EXTM3U'), 'Should have EXTM3U header');
  assert.ok(m3uContent.includes('#PLAYLIST:My Exported List'), 'Should have PLAYLIST tag');
  assert.ok(m3uContent.includes('/tmp/track1.mp3'), 'Should contain track paths');
  assert.ok(m3uContent.includes('#EXTINF:120,Artist A - Song One'), 'Should contain EXTM3U metadata');

  // Import
  const imported = PlaylistIO.importM3U(outPath);
  assert.strictEqual(imported.playlist.name, 'My Exported List', 'Should parse playlist name');
  assert.strictEqual(imported.trackPaths.length, 2, 'Should parse 2 track paths');
  assert.strictEqual(imported.trackPaths[0], '/tmp/track1.mp3', 'Should parse correct path');

  // Preview
  const previewStr = PlaylistIO.previewImport(outPath);
  assert.ok(previewStr.includes('My Exported List'), 'Preview should contain playlist name');
  
  fs.rmSync(ioDir, { recursive: true, force: true });
  console.log('  ✓ M3U export, EXTM3U tags, and import parsing verified.');

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Test execution failed:', err);
  process.exit(1);
});
