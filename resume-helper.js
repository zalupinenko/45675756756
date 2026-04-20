(function(){
  const KEY = "cf_active_deals";
  const API_BASE = "https://api.crossflag.org";
  const TTL = 24 * 60 * 60 * 1000;

  function read(){
    try{
      const raw = localStorage.getItem(KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    }catch(_){ return []; }
  }
  function write(arr){
    try{ localStorage.setItem(KEY, JSON.stringify((arr||[]).slice(0,50))); }catch(_){ }
  }
  function normUrl(url){
    try{
      const u = new URL(url, location.origin);
      return (u.pathname || '') + (u.search || '') + (u.hash || '');
    }catch(_){
      return String(url || '');
    }
  }
  function getUserToken(){
    const keys = [
      'crossflag_user_token',
      'cf_user_token',
      'user_token',
      'USER_TOKEN',
      'auth_token'
    ];
    for (const k of keys){
      try{
        const v = String(localStorage.getItem(k) || '').trim();
        if (v) return v;
      }catch(_){ }
    }
    return '';
  }
  function upsert(rec){
    if (!rec || !rec.type) return;
    const arr = read();
    const type = String(rec.type).toUpperCase();
    let next = arr.filter(x => !(x && String(x.type||'').toUpperCase() === type));
    if (type === 'BUY'){
      const id = String(rec.id || '').trim();
      if (!id) return;
      next.unshift({ type:'BUY', id, reserveId:String(rec.reserveId||'').trim(), url:normUrl(rec.url||location.pathname+location.search+location.hash), ts:Date.now() });
    } else if (type === 'SELL'){
      const id = String(rec.id || rec.dealId || '').trim();
      const secret = String(rec.secret || '').trim();
      if (!id || !secret) return;
      next.unshift({ type:'SELL', id, secret, url:normUrl(rec.url||location.pathname+location.search+location.hash), ts:Date.now() });
    } else {
      return;
    }
    write(next);
  }
  async function notifyResume(rec){
    try{
      if (!rec || !rec.type || !rec.id) return false;
      const tok = getUserToken();
      if (!tok) return false;
      const payload = {
        type: String(rec.type || '').toUpperCase(),
        id: String(rec.id || '').trim(),
        reserveId: String(rec.reserveId || '').trim(),
        secret: String(rec.secret || '').trim(),
        url: normUrl(rec.url || '')
      };
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = ctrl ? setTimeout(()=>{ try{ ctrl.abort(); }catch(_){ } }, 900) : null;
      try{
        await fetch(API_BASE + '/api/public/resume_notify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Token': tok,
            'Authorization': 'Bearer ' + tok
          },
          body: JSON.stringify(payload),
          cache: 'no-store',
          keepalive: true,
          signal: ctrl ? ctrl.signal : undefined
        });
      }finally{
        if (timer) clearTimeout(timer);
      }
      return true;
    }catch(_){
      return false;
    }
  }
  async function open(rec){
    if (!rec || !rec.url) return false;
    await notifyResume(rec).catch(()=>false);
    location.href = rec.url;
    return true;
  }
  function remove(type, id){
    const arr = read().filter(x => !(x && String(x.type||'').toUpperCase()===String(type||'').toUpperCase() && String(x.id||'')===String(id||'')));
    write(arr);
  }
  function isBuyTerminal(status, txHash){
    const st = String(status||'').toUpperCase();
    const ok = new Set(['SUCCESS','DONE','COMPLETED','BYBIT_DONE']);
    const bad = new Set(['FAILED','CANCELED','CANCELLED','ERROR','BYBIT_CANCELED']);
    if (ok.has(st) || bad.has(st)) return true;
    return !!String(txHash||'').trim();
  }
  function isSellTerminal(status){
    const st = String(status||'').toUpperCase();
    return ['COMPLETED','DONE','SUCCESS','CANCELED','CANCELLED','FAILED','CRYPTO_NOT_RECEIVED'].includes(st);
  }
  async function validateBuy(rec){
    const id = String(rec && rec.id || '').trim();
    const reserveId = String(rec && rec.reserveId || '').trim();
    if (!id || !reserveId) return { ok:false, remove:true };
    try{
      const res = await fetch(API_BASE + '/api/public/order_info?id=' + encodeURIComponent(id) + '&reserveId=' + encodeURIComponent(reserveId), { cache:'no-store' });
      const txt = await res.text();
      let j = null; try{ j = JSON.parse(txt); }catch(_){ }
      if (!res.ok || !j || !j.ok) return { ok:false, remove:true };
      const st = String(j.status || '').toUpperCase();
      const txHash = String(j.txHash || '').trim();
      return { ok: !isBuyTerminal(st, txHash), remove: isBuyTerminal(st, txHash), status:st };
    }catch(_){
      return { ok:false, remove:false, offline:true };
    }
  }
  async function validateSell(rec){
    const id = String(rec && rec.id || '').trim();
    const secret = String(rec && rec.secret || '').trim();
    if (!id || !secret) return { ok:false, remove:true };
    try{
      const res = await fetch(API_BASE + '/api/public/sell_status?dealId=' + encodeURIComponent(id) + '&secret=' + encodeURIComponent(secret), { cache:'no-store' });
      const txt = await res.text();
      let j = null; try{ j = JSON.parse(txt); }catch(_){ }
      if (!res.ok || !j || !j.ok) return { ok:false, remove:true };
      const st = String(j.status || '').toUpperCase();
      return { ok: !isSellTerminal(st), remove: isSellTerminal(st), status:st };
    }catch(_){
      return { ok:false, remove:false, offline:true };
    }
  }
  async function findLatestActive(type){
    let arr = read();
    const now = Date.now();
    let changed = false;
    arr = arr.filter(x => {
      const fresh = x && x.ts && (now - Number(x.ts) <= TTL);
      if (!fresh) changed = true;
      return fresh;
    });
    arr.sort((a,b)=>Number(b && b.ts || 0) - Number(a && a.ts || 0));
    const list = arr.filter(x => x && String(x.type||'').toUpperCase()===String(type||'').toUpperCase());
    for (const rec of list){
      const v = (String(type).toUpperCase()==='BUY') ? await validateBuy(rec) : await validateSell(rec);
      if (v.remove){
        arr = arr.filter(x => !(x && String(x.type||'').toUpperCase()===String(rec.type||'').toUpperCase() && String(x.id||'')===String(rec.id||'')));
        changed = true;
        continue;
      }
      if (v && v.ok === true && rec.url && normUrl(rec.url) !== normUrl(location.pathname + location.search + location.hash)){
        if (changed) write(arr);
        return rec;
      }
    }
    if (changed) write(arr);
    return null;
  }
  window.CrossflagResume = {
    upsertBuy(rec){ upsert({ type:'BUY', ...(rec||{}) }); },
    upsertSell(rec){ upsert({ type:'SELL', ...(rec||{}) }); },
    removeBuy(id){ remove('BUY', id); },
    removeSell(id){ remove('SELL', id); },
    findLatestActive,
    notifyResume,
    open,
    read,
    validateBuy,
    validateSell,
    isBuyTerminal,
    isSellTerminal
  };
})();
