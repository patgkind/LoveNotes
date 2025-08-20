// ------------ config ------------
const API_URL = "https://script.google.com/macros/s/AKfycbyOgP36dXRLEoXmmg3KHUfPNuprLSVTo1k57aQYC8VkYfP4vdROq4X3lhFMvOHyQ1dgKw/exec";

// ------------ state ------------
const board = document.getElementById('board');
const fabMain = document.getElementById('fabMain');
const fabOptions = document.getElementById('fabOptions');
const btnAdd = document.getElementById('btnAdd');
const btnImage = document.getElementById('btnImage');
const btnEdit = document.getElementById('btnEdit');
const btnDelete = document.getElementById('btnDelete');

let mode = 'normal'; // normal, edit, delete
let noteMap = {};    // id -> element
let noteHashes = {}; // id -> hash
let zIndex = 1;
let selectedForEdit = null;

// ------------ helpers ------------
function textColor(hex) {
  if (!hex) return '#000';
  const c = hex.replace('#','');
  if (c.length !== 6) return '#000';
  const r = parseInt(c.substring(0,2),16);
  const g = parseInt(c.substring(2,4),16);
  const b = parseInt(c.substring(4,6),16);
  const lum = 0.299*r + 0.587*g + 0.114*b;
  return lum > 140 ? '#000' : '#fff';
}

function hashNote(n) {
  return `${n.text}|${n.color}|${n.x}|${n.y}|${n.pinned ? 1:0}|${n.image||''}`;
}

function taIsSelected(id) { return selectedForEdit === id; }

// ------------ FAB behavior ------------
fabMain.addEventListener('click', ()=> {
  fabOptions.style.display = fabOptions.style.display === 'flex' ? 'none' : 'flex';
});
document.addEventListener('click', e => {
  if (!fabMain.contains(e.target) && !fabOptions.contains(e.target)) fabOptions.style.display = 'none';
});

btnAdd.addEventListener('click', async ()=> {
  fabOptions.style.display = 'none';
  await addNoteBackend('', '#fffa91', 60, 60, false, '');
  await loadNotes();
});

btnImage.addEventListener('click', async ()=> {
  fabOptions.style.display = 'none';
  const url = prompt('Image URL');
  if (!url) return;
  await addNoteBackend('', '#ffffff', 80, 80, false, url);
  await loadNotes();
});

btnEdit.addEventListener('click', ()=> {
  fabOptions.style.display = 'none';
  if (mode === 'edit') {
    mode = 'normal';
    board.classList.remove('edit-outline');
  } else {
    mode = 'edit';
    board.classList.add('edit-outline');
    board.classList.remove('delete-outline');
  }
  Object.values(noteMap).forEach(el => {
    el.classList.remove('editing','adding');
    const ta = el.querySelector('textarea');
    if (ta) ta.disabled = true;
  });
  updateDeleteBadges();
});

btnDelete.addEventListener('click', ()=> {
  fabOptions.style.display = 'none';
  if (mode === 'delete') {
    mode = 'normal';
    board.classList.remove('delete-outline');
  } else {
    mode = 'delete';
    board.classList.add('delete-outline');
    board.classList.remove('edit-outline');
  }
  updateDeleteBadges();
});

function updateDeleteBadges() {
  Object.values(noteMap).forEach(el => {
    if (mode === 'delete') el.classList.add('show-delete');
    else el.classList.remove('show-delete');
  });
}

// ------------ backend wrappers ------------
async function addNoteBackend(text, color, x, y, pinned, image) {
  const url = `${API_URL}?action=addNote&text=${encodeURIComponent(text||'')}&color=${encodeURIComponent(color)}&x=${x}&y=${y}&pinned=${pinned?'true':'false'}&image=${encodeURIComponent(image||'')}`;
  const res = await fetch(url);
  return res.json();
}
async function editNoteBackend(params) {
  const qs = Object.keys(params).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
  const url = `${API_URL}?action=editNote&${qs}`;
  const res = await fetch(url);
  return res.json();
}
async function deleteNoteBackend(id) {
  const url = `${API_URL}?action=deleteNote&id=${encodeURIComponent(id)}`;
  const res = await fetch(url);
  return res.json();
}
async function getNotesBackend() {
  const url = `${API_URL}?action=getNotes`;
  const res = await fetch(url, { cache:'no-store' });
  return res.json();
}

