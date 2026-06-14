// ---- effects ----
function makeImpulse(ctx, decaySec, predelaySec) {
  const sr = ctx.sampleRate;
  const predSamples = Math.max(0, Math.floor(predelaySec * sr));
  const decaySamples = Math.max(1, Math.floor(decaySec * sr));
  const len = predSamples + decaySamples;
  const buf = ctx.createBuffer(2, len, sr);
  const tau = Math.max(0.05, decaySec) / 6.91;
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) {
      if (i < predSamples) { d[i] = 0; continue; }
      const t = (i - predSamples) / sr;
      d[i] = (Math.random() * 2 - 1) * Math.exp(-t / tau);
    }
  }
  return buf;
}

function buildEffects(ctx, inNode, outNode) {
  if (!effectsEnabled) {
    inNode.connect(outNode);
    return null;
  }

  const graph = {};
  let signal = inNode;

  // Always-present filters (frequency nudged out of band when "off")
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = fx.highpass >= 20 ? fx.highpass : 10;
  hp.Q.value = 0.7;
  signal.connect(hp);
  signal = hp;
  graph.hp = hp;

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = Math.min(22000, fx.tone);
  lp.Q.value = 0.7;
  signal.connect(lp);
  signal = lp;
  graph.lp = lp;

  const dry = ctx.createGain();
  dry.gain.value = 1;
  signal.connect(dry).connect(outNode);

  // Echo — always present, gated by echoWet
  const delay = ctx.createDelay(2.5);
  delay.delayTime.value = Math.min(2.5, fx.echoTime);
  const fb = ctx.createGain();
  fb.gain.value = Math.min(0.85, fx.echoFeedback);
  const fbFilter = ctx.createBiquadFilter();
  fbFilter.type = 'lowpass';
  fbFilter.frequency.value = Math.max(800, fx.tone * 0.7);
  const echoWet = ctx.createGain();
  echoWet.gain.value = fx.echoMix;
  signal.connect(delay);
  delay.connect(fbFilter);
  fbFilter.connect(fb);
  fb.connect(delay);
  delay.connect(echoWet);
  echoWet.connect(outNode);
  graph.echoDelay = delay;
  graph.echoFb = fb;
  graph.echoFbFilter = fbFilter;
  graph.echoWet = echoWet;

  // Reverb — always present, gated by revWet
  const conv = ctx.createConvolver();
  conv.buffer = makeImpulse(ctx, Math.max(0.05, fx.reverbDecay), fx.reverbPredelay);
  const revWet = ctx.createGain();
  revWet.gain.value = fx.reverbMix;
  signal.connect(conv);
  conv.connect(revWet);
  revWet.connect(outNode);
  graph.conv = conv;
  graph.revWet = revWet;
  graph._decay = fx.reverbDecay;
  graph._predelay = fx.reverbPredelay;

  return graph;
}

function updateLiveFx() {
  if (!currentGraph || !audioCtx) return;
  const ac = audioCtx;
  const now = ac.currentTime;
  const ramp = 0.02;
  const g = currentGraph;
  const set = (p, v) => {
    try { p.cancelScheduledValues(now); p.linearRampToValueAtTime(v, now + ramp); }
    catch { try { p.setValueAtTime(v, now); } catch {} }
  };
  set(g.hp.frequency, fx.highpass >= 20 ? fx.highpass : 10);
  set(g.lp.frequency, Math.min(22000, fx.tone));
  set(g.echoDelay.delayTime, Math.min(2.5, fx.echoTime));
  set(g.echoFb.gain, Math.min(0.85, fx.echoFeedback));
  set(g.echoFbFilter.frequency, Math.max(800, fx.tone * 0.7));
  set(g.echoWet.gain, fx.echoMix);
  set(g.revWet.gain, fx.reverbMix);
  if (currentGain) set(currentGain.gain, effectsEnabled ? dbToGain(fx.outGainDb) : 1);
  if (g._decay !== fx.reverbDecay || g._predelay !== fx.reverbPredelay) {
    g.conv.buffer = makeImpulse(ac, Math.max(0.05, fx.reverbDecay), fx.reverbPredelay);
    g._decay = fx.reverbDecay;
    g._predelay = fx.reverbPredelay;
  }
}

function effectTailSec() {
  if (!effectsEnabled) return 0;
  let t = 0;
  if (fx.reverbMix > 0.001) t = Math.max(t, fx.reverbDecay + fx.reverbPredelay);
  if (fx.echoMix > 0.001) {
    const f = Math.min(0.85, fx.echoFeedback);
    if (f > 0.01) {
      const repeats = 60 / (-20 * Math.log10(f));
      t = Math.max(t, fx.echoTime * Math.min(40, repeats));
    } else {
      t = Math.max(t, fx.echoTime);
    }
  }
  return Math.min(t, 10);
}
