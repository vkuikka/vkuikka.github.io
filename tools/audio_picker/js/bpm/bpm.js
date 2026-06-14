// ---- snap UI ----
$('snapEnable').addEventListener('change', (e) => {
  snapEnabled = e.target.checked;
  drawAll();
});

$('bpmInput').addEventListener('input', (e) => {
  const v = parseFloat(e.target.value);
  if (isFinite(v) && v > 0) bpm = v;
  drawAll();
});

$('snapDivSelect').addEventListener('change', (e) => {
  snapDivision = parseInt(e.target.value, 10) || 4;
  drawAll();
});

$('snapOffsetInput').addEventListener('input', (e) => {
  const ms = parseFloat(e.target.value);
  snapOffset = isFinite(ms) ? ms / 1000 : 0;
  drawAll();
});

$('autoBpmBtn').addEventListener('click', async () => {
  if (!buffer) { showToast('Load audio first'); return; }
  const btn = $('autoBpmBtn');
  btn.disabled = true;
  const orig = btn.textContent;
  btn.textContent = '…';
  await new Promise(r => setTimeout(r, 0));
  try {
    const res = detectBpmAndOffset(buffer);
    if (!res) { showToast('Could not detect tempo'); return; }
    bpm = res.bpm;
    snapOffset = res.offset;
    $('bpmInput').value = bpm.toFixed(2);
    $('snapOffsetInput').value = Math.round(snapOffset * 1000);
    if (!snapEnabled) {
      snapEnabled = true;
      $('snapEnable').checked = true;
    }
    drawAll();
    showToast(`Detected ${bpm.toFixed(1)} BPM · offset ${Math.round(snapOffset * 1000)} ms`);
  } catch (err) {
    console.error(err);
    showToast('Detection failed: ' + (err.message || err));
  } finally {
    btn.disabled = false;
    btn.textContent = orig;
  }
});

function detectBpmAndOffset(buf) {
  const sr = buf.sampleRate;
  const numCh = buf.numberOfChannels;
  const maxLen = Math.min(buf.length, Math.floor(60 * sr));

  // Mix to mono
  const mono = new Float32Array(maxLen);
  for (let c = 0; c < numCh; c++) {
    const ch = buf.getChannelData(c);
    for (let i = 0; i < maxLen; i++) mono[i] += ch[i] / numCh;
  }

  // Fine-resolution onset envelope (2 ms hops, 10 ms windows)
  const hop = Math.max(1, Math.floor(sr * 0.002));
  const win = Math.max(hop * 2, Math.floor(sr * 0.010));
  const numFrames = Math.floor((maxLen - win) / hop);
  if (numFrames < 64) return null;
  const fps = sr / hop;

  // Log-compressed RMS energy (robust across loud/quiet parts)
  const energy = new Float32Array(numFrames);
  for (let i = 0; i < numFrames; i++) {
    const start = i * hop;
    let sum = 0;
    for (let j = 0; j < win; j++) {
      const s = mono[start + j];
      sum += s * s;
    }
    energy[i] = Math.log(1e-6 + Math.sqrt(sum / win));
  }

  // Onset strength = half-wave rectified first difference of log energy
  const onset = new Float32Array(numFrames);
  for (let i = 1; i < numFrames; i++) {
    onset[i] = Math.max(0, energy[i] - energy[i - 1]);
  }
  let maxOn = 0;
  for (let i = 0; i < numFrames; i++) if (onset[i] > maxOn) maxOn = onset[i];
  if (maxOn <= 0) return null;
  for (let i = 0; i < numFrames; i++) onset[i] /= maxOn;

  // Peak-pick: local maxima above threshold with min spacing
  const minGap = Math.max(2, Math.floor(0.08 * fps));
  const localW = Math.max(2, Math.floor(0.025 * fps));
  const threshold = 0.12;
  const peaks = [];
  for (let i = 1; i < numFrames - 1; i++) {
    if (onset[i] < threshold) continue;
    let isMax = true;
    const a = Math.max(0, i - localW);
    const b = Math.min(numFrames - 1, i + localW);
    for (let j = a; j <= b; j++) {
      if (j !== i && onset[j] > onset[i]) { isMax = false; break; }
    }
    if (!isMax) continue;
    if (peaks.length && (i - peaks[peaks.length - 1]) < minGap) {
      if (onset[i] > onset[peaks[peaks.length - 1]]) peaks[peaks.length - 1] = i;
      continue;
    }
    peaks.push(i);
  }
  if (peaks.length < 4) return null;

  // Refine peak position to leading edge (first frame where onset > 30% of peak)
  const refined = peaks.map(p => {
    const thr = onset[p] * 0.3;
    let i = p;
    while (i > 0 && onset[i - 1] >= thr) i--;
    return i;
  });

  const peakTimes = refined.map(p => p / fps);
  const peakStrengths = refined.map((p, idx) => onset[peaks[idx]]);

  // Search BPM at 0.1 resolution; for each BPM, find best phase (offset) via strength-weighted histogram
  const minBpm = 40, maxBpm = 220;
  const steps = Math.round((maxBpm - minBpm) * 10);
  const numBins = 400;
  const histW = 4; // smoothing window in bins
  const tol = 0.025; // alignment tolerance in seconds

  let bestScore = -Infinity;
  let bestBpm = 120;
  let bestOffset = 0;

  for (let step = 0; step <= steps; step++) {
    const b = minBpm + step / 10;
    const beatDur = 60 / b;

    const bins = new Float32Array(numBins);
    for (let k = 0; k < peakTimes.length; k++) {
      const t = peakTimes[k];
      const s = peakStrengths[k];
      const phase = ((t % beatDur) + beatDur) % beatDur;
      const binIdx = Math.min(numBins - 1, Math.floor((phase / beatDur) * numBins));
      bins[binIdx] += s;
    }
    // Circularly smooth the histogram
    let best = 0, bestIdx = 0;
    for (let i = 0; i < numBins; i++) {
      let sum = 0;
      for (let j = -histW; j <= histW; j++) {
        sum += bins[((i + j) % numBins + numBins) % numBins];
      }
      if (sum > best) { best = sum; bestIdx = i; }
    }
    const offset = (bestIdx / numBins) * beatDur;

    // Alignment score: strength-weighted count of peaks within tol
    let score = 0;
    for (let k = 0; k < peakTimes.length; k++) {
      const raw = (peakTimes[k] - offset) / beatDur;
      const err = Math.abs(raw - Math.round(raw)) * beatDur;
      if (err < tol) score += peakStrengths[k];
    }

    const bias = 0.9 + 0.1 * Math.exp(-Math.pow((b - 120) / 90, 2));
    const biased = score * bias;
    if (biased > bestScore) {
      bestScore = biased;
      bestBpm = b;
      bestOffset = offset;
    }
  }

  // Refine offset: average the error of aligned peaks and nudge offset by it
  const beatDur = 60 / bestBpm;
  let errSum = 0, errCount = 0;
  for (let k = 0; k < peakTimes.length; k++) {
    const raw = (peakTimes[k] - bestOffset) / beatDur;
    const rounded = Math.round(raw);
    const err = (raw - rounded) * beatDur;
    if (Math.abs(err) < tol) { errSum += err; errCount++; }
  }
  if (errCount > 0) bestOffset += errSum / errCount;

  const normOffset = ((bestOffset % beatDur) + beatDur) % beatDur;
  return { bpm: bestBpm, offset: normOffset };
}
