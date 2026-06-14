// ---- numeric inputs ----
function syncInputsFromSel() {
  startInput.value = selStart.toFixed(2);
  endInput.value = selEnd.toFixed(2);
  updateLabels();
}

function clampFades() {
  const selDur = Math.max(0, selEnd - selStart);
  if (fadeInDur + fadeOutDur > selDur) {
    const scale = selDur / (fadeInDur + fadeOutDur || 1);
    fadeInDur *= scale; fadeOutDur *= scale;
    fadeIn.value = fadeInDur.toFixed(2);
    fadeOut.value = fadeOutDur.toFixed(2);
  }
}

function updateLabels() {
  startVal.textContent = fmtTime(selStart);
  endVal.textContent = fmtTime(selEnd);
  fadeInVal.textContent = fadeInDur.toFixed(2) + ' s';
  fadeOutVal.textContent = fadeOutDur.toFixed(2) + ' s';
}

startInput.addEventListener('input', () => {
  if (!buffer) return;
  const v = Math.max(0, Math.min(parseFloat(startInput.value) || 0, selEnd - 0.001));
  selStart = v;
  clampFades(); drawAll(); updateLabels();
  updateLiveLoopPoints();
});

endInput.addEventListener('input', () => {
  if (!buffer) return;
  const v = Math.max(selStart + 0.001, Math.min(parseFloat(endInput.value) || 0, buffer.duration));
  selEnd = v;
  clampFades(); drawAll(); updateLabels();
  updateLiveLoopPoints();
});

fadeIn.addEventListener('input', () => {
  fadeInDur = parseFloat(fadeIn.value) || 0;
  clampFades(); drawAll(); updateLabels();
});

fadeOut.addEventListener('input', () => {
  fadeOutDur = parseFloat(fadeOut.value) || 0;
  clampFades(); drawAll(); updateLabels();
});

// ---- segmented buttons ----
document.getElementById('curveSeg').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  [...e.currentTarget.children].forEach(c => c.classList.remove('active'));
  b.classList.add('active');
  curve = b.dataset.curve;
  drawAll();
});

document.getElementById('fmtSeg').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  [...e.currentTarget.children].forEach(c => c.classList.remove('active'));
  b.classList.add('active');
  format = b.dataset.fmt;
});

document.getElementById('channelSeg').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  [...e.currentTarget.children].forEach(c => c.classList.remove('active'));
  b.classList.add('active');
  channelMode = b.dataset.channel;
  if (currentSource && currentLooping) {
    clearTimeout(crossfadeRestartTimer);
    crossfadeRestartTimer = setTimeout(() => {
      if (currentSource && currentLooping) play(selStart, selEnd, true, true, selStart);
    }, 120);
  }
});
