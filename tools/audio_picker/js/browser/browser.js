// ---- sound browser ----
const browserItems = [];
let nextItemId = 1;
const preview = { item: null, source: null, gain: null, startAt: 0, endAt: 0, rafId: null };

function updateBrowserCount() {
  $('browserCount').textContent = `${browserItems.length} file${browserItems.length === 1 ? '' : 's'}`;
}

async function addToBrowser(files) {
  $('browser').classList.remove('hidden');
  const added = [];
  for (const f of files) {
    const item = { id: nextItemId++, file: f, buffer: null, peaks: null, row: null, canvas: null, playhead: null };
    browserItems.push(item);
    added.push(item);
    createBrowserRow(item);
  }
  updateBrowserCount();
  await runWithConcurrency(added, 3, decodeItem);
}

async function runWithConcurrency(items, limit, fn) {
  const queue = items.slice();
  const workers = Array.from({length: Math.min(limit, queue.length)}, async () => {
    while (queue.length) {
      const it = queue.shift();
      try { await fn(it); } catch (err) { console.error(err); }
    }
  });
  await Promise.all(workers);
}

async function decodeItem(item) {
  try {
    const ab = await item.file.arrayBuffer();
    const ac = ensureCtx();
    item.buffer = await ac.decodeAudioData(ab.slice(0));
    item.peaks = computePeaks(item.buffer, 600);
    item.row.querySelector('.bi-wave-wrap').classList.remove('loading');
    item.row.querySelector('.bi-dur').textContent = fmtTime(item.buffer.duration, 1);
    drawMiniWave(item);
  } catch (err) {
    console.error('Decode failed:', item.file.name, err);
    item.row.querySelector('.bi-wave-wrap').classList.remove('loading');
    item.row.querySelector('.bi-dur').textContent = '—';
    const name = item.row.querySelector('.bi-name');
    name.style.color = 'var(--warn)';
    name.title = 'Decode failed: ' + (err.message || err);
  }
}

function computePeaks(buf, n) {
  const ch0 = buf.getChannelData(0);
  const ch1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : null;
  const step = ch0.length / n;
  const peaks = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const a = Math.floor(i * step);
    const b = Math.min(ch0.length, Math.floor((i + 1) * step));
    let mn = 1, mx = -1;
    for (let j = a; j < b; j++) {
      let v = ch0[j];
      if (ch1) v = (v + ch1[j]) * 0.5;
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    peaks[i * 2] = mn;
    peaks[i * 2 + 1] = mx;
  }
  return peaks;
}

function drawMiniWave(item) {
  if (!item.peaks || !item.canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = item.canvas.getBoundingClientRect();
  if (rect.width === 0) { requestAnimationFrame(() => drawMiniWave(item)); return; }
  item.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  item.canvas.height = Math.max(1, Math.floor(40 * dpr));
  const c = item.canvas.getContext('2d');
  const W = item.canvas.width, H = item.canvas.height;
  c.clearRect(0, 0, W, H);
  const mid = H / 2;
  const n = item.peaks.length / 2;
  c.fillStyle = getCss('--wave');
  for (let x = 0; x < W; x++) {
    const i = Math.min(n - 1, Math.floor((x / W) * n));
    const mn = item.peaks[i * 2];
    const mx = item.peaks[i * 2 + 1];
    const y1 = mid + mn * mid * 0.9;
    const y2 = mid + mx * mid * 0.9;
    c.fillRect(x, y1, 1, Math.max(1, y2 - y1));
  }
}

function createBrowserRow(item) {
  const row = document.createElement('div');
  row.className = 'browser-item';
  row.dataset.id = item.id;
  row.innerHTML = `
    <button class="bi-play" title="Play">▶</button>
    <div class="bi-name"></div>
    <div class="bi-wave-wrap loading">
      <canvas class="bi-wave"></canvas>
      <div class="bi-playhead"></div>
    </div>
    <div class="bi-dur">—</div>
    <button class="bi-edit" title="Load in editor">Edit ↑</button>
    <button class="bi-delete" title="Remove from browser">×</button>
  `;
  row.querySelector('.bi-name').textContent = item.file.name;
  $('browserList').appendChild(row);
  item.row = row;
  item.canvas = row.querySelector('.bi-wave');
  item.playhead = row.querySelector('.bi-playhead');

  row.querySelector('.bi-play').addEventListener('click', (e) => {
    e.stopPropagation();
    if (preview.item === item && preview.source) stopPreview();
    else startPreview(item, 0);
  });
  row.querySelector('.bi-edit').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!item.buffer) { showToast('Still decoding…'); return; }
    selectItemForEditor(item);
  });
  row.querySelector('.bi-wave-wrap').addEventListener('click', (e) => {
    if (!item.buffer) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - rect.left) / rect.width) * item.buffer.duration;
    startPreview(item, Math.max(0, Math.min(item.buffer.duration - 0.01, t)));
  });
  row.querySelector('.bi-delete').addEventListener('click', (e) => {
    e.stopPropagation();
    removeBrowserItem(item);
  });
}

