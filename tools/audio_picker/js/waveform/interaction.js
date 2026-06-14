// ---- selection interaction ----
let dragging = null; // 'start' | 'end' | 'new' | 'pending' | null
let pendingClick = null;
let dragAnchor = 0;
const DRAG_THRESHOLD = 4;

function xToTime(clientX) {
  const rect = waveWrap.getBoundingClientRect();
  const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
  return viewStart + (x / rect.width) * (viewEnd - viewStart);
}

function pickHandle(clientX) {
  const rect = waveWrap.getBoundingClientRect();
  const x = clientX - rect.left;
  const viewDur = viewEnd - viewStart;
  const sPx = ((selStart - viewStart) / viewDur) * rect.width;
  const ePx = ((selEnd - viewStart) / viewDur) * rect.width;
  const ds = Math.abs(x - sPx), de = Math.abs(x - ePx);
  if (Math.min(ds, de) < 10) return ds < de ? 'start' : 'end';
  return null;
}

waveWrap.addEventListener('wheel', (e) => {
  if (!buffer) return;
  e.preventDefault();
  const rect = waveWrap.getBoundingClientRect();
  const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
  const viewDur = viewEnd - viewStart;
  if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
    // Pan
    const delta = (e.shiftKey ? e.deltaY : e.deltaX) || e.deltaY;
    const pan = (delta / rect.width) * viewDur;
    let ns = viewStart + pan, ne = viewEnd + pan;
    if (ns < 0) { ne -= ns; ns = 0; }
    if (ne > buffer.duration) { ns -= (ne - buffer.duration); ne = buffer.duration; }
    viewStart = Math.max(0, ns);
    viewEnd = Math.min(buffer.duration, ne);
  } else {
    // Zoom at cursor
    const tAtCursor = viewStart + (x / rect.width) * viewDur;
    const zoom = Math.pow(1.2, -e.deltaY / 100);
    const minDur = Math.max(20 / buffer.sampleRate, 0.001); // ~20 samples minimum
    let newDur = Math.max(minDur, Math.min(buffer.duration, viewDur / zoom));
    const frac = x / rect.width;
    let ns = tAtCursor - frac * newDur;
    let ne = ns + newDur;
    if (ns < 0) { ns = 0; ne = newDur; }
    if (ne > buffer.duration) { ne = buffer.duration; ns = Math.max(0, ne - newDur); }
    viewStart = ns;
    viewEnd = ne;
  }
  drawAll();
}, { passive: false });

waveWrap.addEventListener('mousedown', (e) => {
  if (!buffer) return;
  const h = pickHandle(e.clientX);
  if (h) {
    dragging = h;
    onMove(e);
  } else {
    dragging = 'pending';
    pendingClick = { clientX: e.clientX, time: xToTime(e.clientX) };
  }
});

window.addEventListener('mousemove', (e) => {
  if (!dragging || !buffer) return;
  if (dragging === 'pending') {
    if (Math.abs(e.clientX - pendingClick.clientX) < DRAG_THRESHOLD) return;
    dragging = 'new';
    dragAnchor = pendingClick.time;
    selStart = dragAnchor;
    selEnd = Math.min(buffer.duration, dragAnchor + 0.001);
  }
  onMove(e);
});

window.addEventListener('mouseup', () => {
  if (dragging === 'pending' && pendingClick && buffer) {
    seekPlay(pendingClick.time);
  }
  dragging = null;
  pendingClick = null;
});

function onMove(e) {
  if (!dragging || dragging === 'pending' || !buffer) return;
  const t = snap(xToTime(e.clientX));
  if (dragging === 'start') {
    selStart = Math.min(t, selEnd - 0.001);
  } else if (dragging === 'end') {
    selEnd = Math.max(t, selStart + 0.001);
  } else if (dragging === 'new') {
    const a = snap(dragAnchor);
    if (t < a) {
      selStart = t;
      selEnd = a;
    } else {
      selStart = a;
      selEnd = Math.max(t, a + 0.001);
    }
  }
  selStart = Math.max(0, selStart);
  selEnd = Math.min(buffer.duration, selEnd);
  clampFades();
  syncInputsFromSel();
  updateLiveLoopPoints();
  drawAll();
}
