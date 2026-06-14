// ---- playback ----
function stopPlayback() {
  if (currentSource) {
    try { currentSource.stop(); } catch {}
    currentSource.disconnect();
    currentSource = null;
  }
  if (currentGain) { currentGain.disconnect(); currentGain = null; }
  currentGraph = null;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  currentLooping = false;
  playhead.style.display = 'none';
  const lph = document.getElementById('leftPlayhead');
  const rph = document.getElementById('rightPlayhead');
  if (lph) lph.style.display = 'none';
  if (rph) rph.style.display = 'none';
}

function buildCrossfadedLoopBuffer(src, selS, selE, xfSec, curve) {
  const sr = src.sampleRate;
  const A = Math.floor(selS * sr);
  const B = Math.floor(selE * sr);
  const L = B - A;
  if (L <= 0) return null;
  const requested = Math.max(0, Math.floor(xfSec * sr));
  const F = Math.max(0, Math.min(requested, A, Math.floor(L / 2)));
  const ch = src.numberOfChannels;
  const ac = ensureCtx();
  const out = ac.createBuffer(ch, L, sr);
  for (let c = 0; c < ch; c++) {
    const s = src.getChannelData(c);
    const d = out.getChannelData(c);
    for (let i = 0; i < L - F; i++) d[i] = s[A + i];
    for (let k = 0; k < F; k++) {
      const alpha = k / Math.max(1, F - 1);
      let fadeIn, fadeOut;
      if (curve === 'linear') {
        fadeIn = alpha; fadeOut = 1 - alpha;
      } else {
        fadeIn = Math.sin(alpha * Math.PI / 2);
        fadeOut = Math.cos(alpha * Math.PI / 2);
      }
      d[L - F + k] = s[B - F + k] * fadeOut + s[A - F + k] * fadeIn;
    }
  }
  return { buffer: out, xfSamples: F };
}

function applyLoopedEnvelope(gainNode, firstStart, iterDur, fi, fo, iterations) {
  const g = gainNode.gain;
  g.cancelScheduledValues(firstStart);
  const steps = 24;
  for (let k = 0; k < iterations; k++) {
    const start = firstStart + k * iterDur;
    if (fi > 0) {
      if (curve === 'exp') {
        g.setValueAtTime(0.0001, start);
        g.exponentialRampToValueAtTime(1, start + fi);
      } else {
        g.setValueAtTime(0, start);
        for (let i = 1; i <= steps; i++) {
          const x = i / steps;
          g.linearRampToValueAtTime(shape(x, curve), start + fi * x);
        }
      }
    } else {
      g.setValueAtTime(1, start);
    }
    const holdUntil = start + Math.max(0, iterDur - fo);
    g.setValueAtTime(1, holdUntil);
    if (fo > 0) {
      if (curve === 'exp') {
        g.exponentialRampToValueAtTime(0.0001, start + iterDur);
      } else {
        for (let i = 1; i <= steps; i++) {
          const x = i / steps;
          g.linearRampToValueAtTime(shape(1 - x, curve), holdUntil + fo * x);
        }
      }
    }
  }
}

function applyEnvelope(gainNode, startAt, selStartT, selEndT, fi, fo) {
  // Build envelope on the gain node's AudioParam, aligned to audio time
  const selDur = selEndT - selStartT;
  const ac = audioCtx;
  const g = gainNode.gain;
  g.cancelScheduledValues(startAt);
  if (fi > 0) {
    if (curve === 'exp') {
      g.setValueAtTime(0.0001, startAt);
      g.exponentialRampToValueAtTime(1, startAt + fi);
    } else {
      g.setValueAtTime(0, startAt);
      // sample envelope for shaped ramps
      const steps = 48;
      for (let i = 1; i <= steps; i++) {
        const x = i / steps;
        g.linearRampToValueAtTime(shape(x, curve), startAt + fi * x);
      }
    }
  } else {
    g.setValueAtTime(1, startAt);
  }
  const holdUntil = startAt + Math.max(0, selDur - fo);
  g.setValueAtTime(1, holdUntil);
  if (fo > 0) {
    if (curve === 'exp') {
      g.exponentialRampToValueAtTime(0.0001, startAt + selDur);
    } else {
      const steps = 48;
      for (let i = 1; i <= steps; i++) {
        const x = i / steps;
        g.linearRampToValueAtTime(shape(1 - x, curve), holdUntil + fo * x);
      }
    }
  }
}

