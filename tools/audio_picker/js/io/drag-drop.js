// ---- window-level drag-drop (accept drops anywhere) ----
const dragOverlay = $('dragOverlay');
let dragDepth = 0;

window.addEventListener('dragenter', (e) => {
  if (!e.dataTransfer || !e.dataTransfer.types || !e.dataTransfer.types.includes('Files')) return;
  if (drop.contains(e.target)) return;
  dragDepth++;
  dragOverlay.classList.add('show');
});

window.addEventListener('dragover', (e) => {
  if (!e.dataTransfer || !e.dataTransfer.types || !e.dataTransfer.types.includes('Files')) return;
  if (drop.contains(e.target)) return;
  e.preventDefault();
});

window.addEventListener('dragleave', (e) => {
  if (drop.contains(e.target)) return;
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) dragOverlay.classList.remove('show');
});

window.addEventListener('drop', async (e) => {
  if (drop.contains(e.target)) return;
  e.preventDefault();
  dragDepth = 0;
  dragOverlay.classList.remove('show');
  if (!e.dataTransfer) return;
  const { files, hadFolder } = await extractFiles(e.dataTransfer);
  if (files.length) await handleIncomingFiles(files, { forceBrowser: hadFolder });
});