function removeBrowserItem(item) {
  if (preview.item === item) stopPreview();
  const idx = browserItems.indexOf(item);
  if (idx >= 0) browserItems.splice(idx, 1);
  if (item.row && item.row.parentElement) item.row.parentElement.removeChild(item.row);
  updateBrowserCount();
  if (browserItems.length === 0) $('browser').classList.add('hidden');
}

function startPreview(item, offset) {
  stopPreview();
  stopPlayback();
  if (!item.buffer) return;
  const ac = ensureCtx();
  const src = ac.createBufferSource();
  src.buffer = item.buffer;
  const gain = ac.createGain();
  gain.gain.value = 1;
  const channelNode = ac.createGain();
  channelNode.channelCount = channelMode === 'mono' ? 1 : 2;
  channelNode.channelCountMode = 'explicit';
  channelNode.channelInterpretation = 'speakers';
  src.connect(gain).connect(channelNode).connect(ac.destination);
  const now = ac.currentTime + 0.02;
  const dur = item.buffer.duration - offset;
  src.start(now, offset, dur);
  preview.item = item;
  preview.source = src;
  preview.gain = gain;
  preview.startAt = now;
  preview.offset = offset;
  preview.endAt = now + dur;
  item.row.classList.add('playing');
  item.playhead.style.display = 'block';
  const tick = () => {
    if (preview.source !== src) return;
    if (ac.currentTime >= preview.endAt) { stopPreview(); return; }
    const t = offset + (ac.currentTime - now);
    const rect = item.canvas.getBoundingClientRect();
    item.playhead.style.left = ((t / item.buffer.duration) * rect.width) + 'px';
    preview.rafId = requestAnimationFrame(tick);
  };
  preview.rafId = requestAnimationFrame(tick);
}

function stopPreview() {
  if (preview.source) {
    try { preview.source.stop(); } catch {}
    preview.source.disconnect();
  }
  if (preview.gain) preview.gain.disconnect();
  if (preview.rafId) cancelAnimationFrame(preview.rafId);
  if (preview.item) {
    preview.item.row.classList.remove('playing');
    preview.item.playhead.style.display = 'none';
  }
  preview.source = preview.gain = preview.item = null;
  preview.rafId = null;
}

function selectItemForEditor(item) {
  stopPlayback();
  stopPreview();
  loadBuffer(item.buffer, item.file.name);
  document.querySelectorAll('.browser-item.current').forEach(r => r.classList.remove('current'));
  item.row.classList.add('current');
}

$('browserStop').addEventListener('click', stopPreview);
$('browserClear').addEventListener('click', () => {
  if (browserItems.length === 0) return;
  if (!confirm(`Clear ${browserItems.length} browser items?`)) return;
  stopPreview();
  browserItems.length = 0;
  $('browserList').innerHTML = '';
  $('browser').classList.add('hidden');
  updateBrowserCount();
});

window.addEventListener('resize', () => {
  for (const it of browserItems) if (it.buffer) drawMiniWave(it);
});
