/* EB28 Mission Control — Trading tab. WATCH-ONLY: nothing here can sign, trade or move funds.
 * Panels: kill switches, wallets, agents & projects, positions & PnL, alerts, security
 * checklist, approvals (record-only), STEPN & dApps, Keychain status.
 * Uses api/esc/ago/toast from app.js.   window.Trading = { load, render, data }
 */
(() => {
  const T = { data: null, loading: false };
  const usd = (n, d = 2) => (n == null || Number.isNaN(n) ? '—' : `${n < 0 ? '−' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`);
  const num = (n, d = 2) => (n == null ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: d }));
  const short = (a) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '');
  const et = (iso) => (iso ? new Date(iso).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' ET' : '—');
  const stateChip = (s) => `<span class="tr-state ${s}">${s === 'safe' ? 'SAFE' : s === 'unsafe' ? 'NOT SAFE' : 'UNKNOWN'}</span>`;
  const $ = (sel) => document.querySelector(sel);

  async function load(fresh = false) {
    if (T.loading) return;
    T.loading = true;
    try {
      T.data = await api('GET', `/api/trading${fresh ? '?fresh=1' : ''}`);
      render();
    } catch (err) {
      toast(err.message, 'bad');
    } finally {
      T.loading = false;
    }
  }

  function ticker(s) {
    const bits = [];
    for (const w of s.wallets) if (w.ok) bits.push(`<b>${esc(w.label.split(' ')[0].toUpperCase())}</b> ${usd(w.usd)}`);
    for (const w of s.wallets) for (const t of (w.tokens || []).slice(0, 4)) if (t.usd != null && t.usd > 0.05) bits.push(`${esc(t.symbol)} ${num(t.amount, 2)}`);
    for (const p of s.polymarket) if (p.ok) bits.push(`POLYMARKET PNL <span class="${p.cashPnl < 0 ? 'dn' : 'up'}">${usd(p.cashPnl)} ${p.cashPnl < 0 ? '▼' : '▲'}</span>`);
    bits.push(`KILL SWITCH <span class="${s.killSwitch.master ? 'up' : 'dn'}">${s.killSwitch.master ? 'ON' : 'OFF'}</span>`);
    const line = bits.join('<i>◆</i>');
    return `<div class="tr-ticker"><div class="tr-ticker-move">${line}<i>◆</i>${line}<i>◆</i></div></div>`;
  }

  function render() {
    const el = $('#trading-root');
    return window.keepTyping(el, paint);
  }
  function paint() {
    const s = T.data;
    const el = $('#trading-root');
    if (!s || !el) return;
    const red = s.flags.filter((f) => f.level === 'red').length;
    const pill = $('#pill-trading');
    if (pill) { pill.hidden = !red; pill.textContent = red; }
    const ks = s.killSwitch;
    const pm = s.polymarket;
    const pending = s.approvals.filter((a) => a.decision === 'pending');
    el.innerHTML = `
      ${ticker(s)}
      <div class="tr-head">
        <div><h1>Wall Street <span>· Trading desk</span></h1><div class="muted">Watch-only. Mission Control cannot sign, trade or move funds. Updated ${ago(s.at)} · <a href="#" data-tr="refresh">refresh</a></div></div>
        <div class="tr-total"><span>Watched value</span><b>${usd(s.totals.usd)}</b><span class="${s.totals.pnl < 0 ? 'dn' : 'up'}">PnL ${usd(s.totals.pnl)}</span></div>
      </div>

      <section class="tr-panel tr-kill ${ks.allSafe ? 'ok' : 'warn'}">
        <div class="tr-master">
          <div><h2>Kill switches</h2><div class="muted">Unknown counts as unsafe. Engaging is one click; disengaging needs Touch ID and a typed phrase.</div></div>
          <div class="tr-switch ${ks.master ? 'on' : 'off'}"><b>MASTER ${ks.master ? 'ON' : 'OFF'}</b>
            ${ks.master ? `<details class="tr-dis"><summary>Disengage…</summary><input data-f="phrase" placeholder="Type DISENGAGE KILL SWITCH" /><button data-tr="disengage">Disengage with Touch ID</button></details>` : `<button data-tr="engage" class="danger">Engage all now</button>`}</div>
        </div>
        <div class="tr-rows">${ks.projects.map((p) => `<div class="tr-row">${stateChip(p.state)}<b>${esc(p.name)}</b><span class="muted">${esc(p.detail || '')}</span></div>`).join('')}</div>
      </section>

      <div class="tr-grid">
        <section class="tr-panel">
          <h2>Wallets <span class="muted">watch-only</span></h2>
          ${s.wallets.map((w) => `<div class="tr-wallet">
            <div class="tr-wallet-head"><b>${esc(w.label)}</b><span class="muted">${esc(w.chain)} · ${short(w.address)}</span><b class="v">${w.ok ? usd(w.usd) : '—'}</b></div>
            ${w.ok ? `<div class="tr-tokens"><span>${esc(w.native.symbol)} ${num(w.native.amount, 4)}${w.native.usd != null ? ` · ${usd(w.native.usd)}` : ''}</span>${(w.tokens || []).slice(0, 8).map((t) => `<span${t.verified === false ? ' class="unv" title="Unverified token"' : ''}>${esc(t.symbol)} ${num(t.amount, 2)}${t.usd != null ? ` · ${usd(t.usd)}` : ''}</span>`).join('')}</div>
              ${(w.signatures || []).length ? `<div class="tr-sigs">Recent: ${w.signatures.slice(0, 5).map((g) => `<a href="https://solscan.io/tx/${esc(g.sig)}" target="_blank" rel="noopener">${et(g.at)}</a>`).join(' · ')}</div>` : ''}` : `<div class="tr-err">${esc(w.error)}</div>`}
          </div>`).join('') || '<div class="muted">No wallets yet.</div>'}
          <details class="tr-add"><summary>Add a watch-only address</summary>
            <div class="tr-form"><input data-f="label" placeholder="Label (e.g. Phantom)" /><select data-f="chain"><option value="solana">Solana</option><option value="polygon">Polygon</option></select><input data-f="address" placeholder="Public address" /><button data-tr="add-wallet">Add</button></div>
            <div class="muted small">Public addresses only. Saved in ~/.eb28-mission-control/trading.json, never in the repo.</div></details>
        </section>

        <section class="tr-panel">
          <h2>Positions &amp; PnL</h2>
          ${pm.map((p) => (p.ok ? `<div class="tr-kpis"><div><b>${p.open}</b><span>open</span></div><div><b>${usd(p.exposure)}</b><span>exposure</span></div><div><b class="${p.cashPnl < 0 ? 'dn' : 'up'}">${usd(p.cashPnl)}</b><span>PnL (${p.count} positions)</span></div><div><b>${p.redeemable}</b><span>to redeem</span></div></div>
            <div class="muted small">${esc(p.wallet)} · last trade ${et(p.lastTradeAt)}</div>
            ${p.top.length ? `<table class="tr-table"><tr><th>Market</th><th>Size</th><th>Avg</th><th>Now</th><th>Value</th><th>PnL</th></tr>${p.top.map((x) => `<tr><td>${esc(x.title)} <span class="muted">${esc(x.outcome)}</span></td><td>${num(x.size, 0)}</td><td>${num(x.avgPrice, 3)}</td><td>${num(x.curPrice, 3)}</td><td>${usd(x.value)}</td><td class="${x.pnl < 0 ? 'dn' : 'up'}">${usd(x.pnl)}</td></tr>`).join('')}</table>` : '<div class="muted">No open positions.</div>'}` : `<div class="tr-err">${esc(p.error)}</div>`)).join('') || '<div class="muted">No Polygon wallets to read.</div>'}
          <h3>DayTradingBot ledger</h3>
          ${s.projects.daytradingbot && s.projects.daytradingbot.ledger ? `<div class="muted small">${s.projects.daytradingbot.running ? 'Running' : 'Not running'} · intents ${s.projects.daytradingbot.ledger.intents} · orders ${s.projects.daytradingbot.ledger.orders} · fills ${s.projects.daytradingbot.ledger.fills} · caps $5/order, $200 total</div>` : `<div class="muted small">${esc((s.projects.daytradingbot || {}).detail || 'n/a')}</div>`}
        </section>

        <section class="tr-panel">
          <h2>Agents &amp; projects <span class="muted">no restart buttons here</span></h2>
          ${(ks.projects.find((p) => p.id === 'simmer') || { agents: [] }).agents.map((a) => `<div class="tr-row">${stateChip(a.state)}<b>${esc(a.name)}</b><span class="muted">Simmer agent · state needs the Simmer API (after key rotation) · <a href="https://simmer.markets" target="_blank" rel="noopener">open dashboard</a></span></div>`).join('')}
          ${s.projects.fundmanager && s.projects.fundmanager.lanes ? `<div class="tr-row">${stateChip(s.projects.fundmanager.state)}<b>FundManager</b><span class="muted">${s.projects.fundmanager.lanes.map((l) => `${esc(l.name)}: ${esc(l.mode)}`).join(' · ')}</span></div>` : ''}
          ${(() => { const i = s.projects.intel || {}; return `<div class="tr-row">${stateChip(i.state || 'unknown')}<b>Hermes-home (Intel Mac)</b><span class="muted">${esc(i.detail || '')}</span></div>`; })()}
          <h2 style="margin-top:14px">STEPN &amp; dApps</h2>
          <div class="tr-rule">${(s.stepn.rules || []).map(esc).join(' · ')}</div>
          ${s.stepn.snapshot ? `<div class="tr-row"><b>STEPN ${esc(s.stepn.account || '')}</b><span class="muted">GST ${num(s.stepn.snapshot.GST)} · GMT ${num(s.stepn.snapshot.GMT)} · entered ${ago(s.stepn.snapshot.at)}${s.stepn.snapshot.note ? ` · ${esc(s.stepn.snapshot.note)}` : ''}</span></div>` : ''}
          <details class="tr-add"><summary>Update STEPN snapshot</summary><div class="tr-form"><input data-f="gst" placeholder="GST" /><input data-f="gmt" placeholder="GMT" /><input data-f="note" placeholder="Note" /><button data-tr="stepn">Save</button></div></details>
          ${s.dapps.map((d) => `<div class="tr-row">${d.id === 'syncstep' ? `<span class="tr-state ${d.up ? 'safe' : 'unsafe'}">${d.up ? 'UP' : 'DOWN'}</span>` : `<span class="tr-state">${esc((d.review || 'n/a').toUpperCase())}</span>`}<b>${esc(d.name)}</b><span class="muted">${d.id === 'syncstep' ? `v${esc(d.version || '?')} · chainReady ${d.chainReady ? 'yes' : 'no'} · treasury ${esc(d.treasury || '?')}${d.lastCommit ? ` · last commit ${ago(d.lastCommit.at)}` : ''}` : esc(d.note || '')}</span></div>`).join('')}
        </section>

        <section class="tr-panel">
          <h2>Security checklist <span class="muted">${s.checklist.filter((c) => c.status === 'open').length} open</span></h2>
          ${s.checklist.map((c) => `<label class="tr-check ${c.status}"><input type="checkbox" data-resolve="${esc(c.id)}" ${c.status === 'done' ? 'checked' : ''}/><span class="pri ${c.priority}">${esc(c.priority)}</span><span>${esc(c.text)}</span></label>`).join('')}
          <h3>Keychain <span class="muted">names only</span></h3>
          ${s.keychain.map((k) => `<div class="tr-row"><span class="tr-state ${k.present ? 'safe' : ''}">${k.present ? 'SET' : 'NOT SET'}</span><b>${esc(k.name)}</b>${k.present ? '' : `<code>${esc(k.addCommand)}</code>`}</div>`).join('')}
        </section>

        <section class="tr-panel">
          <h2>Approvals <span class="muted">records your decision only; nothing executes</span></h2>
          ${pending.map((a) => `<div class="tr-appr"><b>${esc(a.project)}:</b> ${esc(a.change)} <span class="muted">asked by ${esc(a.requestedBy)} · ${ago(a.at)}</span>
            <div class="tr-form"><input data-phrase="${esc(a.id)}" placeholder="For anything live, type: I APPROVE ${esc(a.project)} ${esc(a.change)}" /><button data-approve="${esc(a.id)}" class="go">Approve</button><button data-deny="${esc(a.id)}">Deny</button></div></div>`).join('') || '<div class="muted">Nothing waiting.</div>'}
          <details class="tr-add"><summary>Log a request</summary><div class="tr-form"><input data-f="project" placeholder="Project" /><input data-f="change" placeholder="Exact change (e.g. enable paper mode)" /><button data-tr="request">Add</button></div></details>
          ${s.approvals.filter((a) => a.decision !== 'pending').slice(0, 5).map((a) => `<div class="muted small">${a.decision === 'approved' ? '✅' : '⛔'} ${esc(a.project)}: ${esc(a.change)} · ${ago(a.decidedAt)}${a.confirmMethod === 'touchid' ? ' · Touch ID' : ''}</div>`).join('')}
        </section>

        <section class="tr-panel">
          <h2>Alerts</h2>
          <ul class="tr-feed">${[...s.flags.map((f) => ({ level: f.level === 'red' ? 'warn' : 'amber', text: f.text, at: s.at })), ...s.alerts].slice(0, 30).map((a) => `<li class="${a.level}"><span>${ago(a.at)}</span>${esc(a.text)}</li>`).join('')}</ul>
        </section>
      </div>`;
  }

  async function post(path, body) {
    try {
      T.data = await api('POST', path, body);
      render();
    } catch (err) {
      toast(err.message, 'bad');
    }
  }

  const val = (sel) => ((document.querySelector(sel) || {}).value || '').trim();
  document.addEventListener('click', async (ev) => {
    const t = ev.target.closest('[data-tr],[data-approve],[data-deny]');
    if (!t || !t.closest('#trading-root')) return;
    ev.preventDefault();
    const a = t.dataset.tr;
    if (a === 'refresh') { toast('Refreshing…'); return load(true); }
    if (a === 'engage') return post('/api/trading/killswitch', { engage: true });
    if (a === 'disengage') return post('/api/trading/killswitch', { engage: false, phrase: val('#trading-root [data-f=phrase]') });
    if (a === 'add-wallet') return post('/api/trading/config', { addWallet: { label: val('#trading-root [data-f=label]'), chain: val('#trading-root [data-f=chain]'), address: val('#trading-root [data-f=address]') } });
    if (a === 'stepn') return post('/api/trading/config', { stepnSnapshot: { GST: val('#trading-root [data-f=gst]'), GMT: val('#trading-root [data-f=gmt]'), note: val('#trading-root [data-f=note]') } });
    if (a === 'request') return post('/api/trading/approval', { request: { project: val('#trading-root [data-f=project]'), change: val('#trading-root [data-f=change]') } });
    if (t.dataset.approve) return post('/api/trading/approval', { id: t.dataset.approve, decision: 'approved', phrase: val(`#trading-root [data-phrase="${CSS.escape(t.dataset.approve)}"]`) });
    if (t.dataset.deny) return post('/api/trading/approval', { id: t.dataset.deny, decision: 'denied' });
  });
  document.addEventListener('change', (ev) => {
    const c = ev.target.closest('[data-resolve]');
    if (c && c.closest('#trading-root')) post('/api/trading/config', { resolve: { id: c.dataset.resolve, done: c.checked } });
  });

  window.Trading = { load, render, get data() { return T.data; } };
})();
