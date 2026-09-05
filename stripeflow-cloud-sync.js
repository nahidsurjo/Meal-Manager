/* StripeFlow Cloud Sync */
(function () {
  const KEY = 'stripe_tracker_saas_v1';
  const CONFIG_URL = '/stripeflow-config';
  const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  let client = null, workspaceId = null, timer = null;

  const loadScript = src => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
  const readLocal = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) { return null; } };
  const writeLocal = state => { if (state) localStorage.setItem(KEY, JSON.stringify(state)); };

  function loginOverlay() {
    const wrap = document.createElement('div');
    wrap.id = 'stripeflow-auth';
    wrap.innerHTML = `<div style="position:fixed;inset:0;background:#f7f8fc;display:grid;place-items:center;z-index:99999;font-family:Inter,system-ui,sans-serif">
      <form id="stripeflow-login" style="width:min(390px,calc(100% - 32px));background:#fff;border:1px solid #e7eaf0;border-radius:18px;padding:28px;box-shadow:0 20px 60px rgba(15,23,42,.10)">
        <div style="font-size:24px;font-weight:800;color:#0f172a;margin-bottom:6px">StripeFlow</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:22px">Sign in to access your cloud sales tracker.</div>
        <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin:0 0 6px">Email</label>
        <input id="sf-email" type="email" required autocomplete="username" style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #dfe3eb;border-radius:10px;margin-bottom:13px">
        <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin:0 0 6px">Password</label>
        <input id="sf-password" type="password" required autocomplete="current-password" style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #dfe3eb;border-radius:10px;margin-bottom:16px">
        <button style="width:100%;border:0;border-radius:10px;padding:12px;color:#fff;background:linear-gradient(135deg,#635bff,#7c3aed);font-weight:750;cursor:pointer">Sign in</button>
        <div id="sf-login-error" style="font-size:12px;color:#dc3545;margin-top:12px;min-height:16px"></div>
      </form></div>`;
    document.body.appendChild(wrap);
    return wrap;
  }

  async function signIn() {
    const box = loginOverlay(), form = box.querySelector('#stripeflow-login'), error = box.querySelector('#sf-login-error');
    form.onsubmit = async e => {
      e.preventDefault(); error.textContent = 'Signing in…';
      const { error: err } = await client.auth.signInWithPassword({
        email: box.querySelector('#sf-email').value.trim(),
        password: box.querySelector('#sf-password').value
      });
      if (err) error.textContent = err.message; else location.reload();
    };
  }

  async function push(state) {
    if (!client || !workspaceId || !state) return;
    const { data: auth } = await client.auth.getSession();
    if (!auth.session) return;
    const { error } = await client.from('stripeflow_state').upsert({
      workspace_id: workspaceId, state,
      updated_at: new Date().toISOString(),
      updated_by: auth.session.user.id
    });
    if (error) console.error('StripeFlow cloud save failed:', error);
  }

  async function pull() {
    const { data, error } = await client.from('stripeflow_state')
      .select('state').eq('workspace_id', workspaceId).maybeSingle();
    if (error) throw error;
    if (!data || !data.state) { await push(readLocal()); return; }
    const local = readLocal();
    const remoteText = JSON.stringify(data.state);
    const localText = local ? JSON.stringify(local) : '';
    if (remoteText !== localText) {
      writeLocal(data.state);
      location.reload();
    }
  }

  function installSaveHook() {
    const original = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function (key, value) {
      original(key, value);
      if (key !== KEY) return;
      clearTimeout(timer);
      timer = setTimeout(() => { try { push(JSON.parse(value)); } catch (_) {} }, 300);
    };
  }

  function addCloudStatus() {
    if (document.getElementById('stripeflow-cloud-status')) return;
    const el = document.createElement('div');
    el.id = 'stripeflow-cloud-status'; el.textContent = '☁ Cloud synced';
    el.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:9999;background:#fff;border:1px solid #e7eaf0;border-radius:999px;padding:8px 12px;font:600 11px system-ui;color:#08734f;box-shadow:0 6px 24px rgba(15,23,42,.08)';
    document.body.appendChild(el);
  }

  async function start() {
    try {
      const r = await fetch(CONFIG_URL, { cache: 'no-store' });
      if (!r.ok) throw new Error('Cloudflare config endpoint failed');
      const cfg = await r.json();
      if (!cfg.url || !cfg.key) throw new Error('Supabase variables are not configured in Cloudflare.');
      workspaceId = cfg.workspaceId;
      await loadScript(CDN);
      client = window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
      const { data } = await client.auth.getSession();
      if (!data.session) { document.querySelector('.app')?.remove(); await signIn(); return; }
      await pull();
      installSaveHook();
      addCloudStatus();
    } catch (err) {
      console.error(err);
      const el = document.createElement('div');
      el.style.cssText = 'position:fixed;left:18px;bottom:18px;z-index:99999;background:#fff1f0;color:#b42318;border:1px solid #ffd0cc;padding:10px 14px;border-radius:10px;font:12px system-ui;max-width:420px';
      el.textContent = 'StripeFlow cloud connection error: ' + (err.message || err);
      document.body.appendChild(el);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
