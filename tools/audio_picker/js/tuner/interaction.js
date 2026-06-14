// ---- loop tuner interactions + wiring ----
function paneXToTime(wrap, clientX, view) {
  const rect = wrap.getBoundingClientRect();
  const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
  return view.start + (x / rect.width) * (view.end - view.start);
}

function pickPaneHandle(wrap, clientX, markerT, view) {
  const rect = wrap.getBoundingClientRect();
  const x = clientX - rect.left;
  const markerX = ((markerT - view.start) / (view.end - view.start)) * rect.width;
  return Math.abs(x - markerX) < 10;
}

function setupPane(wrap, pane) {
  wrap.addEventListener('mousedown', (e) => {
    if (!buffer) return;
    const view = pane === 'left' ? leftView : rightView;
    const markerT = pane === 'left' ? selEnd : selStart;
    const onHandle = pickPaneHandle(wrap, e.clientX, markerT, view);
    if (onHandle) {
      tunerDrag = { pane, mode: 'handle' };
    } else {
      tunerDrag = { pane, mode: 'pending', clientX: e.clientX, time: paneXToTime(wrap, e.clientX, view) };
    }
  });
  wrap.addEventListener('wheel', (e) => {
    if (!buffer) return;
    e.preventDefault();
    const view = pane === 'left' ? leftView : rightView;
    const rect = wrap.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const viewDur = view.end - view.start;
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      const delta = (e.shiftKey ? e.deltaY : e.deltaX) || e.deltaY;
      const pan = (delta / rect.width) * viewDur;
      let ns = view.start + pan, ne = view.end + pan;
      if (ns < 0) { ne -= ns; ns = 0; }
      if (ne > buffer.duration) { ns -= (ne - buffer.duration); ne = buffer.duration; }
      view.start = Math.max(0, ns);
      view.end = Math.min(buffer.duration, ne);
    } else {
      const tAtCursor = view.start + (x / rect.width) * viewDur;
      const zoom = Math.pow(1.2, -e.deltaY / 100);
      const minDur = Math.max(20 / buffer.sampleRate, 0.001);
      let newDur = Math.max(minDur, Math.min(buffer.duration, viewDur / zoom));
      const frac = x / rect.width;
      let ns = tAtCursor - frac * newDur;
      let ne = ns + newDur;
      if (ns < 0) { ns = 0; ne = newDur; }
      if (ne > buffer.duration) { ne = buffer.duration; ns = Math.max(0, ne - newDur); }
      view.start = ns;
      view.end = ne;
    }
    drawLoopTuner();
  }, { passive: false });
}

setupPane($('leftWrap'), 'left');
setupPane($('rightWrap'), 'right');

window.addEventListener('mousemove', (e) => {
  if (!tunerDrag || !buffer) return;
  const wrap = tunerDrag.pane === 'left' ? $('leftWrap') : $('rightWrap');
  const view = tunerDrag.pane === 'left' ? leftView : rightView;
  if (tunerDrag.mode === 'pending') {
    if (Math.abs(e.clientX - tunerDrag.clientX) < 4) return;
    tunerDrag.mode = 'handle-drag';
  }
  if (tunerDrag.mode === 'handle' || tunerDrag.mode === 'handle-drag') {
    let t = snap(paneXToTime(wrap, e.clientX, view));
    t = Math.max(0, Math.min(buffer.duration, t));
    if (tunerDrag.pane === 'left') {
      selEnd = Math.max(selStart + 0.001, t);
    } else {
      selStart = Math.min(selEnd - 0.001, t);
    }
    clampFades();
    syncInputsFromSel();
    updateLiveLoopPoints();
    drawAll();
  }
});

window.addEventListener('mouseup', () => {
  if (!tunerDrag) return;
  if (tunerDrag.mode === 'pending' && buffer) {
    const t = Math.max(selStart, Math.min(selEnd - 0.005, tunerDrag.time));
    play(selStart, selEnd, true, true, t);
  }
  tunerDrag = null;
});

$('tuneLoopBtn').addEventListener('click', () => {
  if (loopTunerEnabled) closeLoopTuner(); else openLoopTuner();
});
$('closeLoopTuner').addEventListener('click', closeLoopTuner);

$('xfadeLen').addEventListener('input', (e) => {
  const ms = parseFloat(e.target.value) || 0;
  crossfadeSec = ms / 1000;
  $('xfadeLenVal').textContent = ms > 0 ? Math.round(ms) + ' ms' : 'off';
  if (loopTunerEnabled) drawLoopTuner();
  if (currentSource && currentLooping) {
    clearTimeout(crossfadeRestartTimer);
    crossfadeRestartTimer = setTimeout(() => {
      if (currentSource && currentLooping) play(selStart, selEnd, true, true, selStart);
    }, 120);
  }
});

$('xfadeCurveSeg').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  [...e.currentTarget.children].forEach(c => c.classList.remove('active'));
  b.classList.add('active');
  crossfadeCurve = b.dataset.xc;
  if (currentSource && currentLooping && crossfadeSec > 0) {
    clearTimeout(crossfadeRestartTimer);
    crossfadeRestartTimer = setTimeout(() => {
      if (currentSource && currentLooping) play(selStart, selEnd, true, true, selStart);
    }, 120);
  }
});
