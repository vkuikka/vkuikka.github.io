function detectSourceSampleRate(ab, filename) {
  try {
    const view = new DataView(ab);
    if (view.byteLength < 44) return null;
    // WAV: "RIFF" ... "WAVE"
    if (view.getUint32(0, false) === 0x52494646 && view.getUint32(8, false) === 0x57415645) {
      let pos = 12;
      while (pos + 8 < view.byteLength) {
        const chunkId = view.getUint32(pos, false);
        const chunkSize = view.getUint32(pos + 4, true);
        if (chunkId === 0x666d7420 && pos + 24 <= view.byteLength) {
          return view.getUint32(pos + 12, true);
        }
        pos += 8 + chunkSize;
      }
    }
    // FLAC: "fLaC"
    if (view.getUint32(0, false) === 0x664c6143) {
      // STREAMINFO starts at byte 4 (metadata block header) + 4 → STREAMINFO data at byte 8
      // Sample rate: 20 bits starting at byte offset 8 + 10 = 18, bit offset 0
      if (view.byteLength >= 22) {
        const b18 = view.getUint8(18);
        const b19 = view.getUint8(19);
        const b20 = view.getUint8(20);
        return (b18 << 12) | (b19 << 4) | (b20 >> 4);
      }
    }
    // MP3: skip ID3v2, then read MPEG frame header
    let pos = 0;
    if (view.getUint8(0) === 0x49 && view.getUint8(1) === 0x44 && view.getUint8(2) === 0x33) {
      const size = ((view.getUint8(6) & 0x7f) << 21) | ((view.getUint8(7) & 0x7f) << 14)
                 | ((view.getUint8(8) & 0x7f) << 7)  |  (view.getUint8(9) & 0x7f);
      pos = 10 + size;
    }
    const mp3Limit = Math.min(view.byteLength - 4, pos + 4096);
    while (pos < mp3Limit) {
      if (view.getUint8(pos) === 0xff && (view.getUint8(pos + 1) & 0xe0) === 0xe0) {
        const b1 = view.getUint8(pos + 1);
        const b2 = view.getUint8(pos + 2);
        const version = (b1 >> 3) & 0x3;
        const srIdx = (b2 >> 2) & 0x3;
        if (srIdx !== 3) {
          const table = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };
          const r = table[version] && table[version][srIdx];
          if (r) return r;
        }
      }
      pos++;
    }
  } catch {}
  return null;
}
