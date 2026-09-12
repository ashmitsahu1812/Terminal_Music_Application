import fs from 'fs';
import path from 'path';

/**
 * Generates a valid PCM 16-bit Mono WAV audio buffer.
 */
function createWavBuffer(
  durationSec: number = 10,
  frequency: number = 440,
  type: 'sine' | 'noise' | 'crackle' | 'rain' = 'sine',
  sampleRate: number = 44100
): Buffer {
  const numSamples = durationSec * sampleRate;
  const dataSize = numSamples * 2;
  const fileSize = 44 + dataSize;
  const buffer = Buffer.alloc(fileSize);

  // RIFF Chunk
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(fileSize - 8, 4);
  buffer.write('WAVE', 8);

  // fmt Subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);

  // data Subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  let lastNoise = 0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sampleVal = 0;

    if (type === 'sine') {
      sampleVal = Math.sin(2 * Math.PI * frequency * t) * 0.4 * 32767;
    } else if (type === 'rain') {
      // Filtered pink/white noise simulating rainfall
      const white = (Math.random() * 2 - 1) * 0.2;
      lastNoise = lastNoise * 0.95 + white * 0.05;
      sampleVal = (lastNoise + (Math.random() > 0.998 ? (Math.random() * 2 - 1) * 0.4 : 0)) * 32767;
    } else if (type === 'crackle') {
      // Vinyl crackle / fire pop simulation
      const pop = Math.random() > 0.995 ? (Math.random() * 2 - 1) * 0.5 : (Math.random() * 2 - 1) * 0.04;
      sampleVal = pop * 32767;
    }

    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, Math.floor(sampleVal))), offset);
    offset += 2;
  }

  return buffer;
}

async function main() {
  const samplesDir = path.join(process.cwd(), 'sample_music');
  if (!fs.existsSync(samplesDir)) {
    fs.mkdirSync(samplesDir, { recursive: true });
  }

  const tracksToGenerate = [
    { filename: '01_Cyberpunk_Synth.wav', duration: 15, freq: 523.25, title: 'Cyberpunk Synthwave', artist: 'Neon Pulse' },
    { filename: '02_Terminal_Groove.wav', duration: 20, freq: 440.00, title: 'Terminal Groove', artist: 'CLI Beats' },
    { filename: '03_LoFi_Chill_Beat.wav', duration: 12, freq: 329.63, title: 'LoFi Chill Beat', artist: 'Bitrate Dreams' },
  ];

  console.log(`Generating sample tracks in ${samplesDir}...`);

  for (const trackInfo of tracksToGenerate) {
    const filePath = path.join(samplesDir, trackInfo.filename);
    const wavBuffer = createWavBuffer(trackInfo.duration, trackInfo.freq, 'sine');
    fs.writeFileSync(filePath, wavBuffer);
    console.log(`Created music track: ${trackInfo.filename}`);
  }

  // Generate synced LRC files
  const lrcFiles = [
    {
      filename: '01_Cyberpunk_Synth.lrc',
      content: `[00:00.00] ♫ Neon Lights in the Cyber Rain ♫
[00:03.00] Cruising down the digital highway
[00:06.50] Synth waves pulsing through the terminal
[00:09.00] Bass drops and the matrix glows
[00:12.00] Cyberpunk vibes forever alive!
[00:14.50] [Outro Fade]`,
    },
    {
      filename: '02_Terminal_Groove.lrc',
      content: `[00:00.00] ♫ Initializing Terminal Music Engine ♫
[00:04.00] Typing commands at the speed of light
[00:08.00] Vim motions gliding through the code
[00:12.00] Pure rhythm in the command line
[00:16.00] 60 FPS audio visualizer pumping
[00:19.00] [Terminal Session Complete]`,
    },
    {
      filename: '03_LoFi_Chill_Beat.lrc',
      content: `[00:00.00] ♫ Late Night Coding & Coffee ♫
[00:03.00] Rain tapping softly on the window
[00:06.00] Warm vinyl crackle in the background
[00:09.00] Peaceful chill hop study session
[00:11.50] [Relax & Focus]`,
    },
  ];

  for (const lrc of lrcFiles) {
    const lrcPath = path.join(samplesDir, lrc.filename);
    fs.writeFileSync(lrcPath, lrc.content.trim(), 'utf-8');
    console.log(`Created synced LRC lyric file: ${lrc.filename}`);
  }

  // Generate ambient sound loops
  const ambients = [
    { filename: 'ambient_rain.wav', duration: 10, type: 'rain' as const },
    { filename: 'ambient_vinyl.wav', duration: 10, type: 'crackle' as const },
    { filename: 'ambient_fire.wav', duration: 10, type: 'crackle' as const },
    { filename: 'ambient_cafe.wav', duration: 10, type: 'rain' as const },
  ];

  for (const amb of ambients) {
    const ambPath = path.join(samplesDir, amb.filename);
    const ambBuffer = createWavBuffer(amb.duration, 200, amb.type);
    fs.writeFileSync(ambPath, ambBuffer);
    console.log(`Created ambient loop: ${amb.filename}`);
  }

  console.log('🎉 All sample music, synced lyrics, and ambient sounds generated successfully!');
}

main().catch((err) => {
  console.error('Error generating sample tracks:', err);
});
