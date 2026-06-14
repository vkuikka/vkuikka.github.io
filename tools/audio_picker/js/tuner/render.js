// ---- loop tuner ----
function openLoopTuner() {
  if (!buffer) return;
  loopTunerEnabled = true;
  const zoomDur = Math.max(0.05, Math.min(0.5, (selEnd - selStart) * 0.25));
  leftView = {
    start: Math.max(0, selEnd - zoomDur),
    end: Math.min(buffer.duration, selEnd + zoomDur * 0.3)
  };
  rightView = {
    start: Math.max(0, selStart - zoomDur * 0.3),
    end: Math.min(buffer.duration, selStart + zoomDur)
  };
  $('loopTuner').classList.remove('hidden');
  requestAnimationFrame(drawLoopTuner);
}

function closeLoopTuner() {
  loopTunerEnabled = false;
  $('loopTuner').classList.add('hidden');
}

function drawLoopTuner() {
  if (!loopTunerEnabled || !buffer) return;
  drawTunerPane($('leftWave'), leftView);
  drawTunerPane($('rightWave'), rightView);
  updateTunerHandles();
  drawTunerRuler($('leftRuler'), leftView);
  drawTunerRuler($('rightRuler'), rightView);
}

function drawTunerPane(canvas, view) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0) { requestAnimationFrame(() => drawTunerPane(canvas, view)); return; }
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(120 * dpr));
  const c = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  c.fillStyle = getCss('--panel-2');
  c.fillRect(0, 0, W, H);

  const sr = buffer.sampleRate;
  const startSample = Math.max(0, Math.floor(view.start * sr));
  const endSample = Math.min(buffer.length, Math.ceil(view.end * sr));
  const totalSamples = endSample - startSample;
  if (totalSamples <= 0) return;

  const ch0 = buffer.getChannelData(0);
  const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null;
  const samplesPerPx = totalSamples / W;
  const mid = H / 2;

  const vDur = view.end - view.start;
  const selStartX = ((selStart - view.start) / vDur) * W;
  const selEndX = ((selEnd - view.start) / vDur) * W;

  if (samplesPerPx >= 1) {
    for (let x = 0; x < W; x++) {
      const sA = startSample + Math.floor(x * samplesPerPx);
      const sB = Math.min(endSample, startSample + Math.ceil((x + 1) * samplesPerPx));
      let mn = 1, mx = -1;
      for (let i = sA; i < sB; i++) {
        let v = ch0[i];
        if (ch1) v = (v + ch1[i]) * 0.5;
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
      const inSel = x >= selStartX && x <= selEndX;
      c.fillStyle = inSel ? getCss('--wave-sel') : getCss('--wave');
      const y1 = mid + mn * mid * 0.9;
      const y2 = mid + mx * mid * 0.9;
      c.fillRect(x, y1, 1, Math.max(1, y2 - y1));
    }
  } else {
    const pxPerSample = 1 / samplesPerPx;
    const drawSeg = (fromS, toS, color) => {
      if (toS < fromS) return;
      c.strokeStyle = color;
      c.lineWidth = Math.max(1, Math.floor(dpr));
      c.beginPath();
      for (let i = fromS; i <= toS; i++) {
        let v = ch0[i];
        if (ch1) v = (v + ch1[i]) * 0.5;
        const x = (i - startSample) * pxPerSample;
        const y = mid + v * mid * 0.9;
        if (i === fromS) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.stroke();
      if (pxPerSample > 6) {
        c.fillStyle = color;
        for (let i = fromS; i <= toS; i++) {
          let v = ch0[i];
          if (ch1) v = (v + ch1[i]) * 0.5;
          const x = (i - startSample) * pxPerSample;
          const y = mid + v * mid * 0.9;
          c.beginPath();
          c.arc(x, y, Math.max(1.5, pxPerSample * 0.15), 0, Math.PI * 2);
          c.fill();
        }
      }
    };
    const selA = Math.max(startSample, Math.floor(selStart * sr));
    const selB = Math.min(endSample, Math.ceil(selEnd * sr));
    if (selA > startSample) drawSeg(startSample, Math.min(selA, endSample - 1), getCss('--wave'));
    if (selB > selA) drawSeg(Math.max(selA, startSample), Math.min(selB, endSample - 1), getCss('--wave-sel'));
    if (endSample - 1 > selB) drawSeg(Math.max(selB + 1, startSample), endSample - 1, getCss('--wave'));
  }

  drawBpmGridOnCanvas(c, view.start, view.end, W, H);

  c.fillStyle = 'rgba(0,0,0,0.45)';
  if (selStartX > 0) c.fillRect(0, 0, Math.min(selStartX, W), H);
  if (selEndX < W) c.fillRect(Math.max(0, selEndX), 0, W - Math.max(0, selEndX), H);

  if (crossfadeSec > 0) {
    const F = Math.min(crossfadeSec, selStart, (selEnd - selStart) / 2);
    if (F > 0) {
      const paintRegion = (rs, re, color) => {
        const x1 = Math.max(0, Math.min(W, ((rs - view.start) / vDur) * W));
        const x2 = Math.max(0, Math.min(W, ((re - view.start) / vDur) * W));
        if (x2 > x1) { c.fillStyle = color; c.fillRect(x1, 0, x2 - x1, H); }
      };
      paintRegion(selEnd - F, selEnd, 'rgba(255, 180, 100, 0.22)');
      paintRegion(selStart - F, selStart, 'rgba(100, 200, 255, 0.22)');
    }
  }

  c.fillStyle = 'rgba(255,255,255,0.04)';
  c.fillRect(0, mid - 0.5, W, 1);
}

function updateTunerHandles() {
  const lw = $('leftWrap').clientWidth;
  const rw = $('rightWrap').clientWidth;
  const lDur = leftView.end - leftView.start;
  const rDur = rightView.end - rightView.start;
  const lX = ((selEnd - leftView.start) / lDur) * lw;
  const rX = ((selStart - rightView.start) / rDur) * rw;
  const lh = $('leftHandle'), rh = $('rightHandle');
  if (selEnd < leftView.start - 1e-6 || selEnd > leftView.end + 1e-6) lh.style.display = 'none';
  else { lh.style.display = 'block'; lh.style.left = lX + 'px'; }
  if (selStart < rightView.start - 1e-6 || selStart > rightView.end + 1e-6) rh.style.display = 'none';
  else { rh.style.display = 'block'; rh.style.left = rX + 'px'; }
}

function drawTunerRuler(el, view) {
  const w = el.clientWidth;
  el.innerHTML = '';
  const viewDur = view.end - view.start;
  const targetTicks = Math.max(3, Math.floor(w / 80));
  const rawStep = viewDur / targetTicks;
  const niceSteps = [0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1, 2, 5];
  const step = niceSteps.find(s => s >= rawStep) || rawStep;
  const precision = step < 0.01 ? 3 : 2;
  const first = Math.ceil(view.start / step) * step;
  for (let t = first; t <= view.end + 1e-9; t += step) {
    const x = ((t - view.start) / viewDur) * w;
    const span = document.createElement('span');
    span.textContent = fmtTime(t, precision);
    span.style.position = 'absolute';
    span.style.left = x + 'px';
    span.style.transform = 'translateX(-50%)';
    el.appendChild(span);
  }
}
