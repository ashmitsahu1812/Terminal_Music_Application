import fs from 'fs';
import path from 'path';

/**
 * Generates a valid PCM 16-bit Mono WAV audio buffer containing a simple synthesized tone.
 */
function createWavBuffer(durationSec: number = 10, frequency: number = 440, sampleRate: number = 44100): Buffer {
  const numSamples = durationSec * sampleRate;
  const dataSize = numSamples * 2; // 16-bit = 2 bytes per sample
  const fileSize = 44 + dataSize;
  const buffer = Buffer.alloc(fileSize);

  // RIFF Chunk
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(fileSize - 8, 4);
  buffer.write('WAVE', 8);

  // fmt Subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size for PCM
  buffer.writeUInt16LE(1, 20); // AudioFormat 1 = PCM
  buffer.writeUInt16LE(1, 22); // NumChannels 1 = Mono
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  buffer.writeUInt16LE(2, 32); // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data Subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Write PCM Sine Wave samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * frequency * t) * 0.4 * 32767;
    buffer.writeInt16LE(Math.floor(sample), offset);
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
    { filename: '01_Cyberpunk_Synth.wav', duration: 15, freq: 523.25, title: 'Cyberpunk Synthwave', artist: 'Neon Pulse', album: 'Night City Vibes' },
    { filename: '02_Terminal_Groove.wav', duration: 20, freq: 440.00, title: 'Terminal Groove', artist: 'CLI Beats', album: 'Bash Symphony' },
    { filename: '03_LoFi_Chill_Beat.wav', duration: 12, freq: 329.63, title: 'LoFi Chill Beat', artist: 'Bitrate Dreams', album: 'Coffee & Code' },
  ];

  console.log(`Generating sample tracks in ${samplesDir}...`);

  for (const trackInfo of tracksToGenerate) {
    const filePath = path.join(samplesDir, trackInfo.filename);
    const wavBuffer = createWavBuffer(trackInfo.duration, trackInfo.freq);
    fs.writeFileSync(filePath, wavBuffer);
    console.log(`Created: ${trackInfo.filename} (${trackInfo.duration}s, ${trackInfo.title})`);
  }

  console.log('Sample track generation complete!');
}

main().catch((err) => {
  console.error('Error generating sample tracks:', err);
});
