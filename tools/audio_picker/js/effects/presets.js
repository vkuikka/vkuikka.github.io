// ---- custom presets (localStorage) ----
function loadCustom() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_KEY)) || []; }
  catch { return []; }
}

function saveCustom(list) {
  try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(list)); } catch {}
}

function seedCustomIfEmpty() {
  if (loadCustom().length > 0) return;
  saveCustom([{
    name: 'My cave 1',
    fx: { reverbMix: 0.41, reverbDecay: 4.5, reverbPredelay: 0, echoMix: 0.17, echoTime: 0.543, echoFeedback: 0.13, tone: 8000, outGainDb: 0 }
  }]);
}

function renderCustomPresets() {
  const container = $('presets');
  [...container.querySelectorAll('[data-custom]')].forEach(b => b.remove());
  const saveBtn = $('savePreset');
  for (const item of loadCustom()) {
    const btn = document.createElement('button');
    btn.className = 'custom-preset';
    btn.dataset.custom = item.name;
    btn.innerHTML = `<span>${escapeHtml(item.name)}</span><span class="x" title="Delete preset">×</span>`;
    container.insertBefore(btn, saveBtn);
  }
}

function savePromptDialog() {
  const suggestion = 'My preset ' + (loadCustom().length + 1);
  const name = prompt('Preset name:', suggestion);
  if (!name || !name.trim()) return;
  const clean = name.trim();
  const snapshot = {};
  for (const k of FX_KEYS) snapshot[k] = fx[k];
  const list = loadCustom();
  const idx = list.findIndex(p => p.name === clean);
  if (idx >= 0) {
    if (!confirm(`Overwrite existing preset "${clean}"?`)) return;
    list[idx] = { name: clean, fx: snapshot };
  } else {
    list.push({ name: clean, fx: snapshot });
  }
  saveCustom(list);
  renderCustomPresets();
  document.querySelectorAll('#presets button').forEach(x => x.classList.remove('active'));
  const btn = document.querySelector(`#presets [data-custom="${CSS.escape(clean)}"]`);
  if (btn) btn.classList.add('active');
  showToast(`Saved "${clean}"`);
}

$('presets').addEventListener('click', (e) => {
  const xBtn = e.target.closest('.x');
  if (xBtn) {
    const btn = xBtn.closest('button');
    const name = btn.dataset.custom;
    if (confirm(`Delete preset "${name}"?`)) {
      saveCustom(loadCustom().filter(p => p.name !== name));
      renderCustomPresets();
    }
    return;
  }
  const b = e.target.closest('button');
  if (!b) return;
  if (b.id === 'savePreset') { savePromptDialog(); return; }
  document.querySelectorAll('#presets button').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  if (b.dataset.preset) {
    Object.assign(fx, PRESETS[b.dataset.preset]);
  } else if (b.dataset.custom) {
    const item = loadCustom().find(p => p.name === b.dataset.custom);
    if (item) Object.assign(fx, item.fx);
  }
  writeUIFromFx();
  updateLiveFx();
});

$('fxToggle').addEventListener('click', () => {
  effectsEnabled = !effectsEnabled;
  $('fxToggle').classList.toggle('active', effectsEnabled);
  $('fxToggle').textContent = effectsEnabled ? 'on' : 'off';
  $('effectControls').classList.toggle('fx-off', !effectsEnabled);
  if (currentSource && currentLooping) {
    clearTimeout(crossfadeRestartTimer);
    crossfadeRestartTimer = setTimeout(() => {
      if (currentSource && currentLooping) play(selStart, selEnd, true, true, selStart);
    }, 120);
  }
});
