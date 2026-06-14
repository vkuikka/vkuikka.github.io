// ---- file loading ----
function isAudio(file) {
  return (file.type && file.type.startsWith('audio/')) ||
    /\.(mp3|wav|ogg|flac|m4a|aac|aif|aiff|opus|webm)$/i.test(file.name);
}

async function readAllEntries(reader) {
  const out = [];
  while (true) {
    const batch = await new Promise((res, rej) => reader.readEntries(res, rej));
    if (!batch.length) break;
    out.push(...batch);
  }
  return out;
}

async function walkEntry(entry, files) {
  if (entry.isFile) {
    const f = await new Promise((res, rej) => entry.file(res, rej));
    if (isAudio(f)) files.push(f);
  } else if (entry.isDirectory) {
    const reader = entry.createReader();
    const entries = await readAllEntries(reader);
    for (const e of entries) await walkEntry(e, files);
  }
}

async function extractFiles(dataTransfer) {
  let files = [];
  let hadFolder = false;
  const items = dataTransfer.items;
  if (items && items.length && items[0].webkitGetAsEntry) {
    const entries = [];
    for (const it of items) {
      if (it.kind !== 'file') continue;
      const en = it.webkitGetAsEntry && it.webkitGetAsEntry();
      if (en) entries.push(en);
    }
    for (const e of entries) {
      if (e.isDirectory) hadFolder = true;
      await walkEntry(e, files);
    }
  }
  if (files.length === 0) files = [...dataTransfer.files].filter(isAudio);
  return { files, hadFolder };
}

async function handleIncomingFiles(files, opts = {}) {
  const audio = files.filter(isAudio);
  if (audio.length === 0) { showToast('No audio files found'); return; }
  if (audio.length === 1 && !opts.forceBrowser) {
    await loadFile(audio[0]);
    return;
  }
  await loadFile(audio[0]);
  await addToBrowser(audio);
}

async function loadFile(file) {
  try {
    fname.textContent = file.name;
    meta.textContent = 'Decoding…';
    const ab = await file.arrayBuffer();
    const detectedRate = detectSourceSampleRate(ab, file.name);
    stopPlayback();
    const ac = ensureCtx(detectedRate || 96000);
    const buf = await ac.decodeAudioData(ab.slice(0));
    loadBuffer(buf, file.name);
  } catch (err) {
    console.error(err);
    meta.textContent = '';
    showToast('Could not decode audio: ' + (err.message || err));
  }
}

function loadBuffer(buf, displayName) {
  buffer = buf;
  fileName = displayName.replace(/\.[^.]+$/, '');
  fname.textContent = displayName;
  selStart = 0;
  selEnd = buffer.duration;
  viewStart = 0;
  viewEnd = buffer.duration;
  startInput.max = buffer.duration;
  endInput.max = buffer.duration;
  startInput.value = selStart.toFixed(2);
  endInput.value = selEnd.toFixed(2);
  fadeIn.max = Math.min(10, buffer.duration / 2);
  fadeOut.max = Math.min(10, buffer.duration / 2);
  fadeIn.value = 0; fadeOut.value = 0;
  fadeInDur = 0; fadeOutDur = 0;
  meta.textContent = `${buffer.numberOfChannels}ch · ${buffer.sampleRate} Hz · ${fmtTime(buffer.duration)}`;
  drop.classList.add('hidden');
  editor.classList.remove('hidden');
  resizeCanvas();
  drawAll();
  updateLabels();
}

drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('drag'); });
drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
drop.addEventListener('drop', async (e) => {
  e.preventDefault(); e.stopPropagation();
  drop.classList.remove('drag');
  const { files, hadFolder } = await extractFiles(e.dataTransfer);
  if (files.length) await handleIncomingFiles(files, { forceBrowser: hadFolder });
});

fileInput.addEventListener('change', async (e) => {
  const files = [...e.target.files];
  if (files.length) await handleIncomingFiles(files);
});

$('reset').addEventListener('click', () => {
  stopPlayback();
  editor.classList.add('hidden');
  drop.classList.remove('hidden');
  fileInput.value = '';
  buffer = null;
});
