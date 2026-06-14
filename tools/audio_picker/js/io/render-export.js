// ---- render + download ----
function sliceChannelsWithFadesAndCrossfade(startIdx, len) {
  const sr = buffer.sampleRate;
  const ch = buffer.numberOfChannels;
  const xfSamples = crossfadeSec > 0
    ? Math.max(0, Math.min(Math.floor(crossfadeSec * sr), startIdx, Math.floor(len / 2)))
    : 0;
  const selDur = len / sr;
  const fi = Math.min(fadeInDur, selDur);
  const fo = Math.min(fadeOutDur, selDur - fi);
  const fiSamples = Math.floor(fi * sr);
  const foSamples = Math.floor(fo * sr);
  const out = new Array(ch);
  for (let c = 0; c < ch; c++) {
    const d = new Float32Array(len);
    const s = buffer.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = s[startIdx + i];
    if (xfSamples > 0) {
      for (let k = 0; k < xfSamples; k++) {
        const alpha = k / Math.max(1, xfSamples - 1);
        let fIn, fOut;
        if (crossfadeCurve === 'linear') { fIn = alpha; fOut = 1 - alpha; }
        else { fIn = Math.sin(alpha * Math.PI / 2); fOut = Math.cos(alpha * Math.PI / 2); }
        d[len - xfSamples + k] = s[startIdx + len - xfSamples + k] * fOut + s[startIdx - xfSamples + k] * fIn;
      }
    }
    if (fiSamples > 0 || foSamples > 0) {
      for (let i = 0; i < len; i++) {
        let g = 1;
        if (fiSamples > 0 && i < fiSamples) g = Math.min(g, shape(i / fiSamples, curve));
        if (foSamples > 0 && i >= len - foSamples) g = Math.min(g, shape((len - i) / foSamples, curve));
        d[i] *= g;
      }
    }
    out[c] = d;
  }
  return out;
}

async function renderSnippet() {
  const sr = buffer.sampleRate;
  const ch = buffer.numberOfChannels;
  const startIdx = Math.floor(selStart * sr);
  const endIdx = Math.min(buffer.length, Math.floor(selEnd * sr));
  const len = Math.max(0, endIdx - startIdx);
  if (len === 0) throw new Error('Empty selection');

  // Fast path: no effects → pure JS, bit-identical to source slice + fades/crossfade
  if (!effectsEnabled) {
    let out = sliceChannelsWithFadesAndCrossfade(startIdx, len);
    if (channelMode === 'mono' && out.length > 1) {
      const mono = new Float32Array(len);
      const n = out.length;
      for (let i = 0; i < len; i++) {
        let sum = 0;
        for (let c = 0; c < n; c++) sum += out[c][i];
        mono[i] = sum / n;
      }
      out = [mono];
    }
    return { channels: out, sampleRate: sr, length: len };
  }

  // Effects path: render through OfflineAudioContext
  const tailSamples = Math.floor(effectTailSec() * sr);
  const totalLen = len + tailSamples;
  const outCh = channelMode === 'mono' ? 1 : ch;
  const offline = new OfflineAudioContext(outCh, totalLen, sr);

  const slicedData = sliceChannelsWithFadesAndCrossfade(startIdx, len);
  const sliced = offline.createBuffer(ch, len, sr);
  for (let c = 0; c < ch; c++) sliced.copyToChannel(slicedData[c], c);

  const src = offline.createBufferSource();
  src.buffer = sliced;

  const effectOut = offline.createGain();
  const masterGain = offline.createGain();
  masterGain.gain.value = dbToGain(fx.outGainDb);

  buildEffects(offline, src, effectOut);
  effectOut.connect(masterGain).connect(offline.destination);

  src.start(0);
  const rendered = await offline.startRendering();
  const out = new Array(outCh);
  for (let c = 0; c < outCh; c++) out[c] = rendered.getChannelData(c).slice(0);
  return { channels: out, sampleRate: sr, length: totalLen };
}

function encodeWAV({ channels, sampleRate, length }, bits = 16) {
  const numCh = channels.length;
  const bytesPerSample = bits / 8;
  const blockAlign = numCh * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const buf = new ArrayBuffer(44 + dataSize);
  const v = new DataView(buf);
  const writeStr = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  v.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, numCh, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, byteRate, true);
  v.setUint16(32, blockAlign, true);
  v.setUint16(34, bits, true);
  writeStr(36, 'data');
  v.setUint32(40, dataSize, true);

  let offset = 44;
  if (bits === 16) {
    for (let i = 0; i < length; i++) {
      for (let c = 0; c < numCh; c++) {
        let s = Math.max(-1, Math.min(1, channels[c][i]));
        s = s < 0 ? s * 0x8000 : s * 0x7fff;
        v.setInt16(offset, s | 0, true);
        offset += 2;
      }
    }
  } else if (bits === 24) {
    for (let i = 0; i < length; i++) {
      for (let c = 0; c < numCh; c++) {
        let s = Math.max(-1, Math.min(1, channels[c][i]));
        const n = Math.round(s * 8388607);
        const u = n < 0 ? n + 0x1000000 : n;
        v.setUint8(offset, u & 0xff);
        v.setUint8(offset + 1, (u >> 8) & 0xff);
        v.setUint8(offset + 2, (u >> 16) & 0xff);
        offset += 3;
      }
    }
  }
  return new Blob([buf], { type: 'audio/wav' });
}

$('download').addEventListener('click', async () => {
  if (!buffer) return;
  const btn = $('download');
  btn.disabled = true;
  const origText = btn.textContent;
  btn.textContent = 'Rendering…';
  try {
    const snippet = await renderSnippet();
    const bits = format === 'wav24' ? 24 : 16;
    const blob = encodeWAV(snippet, bits);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const s = selStart.toFixed(2).replace('.', '_');
    const e = selEnd.toFixed(2).replace('.', '_');
    a.href = url;
    a.download = `${fileName}_${s}-${e}s.wav`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    showToast('Exported ' + a.download);
  } catch (err) {
    console.error(err);
    showToast('Export failed: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = origText;
  }
});
