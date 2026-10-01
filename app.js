const $ = s => document.querySelector(s);
const promptEl = $('#prompt'), language = $('#language'), code = $('#code'), editor = $('#editorWrap'), generateBtn = $('#generate');
const extensions = {'HTML / CSS / JS':'html',Python:'py',JavaScript:'js',TypeScript:'ts',React:'jsx',Java:'java','C++':'cpp',SQL:'sql'};
let busy = false, projectId = null, installEvent;
function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { notice('Storage is full or unavailable. Export your code as a backup.', true); return false; } }
let settings = read('codex.settings', {apiUrl:''});
let token = ''; try { token = sessionStorage.getItem('codex.token') || ''; } catch {}
let projects = read('codex.projects', []); if (!Array.isArray(projects)) projects = [];
function notice(message, error = false) { $('#notice').textContent = message; $('#notice').classList.toggle('error', error); }
function endpoint(path) { return (settings.apiUrl || '').replace(/\/$/, '') + path; }
function renderLines() { $('#lines').textContent = Array.from({length:Math.max(1, code.value.split('\n').length)}, (_,i) => i+1).join('\n'); $('#fileTab').textContent = `main.${extensions[language.value]}`; $('#langStatus').textContent = language.value; }
function showCode() { editor.classList.add('show'); renderLines(); }
function setHome() { if (busy) return; editor.classList.remove('show'); $('#preview').classList.remove('show'); projectId = null; promptEl.value = ''; code.value = ''; $('#mode').value = 'generate'; notice(''); promptEl.focus(); }
async function health() {
  try { const res = await fetch(endpoint('/api/health'), {signal:AbortSignal.timeout(10000), cache:'no-store'}); const data = await res.json(); if (!res.ok || data.service !== 'AI CodeX API') throw new Error(); $('#serviceStatus').textContent = data.aiConfigured ? '● AI configured' : '● AI setup required'; }
  catch { $('#serviceStatus').textContent = '● Backend unavailable'; }
}
async function generate() {
  if (busy) return;
  const idea = promptEl.value.trim(); if (!idea) { promptEl.focus(); return; }
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 75000);
  busy = true; generateBtn.disabled = true; generateBtn.textContent = 'Generating…'; notice('Working on your request…');
  const action = $('#mode').value; language.disabled = true; $('#mode').disabled = true;
  try {
    const res = await fetch(endpoint('/api/generate'), {method:'POST', signal:controller.signal, headers:{'Content-Type':'application/json', ...(token ? {'X-App-Token':token} : {})}, body:JSON.stringify({prompt:idea, language:language.value, currentCode:code.value, mode:action})});
    const data = await res.json().catch(() => { throw new Error('The backend did not return JSON. Check the Backend URL in Settings.'); });
    if (!res.ok) throw new Error(data.error || 'Generation failed.');
    if (action === 'explain') { if (!data.explanation) throw new Error('AI returned no explanation.'); $('#explanation').textContent = data.explanation; $('#explanationDialog').showModal(); }
    else { const generated = String(data.code || '').replace(/^\s*```[\w+#./_-]*\s*/, '').replace(/\s*```\s*$/, '').trim(); if (!generated) throw new Error('AI returned no code.'); code.value = generated; showCode(); saveProject(false); if (language.value === 'HTML / CSS / JS') preview(); }
    if (action === 'explain') notice('Explanation ready. Your code is unchanged.'); else if (!$('#notice').classList.contains('error')) notice('Done. Your code is saved on this device.');
  } catch (error) { notice(error.name === 'AbortError' ? 'Request timed out. Try a smaller request.' : error instanceof TypeError ? 'Cannot connect to the backend. Check Settings and your connection.' : error.message, true); }
  finally { clearTimeout(timer); busy = false; language.disabled = false; $('#mode').disabled = false; generateBtn.disabled = false; generateBtn.innerHTML = 'Generate <span>↑</span>'; health(); }
}
function preview() { if (language.value !== 'HTML / CSS / JS') { editor.classList.remove('show'); notice('Live preview supports HTML / CSS / JS. Export other languages to run them in your development environment.'); return; } $('#preview').classList.add('show'); $('#frame').srcdoc = code.value; }
function saveProject(showMessage = true) {
  if (!code.value.trim()) { notice('Write or import code first.', true); return; }
  const item = {id:projectId || crypto.randomUUID(), title:promptEl.value.trim().slice(0,60) || `Untitled ${language.value}`, prompt:promptEl.value, language:language.value, code:code.value, updated:Date.now()};
  const next = [item, ...projects.filter(p => p.id !== item.id)];
  if (write('codex.projects', next)) { projects = next; projectId = item.id; renderProjects(); if (showMessage) notice('Project saved on this device.'); }
}
function openProject(item) { if (busy) return; projectId = item.id; promptEl.value = item.prompt || ''; language.value = extensions[item.language] ? item.language : 'HTML / CSS / JS'; code.value = item.code; $('#preview').classList.remove('show'); showCode(); $('#projectsDialog').close(); }
function renderProjects() {
  for (const target of ['#projectList','#allProjects']) { const list = $(target); list.replaceChildren(); if (!projects.length) { const p = document.createElement('p'); p.textContent = 'No saved projects yet.'; list.append(p); }
    for (const item of projects.slice(0, target === '#projectList' ? 8 : projects.length)) { const row = document.createElement('div'); row.className = 'project-row'; const b = document.createElement('button'); b.textContent = item.title; b.onclick = () => openProject(item); row.append(b); if (target === '#allProjects') { const del = document.createElement('button'); del.textContent = 'Delete'; del.onclick = () => { if (confirm(`Delete "${item.title}" from this device?`)) { const next = projects.filter(p=>p.id!==item.id); if (write('codex.projects', next)) { projects = next; if (projectId === item.id) projectId = null; renderProjects(); } } }; row.append(del); } list.append(row); }
  }
}
generateBtn.onclick = generate; $('#newChat').onclick = setHome;
$('#workspaceBtn').onclick = () => editor.classList.remove('show');
$('#backBtn').onclick = () => { editor.classList.remove('show'); promptEl.focus(); };
$('#saveBtn').onclick = () => { saveProject(); editor.classList.remove('show'); };
$('#previewBtn').onclick = preview; $('#closePreview').onclick = () => $('#preview').classList.remove('show');
code.addEventListener('input', () => { renderLines(); if ($('#preview').classList.contains('show')) $('#frame').srcdoc = code.value; });
code.addEventListener('scroll', () => $('#lines').scrollTop = code.scrollTop);
$('#copyBtn').onclick = async () => { try { await navigator.clipboard.writeText(code.value); $('#copyBtn').textContent = 'Copied!'; setTimeout(() => $('#copyBtn').textContent = 'Copy', 1200); } catch { editor.classList.remove('show'); notice('Clipboard unavailable. Select code in the editor and copy it manually.', true); } };
$('#downloadBtn').onclick = () => { const url = URL.createObjectURL(new Blob([code.value], {type:'text/plain;charset=utf-8'})); const a = document.createElement('a'); a.href = url; a.download = `main.${extensions[language.value]}`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); };
$('.suggestions').querySelectorAll('button').forEach((b,i) => b.onclick = () => { $('#mode').value = i===2 ? 'explain' : i===3 ? 'improve' : 'generate'; if (i===1) language.value = 'Python'; if (i===0) language.value = 'HTML / CSS / JS'; promptEl.value = b.dataset.prompt; promptEl.focus(); });
$('#themeBtn').onclick = () => { document.body.classList.toggle('light'); write('codex.light', document.body.classList.contains('light')); };
document.body.classList.toggle('light', read('codex.light', false));
for (const id of ['#projectsBtn','#mobileProjects']) $(id).onclick = () => { renderProjects(); $('#projectsDialog').showModal(); };
$('#closeProjects').onclick = () => $('#projectsDialog').close();
for (const id of ['#settingsBtn','#mobileSettings']) $(id).onclick = () => { $('#apiUrl').value = settings.apiUrl || ''; $('#accessToken').value = token; $('#settingsDialog').showModal(); };
$('#closeSettings').onclick = () => $('#settingsDialog').close();
$('#saveSettings').onclick = () => { const raw = $('#apiUrl').value.trim(); if (raw) { try { const u = new URL(raw); if (!['http:','https:'].includes(u.protocol) || u.username || u.password || u.search || u.hash) throw new Error(); if (location.protocol === 'https:' && u.protocol !== 'https:') throw new Error(); } catch { $('#apiUrl').setCustomValidity('Enter a valid HTTPS backend URL.'); $('#apiUrl').reportValidity(); return; } } $('#apiUrl').setCustomValidity(''); settings = {apiUrl:raw.replace(/\/$/,'')}; write('codex.settings',settings); token = $('#accessToken').value.trim(); try { sessionStorage.setItem('codex.token',token); } catch {} $('#settingsDialog').close(); health(); };
$('#apiUrl').oninput = () => $('#apiUrl').setCustomValidity('');
$('#closeExplanation').onclick = () => $('#explanationDialog').close();
$('#attach').onclick = () => $('#fileInput').click();
$('#fileInput').onchange = async e => { const file = e.target.files[0]; if (!file) return; if (file.size > 60000) { notice('Import a file smaller than 60 KB.', true); e.target.value = ''; return; } try { code.value = await file.text(); const ext = file.name.split('.').pop(); language.value = Object.keys(extensions).find(k=>extensions[k]===ext) || 'HTML / CSS / JS'; projectId = null; promptEl.value = `Improve ${file.name}`; $('#preview').classList.remove('show'); showCode(); } catch { notice('Could not read the file.',true); } e.target.value = ''; };
promptEl.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') generate(); });
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvent = e; $('#installBtn').hidden = false; });
$('#installBtn').onclick = async () => { if (!installEvent) return; await installEvent.prompt(); installEvent = null; $('#installBtn').hidden = true; };
window.addEventListener('appinstalled', () => $('#installBtn').hidden = true);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
renderLines(); renderProjects(); health();

window.openSampleProject = html => { if (busy) return false; language.value = 'HTML / CSS / JS'; promptEl.value = 'Sample project: creative studio landing page'; projectId = null; code.value = html; showCode(); preview(); notice('Opened a handcrafted sample, not AI-generated output. No credits used.'); return true; };
