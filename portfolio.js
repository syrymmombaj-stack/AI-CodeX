(() => {
  const el = id => document.getElementById(id);
  const packs = {starter:{name:'Starter',price:5,credits:100},builder:{name:'Builder',price:15,credits:400},studio:{name:'Studio',price:35,credits:1000}};
  let users = read('codex.demoAccounts', {}); if (!users || Array.isArray(users) || typeof users !== 'object') users = {};
  let active = read('codex.demoActive', null), signingIn = false, selectedPack = null, completing = false, toastTimer;
  const user = () => active && Object.hasOwn(users, active) ? users[active] : null;
  function persist() { return write('codex.demoAccounts', users) && write('codex.demoActive', active); }
  function toast(message) { clearTimeout(toastTimer); el('toast').textContent = message; el('toast').hidden = false; toastTimer = setTimeout(()=>el('toast').hidden=true,4500); }
  function closeAll() { for (const id of ['authDialog','creditsDialog','checkoutDialog','accountDialog']) el(id).close(); }
  function open(id) { closeAll(); el(id).showModal(); }
  function update() {
    const u = user(), balance = u ? u.balance : 0;
    for (const id of ['sidebarCredits','headerCredits','pricingBalance']) el(id).textContent = balance.toLocaleString();
    el('profileName').textContent = u ? u.name : 'Guest workspace'; el('profileAvatar').textContent = u ? u.name.slice(0,1).toUpperCase() : 'G';
    el('profilePlan').textContent = u ? `${u.package || 'Welcome'} · Demo account` : 'Portfolio demo'; el('accountBtn').textContent = u ? 'My account' : 'Sign up';
    if (u) {
      el('accountName').textContent = `Hi, ${u.name}.`; el('accountEmail').textContent = u.email;
      el('accountBalance').textContent = `${balance.toLocaleString()} credits`; el('accountPackage').textContent = u.package || 'Welcome';
      el('creditActivity').replaceChildren();
      for (const entry of [...u.history].reverse().slice(0,10)) {
        const row = document.createElement('div'); row.className = 'activity-row';
        const detail = document.createElement('div'); const label = document.createElement('b'); label.textContent = entry.label; const date = document.createElement('small'); date.textContent = new Date(entry.date).toLocaleString(); detail.append(label,date);
        const amount = document.createElement('strong'); amount.textContent = `+${entry.credits} credits`; row.append(detail,amount); el('creditActivity').append(row);
      }
    }
  }
  function authView() { el('authTitle').textContent = signingIn ? 'Welcome back.' : 'Create your workspace.'; el('authSubtitle').textContent = signingIn ? 'Pick up where your ideas left off.' : 'Start with 25 free demo credits.'; el('nameLabel').hidden=signingIn; el('signupName').required=!signingIn; el('authSubmit').textContent=signingIn?'Sign in to demo →':'Create demo account →'; el('authSwitch').textContent=signingIn?'New here? Create a demo account':'Already have a demo account? Sign in'; el('authError').textContent=''; }
  function showCheckout() { const p=packs[selectedPack]; if(!p)return; el('checkoutPack').textContent=`${p.name} package`;el('checkoutPrice').textContent=`$${p.price} illustrative price`;el('checkoutCredits').textContent=p.credits.toLocaleString();el('checkoutError').textContent='';open('checkoutDialog'); }
  document.querySelectorAll('[data-open]').forEach(button=>button.onclick=()=>{const destination=button.dataset.open;if(destination==='credits'){update();open('creditsDialog');}else if(user()){update();open('accountDialog');}else{selectedPack=null;signingIn=false;authView();open('authDialog');}});
  document.querySelectorAll('[data-close]').forEach(button=>button.onclick=()=>el(button.dataset.close).close());
  document.querySelectorAll('[data-pack]').forEach(button=>button.onclick=()=>{selectedPack=button.dataset.pack;if(user())showCheckout();else{signingIn=false;authView();open('authDialog');}});
  el('authSwitch').onclick=()=>{signingIn=!signingIn;authView();};
  el('authForm').onsubmit=event=>{
    event.preventDefault();const email=el('signupEmail').value.trim().toLowerCase(),name=el('signupName').value.trim();
    if(!el('authForm').reportValidity())return;
    if(signingIn){if(!Object.hasOwn(users,email)){el('authError').textContent='No demo account with this email exists in this browser. Create one first.';return;}}
    else {if(Object.hasOwn(users,email)){el('authError').textContent='This demo account already exists. Choose Sign in.';return;}if(!name){el('authError').textContent='Enter your name.';return;}Object.defineProperty(users,email,{value:{name,email,balance:25,package:'Welcome',history:[{label:'Welcome demo credits',credits:25,date:Date.now()}]},writable:true,enumerable:true,configurable:true});}
    active=email;if(!persist()){el('authError').textContent='Could not save your demo account. Enable browser storage and try again.';return;}update();if(selectedPack)showCheckout();else{open('accountDialog');toast(signingIn?'Welcome back.':'Your workspace is ready. 25 demo credits added.');}
  };
  el('confirmPurchase').onclick=()=>{
    if(completing||!selectedPack)return;const u=user(),p=packs[selectedPack];if(!u||!p)return;
    completing=true;el('confirmPurchase').disabled=true;const before=structuredClone(u);
    u.balance+=p.credits;u.package=p.name;u.history.push({label:`${p.name} demo purchase · $0 charged`,credits:p.credits,date:Date.now()});
    if(persist()){selectedPack=null;update();open('accountDialog');toast(`${p.credits.toLocaleString()} demo credits added. No money charged.`);}else{users[active]=before;el('checkoutError').textContent='Storage unavailable. No credits added; no money charged.';}
    completing=false;el('confirmPurchase').disabled=false;
  };
  el('signOut').onclick=()=>{active=null;write('codex.demoActive',null);selectedPack=null;update();closeAll();toast('Signed out. Your demo account remains on this device.');};
  el('sampleBtn').onclick=()=>{
    const sample='<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Forma Studio — Sample</title>\n<style>*{box-sizing:border-box}body{margin:0;background:#f3f0e8;color:#182823;font:16px system-ui}nav{display:flex;justify-content:space-between;padding:28px 7%;border-bottom:1px solid #d4d6ca}main{padding:9% 7%;max-width:1100px}small{letter-spacing:3px;color:#47725a}h1{font-size:clamp(48px,8vw,100px);line-height:1.02;letter-spacing:-5px;max-width:850px;margin:24px 0}p{font-size:20px;line-height:1.7;max-width:540px;color:#526158}a{display:inline-block;background:#234c38;color:white;padding:16px 24px;border-radius:30px;text-decoration:none}.orb{width:180px;height:180px;background:linear-gradient(140deg,#bce7a5,#355f48);border-radius:50%;float:right;box-shadow:20px 20px 70px #65846755}footer{padding:30px 7%;color:#526158}</style></head>\n<body><nav><b>FORMA®</b><span>Independent creative studio</span></nav><main><div class="orb"></div><small>DESIGN WITH INTENTION</small><h1>Good ideas.<br>Better beginnings.</h1><p>We turn ambitious ideas into thoughtful digital experiences. Simple, expressive, and made for people.</p><a href="mailto:hello@example.com">Let’s build something ↗</a></main><footer>Handcrafted sample project · AI CodeX portfolio demo</footer></body></html>';
    if (window.openSampleProject(sample)) toast('Sample project opened. Edit, preview, or export it.');
  };
  update();
})();
