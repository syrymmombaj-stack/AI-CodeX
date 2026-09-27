const $=s=>document.querySelector(s);
const promptEl=$('#prompt'),language=$('#language'),code=$('#code'),editor=$('#editorWrap'),lines=$('#lines'),generateBtn=$('#generate');

function renderLines(){
  const n=Math.max(1,code.value.split('\n').length);
  lines.innerHTML=Array.from({length:n},(_,i)=>i+1).join('<br>');
}

function setHome(){
  editor.classList.remove('show');
  $('#preview').classList.remove('show');
  promptEl.value='';
  code.value='';
  promptEl.focus();
}

function cleanGeneratedCode(text){
  return String(text||'')
    .replace(/^\s*```[a-zA-Z0-9+#./_-]*\s*/,'')
    .replace(/\s*```\s*$/,'')
    .trim();
}

async function generate(){
  const idea=promptEl.value.trim();
  if(!idea){promptEl.focus();return;}
  const original=generateBtn.innerHTML;
  generateBtn.disabled=true;
  generateBtn.textContent='Generating…';
  try{
    const res=await fetch('/api/generate',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        prompt:idea,
        language:language.value,
        currentCode:code.value
      })
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error||'Generation failed');
    const generated=cleanGeneratedCode(data.code||data.output||data.text||'');
    if(!generated) throw new Error('AI returned an empty response');
    code.value=generated;
    editor.classList.add('show');
    $('#langStatus').textContent=language.value;
    renderLines();
    if(language.value==='HTML / CSS / JS') preview();
  }catch(err){
    alert('AI CodeX: '+err.message);
  }finally{
    generateBtn.disabled=false;
    generateBtn.innerHTML=original;
  }
}

function preview(){
  if(language.value!=='HTML / CSS / JS'){
    alert('Live Preview is available for HTML / CSS / JS projects.');
    return;
  }
  $('#preview').classList.add('show');
  $('#frame').srcdoc=code.value;
}

generateBtn.onclick=generate;
$('#newChat').onclick=setHome;
$('#previewBtn').onclick=preview;
$('#closePreview').onclick=()=>$('#preview').classList.remove('show');
code.addEventListener('input',()=>{renderLines();if($('#preview').classList.contains('show')&&language.value==='HTML / CSS / JS')$('#frame').srcdoc=code.value;});
$('#copyBtn').onclick=async()=>{await navigator.clipboard.writeText(code.value);$('#copyBtn').textContent='Copied!';setTimeout(()=>$('#copyBtn').textContent='Copy',1200);};
document.querySelectorAll('.suggestions button').forEach(b=>b.onclick=()=>{promptEl.value=b.dataset.prompt;promptEl.focus();});
$('#themeBtn').onclick=()=>document.body.classList.toggle('light');
promptEl.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter')generate();});
renderLines();
