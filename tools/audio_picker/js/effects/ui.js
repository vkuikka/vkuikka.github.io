// ---- effect UI wiring ----
function refreshEffectLabels() {
  $('revMixVal').textContent    = Math.round(fx.reverbMix * 100) + '%';
  $('revDecayVal').textContent  = fx.reverbDecay.toFixed(1) + ' s';
  $('revPreVal').textContent    = Math.round(fx.reverbPredelay * 1000) + ' ms';
  $('echoMixVal').textContent   = Math.round(fx.echoMix * 100) + '%';
  $('echoTimeVal').textContent  = Math.round(fx.echoTime * 1000) + ' ms';
  $('echoFbVal').textContent    = Math.round(fx.echoFeedback * 100) + '%';
  $('toneVal').textContent      = fx.tone >= 20000 ? 'off' : (fx.tone / 1000).toFixed(1) + ' kHz';
  $('highpassVal').textContent  = fx.highpass < 20 ? 'off' : Math.round(fx.highpass) + ' Hz';
  $('gainVal').textContent      = fx.outGainDb.toFixed(1) + ' dB';
}

function syncFxFromUI() {
  fx.reverbMix     = parseFloat($('revMix').value);
  fx.reverbDecay   = parseFloat($('revDecay').value);
  fx.reverbPredelay = parseFloat($('revPre').value) / 1000;
  fx.echoMix       = parseFloat($('echoMix').value);
  fx.echoTime      = parseFloat($('echoTime').value) / 1000;
  fx.echoFeedback  = parseFloat($('echoFb').value);
  fx.tone          = parseFloat($('tone').value);
  fx.highpass      = parseFloat($('highpass').value);
  fx.outGainDb     = parseFloat($('outGain').value);
  refreshEffectLabels();
}

function writeUIFromFx() {
  $('revMix').value   = fx.reverbMix;
  $('revDecay').value = fx.reverbDecay;
  $('revPre').value   = Math.round(fx.reverbPredelay * 1000);
  $('echoMix').value  = fx.echoMix;
  $('echoTime').value = Math.round(fx.echoTime * 1000);
  $('echoFb').value   = fx.echoFeedback;
  $('tone').value     = fx.tone;
  $('highpass').value = fx.highpass;
  $('outGain').value  = fx.outGainDb;
  refreshEffectLabels();
}

for (const id of ['revMix','revDecay','revPre','echoMix','echoTime','echoFb','tone','highpass','outGain']) {
  $(id).addEventListener('input', () => {
    syncFxFromUI();
    updateLiveFx();
    const activeCustom = document.querySelector('#presets button.custom-preset.active');
    if (activeCustom) {
      const name = activeCustom.dataset.custom;
      const list = loadCustom();
      const idx = list.findIndex(p => p.name === name);
      if (idx >= 0) {
        const snapshot = {};
        for (const k of FX_KEYS) snapshot[k] = fx[k];
        list[idx] = { name, fx: snapshot };
        saveCustom(list);
      }
    } else {
      document.querySelectorAll('#presets button').forEach(b => b.classList.remove('active'));
    }
  });
}