// ------------ render logic ------------
function createOrUpdateNoteDom(note, focus=false, adding=false) {
  const h = hashNote(note);
  if (noteMap[note.id] && noteHashes[note.id] === h && !adding && !focus) return;

  let el = noteMap[note.id];
  if (!el) {
    el = document.createElement('div');
    el.className = 'note';
    el.style.zIndex = zIndex++;
    noteMap[note.id] = el;
    board.appendChild(el);
    attachDrag(el, note.id);
  }
  noteHashes[note.id] = h;

  el.style.left = (Number(note.x) || 60) + 'px';
  el.style.top  = (Number(note.y) || 60) + 'px';
  el.style.background = note.color || '#fffa91';
  el.style.color = textColor(note.color || '#000');
  el.innerHTML = '';

  // delete badge
  const del = document.createElement('div');
  del.className = 'delete-badge';
  del.innerText = '❌';
  del.title = 'Delete';
  del.addEventListener('click', async (ev) => {
    ev.stopPropagation();
    if (mode !== 'delete') return;
    await deleteNoteBackend(note.id);
    if (noteMap[note.id]) { noteMap[note.id].remove(); delete noteMap[note.id]; delete noteHashes[note.id]; }
    await loadNotes();
  });
  el.appendChild(del);

  // pin badge
  const pin = document.createElement('div');
  pin.className = 'pin-badge';
  pin.innerText = '📌';
  pin.title = note.pinned ? 'Unpin' : 'Pin';
  pin.style.opacity = note.pinned ? '1' : '0.6';
  pin.addEventListener('click', async (ev) => {
    ev.stopPropagation();
    const newPinned = !note.pinned;
    await editNoteBackend({ id: note.id, pinned: newPinned ? 'true' : 'false' });
    await loadNotes();
  });
  el.appendChild(pin);

  // color picker wrapper
  const colorBtn = document.createElement('div');
  colorBtn.className = 'color-btn';
  colorBtn.style.background = note.color || '#fff';
  colorBtn.title = 'Change color';
  colorBtn.style.position = 'absolute';
  colorBtn.style.left = '6px';
  colorBtn.style.bottom = '6px';
  colorBtn.style.width = '22px';
  colorBtn.style.height = '22px';
  colorBtn.style.borderRadius = '4px';
  colorBtn.style.overflow = 'hidden';
  colorBtn.style.border = '1px solid rgba(0,0,0,0.15)';

  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.value = note.color || '#fffa91';
  colorInput.style.width = '100%';
  colorInput.style.height = '100%';
  colorInput.style.opacity = 0;
  colorInput.style.cursor = 'pointer';
  colorBtn.appendChild(colorInput);
  el.appendChild(colorBtn);

  colorInput.addEventListener('input', async (ev) => {
    const v = ev.target.value;
    el.style.background = v;
    colorBtn.style.background = v;
    await editNoteBackend({ id: note.id, color: v });
    note.color = v;
    noteHashes[note.id] = hashNote(note);
  });

  // image
  if (note.image) {
    const img = document.createElement('img');
    img.src = note.image;
    img.alt = 'note image';
    img.style.maxWidth = '100%';
    img.style.maxHeight = '40%';
    img.style.display = 'block';
    img.style.marginBottom = '6px';
    img.style.borderRadius = '6px';
    img.style.zIndex = 1;
    el.appendChild(img);
  }

  // textarea
  const ta = document.createElement('textarea');
  ta.value = note.text || '';
  ta.disabled = !(adding || (mode === 'edit' && taIsSelected(note.id)));
  ta.style.color = textColor(note.color || '#000');
  el.appendChild(ta);

  el.addEventListener('click', (ev) => {
    ev.stopPropagation();
    if (mode === 'edit') {
      Object.values(noteMap).forEach(x => {
        x.classList.remove('editing');
        const xt = x.querySelector('textarea');
        if (xt) xt.disabled = true;
      });
      el.classList.add('editing');
      ta.disabled = false;
      ta.focus();
      selectedForEdit = note.id;
    }
  });

  if (adding || focus) {
    el.classList.add('adding');
    ta.disabled = false;
    ta.focus();
  } else {
    el.classList.remove('adding');
  }

  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); ta.blur(); }
  });
  ta.addEventListener('blur', async () => {
    if (ta.disabled) return;
    const newText = ta.value;
    ta.disabled = true;
    if (newText !== note.text) {
      await editNoteBackend({ id: note.id, text: newText });
      await loadNotes();
    }
    el.classList.remove('adding');
    el.classList.remove('editing');
    selectedForEdit = null;
  });

  if (mode === 'delete') el.classList.add('show-delete'); else el.classList.remove('show-delete');
}

// ------------ drag ------------
function attachDrag(el, id) {
  let dragging = false, ox = 0, oy = 0;
  el.addEventListener('mousedown', (ev) => {
    const tag = ev.target.tagName;
    if (["TEXTAREA","INPUT","BUTTON","IMG","svg"].includes(tag)) return;
    if (mode === 'delete') return;
    dragging = true;
    const rect = el.getBoundingClientRect();
    const brect = board.getBoundingClientRect();
    ox = ev.clientX - rect.left;
    oy = ev.clientY - rect.top;
    el.style.zIndex = ++zIndex;
    ev.preventDefault();
  });
  document.addEventListener('mousemove', (ev) => {
    if (!dragging) return;
    const brect = board.getBoundingClientRect();
    let nx = ev.clientX - brect.left - ox;
    let ny = ev.clientY - brect.top - oy;
    nx = Math.max(6, Math.min(nx, brect.width - el.offsetWidth - 6));
    ny = Math.max(6, Math.min(ny, brect.height - el.offsetHeight - 6));
    el.style.left = nx + 'px';
    el.style.top  = ny + 'px';
  });
  document.addEventListener('mouseup', async () => {
    if (!dragging) return;
    dragging = false;
    const nx = parseInt(el.style.left,10);
    const ny = parseInt(el.style.top,10);
    await editNoteBackend({ id, x: nx, y: ny });
    await loadNotes();
  });
}

// ------------ load / poll ------------
async function loadNotes() {
  try {
    const list = await getNotesBackend();
    const seen = new Set();
    for (const n of list) {
      seen.add(n.id);
      createOrUpdateNoteDom(n, false, false);
    }
    Object.keys(noteMap).forEach(id => {
      if (!seen.has(id)) {
        if (noteMap[id]) { noteMap[id].remove(); delete noteMap[id]; delete noteHashes[id]; }
      }
    });
  } catch (err) { console.error('loadNotes error', err); }
}

// ------------ start ------------
loadNotes();

// ------------ expose helpers ------------
window._ln = { loadNotes, createOrUpdateNoteDom, addNoteBackend, editNoteBackend, deleteNoteBackend };
