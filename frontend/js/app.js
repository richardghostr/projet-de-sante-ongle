const apiBase = 'http://localhost:8000/api';

function el(id){return document.getElementById(id)}

function navigate(){
  const hash = location.hash || '#/';
  const page = hash.replace('#','').split('/')[1] || '';
  if (hash.startsWith('#/analyze')) renderAnalyze();
  else if (hash.startsWith('#/history')) renderHistory();
  else renderLanding();
}

window.addEventListener('hashchange', navigate);
window.addEventListener('load', navigate);

function renderLanding(){
  const page = el('page');
  page.innerHTML = `
    <div class="card">
      <h2>Analyse rapide de l'ongle</h2>
      <p class="muted">Ce service est une aide informative, pas un diagnostic médical.</p>
      <p><a class="btn" href="#/analyze">Commencer une analyse</a></p>
    </div>
  `;
}

function renderAnalyze(){
  const page = el('page');
  page.innerHTML = `
    <div class="card">
      <h2>Importer une image</h2>
      <input type="file" id="imageInput" accept="image/*" />
      <div id="preview"></div>
      <p><button id="uploadBtn" class="btn">Uploader & Analyser</button></p>
      <div id="result"></div>
    </div>
  `;

  const input = document.getElementById('imageInput');
  const preview = document.getElementById('preview');
  input.addEventListener('change', ()=>{
    const f = input.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    preview.innerHTML = `<img src="${url}" style="max-width:240px;border-radius:8px;">`;
  });

  document.getElementById('uploadBtn').addEventListener('click', async ()=>{
    const f = input.files[0];
    if (!f) { alert('Choisir une image'); return; }
    const fd = new FormData(); fd.append('image', f);
    const res = await fetch(apiBase + '/upload-image', { method:'POST', body: fd });
    const data = await res.json();
    if (!res.ok) { alert(data.error || 'Erreur'); return; }
    const analysis_id = data.analysis_id;
    // call analyze
    const r2 = await fetch(apiBase + '/analyze-image', { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({analysis_id}) });
    const out = await r2.json();
    if (!r2.ok) { alert(out.error || 'Analyse failed'); return; }
    document.getElementById('result').innerHTML = `<pre>${JSON.stringify(out,null,2)}</pre>`;
  });
}

async function renderHistory(){
  const page = el('page');
  page.innerHTML = `<div class="card"><h2>Historique</h2><div id="list"></div></div>`;
  const list = document.getElementById('list');
  const res = await fetch(apiBase + '/history');
  const data = await res.json();
  if (!res.ok) { list.innerText = 'Erreur'; return; }
  const rows = data.data || [];
  if (rows.length === 0) { list.innerHTML = '<p class="muted">Aucune analyse</p>'; return; }
  list.innerHTML = rows.map(r => `
    <div style="margin-bottom:12px">
      <strong>#${r.id}</strong> - ${r.date_analyse}<br/>
      <img src="${r.image_path}" style="max-width:120px;border-radius:8px"/>
    </div>
  `).join('');
}