function play(startT, endT, withFades, loop, initialOffset) {
  if (!buffer) return;
  stopPlayback();
  const ac = ensureCtx();

  let srcBuf = buffer;
  let srcStartT = startT;
  let srcEndT = endT;
  if (loop && crossfadeSec > 0) {
    const r = buildCrossfadedLoopBuffer(buffer, startT, endT, crossfadeSec, crossfadeCurve);
    if (r && r.buffer.duration > 0) {
      srcBuf = r.buffer;
      srcStartT = 0;
      srcEndT = r.buffer.duration;
    }
  }

  const src = ac.createBufferSource();
  src.buffer = srcBuf;
  const fadeGain = ac.createGain();
  const effectOut = ac.createGain();
  const masterGain = ac.createGain();
  masterGain.gain.value = effectsEnabled ? dbToGain(fx.outGainDb) : 1;
  src.connect(fadeGain);
  currentGraph = buildEffects(ac, fadeGain, effectOut);
  const channelNode = ac.createGain();
  channelNode.channelCount = channelMode === 'mono' ? 1 : 2;
  channelNode.channelCountMode = 'explicit';
  channelNode.channelInterpretation = 'speakers';
  effectOut.connect(masterGain).connect(channelNode).connect(ac.destination);
  const now = ac.currentTime + 0.02;
  const dur = endT - startT;
  const offsetOrig = (typeof initialOffset === 'number' && initialOffset >= startT && initialOffset < endT)
    ? initialOffset : startT;
  const offsetSrc = offsetOrig - startT + srcStartT;
  const firstIterRemain = srcEndT - offsetSrc;

  if (loop) {
    src.loop = true;
    src.loopStart = srcStartT;
    src.loopEnd = srcEndT;
  }

  if (withFades) {
    const fi = Math.min(fadeInDur, dur);
    const fo = Math.min(fadeOutDur, dur - fi);
    if (loop) {
      const iterations = Math.min(1000, Math.max(20, Math.ceil(600 / Math.max(0.05, dur))));
      if (offsetOrig === startT) {
        applyLoopedEnvelope(fadeGain, now, dur, fi, fo, iterations);
      } else {
        fadeGain.gain.setValueAtTime(1, now);
        applyLoopedEnvelope(fadeGain, now + firstIterRemain, dur, fi, fo, iterations);
      }
    } else {
      const shotDur = endT - offsetOrig;
      const fi2 = Math.min(fadeInDur, shotDur);
      const fo2 = Math.min(fadeOutDur, shotDur - fi2);
      applyEnvelope(fadeGain, now, offsetOrig, endT, fi2, fo2);
    }
  } else {
    fadeGain.gain.setValueAtTime(1, now);
  }
  if (loop) src.start(now, offsetSrc);
  else src.start(now, offsetSrc, srcEndT - offsetSrc);
  currentSource = src;
  currentGain = masterGain;
  currentLooping = !!loop;
  playStartAudioTime = now;
  playStartOffset = offsetOrig;
  playEndOffset = endT;
  playFirstIterRemain = firstIterRemain;
  playSrcStartT = srcStartT;
  playSrcEndT = srcEndT;
  playOrigStartT = startT;
  playOffsetSrc = offsetSrc;
  const tail = effectTailSec();
  const totalEnd = loop ? Infinity : (now + (endT - offsetOrig) + tail);
  playhead.style.display = 'block';
  const tick = () => {
    if (!currentSource) return;
    const elapsed = Math.max(0, ac.currentTime - playStartAudioTime);
    let t;
    if (loop) {
      let bufPos;
      if (elapsed < playFirstIterRemain) {
        bufPos = playOffsetSrc + elapsed;
      } else {
        const iterDur = Math.max(0.001, currentSource.loopEnd - currentSource.loopStart);
        bufPos = currentSource.loopStart + ((elapsed - playFirstIterRemain) % iterDur);
      }
      t = playOrigStartT + (bufPos - playSrcStartT);
    } else {
      t = playStartOffset + elapsed;
      if (ac.currentTime >= totalEnd) { stopPlayback(); return; }
    }
    if (!loop && t >= playEndOffset) {
      playhead.style.display = 'none';
    } else {
      const w = waveWrap.clientWidth;
      const viewDur = viewEnd - viewStart;
      if (t < viewStart || t > viewEnd) {
        playhead.style.display = 'none';
      } else {
        playhead.style.display = 'block';
        playhead.style.left = ((t - viewStart) / viewDur) * w + 'px';
      }
    }
    if (loopTunerEnabled) updateTunerPlayheads(t);
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
}

function updateTunerPlayheads(t) {
  const lph = $('leftPlayhead');
  const rph = $('rightPlayhead');
  const lw = $('leftWrap').clientWidth;
  const rw = $('rightWrap').clientWidth;
  if (t >= leftView.start && t <= leftView.end && lw > 0) {
    lph.style.display = 'block';
    lph.style.left = ((t - leftView.start) / (leftView.end - leftView.start)) * lw + 'px';
  } else lph.style.display = 'none';
  if (t >= rightView.start && t <= rightView.end && rw > 0) {
    rph.style.display = 'block';
    rph.style.left = ((t - rightView.start) / (rightView.end - rightView.start)) * rw + 'px';
  } else rph.style.display = 'none';
}

function seekPlay(t) {
  if (!buffer) return;
  t = Math.max(0, Math.min(buffer.duration, t));
  if (t >= selStart && t < selEnd) {
    play(selStart, selEnd, true, true, t);
  } else {
    play(t, buffer.duration, false, false);
  }
}

function updateLiveLoopPoints() {
  if (!currentSource || !currentLooping) return;
  if (crossfadeSec > 0) {
    clearTimeout(crossfadeRestartTimer);
    crossfadeRestartTimer = setTimeout(() => {
      if (currentSource && currentLooping) {
        play(selStart, selEnd, true, true, selStart);
      }
    }, 120);
    return;
  }
  try {
    currentSource.loopStart = selStart;
    currentSource.loopEnd = selEnd;
  } catch {}
}

$('playSel').addEventListener('click', () => play(selStart, selEnd, true, true));
$('playFull').addEventListener('click', () => play(0, buffer.duration, false, false));
$('stop').addEventListener('click', stopPlayback);

// Space toggles selection playback
window.addEventListener('keydown', (e) => {
  if (!buffer) return;
  if (e.code === 'Space' && !['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) {
    e.preventDefault();
    if (currentSource) stopPlayback(); else play(selStart, selEnd, true, true);
  }
});
