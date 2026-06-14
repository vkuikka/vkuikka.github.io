// ---- waveform rendering ----
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(180 * dpr));
}

function drawAll() {
  drawWaveform();
  drawBpmGridOnCanvas(ctx, viewStart, viewEnd, canvas.width, canvas.height);
  drawSelectionOverlay();
  drawFadeOverlay();
  updateHandles();
  drawRuler();
  if (loopTunerEnabled) drawLoopTuner();
}

function drawBpmGridOnCanvas(c, vs, ve, W, H) {
  if (!snapEnabled || !bpm || bpm <= 0) return;
  const beatDur = (60 / bpm) / snapDivision;
  if (beatDur <= 0) return;
  const viewDur = ve - vs;
  if (viewDur / beatDur > 500) return;
  const firstBeat = Math.floor((vs - snapOffset) / beatDur) * beatDur + snapOffset;
  c.fillStyle = 'rgba(124, 156, 255, 0.22)';
  for (let t = firstBeat; t <= ve + 1e-9; t += beatDur) {
    const x = ((t - vs) / viewDur) * W;
    c.fillRect(Math.floor(x), 0, 1, H);
  }
}

function timeToCanvasX(t) {
  return ((t - viewStart) / (viewEnd - viewStart)) * canvas.width;
}

function drawWaveform() {
  if (!buffer) return;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = getCss('--panel-2');
  ctx.fillRect(0, 0, W, H);

  const ch0 = buffer.getChannelData(0);
  const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null;
  const mid = H / 2;

  const sr = buffer.sampleRate;
  const startSample = Math.max(0, Math.floor(viewStart * sr));
  const endSample = Math.min(ch0.length, Math.ceil(viewEnd * sr));
  const totalSamples = endSample - startSample;
  if (totalSamples <= 0) return;
  const samplesPerPx = totalSamples / W;

  const selStartX = timeToCanvasX(selStart);
  const selEndX = timeToCanvasX(selEnd);

  if (samplesPerPx >= 1) {
    // Downsample: min/max per pixel column
    for (let x = 0; x < W; x++) {
      const sA = startSample + Math.floor(x * samplesPerPx);
      const sB = Math.min(endSample, startSample + Math.ceil((x + 1) * samplesPerPx));
      let min = 1, max = -1;
      for (let i = sA; i < sB; i++) {
        let v = ch0[i];
        if (ch1) v = (v + ch1[i]) * 0.5;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const inSel = x >= selStartX && x <= selEndX;
      ctx.fillStyle = inSel ? getCss('--wave-sel') : getCss('--wave');
      const y1 = mid + min * mid * 0.95;
      const y2 = mid + max * mid * 0.95;
      ctx.fillRect(x, y1, 1, Math.max(1, y2 - y1));
    }
  } else {
    // Zoomed so far in that each sample > 1px — draw interpolated line
    const pxPerSample = 1 / samplesPerPx;
    const drawSegment = (fromS, toS, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, Math.floor((window.devicePixelRatio || 1)));
      ctx.beginPath();
      let started = false;
      for (let i = fromS; i <= toS; i++) {
        let v = ch0[i];
        if (ch1) v = (v + ch1[i]) * 0.5;
        const x = (i - startSample) * pxPerSample;
        const y = mid + v * mid * 0.95;
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // sample dots when very zoomed
      if (pxPerSample > 6) {
        ctx.fillStyle = color;
        for (let i = fromS; i <= toS; i++) {
          let v = ch0[i];
          if (ch1) v = (v + ch1[i]) * 0.5;
          const x = (i - startSample) * pxPerSample;
          const y = mid + v * mid * 0.95;
          ctx.beginPath();
          ctx.arc(x, y, Math.max(1.5, pxPerSample * 0.15), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };
    const selA = Math.max(startSample, Math.floor(selStart * sr));
    const selB = Math.min(endSample, Math.ceil(selEnd * sr));
    if (selA > startSample) drawSegment(startSample, selA, getCss('--wave'));
    if (selB > selA) drawSegment(selA, selB, getCss('--wave-sel'));
    if (endSample > selB) drawSegment(selB, endSample - 1, getCss('--wave'));
  }

  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(0, mid - 0.5, W, 1);
}

function drawSelectionOverlay() {
  if (!buffer) return;
  const W = canvas.width, H = canvas.height;
  const a = Math.max(0, Math.min(W, timeToCanvasX(selStart)));
  const b = Math.max(0, Math.min(W, timeToCanvasX(selEnd)));
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, a, H);
  ctx.fillRect(b, 0, W - b, H);
}

function drawFadeOverlay() {
  if (!buffer) return;
  const W = canvas.width, H = canvas.height;
  const selDur = selEnd - selStart;
  if (selDur <= 0) return;
  const aX = timeToCanvasX(selStart);
  const bX = timeToCanvasX(selEnd);
  const visAX = Math.max(0, aX);
  const visBX = Math.min(W, bX);
  if (visBX <= visAX) return;

  const fiDur = Math.min(fadeInDur, selDur);
  const foDur = Math.min(fadeOutDur, selDur - fiDur);

  const samples = Math.max(32, Math.min(800, Math.floor(visBX - visAX)));
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const x = visAX + (i / samples) * (visBX - visAX);
    const tInSel = ((x - aX) / (bX - aX)) * selDur;
    const g = envelopeGain(tInSel, selDur, fiDur, foDur, curve);
    pts.push([x, H - g * H * 0.95]);
  }

  ctx.beginPath();
  ctx.moveTo(visAX, H);
  for (const [x, y] of pts) ctx.lineTo(x, y);
  ctx.lineTo(visBX, H);
  ctx.closePath();
  ctx.fillStyle = getCss('--fade');
  ctx.fill();

  ctx.beginPath();
  pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.strokeStyle = getCss('--fade-line');
  ctx.lineWidth = Math.max(1, Math.floor((window.devicePixelRatio || 1)));
  ctx.stroke();
}

function updateHandles() {
  if (!buffer) return;
  const w = waveWrap.clientWidth;
  const viewDur = viewEnd - viewStart;
  const place = (el, t) => {
    if (t < viewStart - 1e-6 || t > viewEnd + 1e-6) {
      el.style.display = 'none';
    } else {
      el.style.display = 'block';
      el.style.left = ((t - viewStart) / viewDur) * w + 'px';
    }
  };
  place(hStart, selStart);
  place(hEnd, selEnd);
}

function drawRuler() {
  if (!buffer) return;
  const w = waveWrap.clientWidth;
  ruler.innerHTML = '';
  const viewDur = viewEnd - viewStart;
  const targetTicks = Math.max(4, Math.floor(w / 100));
  const rawStep = viewDur / targetTicks;
  const niceSteps = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
  const step = niceSteps.find(s => s >= rawStep) || rawStep;
  const precision = step < 0.01 ? 3 : 2;
  const firstTick = Math.ceil(viewStart / step) * step;
  for (let t = firstTick; t <= viewEnd + 1e-9; t += step) {
    const x = ((t - viewStart) / viewDur) * w;
    const el = document.createElement('span');
    el.textContent = fmtTime(t, precision);
    el.style.position = 'absolute';
    el.style.left = x + 'px';
    el.style.transform = 'translateX(-50%)';
    ruler.appendChild(el);
  }
}

window.addEventListener('resize', () => {
  if (!buffer) return;
  resizeCanvas();
  drawAll();
});
