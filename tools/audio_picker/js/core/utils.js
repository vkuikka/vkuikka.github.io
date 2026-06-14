// ---- helpers ----
function showToast(msg, ms = 1800) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), ms);
}

function fmtTime(t, precision = 2) {
  if (!isFinite(t)) return '0:00.00';
  const sign = t < 0 ? '-' : '';
  t = Math.abs(t);
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  const width = 3 + (precision > 0 ? 1 + precision : 0);
  return `${sign}${m}:${s.toFixed(precision).padStart(width, '0')}`;
}

function ensureCtx(preferredRate) {
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (audioCtx && preferredRate && Math.abs(audioCtx.sampleRate - preferredRate) > 1) {
    try { audioCtx.close(); } catch {}
    audioCtx = null;
  }
  if (!audioCtx) {
    if (preferredRate) {
      try { audioCtx = new Ctor({ sampleRate: preferredRate }); }
      catch { audioCtx = new Ctor(); }
    } else {
      audioCtx = new Ctor();
    }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function getCss(v) {
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

const dbToGain = db => Math.pow(10, db / 20);

function shape(x, curve) {
  x = Math.max(0, Math.min(1, x));
  if (curve === 'linear') return x;
  if (curve === 'equal') return Math.sin(x * Math.PI / 2);
  if (curve === 'exp') return x * x;
  return x;
}

function envelopeGain(t, selDur, fi, fo, curve) {
  let g = 1;
  if (fi > 0 && t < fi) {
    g = Math.min(g, shape(t / fi, curve));
  }
  const tailStart = selDur - fo;
  if (fo > 0 && t > tailStart) {
    g = Math.min(g, shape((selDur - t) / fo, curve));
  }
  return Math.max(0, Math.min(1, g));
}

function snap(t) {
  if (!snapEnabled || !bpm || bpm <= 0) return t;
  const beatDur = (60 / bpm) / snapDivision;
  return Math.round((t - snapOffset) / beatDur) * beatDur + snapOffset;
}
