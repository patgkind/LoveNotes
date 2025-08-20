const board = document.getElementById('board');
const fabMain = document.getElementById('fabMain');
const fabOptions = document.getElementById('fabOptions');
const btnAdd = document.getElementById('btnAdd');
const btnImage = document.getElementById('btnImage');
const btnEdit = document.getElementById('btnEdit');
const btnDelete = document.getElementById('btnDelete');

let mode = 'normal';
let noteMap = {};
let zIndex = 1;
let selectedForEdit = null;

// simple local notes for demo
let noteIdCounter = 1;
let notes = [];

// FAB
fabMain.addEventListener('click', ()=> fabOptions.style.display = fabOptions.style.display==='flex'?'none':'flex');
document.addEventListener('click', e=>{ if(!fabMain.contains(e.target)&&!fabOptions.contains(e.target)) fabOptions.style.display='none'; });

// add note
btnAdd.addEventListener('click', ()=>{
  fabOptions.style.display='none';
  const n = {id:noteIdCounter++, text:'', color:'#fffa91', x:60, y:60, pinned:false};
  notes.push(n);
  renderNote(n,true);
});
btnImage.addEventListener('click', ()=>{
  fabOptions.style.display='none';
  const url = prompt('Image URL'); if(!url) return;
  const n = {id:noteIdCounter++, text:'', color:'#ffffff', x:80, y:80, pinned:false, image:url};
  notes.push(n);
  renderNote(n,true);
});
btnEdit.addEventListener('click', ()=>{
  fabOptions.style.display='none';
  if(mode==='edit'){ mode='normal'; board.classList.remove('edit-outline'); } 
  else { mode='edit'; board.classList.add('edit-outline'); board.classList.remove('delete-outline'); }
  finishEditingAll();
});
btnDelete.addEventListener('click', ()=>{
  fabOptions.style.display='none';
  if(mode==='delete'){ mode='normal'; board.classList.remove('delete-outline'); } 
  else { mode='delete'; board.classList.add('delete-outline'); board.classList.remove('edit-outline'); }
  updateDeleteBadges();
});

function finishEditingAll(){
  Object.values(noteMap).forEach(el=>{
    el.classList.remove('editing','adding');
    const ta = el.querySelector('textarea'); if(ta) ta.disabled=true;
  });
  selectedForEdit=null;
}

function updateDeleteBadges(){
  Object.values(noteMap).forEach(el=>{
    if(mode==='delete') el.classList.add('show-delete'); else el.classList.remove('show-delete');
  });
}

function renderNote(note, focus=false){
  let el = noteMap[note.id];
  if(!el){
    el = document.createElement('div'); el.className='note';
    el.style.zIndex=zIndex++;
    noteMap[note.id]=el;
    board.appendChild(el);
  }
  el.style.left = note.x+'px';
  el.style.top  = note.y+'px';
  el.style.background = note.color;

  el.innerHTML='';

  // delete
  const del = document.createElement('div');
  del.className='delete-badge'; del.innerText='❌';
  del.addEventListener('click',()=>{ if(mode!=='delete') return; el.remove(); delete noteMap[note.id]; notes = notes.filter(x=>x.id!==note.id); });
  el.appendChild(del);

  // pin
  const pin = document.createElement('div'); pin.className='pin-badge'; pin.innerText='📌';
  pin.addEventListener('click',()=>{ note.pinned=!note.pinned; pin.style.opacity=note.pinned?1:0.6; });
  pin.style.opacity=note.pinned?1:0.6; el.appendChild(pin);

  // image
  if(note.image){
    const img = document.createElement('img'); img.src=note.image;
    img.style.maxWidth='100%'; img.style.maxHeight='40%'; img.style.display='block';
    img.style.marginBottom='6px'; img.style.borderRadius='6px'; el.appendChild(img);
  }

  // textarea
  const ta = document.createElement('textarea'); ta.value=note.text; 
  ta.disabled = !(focus || mode==='edit');
  el.appendChild(ta);

  el.addEventListener('click',(ev)=>{
    ev.stopPropagation();
    if(mode==='edit'){
      finishEditingAll();
      el.classList.add('editing'); ta.disabled=false; ta.focus();
      selectedForEdit = note.id;
    }
  });

  ta.addEventListener('blur',()=>{
    ta.disabled=true;
    note.text = ta.value;
    el.classList.remove('editing','adding');
    selectedForEdit=null;
  });
  ta.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); ta.blur(); }});

  // drag
  attachDrag(el,note);
  updateDeleteBadges();
}

function attachDrag(el,note){
  let dragging=false, ox=0, oy=0;
  el.addEventListener('mousedown', ev=>{
    if(["TEXTAREA","INPUT","BUTTON","IMG"].includes(ev.target.tagName)) return;
    if(mode==='delete') return;
    dragging=true;
    const rect=el.getBoundingClientRect(); ox=ev.clientX-rect.left; oy=ev.clientY-rect.top;
    el.style.zIndex=++zIndex;
  });
  document.addEventListener('mousemove', ev=>{
    if(!dragging) return;
    const brect=board.getBoundingClientRect();
    let nx=ev.clientX-brect.left-ox, ny=ev.clientY-brect.top-oy;
    nx=Math.max(6,Math.min(nx,brect.width-el.offsetWidth-6));
    ny=Math.max(6,Math.min(ny,brect.height-el.offsetHeight-6));
    el.style.left=nx+'px'; el.style.top=ny+'px';
  });
  document.addEventListener('mouseup', ()=>{
    if(!dragging) return; dragging=false;
    note.x=parseInt(el.style.left,10); note.y=parseInt(el.style.top,10);
  });
}
