/* EB28 Mission Control — UI. Plain JS, talks to the local API. */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const api = async (method, path, body) => {
  const res = await fetch(path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ago = (iso) => {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};
const STATUS_LABEL = { needs_you: 'Needs you', working: 'Working', follow_up: 'Follow up', done: 'Done', failed: 'Failed' };

const state = { board: null, workforce: null, automations: [], filter: new Set(), search: '', open: null, tab: 'home', biz: 'all' };

/* ---------- toasts ---------- */
function toast(text, kind = '') {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = text;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 6000);
}

/* ---------- board ---------- */
async function loadBoard() {
  state.board = await api('GET', '/api/board');
  chime.check(state.board);
  if (state.tab === 'home') renderHome();
  renderBoard();
}

function visibleJobs(list) {
  const q = state.search.trim().toLowerCase();
  return list.filter((j) => (!state.filter.size || state.filter.has(j.source)) && (!q || `${j.title} ${j.project} ${j.branch} ${j.reason} ${j.lastMessage}`.toLowerCase().includes(q)));
}

function sourceOf(id) {
  return (state.board.sources || []).find((s) => s.id === id) || { label: id, color: '#888' };
}

function sourceFor(j) {
  if (j.source === 'bot' && j.meta && j.meta.providerLabel) return { label: `${j.meta.providerLabel} bot`, color: j.meta.providerColor };
  return sourceOf(j.source);
}

function cardHtml(j) {
  const s = sourceFor(j);
  return `<div class="card ${j.overridden ? 'overridden' : ''}" data-id="${esc(j.id)}">
    ${j.alive ? '<span class="live" title="process is running"></span>' : ''}
    <div class="source"><span class="swatch" style="background:${s.color}"></span>${esc(s.label)}${j.project ? ` · ${esc(j.project)}` : ''}</div>
    <div class="title">${esc(j.title)}</div>
    <div class="why">${esc(j.explanation || j.reason)}</div>
    <div class="meta"><span>${ago(j.lastActivity)}</span>${j.branch ? `<span>⎇ ${esc(j.branch)}</span>` : ''}${j.note ? `<span>📝 ${esc(j.note.slice(0, 40))}</span>` : ''}</div>
  </div>`;
}

function renderBoard() {
  const b = state.board;
  if (!b) return;
  const all = b.columns.flatMap((c) => c.jobs);
  $('#stats').innerHTML = Object.entries(b.summary.counts).map(([k, v]) => `<span class="stat ${k}"><b>${v}</b>${STATUS_LABEL[k]}</span>`).join('');
  $('#filters').innerHTML = b.sources
    .filter((s) => b.summary.bySource[s.id])
    .map((s) => `<button data-source="${s.id}" class="${state.filter.has(s.id) ? 'on' : ''}"><span class="swatch" style="background:${s.color}"></span>${esc(s.label)} ${b.summary.bySource[s.id]}</button>`)
    .join('') + (b.errors.length ? `<span class="errors">${b.errors.map((e) => `${e.source}: ${esc(e.error)}`).join(' · ')}</span>` : '');
  $('#board').innerHTML = b.columns
    .map((c) => {
      const jobs = visibleJobs(c.jobs);
      return `<div class="column ${c.id}"><div class="column-head"><h2>${c.title}</h2><span class="count">${jobs.length}</span></div><div class="hint">${c.hint}</div>${jobs.length ? jobs.map(cardHtml).join('') : `<div class="empty">${c.id === 'needs_you' ? 'Nothing needs you. 🎉' : 'Empty'}</div>`}</div>`;
    })
    .join('');
  const snoozed = visibleJobs(b.snoozed || []);
  $('#snoozed').innerHTML = snoozed.length ? `<h2>Snoozed (${snoozed.length})</h2><div class="cards wide">${snoozed.map(cardHtml).join('')}</div>` : '';
  $('.brand .dot').classList.toggle('off', false);
  if (state.open) {
    const fresh = all.concat(b.snoozed || []).find((j) => j.id === state.open.id);
    if (fresh) state.open = fresh;
  }
}

/* ---------- drawer ---------- */
async function openJob(id) {
  const j = state.board.columns.flatMap((c) => c.jobs).concat(state.board.snoozed || []).find((x) => x.id === id);
  if (!j) return;
  state.open = j;
  const s = sourceFor(j);
  $('#drawer-chips').innerHTML = `<span class="chip ${j.status}">${STATUS_LABEL[j.status]}</span><span class="chip">${esc(s.label)}</span>${j.alive ? '<span class="chip working">live</span>' : ''}${j.tags.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}`;
  $('#drawer-title').textContent = j.title;
  $('#drawer-sub').textContent = [j.project && `📁 ${j.cwd || j.project}`, j.branch && `⎇ ${j.branch}`, j.startedAt && `started ${ago(j.startedAt)}`, j.lastActivity && `last activity ${ago(j.lastActivity)}`].filter(Boolean).join('  ·  ');
  $('#drawer-reason').innerHTML = `${esc(j.reason)}${j.explanation ? `<div class="explain">${esc(j.explanation)}</div>` : ''}`;
  $('#drawer-note').value = j.note || '';
  const act = (label, patch, cls = '') => `<button class="small ${cls}" data-act='${esc(JSON.stringify(patch))}'>${label}</button>`;
  $('#drawer-actions').innerHTML = [
    j.status !== 'done' && act('✓ Mark done', { status: 'done' }),
    j.status !== 'needs_you' && act('Needs me', { status: 'needs_you' }),
    j.status !== 'follow_up' && act('Follow up later', { status: 'follow_up' }),
    j.status !== 'working' && act('Still working', { status: 'working' }),
    act('Snooze 4h', { snoozedUntil: new Date(Date.now() + 4 * 3600e3).toISOString() }),
    act('Snooze until tomorrow', { snoozedUntil: tomorrow9() }),
    j.overridden && act('Clear my override', { status: null, reason: null, snoozedUntil: null }),
    act('Archive', { archived: true }, 'danger'),
    j.id.startsWith('manual:') && `<button class="small danger" id="delete-manual">Delete</button>`,
  ].filter(Boolean).join('');
  const resume = j.resumeCommand;
  if (j.source === 'bot') {
    $('#drawer-resume').innerHTML = `<span>${esc(resume || 'No restart command yet. Edit the bot to add one.')}</span><span style="display:flex;gap:4px">${resume ? '<button class="small" id="bot-restart">Restart</button>' : ''}<button class="small" id="bot-edit">Edit</button>${j.meta.logFile ? '<button class="small" id="bot-log">Log file</button>' : ''}</span>`;
    $('#drawer-transcript').innerHTML = j.lastMessage ? `<div class="msg assistant"><div class="who">recent log${j.meta.pid ? ` · pid ${j.meta.pid}` : ''} · ${esc(j.meta.manager)}</div>${esc(j.lastMessage)}</div>` : '<div class="muted">No log found. Add a log path to see what it is doing.</div>';
    $('#drawer').hidden = false;
    return;
  }
  $('#drawer-resume').innerHTML = resume
    ? `<span>${esc(resume)}</span><span style="display:flex;gap:4px"><button class="small" id="copy-resume">Copy</button><button class="small" id="term-resume" title="Open a Terminal window and run this">Run</button>${j.cwd ? '<button class="small" id="open-folder" title="Open the project folder">Folder</button>' : ''}</span>`
    : j.link ? `<span>${esc(j.link)}</span><button class="small" id="open-link">Open</button>` : '';
  $('#drawer-transcript').innerHTML = j.lastMessage ? `<div class="msg assistant"><div class="who">last message</div>${esc(j.lastMessage)}</div>` : '<div class="muted">No transcript available.</div>';
  $('#drawer').hidden = false;
  try {
    const detail = await api('GET', `/api/job?id=${encodeURIComponent(j.id)}`);
    if (detail.transcript.length && state.open && state.open.id === j.id) {
      $('#drawer-transcript').innerHTML = detail.transcript
        .map((m) => `<div class="msg ${m.role}"><div class="who">${m.role === 'user' ? 'you' : 'agent'} · ${ago(m.at)}</div>${esc(m.text)}${m.tools.length ? `<div class="tools">🛠 ${esc(m.tools.join(', '))}</div>` : ''}</div>`)
        .join('');
      $('#drawer-transcript').scrollTop = 1e9;
    }
  } catch { /* fine */ }
}

function tomorrow9() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

async function override(patch) {
  if (!state.open) return;
  await api('POST', '/api/job/override', { id: state.open.id, ...patch });
  await loadBoard();
  if (patch.archived) closeDrawer();
  else openJob(state.open.id);
}

function closeDrawer() {
  $('#drawer').hidden = true;
  state.open = null;
}

/* ---------- workforce ---------- */
async function loadWorkforce() {
  state.workforce = await api('GET', '/api/workforce');
  renderWorkforce();
}

function renderWorkforce() {
  const w = state.workforce;
  if (!w) return;
  $('#pause-all').checked = w.paused;
  $('.brand .dot').classList.toggle('off', w.paused);
  const pill = $('#pill-approvals');
  pill.hidden = !w.proposals.length;
  pill.textContent = w.proposals.length;
  $('#agents').innerHTML = w.agents
    .map((a) => `<div class="tile ${a.running ? 'running' : ''}">
      <div class="row"><span class="name">${esc(a.name)} <span class="tier ${a.tier}">${a.tier}</span></span><label class="switch"><input type="checkbox" data-agent="${a.id}" ${a.enabled ? 'checked' : ''}/> on</label></div>
      <div class="role">${esc(a.role)}</div>
      <div class="foot"><span>${a.cadence}</span><span>${a.running ? '⏳ running' : a.lastRunAt ? `last run ${ago(a.lastRunAt)}` : 'never run'}</span></div>
      ${a.lastSummary ? `<div class="foot"><span>${esc(a.lastSummary)}</span></div>` : ''}${a.lastError ? `<div class="foot bad">${esc(a.lastError)}</div>` : ''}
      <div class="btns"><button class="small" data-run-agent="${a.id}">Run now</button></div>
    </div>`)
    .join('') + `<div class="muted" style="font-size:12px">Claude for summaries and briefings: ${w.llm.available ? `on (${esc(w.llm.model)})` : 'off — set ANTHROPIC_API_KEY or run `ant auth login`; everything else still works.'}</div>`;
  $('#approvals-hint').textContent = w.proposals.length ? '' : '— nothing waiting';
  $('#proposals').innerHTML = w.proposals
    .map((p) => `<div class="tile"><div class="name">${esc(p.title)}</div><div class="role">${esc(p.description)}</div>
      <div class="btns"><button class="small primary" data-decide="${p.id}" data-decision="approved">Approve once</button><button class="small" data-decide="${p.id}" data-decision="approved" data-standing="1">Approve as standing</button><button class="small" data-decide="${p.id}" data-decision="rejected">Not now</button></div></div>`)
    .join('') || '<div class="muted">The workforce has nothing waiting on you.</div>';
  $('#followups').innerHTML = (w.followUps.items || [])
    .slice(0, 12)
    .map((f) => `<div class="tile" data-open="${esc(f.id)}" style="cursor:pointer"><div class="name">${esc(f.title)}</div><div class="role">${esc(f.why)}</div><div class="foot"><span>${esc(f.source)}</span><span>${ago(f.lastActivity)}</span></div><div class="foot"><span>${esc(f.next)}</span></div></div>`)
    .join('') || '<div class="muted">Nothing stalled.</div>';
  $('#scout').innerHTML = (w.scout.proposals || [])
    .slice(0, 30)
    .map((p) => `<div class="tile"><div class="row"><span class="name">${esc(p.automation.title)}</span><span class="tier ${p.suggestedTier}">${p.suggestedTier}</span></div><div class="role"><code>${esc(p.description)}</code></div>
      <div class="btns"><button class="small" data-adopt="${esc(p.id)}" data-tier="${p.suggestedTier}">Add as ${p.suggestedTier}</button>${p.suggestedTier !== 'manual' ? `<button class="small" data-adopt="${esc(p.id)}" data-tier="manual">Add as manual</button>` : ''}</div></div>`)
    .join('') || '<div class="muted">Scout has not found anything new. It runs every morning.</div>';
  $('#activity').innerHTML = [...w.activity.map((a) => ({ at: a.at, text: `${a.title} → ${STATUS_LABEL[a.to] || a.to}`, cls: a.to === 'failed' ? 'bad' : a.to === 'needs_you' ? 'warn' : 'ok' })), ...w.agentRuns.map((r) => ({ at: r.at, text: `${r.agent}: ${r.summary || ''}`, cls: '' }))]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 30)
    .map((e) => `<li><span class="t">${ago(e.at)}</span><span class="${e.cls}">${esc(e.text)}</span></li>`)
    .join('') || '<li class="muted">Quiet so far.</li>';
}

/* ---------- bots ---------- */
async function loadBots() {
  state.bots = await api('GET', '/api/bots');
  renderBots();
}

function renderBots() {
  const b = state.bots;
  if (!b) return;
  const down = b.bots.filter((x) => x.status === 'failed' || x.status === 'needs_you').length;
  $('#pill-bots').hidden = !down;
  $('#pill-bots').textContent = down;
  const order = { failed: 0, needs_you: 1, follow_up: 2, working: 3, done: 4 };
  $('#bots').innerHTML = b.bots
    .slice()
    .sort((x, y) => order[x.status] - order[y.status] || x.title.localeCompare(y.title))
    .map((x) => `<div class="tile ${x.status === 'working' ? 'running' : ''}">
      <div class="row"><span class="name">${esc(x.title)}</span><span class="chip ${x.status}">${STATUS_LABEL[x.status]}</span></div>
      <div class="foot"><span><span class="swatch" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${x.meta.providerColor}"></span> ${esc(x.meta.providerLabel || 'Unknown provider')}</span><span>${esc(x.meta.manager)}</span>${x.meta.pid ? `<span>pid ${x.meta.pid}</span>` : ''}${x.meta.autoRestart ? '<span class="ok">auto-restart</span>' : ''}${x.lastActivity ? `<span>${ago(x.lastActivity)}</span>` : ''}</div>
      <div class="role">${esc(x.reason)}</div>
      ${x.meta.lastError && x.status !== 'done' && x.status !== 'working' ? `<div class="foot bad">${esc(x.meta.lastError.slice(0, 160))}</div>` : ''}
      <div class="btns"><button class="small" data-open="${esc(x.id)}">Details</button>${x.meta.restart ? `<button class="small" data-bot-restart="${esc(x.id)}">Restart</button>` : ''}<button class="small" data-bot-edit="${esc(x.id)}">Edit</button></div>
    </div>`)
    .join('') || `<div class="tile"><div class="name">No bots found yet</div><div class="role">Nothing is running under pm2, launchd, or Docker with an AI provider, and no process mentions grok or xai. Press "+ Add a bot" to register Dot, your Grok bots, or anything else.</div></div>`;
  $('#bot-restarts').innerHTML = b.restarts.map((r) => `<li><span class="t">${ago(r.at)}</span><span class="${r.ok ? 'ok' : 'bad'}">${esc(r.name)} · ${r.trigger} · ${r.ok ? 'ok' : `failed (${r.code})`}</span></li>`).join('') || '<li class="muted">No restarts yet.</li>';
}

function openBotDialog(job) {
  const f = $('#bot-form');
  f.reset();
  const providers = (state.bots && state.bots.providers) || [];
  $('#bot-provider').innerHTML = [...providers.map((p) => `<option value="${p.id}">${esc(p.label)}</option>`), '<option value="dot">Dot</option>', '<option value="">Other / custom</option>'].join('');
  const reg = job && state.bots ? state.bots.registry.find((r) => (r.id || r.name) === (job.meta.registryId || job.title)) : null;
  const src = reg || (job ? { name: job.title, provider: job.meta.provider, restart: job.meta.restart, match: job.id.replace(/^bot:/, ''), log: job.meta.logFile } : {});
  for (const [k, v] of Object.entries(src)) if (f.elements[k] && f.elements[k].type !== 'checkbox') f.elements[k].value = Array.isArray(v) ? v.join(' ') : v ?? '';
  f.elements.expected.checked = src.expected !== false;
  f.elements.autoRestart.checked = Boolean(src.autoRestart);
  f.elements.originalName.value = reg ? reg.id || reg.name : '';
  f.dataset.match = src.match || '';
  $('#bot-dialog-title').textContent = job ? `Edit ${job.title}` : 'Add a bot';
  $('#bot-delete').hidden = !reg;
  $('#bot-dialog').showModal();
}

/* ---------- automations ---------- */
async function loadAutomations() {
  state.automations = await api('GET', '/api/automations');
  renderAutomations();
}

function renderAutomations() {
  const groups = {};
  for (const a of state.automations) (groups[a.area || 'Other'] ||= []).push(a);
  $('#automations').innerHTML = Object.entries(groups)
    .map(([area, list]) => `<div style="grid-column:1/-1"><h2>${esc(area)}</h2></div>` + list
      .map((a) => {
        const r = a.lastRun;
        const status = a.unavailable ? '⚪ not set up on this Mac' : !r ? 'never run' : r.status === 'running' ? '⏳ running' : r.ok ? `✅ ok ${ago(r.finishedAt)}` : `❌ failed ${ago(r.finishedAt)}`;
        return `<div class="tile">
          <div class="row"><span class="name">${esc(a.title)}</span><span class="tier ${a.tier}">${a.tier}</span></div>
          <div class="role">${esc(a.description)}</div>
          ${a.unavailable ? `<div class="role" style="color:#b45309">${esc(a.unavailable[0].toUpperCase() + a.unavailable.slice(1))}. Clone the repo this runs in, or set MC_REPOS to its folder.</div>` : ''}
          <div class="foot"><code>${esc(a.command.join(' '))}</code></div>
          <div class="foot"><span>${a.schedule ? `⏰ ${esc(a.schedule)}` : 'on demand'}</span><span class="${!a.unavailable && r && !r.ok && r.status !== 'running' ? 'bad' : ''}">${status}</span>${a.autoApproved ? '<span class="ok">standing approval</span>' : ''}</div>
          <div class="btns">
            <button class="small ${a.tier === 'manual' ? 'danger' : ''}" data-run-auto="${a.id}" data-tier="${a.tier}">${a.tier === 'manual' ? 'Run (asks first)' : 'Run now'}</button>
            ${a.schedule ? `<label class="switch"><input type="checkbox" data-auto-enabled="${a.id}" ${a.enabled ? 'checked' : ''}/> scheduled</label>` : ''}
            ${a.tier === 'approval' ? `<label class="switch"><input type="checkbox" data-auto-standing="${a.id}" ${a.autoApproved ? 'checked' : ''}/> standing approval</label>` : ''}
            ${r ? `<button class="small" data-auto-log="${a.id}">Last output</button>` : ''}
          </div>
          <pre class="log" id="log-${esc(a.id)}" hidden style="white-space:pre-wrap;font-size:11px;max-height:240px;overflow:auto;background:var(--panel-2);padding:8px;border-radius:8px"></pre>
        </div>`;
      })
      .join(''))
    .join('');
}

/* ---------- briefing ---------- */
function md(text) {
  const lines = String(text || '').split('\n');
  let html = '';
  let inList = false;
  for (const raw of lines) {
    const line = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/_(.+?)_/g, '<i>$1</i>').replace(/`(.+?)`/g, '<code>$1</code>');
    const h = line.match(/^(#{1,3})\s+(.*)/);
    const li = line.match(/^\s*[-*]\s+(.*)/);
    if (li) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${li[1]}</li>`;
      continue;
    }
    if (inList) { html += '</ul>'; inList = false; }
    if (h) html += `<h${h[1].length}>${h[2]}</h${h[1].length}>`;
    else if (/^---+$/.test(line.trim())) html += '<hr/>';
    else if (line.trim()) html += `<p>${line}</p>`;
  }
  if (inList) html += '</ul>';
  return html;
}

async function loadBriefing() {
  const digests = await api('GET', '/api/digests');
  $('#digest').innerHTML = digests[0] ? md(digests[0].markdown) : '<p class="muted">No briefing yet. The Reporter writes one at 08:00 and 17:00, or press the button.</p>';
}

/* ---------- events ---------- */
function connectEvents() {
  const es = new EventSource('/api/events');
  es.onmessage = (ev) => {
    const e = JSON.parse(ev.data);
    if (e.type === 'ask:suggested') { delete home.asks[e.jobId]; if (state.tab === 'home') hydrateAsks(queueItems()); }
    if (e.type === 'reply:progress' || e.type === 'reply:done') onReplyEvent(e);
    if (e.type === 'cos:done') { toast(`Chief of Staff replied: ${e.chat.a.slice(0, 80)}`, e.chat.status === 'done' ? 'ok' : 'bad'); loadCos(); }
    if (e.type === 'board:refresh') loadBoard().then(() => { if (state.tab === 'arcade') loadArcade(); });
    if (e.type === 'job:transition') toast(`${e.title.slice(0, 70)} → ${STATUS_LABEL[e.to] || e.to}`, e.to === 'failed' ? 'bad' : e.to === 'needs_you' ? 'you' : 'ok');
    if (e.type === 'proposal:new') { toast(`Approval needed: ${e.title}`, 'you'); loadWorkforce(); }
    if (e.type === 'automation:finish') { toast(`${e.run.title}: ${e.run.ok ? 'finished' : 'failed'}`, e.run.ok ? 'ok' : 'bad'); if (state.tab === 'automations') loadAutomations(); }
    if (e.type === 'bot:restart') { toast(`${e.auto ? 'Auto-restarted' : 'Restarted'} ${e.name}: ${e.ok ? 'ok' : 'failed'}`, e.ok ? 'ok' : 'bad'); if (state.tab === 'bots') setTimeout(loadBots, 2000); }
    if (e.type === 'board:refresh') loadBots().catch(() => {});
    if (e.type.startsWith('agent:') || e.type.startsWith('proposal:')) { if (state.tab === 'workforce') loadWorkforce(); }
  };
  es.onerror = () => $('.brand .dot').classList.add('off');
  es.onopen = () => $('.brand .dot').classList.remove('off');
}

/* ---------- wiring ---------- */
function showTab(id) {
  state.tab = id;
  $$('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === id));
  $$('.tab').forEach((t) => t.classList.toggle('active', t.id === `tab-${id}`));
  if (id === 'home') loadHome();
  if (id === 'workforce') loadWorkforce();
  if (id === 'bots') loadBots();
  if (id === 'automations') loadAutomations();
  if (id === 'briefing') loadBriefing();
  if (id === 'arcade') loadArcade().then(() => window.Arcade.start());
  else if (window.Arcade) window.Arcade.stop();
}

/* ---------- arcade ---------- */
const arcade = { crew: [], dot: { target: 'codex-voice' }, mounted: false, sel: null, automations: [] };
async function loadArcade() {
  if (!arcade.mounted) {
    window.Arcade.mount($('#arcade'), { onSelect: (sel) => { arcade.sel = sel; renderSide(); } });
    arcade.mounted = true;
  }
  const [board, workforce, crew, dot, automations] = await Promise.all([
    state.board ? state.board : api('GET', '/api/board'),
    api('GET', '/api/workforce'),
    api('GET', '/api/crew').catch(() => []),
    api('GET', '/api/dot').catch(() => ({ target: 'codex-voice' })),
    api('GET', '/api/automations').catch(() => []),
  ]);
  state.board = board;
  state.workforce = workforce;
  Object.assign(arcade, { crew, dot, automations });
  loadUsage().catch(() => {});
  if (!cos.data) loadCos();
  renderDotPicker();
  $('#chime-toggle').checked = chime.on;
  if (!replay.on) window.Arcade.update(board, workforce, crew, dot, scheduleList());
  renderLegend(board, workforce, crew);
  renderTeam();
  renderSide();
}

const TEAM_ORDER = { tycoon: 0, warden: 1, mech: 1, overlord: 2, dot: 3, agent: 4, crew: 5 };
function renderTeam() {
  const el = $('#arcade-team');
  if (!el || !window.Arcade.team) return;
  const list = window.Arcade.team().sort((a, b) => TEAM_ORDER[a.kind] - TEAM_ORDER[b.kind]);
  el.innerHTML = list.map((m) => {
    const key = JSON.stringify(m.spec);
    if (!portraitCache.has(key)) portraitCache.set(key, window.Sprites.portrait(m.spec).toDataURL());
    const role = m.kind === 'tycoon' ? 'Island owner' : m.kind === 'overlord' ? 'Overlord' : m.kind === 'warden' || m.kind === 'mech' ? 'Mech' : m.kind === 'agent' ? 'Workforce' : m.kind === 'dot' ? 'OG Kush' : 'Hermes';
    return `<div class="pcard" data-team="${esc(JSON.stringify(m.sel))}"><img src="${portraitCache.get(key)}" alt=""><div class="plate">${esc(m.name.toUpperCase().slice(0, 22))}<span>(${role.toUpperCase()})</span></div></div>`;
  }).join('');
}

document.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-cam]');
  if (b) { window.Arcade.camera(b.dataset.cam); return; }
  const c = ev.target.closest('[data-team]');
  if (c) { selectInArcade(JSON.parse(c.dataset.team)); $('#arcade-side').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
});

const PLACE_COLOR = { needs_you: '#f04838', working: '#48b838', bots: '#585878', follow_up: '#d8a000', hq: '#9060d8', done: '#f8d838', failed: '#787088', crew: '#d8a828' };
function renderLegend(board, workforce, crew) {
  const P = window.Arcade.PLACES;
  const jobs = board.columns.flatMap((c) => c.jobs);
  const at = (id) => jobs.filter((j) => (j.source === 'bot' ? 'bots' : P[j.status] ? j.status : 'follow_up') === id);
  const items = (id) => {
    if (id === 'hq') return (workforce.agents || []).map((a) => ({ label: `${a.name}: ${a.lastSummary || a.role}` }));
    if (id === 'crew') return crew.map((m) => ({ label: `${m.busy ? '● ' : '○ '}${m.title} (${m.name})` }));
    return at(id).map((j) => ({ id: j.id, label: `${j.title} · ${j.reason || ''}` }));
  };
  const order = ['needs_you', 'working', 'follow_up', 'bots', 'failed', 'done', 'hq', 'crew'];
  $('#arcade-legend').innerHTML = order.map((id) => {
    const list = items(id);
    return `<div class="place" id="place-${id}"><h3><span><span class="swatch" style="background:${PLACE_COLOR[id]}"></span>${esc(P[id].name)}</span><span class="n">${list.length}</span></h3>
      <p>${esc(P[id].blurb)}</p>
      <ul>${list.slice(0, 6).map((it) => `<li ${it.id ? `data-open-job="${esc(it.id)}"` : ''} title="${esc(it.label)}">${esc(it.label)}</li>`).join('')}${list.length > 6 ? `<li class="muted">+${list.length - 6} more</li>` : ''}</ul></div>`;
  }).join('');
}

document.addEventListener('click', (ev) => {
  const li = ev.target.closest('[data-open-job]');
  if (li) selectInArcade({ type: 'job', id: li.dataset.openJob });
});


/* ---------- home: one calm screen that answers "what needs me?" ---------- */
const ASK = { approve: 'Approve', answer: 'Answer', fix: 'Fix', review: 'Review' };
const ASK_ORDER = { approve: 0, answer: 1, fix: 2, review: 3 };

async function loadHome() {
  const [workforce, automations] = await Promise.all([api('GET', '/api/workforce'), api('GET', '/api/automations').catch(() => [])]);
  state.workforce = workforce;
  arcade.automations = automations;
  if (!state.board) await loadBoard();
  renderHome();
  loadUsage().then(() => { const el = $('#home-fuel'); if (el) el.innerHTML = fuelRows(fuel.data); }).catch(() => {});
  loadCos();
}

function bizInfo(id) {
  return ((state.board && state.board.businesses) || []).find((b) => b.id === id) || { id, name: id, color: '#6b7280' };
}

function waitClass(iso) {
  if (!iso) return '';
  const h = (Date.now() - Date.parse(iso)) / 3600e3;
  return h >= 24 ? 'red' : h >= 2 ? 'amber' : '';
}

/** Everything blocked on Richard, as one list: approvals, questions, failures, reviews. */
function queueItems() {
  const jobs = allJobs();
  const items = [];
  for (const p of (state.workforce && state.workforce.proposals) || []) {
    const job = jobs.find((j) => j.id === p.botJobId);
    items.push({ kind: 'proposal', ask: 'approve', id: p.id, title: p.title, line: p.description || '', at: p.createdAt, business: job ? job.business : 'other', p });
  }
  for (const j of jobs) {
    const run = home.runs[j.id];
    const live = run && (run.status === 'running' || (run.denials && run.denials.length));
    if (j.status !== 'needs_you' && j.status !== 'failed' && !live) continue;
    const act = j.meta && j.meta.activity;
    const line = j.status === 'needs_you' && act && /question|permission/i.test(`${act.label} ${j.reason}`) ? `${act.icon} ${act.label}` : j.reason;
    items.push({ kind: 'job', ask: j.ask || (j.status === 'failed' ? 'fix' : 'review'), id: j.id, title: j.title, line, at: j.lastActivity, business: j.business, j });
  }
  return items.sort((a, b) => ASK_ORDER[a.ask] - ASK_ORDER[b.ask] || Date.parse(a.at || 0) - Date.parse(b.at || 0));
}

function queueHtml(it) {
  const b = bizInfo(it.business);
  const wait = it.at ? `<span class="age ${waitClass(it.at)}">waiting ${ago(it.at).replace(' ago', '')}</span>` : '';
  let btns = '';
  if (it.kind === 'proposal') {
    btns = `<button class="go" data-side-decide="${esc(it.id)}" data-decision="approved">Approve</button><button data-side-decide="${esc(it.id)}" data-decision="approved" data-standing="1">Always allow</button><button data-side-decide="${esc(it.id)}" data-decision="rejected">Not now</button>`;
  } else {
    const j = it.j;
    const primary = j.source === 'bot' && j.meta.restart ? `<button class="go" data-bot-restart="${esc(j.id)}">Restart</button>`
      : j.source === 'automation' && j.meta.automationId ? `<button class="go" data-run-auto="${esc(j.meta.automationId)}" data-tier="${esc(j.meta.tier || '')}">Retry</button>`
      : j.resumeCommand ? `<button class="go" data-side-run="${esc(j.id)}">${it.ask === 'answer' || it.ask === 'approve' ? 'Open & reply' : 'Open'}</button>`
      : j.link ? `<button class="go" data-side-url="${esc(j.link)}">Open</button>` : '';
    btns = `${primary}<button data-side-act='${esc(JSON.stringify({ id: j.id, status: 'done' }))}'>Done</button><button data-side-act='${esc(JSON.stringify({ id: j.id, snoozedUntil: new Date(Date.now() + 4 * 3600e3).toISOString() }))}'>Snooze 4h</button>`;
  }
  // only conversations can be answered; bots and automations get their own buttons (restart, retry)
  const answerable = it.kind === 'job' && ['claude-code', 'codex', 'hermes'].includes(it.j.source) && (it.j.status === 'needs_you' || Boolean(home.runs[it.id]));
  return `<div class="q ${it.ask}"><div class="ask">${ASK[it.ask]}</div>
    <div><div class="t" ${it.kind === 'job' ? `data-side-drawer="${esc(it.id)}"` : ''}>${esc(it.title)}</div>
    <div class="s"><span class="biz" style="background:${b.color}">${esc(b.name)}</span>${wait}${answerable ? '' : `<span>${esc((it.line || '').slice(0, 140))}</span>`}</div>
    ${answerable ? `<div class="ans" data-ans="${esc(it.id)}">${askHtml(it.j, home.asks[it.id])}</div>` : ''}</div>
    <div class="btns">${answerable ? `<button data-side-act='${esc(JSON.stringify({ id: it.j.id, status: 'done' }))}' title="Mark done">✓</button><button data-side-act='${esc(JSON.stringify({ id: it.j.id, snoozedUntil: new Date(Date.now() + 4 * 3600e3).toISOString() }))}' title="Snooze 4 hours">💤</button>` : btns}</div></div>`;
}

const home = { asks: {}, loading: new Set(), open: new Set(), runs: {}, needsLogin: false };

/** Live status of a reply Richard sent: progress, the agent's answer, follow-up approvals. */
function runHtml(run) {
  if (!run) return '';
  const notes = (run.notes || []).slice(-3).map((n) => `<div>${esc(n)}</div>`).join('');
  const head = run.status === 'running' ? '⏳ Sent. The agent is working…' : run.status === 'done' ? '✅ The agent finished.' : '⚠️ The agent hit a problem.';
  const denials = (run.denials || []).map((d, i) => {
    const what = d.input && (d.input.command || d.input.file_path || d.input.url) ? `<code>${esc(String(d.input.command || d.input.file_path || d.input.url).slice(0, 300))}</code>` : '';
    return `<div class="deny">It wants to use <b>${esc(d.tool)}</b>${what}<div class="opts"><button class="opt go" data-allow="${esc(run.jobId)}" data-i="${i}"><b>1</b> Approve</button><button class="opt" data-run-clear="${esc(run.jobId)}"><b>2</b> Don't</button></div></div>`;
  }).join('');
  return `<div class="run ${run.status}"><b>${head}</b>${notes ? `<div class="notes">${notes}</div>` : ''}${run.answer ? `<div class="aq">${esc(run.answer.slice(0, 900))}</div>` : ''}${denials}</div>`;
}

function askHtml(j, ask) {
  const run = home.runs[j.id];
  if (!ask) return run ? runHtml(run) : '<div class="aq muted">Loading the question…</div>';
  if (run && (run.status === 'running' || (run.denials && run.denials.length))) return runHtml(run);
  const opts = (ask.suggested && ask.suggested.length ? ask.suggested : ask.options) || [];
  const q = ask.kind === 'approve' ? `${esc(ask.question)}${ask.detail ? `<code>${esc(ask.detail)}</code>` : ''}` : ask.question && ask.question.trim() !== j.title.trim() ? esc(ask.question) : '';
  const login = home.needsLogin && j.source === 'claude-code' ? '<div class="note">Mission Control needs a one-time Claude sign-in to send replies. <button class="opt go" data-claude-login>Connect Claude</button></div>' : '';
  const other = home.open.has(j.id)
    ? `<div class="other"><textarea rows="2" placeholder="Type your answer…" data-other-text="${esc(j.id)}"></textarea><button class="go" data-answer-other="${esc(j.id)}">Send</button></div>`
    : '';
  return `${run && run.status !== 'running' ? runHtml(run) : ''}${q ? `<div class="aq">${q}</div>` : ''}
    <div class="opts">${opts.map((o, i) => `<button class="opt ${i === 0 ? 'go' : ''}" data-answer="${esc(j.id)}" data-reply="${esc(o.reply)}" ${o.approve ? 'data-approve="1"' : ''} title="${esc(o.reply)}"><b>${i + 1}</b> ${esc(o.label)}</button>`).join('')}
    <button class="opt" data-answer-open="${esc(j.id)}">✍️ Other…</button></div>${other}${login}`;
}

async function hydrateAsks(items) {
  for (const it of items) {
    if (it.kind !== 'job' || it.j.status !== 'needs_you' || !['claude-code', 'codex', 'hermes'].includes(it.j.source) || home.asks[it.id] || home.loading.has(it.id)) continue;
    home.loading.add(it.id);
    api('GET', `/api/ask?id=${encodeURIComponent(it.id)}`)
      .then((ask) => { home.asks[it.id] = ask; paintAsk(it.id); })
      .catch(() => {})
      .finally(() => home.loading.delete(it.id));
  }
}

function paintAsk(id) {
  const j = allJobs().find((x) => x.id === id);
  if (!j) return;
  for (const el of document.querySelectorAll(`[data-ans="${CSS.escape(id)}"]`)) el.innerHTML = askHtml(j, home.asks[id]);
}

async function answer(id, text, { approve = false, allow = null } = {}) {
  const ask = home.asks[id];
  const reply = String(text || '').trim();
  if (!reply) return toast('Type an answer first.', 'bad');
  if (ask && ask.kind === 'decision') {
    await api('POST', '/api/decision', { id, answer: reply });
    toast('Answer sent to Chief of Staff ✓', 'ok');
    delete home.asks[id];
    home.open.delete(id);
    await loadBoard();
    return renderHome();
  }
  const res = await api('POST', '/api/reply', { id, text: reply, approve, allow });
  if (res && res.needsLogin) {
    home.needsLogin = true;
    paintAsk(id);
    return toast('Connect Claude once, then send again.', 'bad');
  }
  home.open.delete(id);
  home.runs[id] = res;
  paintAsk(id);
  toast('Sent to the agent ✓', 'ok');
}

/** Follow a reply's progress as the server streams it. */
function onReplyEvent(e) {
  home.runs[e.jobId] = e.run;
  if (e.type === 'reply:done') {
    delete home.asks[e.jobId];
    toast(e.run.status === 'done' ? `${e.run.title.slice(0, 50)}: agent finished` : `${e.run.title.slice(0, 50)}: agent hit a problem`, e.run.status === 'done' ? 'ok' : 'bad');
  }
  if (state.tab === 'home') paintAsk(e.jobId);
}

document.addEventListener('click', async (ev) => {
  const t = ev.target.closest('[data-answer],[data-answer-open],[data-answer-other],[data-allow],[data-run-clear],[data-claude-login]');
  if (!t) return;
  try {
    if ('claudeLogin' in t.dataset) {
      await api('POST', '/api/claude/login');
      home.needsLogin = false;
      return toast('Finish signing in to Claude in your browser, then send your answer again.', 'ok');
    }
    if (t.dataset.allow) {
      const run = home.runs[t.dataset.allow];
      const d = run && run.denials && run.denials[Number(t.dataset.i)];
      if (!d) return;
      // a forked reply continues in its own session; approve there
      const target = run.forked && run.sessionId ? `claude-code:${run.sessionId}` : run.jobId;
      await loadBoard();
      return await answer(target, 'Approved. Run it now and continue.', { allow: { tool: d.tool, input: d.input } });
    }
    if (t.dataset.runClear) { delete home.runs[t.dataset.runClear]; return paintAsk(t.dataset.runClear); }
    if (t.dataset.answer) return await answer(t.dataset.answer, t.dataset.reply, { approve: t.dataset.approve === '1' });
    if (t.dataset.answerOpen) { const id = t.dataset.answerOpen; home.open.has(id) ? home.open.delete(id) : home.open.add(id); paintAsk(id); const ta = [...document.querySelectorAll(`[data-other-text="${CSS.escape(id)}"]`)].find((x) => x.offsetParent); if (ta) ta.focus(); return; }
    if (t.dataset.answerOther) { const ta = t.closest('.other') && t.closest('.other').querySelector('textarea'); return await answer(t.dataset.answerOther, ta && ta.value); }
  } catch (err) { toast(err.message, 'bad'); }
});

function renderHome() {
  if (!state.board) return;
  const all = queueItems();
  const items = state.biz === 'all' ? all : all.filter((x) => x.business === state.biz);
  const jobs = allJobs();
  const hour = new Date().getHours();
  $('#home-hello').textContent = `${hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'}, Richard`;
  // always-on bots live on the Bots tab; "working" here means real work in progress
  const working = jobs.filter((j) => j.status === 'working' && j.source !== 'bot');
  $('#home-sub').textContent = `${all.length ? `${all.length} thing${all.length === 1 ? '' : 's'} need${all.length === 1 ? 's' : ''} you` : 'Nothing needs you'} · ${working.length} working · updated ${ago(state.board.generatedAt)}`;
  const pill = $('#pill-home');
  pill.hidden = !all.length;
  pill.textContent = all.length;

  // business tabs (only businesses with something going on)
  const active = state.board.businesses.filter((b) => jobs.some((j) => j.business === b.id));
  $('#biz-tabs').innerHTML = [`<button data-biz="all" class="${state.biz === 'all' ? 'on' : ''}">All ${all.length ? `· ${all.length}` : ''}</button>`]
    .concat(active.map((b) => { const n = all.filter((x) => x.business === b.id).length; return `<button data-biz="${b.id}" class="${state.biz === b.id ? 'on' : ''}"><span class="dot" style="background:${b.color}"></span>${esc(b.name)}${n ? ` · ${n}` : ''}</button>`; }))
    .join('');

  $('#queue-count').textContent = items.length ? `(${items.length})` : '';
  $('#queue').innerHTML = items.length ? items.map(queueHtml).join('') : `<div class="clear">✅ You're clear${state.biz === 'all' ? '' : ` in ${esc(bizInfo(state.biz).name)}`}. Nothing is waiting on you.</div>`;
  hydrateAsks(items);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  $('#biz-cards').innerHTML = active.map((b) => {
    const mine = jobs.filter((j) => j.business === b.id);
    const you = all.filter((x) => x.business === b.id).length;
    const w = mine.filter((j) => j.status === 'working').length;
    const failed = mine.filter((j) => j.status === 'failed').length;
    const done = mine.filter((j) => j.status === 'done' && j.lastActivity && Date.parse(j.lastActivity) >= today.getTime()).length;
    return `<div class="bizcard" data-biz="${b.id}" style="border-top-color:${b.color}"><div class="name"><span>${esc(b.full || b.name)}</span></div>
      <div class="nums"><span class="you"><b>${you}</b>need you</span><span><b>${w}</b>working</span><span><b>${done}</b>done today</span>${failed ? `<span class="bad"><b>${failed}</b>failed</span>` : ''}</div></div>`;
  }).join('') || '<div class="mini-list"><div class="empty">No activity yet.</div></div>';

  const shown = state.biz === 'all' ? working : working.filter((j) => j.business === state.biz);
  $('#working-list').innerHTML = shown.slice(0, 10).map((j) => {
    const a = j.meta && j.meta.activity;
    return `<div class="row" data-side-drawer="${esc(j.id)}"><span class="main">${a ? `${a.icon} ` : ''}<b>${esc(j.title)}</b>${a ? ` <span class="muted">— ${esc(a.label)}</span>` : ''}</span><span class="side">${esc(bizInfo(j.business).name)}</span></div>`;
  }).join('') || '<div class="empty">Nothing running right now.</div>';

  $('#upcoming').innerHTML = scheduleList().slice(0, 5).map((x) => `<div class="row" ${x.kind === 'agent' ? `data-tab-agent="${esc(x.id)}"` : ''}><span class="main">⏰ ${esc(x.name)}</span><span class="side">${until(x.nextRunAt)}</span></div>`).join('') || '<div class="empty">Nothing scheduled.</div>';
}

document.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-biz]');
  if (b && state.tab === 'home') { state.biz = b.dataset.biz === state.biz && b.classList.contains('bizcard') ? 'all' : b.dataset.biz; renderHome(); }
});

/* ---------- chat with a chief of staff ---------- */
const cos = { data: null, profile: (() => { try { return localStorage.getItem('mc-cos') || 'hermes-cos'; } catch { return 'hermes-cos'; } })() };
async function loadCos() {
  cos.data = await api('GET', '/api/cos').catch(() => ({ profiles: [], chats: [] }));
  paintCos();
}
function cosHtml() {
  const d = cos.data || { profiles: [], chats: [] };
  const opts = d.profiles.map((p) => `<option value="${esc(p.id)}" ${p.id === cos.profile ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
  const recent = d.chats.slice(0, 3).map((c) => `<div class="cos-x ${c.status}"><div class="cos-q">You: ${esc(c.q)}</div><div class="cos-a">${c.status === 'running' ? '⏳ Thinking (local model, free)…' : esc(c.a.slice(0, 900))}</div></div>`).join('');
  return `<div class="cos-box"><select data-cos-profile>${opts}</select><textarea rows="2" data-cos-text placeholder="Ask or assign anything… e.g. 'Who hasn't logged Joel Brock in Zoho?'"></textarea><button class="go" data-cos-send>Send</button></div>${recent}`;
}
function paintCos() {
  for (const el of document.querySelectorAll('[data-cos-panel]')) {
    const typed = el.querySelector('[data-cos-text]');
    const keep = typed ? typed.value : '';
    el.innerHTML = cosHtml();
    if (keep) el.querySelector('[data-cos-text]').value = keep;
  }
}
document.addEventListener('click', async (ev) => {
  const b = ev.target.closest('[data-cos-send]');
  if (!b) return;
  const box = b.closest('[data-cos-panel]');
  const text = box.querySelector('[data-cos-text]').value.trim();
  if (!text) return toast('Type a message first.', 'bad');
  try {
    await api('POST', '/api/cos', { text, profile: cos.profile });
    box.querySelector('[data-cos-text]').value = '';
    toast('Sent to your chief of staff', 'ok');
    loadCos();
  } catch (err) { toast(err.message, 'bad'); }
});
document.addEventListener('change', (ev) => {
  if (!ev.target.matches('[data-cos-profile]')) return;
  cos.profile = ev.target.value;
  try { localStorage.setItem('mc-cos', cos.profile); } catch { /* ignore */ }
});

/* ---------- daily replay ---------- */
const replay = { on: false, frames: [], i: 0, timer: null };
function replayShow(i) {
  replay.i = Math.max(0, Math.min(replay.frames.length - 1, i));
  const f = replay.frames[replay.i];
  if (!f) return;
  const label = new Date(f.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  $('#replay-slider').value = replay.i;
  $('#replay-time').textContent = label;
  window.Arcade.setReplay(label);
  window.Arcade.update(f.board, state.workforce, arcade.crew, arcade.dot, scheduleList());
}
function replayStop() {
  clearInterval(replay.timer);
  replay.timer = null;
  $('#replay-play').textContent = '▶';
}
async function replayOpen() {
  const data = await api('GET', '/api/replay');
  if (!data.frames.length) return toast('Nothing recorded yet today. The replay builds up as the day goes on.', 'bad');
  Object.assign(replay, { on: true, frames: data.frames });
  $('#replay-slider').max = data.frames.length - 1;
  $('#replay-bar').hidden = false;
  window.Arcade.camera('fit');
  replayShow(0);
}
async function replayClose() {
  replayStop();
  replay.on = false;
  $('#replay-bar').hidden = true;
  window.Arcade.setReplay('');
  await loadArcade();
}
document.addEventListener('click', (ev) => {
  const t = ev.target.closest('#replay-open,#replay-live,#replay-play');
  if (!t) return;
  if (t.id === 'replay-open') return replayOpen().catch((err) => toast(err.message, 'bad'));
  if (t.id === 'replay-live') return replayClose();
  if (replay.timer) return replayStop();
  if (replay.i >= replay.frames.length - 1) replayShow(0);
  t.textContent = '⏸';
  replay.timer = setInterval(() => { if (replay.i >= replay.frames.length - 1) return replayStop(); replayShow(replay.i + 1); }, Number($('#replay-speed').value));
});
document.addEventListener('input', (ev) => { if (ev.target.id === 'replay-slider') { replayStop(); replayShow(Number(ev.target.value)); } });
document.addEventListener('change', (ev) => {
  if (ev.target.id !== 'replay-speed' || !replay.timer) return;
  replayStop();
  $('#replay-play').click();
});

/* ---------- usage / fuel ---------- */
const fuel = { data: null, at: 0 };
async function loadUsage() {
  if (fuel.data && Date.now() - fuel.at < 60e3) return fuel.data;
  fuel.data = await api('GET', '/api/usage').catch(() => null);
  fuel.at = Date.now();
  if (fuel.data && window.Arcade && window.Arcade.setUsage) window.Arcade.setUsage(fuel.data);
  return fuel.data;
}
const fmtTok = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n || 0));
function fuelRows(u) {
  if (!u) return '<div class="empty">Loading…</div>';
  const bar = (pct, color) => `<div class="fbar"><span style="width:${Math.max(0, Math.min(100, pct))}%;background:${color}"></span></div>`;
  const rows = [];
  if (u.codex.ok && u.codex.primary) {
    const left = 100 - u.codex.primary.usedPercent;
    rows.push(`<div class="frow"><b>Codex</b><span>${Math.round(left)}% left this week · resets ${until(u.codex.primary.resetsAt).replace('in ', 'in ')}</span>${bar(left, left < 20 ? 'var(--bad)' : left < 40 ? 'var(--warn)' : '#10b088')}</div>`);
  } else rows.push(`<div class="frow"><b>Codex</b><span>${esc(u.codex.reason || 'no data')}</span></div>`);
  if (u.claude.ok) rows.push(`<div class="frow"><b>Claude</b><span>${fmtTok(u.claude.tokens5h)} tokens in 5h · ${u.claude.sessions5h} sessions</span>${bar(Math.min(100, (u.claude.tokens5h / 5e6) * 100), '#e07850')}<div class="muted small">Activity, not a %: Anthropic doesn't publish your Max cap.</div></div>`);
  rows.push(u.grok.ok ? `<div class="frow"><b>Grok</b><span>${Math.round(100 - u.grok.usedPercent)}% left</span>${bar(100 - u.grok.usedPercent, '#9aa8c0')}</div>` : `<div class="frow"><b>Grok</b><span>${esc(u.grok.reason)}</span></div>`);
  rows.push(u.local.ok ? `<div class="frow"><b>Local Qwen</b><span>free · ${u.local.loaded.length ? esc(u.local.loaded[0].replace(/-UD.*/, '')) + ' loaded' : 'idle'}${u.local.busy ? ` · ${u.local.busy} busy` : ''}</span>${bar(100, '#2affd0')}</div>` : `<div class="frow"><b>Local Qwen</b><span>${esc(u.local.reason)}</span></div>`);
  return rows.join('');
}

/* ---------- arcade sidebar ---------- */
function allJobs() {
  return state.board ? state.board.columns.flatMap((c) => c.jobs) : [];
}

function scheduleList() {
  const agents = ((state.workforce && state.workforce.agents) || []).map((a) => ({ name: a.name, nextRunAt: a.nextRunAt, kind: 'agent', id: a.id, cadence: a.cadence }));
  const autos = arcade.automations.filter((a) => a.nextRunAt).map((a) => ({ name: a.title || a.id, nextRunAt: a.nextRunAt, kind: 'automation', id: a.id, cadence: a.schedule, tier: a.tier }));
  return agents.concat(autos).filter((x) => x.nextRunAt).sort((a, b) => Date.parse(a.nextRunAt) - Date.parse(b.nextRunAt));
}

function until(iso) {
  if (!iso) return '';
  const ms = Date.parse(iso) - Date.now();
  if (ms <= 30e3) return 'any moment';
  const m = Math.round(ms / 60000);
  if (m < 60) return `in ${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `in ${h}h ${m % 60}m` : `in ${Math.floor(h / 24)}d`;
}

function selectInArcade(sel) {
  arcade.sel = sel;
  window.Arcade.select(sel);
  renderSide();
}

const placeOfJob = (j) => (window.Arcade.placeOf ? window.Arcade.placeOf(j) : j.source === 'bot' ? 'bots' : j.status);
const jobLi = (j) => `<li data-side-select="${esc(j.id)}">${esc(j.title)}<span class="sub">${j.meta && j.meta.activity ? `${j.meta.activity.icon} ${esc(j.meta.activity.label)}` : esc(j.reason)}</span></li>`;
const btn = (label, attrs, cls = '') => `<button class="${cls}" ${attrs}>${label}</button>`;

const portraitCache = new Map();
/** Pixel portrait card (Fund Manager agents-grid style) for whatever is selected. */
function portraitHtml(sel, name, role, big = true) {
  const info = window.Arcade && window.Arcade.info(sel);
  const spec = info && info.spec;
  if (!spec || !window.Sprites) return '';
  const key = JSON.stringify(spec);
  if (!portraitCache.has(key)) portraitCache.set(key, window.Sprites.portrait(spec).toDataURL());
  return `<div class="pcard ${big ? 'big' : ''}"><img src="${portraitCache.get(key)}" alt=""><div class="plate">${esc(String(name || '').toUpperCase())}${role ? `<span>(${esc(String(role).toUpperCase())})</span>` : ''}</div></div>`;
}

function renderSide() {
  const el = $('#arcade-side');
  if (!el || !state.board) return;
  const sel = arcade.sel;
  const back = sel ? '<button class="back" data-side-clear>← Your turn</button>' : '';
  const proposals = (state.workforce && state.workforce.proposals) || [];
  if (!sel) {
    const needs = allJobs().filter((j) => j.status === 'needs_you');
    const failed = allJobs().filter((j) => j.status === 'failed');
    const next = scheduleList()[0];
    el.innerHTML = `<h2>YOUR TURN</h2>
      ${needs.length ? `<ul>${needs.map(jobLi).join('')}</ul>` : '<div class="empty">Nothing is waiting on you. 🎉</div>'}
      <h2>APPROVALS</h2>
      ${proposals.length ? proposals.map((p) => `<div class="doing"><b>${esc(p.title)}</b><div class="why">${esc(p.description || '')}</div><div class="btns">${btn('Approve', `data-side-decide="${esc(p.id)}" data-decision="approved"`, 'go')}${btn('Always allow', `data-side-decide="${esc(p.id)}" data-decision="approved" data-standing="1"`)}${btn('Not now', `data-side-decide="${esc(p.id)}" data-decision="rejected"`)}</div></div>`).join('') : '<div class="empty">No approvals pending.</div>'}
      ${failed.length ? `<h2>IN THE GHOST HOUSE</h2><ul>${failed.map(jobLi).join('')}</ul>` : ''}
      ${next ? `<h2>NEXT UP</h2><div class="doing">⏰ <b>${esc(next.name)}</b> runs ${until(next.nextRunAt)}</div>` : ''}
      <h2>ASK YOUR CHIEF OF STAFF</h2><div data-cos-panel>${cosHtml()}</div>
      <div class="meta">Click anyone on the map, or a building, to see details here.</div>`;
    return;
  }
  if (sel.type === 'job') {
    const j = allJobs().concat(state.board.snoozed || []).find((x) => x.id === sel.id);
    if (!j) { el.innerHTML = `${back}<div class="empty">That job is no longer on the board.</div>`; return; }
    const src = sourceFor(j);
    const act = j.meta && j.meta.activity;
    const mine = proposals.filter((p) => p.botJobId === j.id);
    const actions = [];
    if (j.source === 'bot') {
      if (j.meta.restart) actions.push(btn('↻ Restart', `data-bot-restart="${esc(j.id)}"`, 'go'));
      if (j.meta.logFile) actions.push(btn('📄 Log', `data-side-path="${esc(j.meta.logFile)}"`));
    }
    if (j.source === 'automation' && j.meta.automationId) actions.push(btn('↻ Retry', `data-run-auto="${esc(j.meta.automationId)}" data-tier="${esc(j.meta.tier || '')}"`, j.status === 'failed' ? 'go' : ''));
    if (j.link) actions.push(btn('🔗 Open link', `data-side-url="${esc(j.link)}"`));
    if (j.cwd) actions.push(btn('📁 Folder', `data-side-path="${esc(j.cwd)}"`));
    const status = [];
    if (j.status !== 'done') status.push(btn('✓ Done', `data-side-act='${esc(JSON.stringify({ id: j.id, status: 'done' }))}'`));
    status.push(btn('Snooze 4h', `data-side-act='${esc(JSON.stringify({ id: j.id, snoozedUntil: new Date(Date.now() + 4 * 3600e3).toISOString() }))}'`));
    if (j.status !== 'follow_up') status.push(btn('Follow up later', `data-side-act='${esc(JSON.stringify({ id: j.id, status: 'follow_up' }))}'`));
    status.push(btn('Dismiss', `data-side-act='${esc(JSON.stringify({ id: j.id, archived: true }))}'`, 'warn'));
    const role = (window.Sprites && window.Arcade.info(sel) && window.Arcade.info(sel).spec && window.Arcade.info(sel).spec.label) || src.label;
    el.innerHTML = `${back}${portraitHtml(sel, src.label, role)}
      <div class="chips"><span class="chip ${j.status}">${STATUS_LABEL[j.status]}</span><span class="chip">${esc(src.label)}</span>${j.alive ? '<span class="chip working">live</span>' : ''}${j.meta && j.meta.alias ? `<span class="chip">🌿 ${esc(j.meta.alias)}</span>` : ''}</div>
      <h3>${esc(j.title)}</h3>
      ${act ? `<div class="doing"><span class="k">Doing now</span>${act.icon} ${esc(act.label)}${act.at ? ` <span class="meta">· ${ago(act.at)}</span>` : ''}</div>` : ''}
      <div class="why">${esc(j.reason)}</div>
      ${mine.map((p) => `<div class="doing"><span class="k">Needs your OK</span>${esc(p.title)}<div class="btns">${btn('Approve', `data-side-decide="${esc(p.id)}" data-decision="approved"`, 'go')}${btn('Always allow', `data-side-decide="${esc(p.id)}" data-decision="approved" data-standing="1"`)}${btn('Not now', `data-side-decide="${esc(p.id)}" data-decision="rejected"`)}</div></div>`).join('')}
      ${j.status === 'needs_you' || home.runs[j.id] ? `<div class="q side-q"><div class="ans" data-ans="${esc(j.id)}">${askHtml(j, home.asks[j.id])}</div></div>` : ''}
      <div class="btns">${actions.join('')}</div>
      ${j.lastMessage && j.status !== 'needs_you' ? `<div class="msg">${esc(j.lastMessage)}</div>` : ''}
      <div class="meta">${[j.cwd && `📁 ${esc(j.cwd)}`, j.branch && `⎇ ${esc(j.branch)}`, j.lastActivity && `last activity ${ago(j.lastActivity)}`].filter(Boolean).join('<br>')}</div>
      <div class="btns">${status.join('')}${btn('Full details', `data-side-drawer="${esc(j.id)}"`)}</div>`;
    if (j.status === 'needs_you') hydrateAsks([{ kind: 'job', id: j.id, j }]);
    return;
  }
  if (sel.type === 'agent') {
    const a = ((state.workforce && state.workforce.agents) || []).find((x) => x.id === sel.id);
    if (!a) { el.innerHTML = back; return; }
    el.innerHTML = `${back}${portraitHtml(sel, a.name, 'Workforce')}<div class="chips"><span class="chip">Workforce agent</span><span class="chip">${esc(a.tier)}</span>${a.running ? '<span class="chip working">running</span>' : ''}${a.enabled ? '' : '<span class="chip failed">off</span>'}</div>
      <h3>${esc(a.name)}</h3><div class="why">${esc(a.role)}</div>
      <div class="doing"><span class="k">Last run ${a.lastRunAt ? ago(a.lastRunAt) : 'never'}</span>${esc(a.lastSummary || 'No runs yet.')}</div>
      ${a.lastError ? `<div class="doing" style="border-color:#e8434f"><span class="k">Last error</span>${esc(a.lastError)}</div>` : ''}
      <div class="meta">Runs ${esc(a.cadence)}${a.nextRunAt ? ` · next ${until(a.nextRunAt)}` : ''}</div>
      <div class="btns">${btn('▶ Run now', `data-side-run-agent="${esc(a.id)}"`, 'go')}${btn(a.enabled ? 'Turn off' : 'Turn on', `data-side-agent-toggle="${esc(a.id)}" data-on="${a.enabled ? '0' : '1'}"`)}</div>`;
    return;
  }
  if (sel.type === 'crew') {
    const m = arcade.crew.find((x) => x.id === sel.id);
    if (!m) { el.innerHTML = back; return; }
    el.innerHTML = `${back}${portraitHtml(sel, m.title, `Hermes ${m.name}`)}<div class="chips"><span class="chip">Hermes profile</span>${m.busy ? '<span class="chip working">active</span>' : '<span class="chip">idle</span>'}</div>
      <h3>${esc(m.title)}</h3><div class="why">${esc(m.description || '')}</div>
      <div class="meta">Profile: ${esc(m.name)}<br>Last active ${m.lastActive ? ago(m.lastActive) : 'unknown'}</div>
      <div class="btns">${btn('📁 Open profile folder', `data-side-path="${esc(m.dir || '')}"`)}${btn('🌿 Make this OG Kush', `data-side-dot="${esc(m.id)}"`)}</div>`;
    return;
  }
  if (sel.type === 'dot') {
    const mine = allJobs().filter((j) => j.meta && j.meta.agent === 'Dot');
    el.innerHTML = `${back}${portraitHtml(sel, 'Dot', 'OG Kush')}<div class="chips"><span class="chip">🌿 OG Kush</span></div><h3>Dot</h3>
      <div class="why">Your voice assistant. Right now Dot is tracked as any Codex thread you started by voice. If Dot is actually a Grok bot or a Hermes agent, pick it in "Dot (OG Kush) is" above the map.</div>
      <h2>HANDED TO CODEX</h2>${mine.length ? `<ul>${mine.map(jobLi).join('')}</ul>` : '<div class="empty">No voice-started threads in the last day.</div>'}`;
    return;
  }
  if (sel.type === 'tycoon') {
    const jobs = allJobs();
    const w = window.Arcade.weather || {};
    const sky = (k) => ({ sun: '☀️ clear', rain: '🌧 rain: something is waiting on you', storm: '⛈ storm: something failed' })[w[k]] || '☀️ clear';
    el.innerHTML = `${back}${portraitHtml(sel, 'The Tycoon', 'Owner of the island')}
      <div class="why">Owns Tycoon Isle, the yacht and, by his account, everyone on it. Strolls between the castle and the Goal muttering about efficiency. The cat is not for sale.</div>
      <h2>THE FORECAST</h2>
      ${(window.Arcade.ISLANDS || []).map((i) => `<div class="isl-row" data-side-island="${esc(i.id)}"><b>${esc(i.name)}</b><span class="n">${sky(i.id)}</span></div>`).join('')}
      <div class="meta">${jobs.filter((j) => j.status === 'needs_you').length} need you · ${jobs.filter((j) => j.status === 'failed').length} failed · ${jobs.filter((j) => j.status === 'working').length} working</div>`;
    return;
  }
  if (sel.type === 'warden') {
    const info = window.Arcade.info(sel);
    if (!info) { el.innerHTML = back; return; }
    const isl = (window.Arcade.ISLANDS || []).find((i) => i.id === info.island);
    el.innerHTML = `${back}${portraitHtml(sel, info.title.replace('The ', ''), 'Mech overlord')}
      <div class="chips"><span class="chip">🤖 Rules ${esc(isl ? isl.name : info.island)}</span>${info.checking ? '<span class="chip working">scanning</span>' : '<span class="chip">on patrol</span>'}</div>
      <div class="why">Patrols every corner of its island, scans each department or ride, and leans on anyone who has gone quiet.</div>
      <h2>RECENT SCANS</h2>${info.log.length ? `<ul>${info.log.map((l) => `<li>🔍 ${esc(l.what)}<span class="sub">${ago(new Date(l.at).toISOString())} · ${l.n} agent${l.n === 1 ? '' : 's'} there</span></li>`).join('')}</ul>` : '<div class="empty">Just left the hangar.</div>'}
      <div class="btns">${btn('Enter this island', `data-side-island="${esc(info.island)}"`, 'go')}</div>`;
    return;
  }
  if (sel.type === 'place' && sel.id === 'fuel') {
    el.innerHTML = `${back}<h2>FUEL DEPOT</h2><div class="why">How much of each AI's allowance is left. Background thinking in Mission Control runs on the free local model, so it never touches these.</div><div class="fuel-side">${fuelRows(fuel.data)}</div>`;
    loadUsage().then(() => { if (arcade.sel && arcade.sel.id === 'fuel') $('#arcade-side .fuel-side').innerHTML = fuelRows(fuel.data); });
    return;
  }
  if (sel.type === 'place' && sel.id === 'eye') {
    const jobs = allJobs();
    const isls = (window.Arcade.ISLANDS || []).map((i) => ({ i, n: jobs.filter((j) => (window.Arcade.PLACES[placeOfJob(j)] || {}).island === i.id || (i.id === 'main' && !(window.Arcade.PLACES[placeOfJob(j)] || {}).island)).length }));
    const urgent = jobs.filter((j) => j.status === 'needs_you' || j.status === 'failed');
    el.innerHTML = `${back}<h2>THE EYE</h2><div class="why">Sees every agent on every island at once. Its beam lands on whatever needs you most.</div>
      <div class="doing"><span class="k">Watching</span>${jobs.length} jobs and bots across ${isls.length} islands</div>
      ${isls.map(({ i, n }) => `<div class="isl-row" data-side-island="${esc(i.id)}"><b>${esc(i.name)}</b><span class="n">${n}</span></div>`).join('')}
      <h2>IN ITS SIGHT</h2>${urgent.length ? `<ul>${urgent.map(jobLi).join('')}</ul>` : '<div class="empty">Nothing needs you. The Eye rests.</div>'}`;
    return;
  }
  if (sel.type === 'island') {
    const isl = (window.Arcade.ISLANDS || []).find((i) => i.id === sel.id);
    const P = window.Arcade.PLACES;
    const places = Object.entries(P).filter(([, p]) => (sel.id === 'main' ? !p.island : p.island === sel.id));
    const jobsAt = (id) => allJobs().filter((j) => placeOfJob(j) === id);
    const total = places.reduce((n, [id]) => n + jobsAt(id).length, 0);
    const intro = sel.id === 'backrooms' ? 'Where the coders and office work live: one department per company.' : sel.id === 'funpark' ? 'One ride per app. Anyone working on an app rides it; social and creative work is at the Content Studio.' : sel.id === 'cyber' ? 'The machine city: the Bot Fortress, the mech hangar, and the Eye on its golden pyramid watching every island.' : 'Status landmarks: anyone who needs you, finished or failed comes here.';
    el.innerHTML = `${back}<h2>${esc(isl ? isl.name : sel.id)}</h2><div class="why">${intro}</div>
      <div class="doing"><span class="k">On this island</span>${total} agents working here</div>
      ${places.map(([id, p]) => {
        const list = jobsAt(id);
        const urgent = list.filter((j) => j.status === 'needs_you' || j.status === 'failed').length;
        return `<div class="isl-row" data-side-place="${esc(id)}"><b>${esc(p.name)}</b><span class="n">${list.length}${urgent ? ` · <span style="color:#ff7a7a">${urgent} need you</span>` : ''}</span>
          ${list.length ? `<ul>${list.slice(0, 4).map(jobLi).join('')}${list.length > 4 ? `<li class="sub">+${list.length - 4} more</li>` : ''}</ul>` : ''}</div>`;
      }).join('')}`;
    return;
  }
  if (sel.type === 'overlord') {
    const info = window.Arcade.info(sel);
    const m = arcade.crew.find((x) => x.id === sel.id);
    if (!info || !m) { el.innerHTML = back; return; }
    const realm = info.realm || {};
    const mine = realm.business === '*' ? allJobs() : allJobs().filter((j) => j.business === realm.business);
    const n = (st) => mine.filter((j) => j.status === st).length;
    const urgent = mine.filter((j) => j.status === 'needs_you' || j.status === 'failed');
    el.innerHTML = `${back}${portraitHtml(sel, realm.label, m.title)}
      <div class="chips"><span class="chip">${realm.grand ? '👑 Oversees every realm' : realm.liaison ? 'Grok ↔ Hermes liaison' : `Realm: ${esc(info.businessName || realm.business)}`}</span>${info.checking ? '<span class="chip working">checking in</span>' : '<span class="chip">on patrol</span>'}</div>
      <div class="why">${esc(m.description || '')}</div>
      <div class="doing"><span class="k">Realm right now</span>${n('needs_you')} need you · ${n('working')} working · ${n('failed')} failed · ${n('done')} done</div>
      ${urgent.length ? `<h2>NEEDS ATTENTION</h2><ul>${urgent.map(jobLi).join('')}</ul>` : '<div class="empty">Nothing urgent in this realm.</div>'}
      <h2>RECENT CHECK-INS</h2>${info.log.length ? `<ul>${info.log.map((l) => `<li>✓ ${esc((l.what || '').slice(0, 60))}<span class="sub">${ago(new Date(l.at).toISOString())}${l.status ? ` · ${esc(STATUS_LABEL[l.status] || l.status)}` : ''}</span></li>`).join('')}</ul>` : '<div class="empty">Just started the rounds.</div>'}
      <div class="btns">${realm.business && realm.business !== '*' ? btn('Show this realm on Home', `data-side-realm="${esc(realm.business)}"`, 'go') : ''}${btn('📁 Profile folder', `data-side-path="${esc(m.dir || '')}"`)}</div>`;
    return;
  }
  if (sel.type === 'place') {
    if (sel.id === 'clock') {
      const list = scheduleList();
      el.innerHTML = `${back}<h2>CLOCK TOWER</h2><div class="why">When each scheduled agent and automation runs next.${state.workforce && state.workforce.paused ? ' <b>The workforce is paused.</b>' : ''}</div>
        <ul>${list.map((x) => `<li ${x.kind === 'agent' ? `data-side-agent="${esc(x.id)}"` : ''}>⏰ ${esc(x.name)} <b style="float:right">${until(x.nextRunAt)}</b><span class="sub">${esc(x.cadence || '')}${x.tier ? ` · ${esc(x.tier)}` : ''}</span></li>`).join('') || '<div class="empty">Nothing scheduled.</div>'}</ul>`;
      return;
    }
    const P = window.Arcade.PLACES[sel.id];
    let items = '';
    if (sel.id === 'hq') items = ((state.workforce && state.workforce.agents) || []).map((a) => `<li data-side-agent="${esc(a.id)}">${esc(a.name)}<span class="sub">${esc(a.lastSummary || a.role)}</span></li>`).join('');
    else if (sel.id === 'crew') items = arcade.crew.map((m) => `<li data-side-crew="${esc(m.id)}">${m.busy ? '🟢' : '⚪'} ${esc(m.title)}<span class="sub">${esc(m.name)} · ${esc(m.description || '')}</span></li>`).join('');
    else items = allJobs().filter((j) => placeOfJob(j) === sel.id).map(jobLi).join('');
    el.innerHTML = `${back}<h2>${esc(P.name)}</h2><div class="why">${esc(P.blurb)}</div><ul>${items || '<div class="empty">Empty right now.</div>'}</ul>`;
  }
}

const refreshViews = () => (state.tab === 'home' ? loadHome() : state.tab === 'arcade' ? loadArcade() : loadBoard());

document.addEventListener('click', async (ev) => {
  const t = ev.target.closest('[data-side-island],[data-side-place],[data-side-realm],[data-side-clear],[data-side-select],[data-side-act],[data-side-run],[data-side-copy],[data-side-path],[data-side-url],[data-side-drawer],[data-side-decide],[data-side-run-agent],[data-side-agent-toggle],[data-side-agent],[data-side-crew],[data-side-dot]');
  if (!t) return;
  const d = t.dataset;
  const job = (id) => allJobs().concat(state.board.snoozed || []).find((x) => x.id === id);
  try {
    if ('sideClear' in d) return selectInArcade(null);
    if (d.sideRealm) { state.biz = d.sideRealm; return showTab('home'); }
    if (d.sidePlace) return selectInArcade({ type: 'place', id: d.sidePlace });
    if (d.sideIsland) { window.Arcade.enterIsland(d.sideIsland); return; }
    if (d.sideSelect) return selectInArcade({ type: 'job', id: d.sideSelect });
    if (d.sideAgent) return selectInArcade({ type: 'agent', id: d.sideAgent });
    if (d.sideCrew) return selectInArcade({ type: 'crew', id: d.sideCrew });
    if (d.sideDrawer) return openJob(d.sideDrawer);
    if (d.sideAct) { const { id, ...patch } = JSON.parse(d.sideAct); await api('POST', '/api/job/override', { id, ...patch }); toast('Updated', 'ok'); if (patch.archived || patch.snoozedUntil) selectInArcade(null); await loadBoard(); return refreshViews(); }
    if (d.sideRun) { const r = await api('POST', '/api/open', { command: job(d.sideRun).resumeCommand }); return toast(r.ok ? `Opened in ${r.opened}` : r.error, r.ok ? 'ok' : 'bad'); }
    if (d.sideCopy) { await navigator.clipboard.writeText(job(d.sideCopy).resumeCommand); return toast('Copied'); }
    if (d.sidePath) { const r = await api('POST', '/api/open', { path: d.sidePath }); return r.ok ? null : toast(r.error, 'bad'); }
    if (d.sideUrl) { const r = await api('POST', '/api/open', { url: d.sideUrl }); return r.ok ? null : toast(r.error, 'bad'); }
    if (d.sideDecide) { await api('POST', '/api/workforce/proposal', { id: d.sideDecide, decision: d.decision, standing: Boolean(d.standing) }); toast(d.decision === 'approved' ? 'Approved' : 'Declined', 'ok'); return refreshViews(); }
    if (d.sideRunAgent) { toast('Running…'); await api('POST', '/api/workforce/agent', { id: d.sideRunAgent, run: true }); return refreshViews(); }
    if (d.sideAgentToggle) { await api('POST', '/api/workforce/agent', { id: d.sideAgentToggle, enabled: d.on === '1' }); return refreshViews(); }
    if (d.sideDot) { arcade.dot = await api('POST', '/api/dot', { target: d.sideDot }); toast('OG Kush updated', 'ok'); return refreshViews(); }
  } catch (err) {
    toast(err.message, 'bad');
  }
});

/* ---------- chime: a short 16-bit jingle when something new needs you ---------- */
const chime = {
  get on() { try { return localStorage.getItem('mc-chime') !== '0'; } catch { return true; } },
  set on(v) { try { localStorage.setItem('mc-chime', v ? '1' : '0'); } catch { /* ignore */ } },
  seen: null,
  play() {
    try {
      const ctx = chime.ctx || (chime.ctx = new AudioContext());
      const t0 = ctx.currentTime + 0.02;
      [[988, 0], [1319, 0.09], [1976, 0.18]].forEach(([freq, at]) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'square';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.06, t0 + at);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + at + 0.16);
        o.connect(g).connect(ctx.destination);
        o.start(t0 + at);
        o.stop(t0 + at + 0.18);
      });
    } catch { /* audio blocked */ }
  },
  check(board) {
    const ids = new Set(board.columns.flatMap((c) => c.jobs).filter((j) => j.status === 'needs_you').map((j) => j.id));
    const fresh = chime.seen ? [...ids].filter((id) => !chime.seen.has(id)) : [];
    chime.seen = ids;
    if (fresh.length && chime.on) chime.play();
  },
};
document.addEventListener('change', (ev) => {
  if (ev.target.id === 'chime-toggle') { chime.on = ev.target.checked; if (chime.on) chime.play(); }
});

function renderDotPicker() {
  const jobs = state.board ? state.board.columns.flatMap((c) => c.jobs) : [];
  const opts = [['codex-voice', 'Codex voice delegations']]
    .concat(jobs.filter((j) => j.source === 'bot').map((j) => [j.id, `Bot: ${j.title}`]))
    .concat(arcade.crew.map((m) => [m.id, `Hermes: ${m.title} (${m.name})`]));
  if (!opts.some(([v]) => v === arcade.dot.target)) opts.push([arcade.dot.target, arcade.dot.target]);
  $('#dot-target').innerHTML = opts.map(([v, l]) => `<option value="${esc(v)}" ${v === arcade.dot.target ? 'selected' : ''}>${esc(l)}</option>`).join('');
}

document.addEventListener('change', async (ev) => {
  if (ev.target.id !== 'dot-target') return;
  arcade.dot = await api('POST', '/api/dot', { target: ev.target.value });
  toast(`OG Kush is now ${ev.target.selectedOptions[0].textContent}`, 'ok');
  loadArcade();
});

document.addEventListener('click', async (ev) => {
  const t = ev.target.closest('button, .card, .tile[data-open]');
  if (!t) return;
  try {
    if (t.dataset.tab) return showTab(t.dataset.tab);
    if (t.dataset.source) { state.filter.has(t.dataset.source) ? state.filter.delete(t.dataset.source) : state.filter.add(t.dataset.source); return renderBoard(); }
    if (t.classList.contains('card')) return openJob(t.dataset.id);
    if (t.dataset.open) { showTab('board'); return openJob(t.dataset.open); }
    if (t.id === 'drawer-close') return closeDrawer();
    if (t.id === 'refresh') { await api('POST', '/api/refresh'); await loadBoard(); return toast('Rescanned'); }
    if (t.id === 'add-job') return $('#add-dialog').showModal();
    if (t.id === 'add-cancel') return $('#add-dialog').close();
    if (t.dataset.act) return override(JSON.parse(t.dataset.act));
    if (t.id === 'delete-manual') { await api('DELETE', `/api/job/manual?id=${encodeURIComponent(state.open.id)}`); closeDrawer(); return loadBoard(); }
    if (t.id === 'copy-resume') { await navigator.clipboard.writeText(state.open.resumeCommand); return toast('Copied'); }
    if (t.id === 'term-resume') { const r = await api('POST', '/api/open', { command: state.open.resumeCommand }); return toast(r.ok ? `Opened in ${r.opened}` : r.error, r.ok ? 'ok' : 'bad'); }
    if (t.id === 'open-folder') { const r = await api('POST', '/api/open', { path: state.open.cwd }); return r.ok ? null : toast(r.error, 'bad'); }
    if (t.id === 'open-link') { const r = await api('POST', '/api/open', { url: state.open.link }); return r.ok ? null : toast(r.error, 'bad'); }
    if (t.id === 'add-bot') { if (!state.bots) await loadBots(); return openBotDialog(null); }
    if (t.id === 'bot-cancel') return $('#bot-dialog').close();
    if (t.id === 'bot-delete') { await api('DELETE', `/api/bots/registry?name=${encodeURIComponent($('#bot-form').elements.originalName.value)}`); $('#bot-dialog').close(); toast('Removed'); return loadBots(); }
    if (t.id === 'bot-edit' || t.dataset.botEdit) { if (!state.bots) await loadBots(); const job = t.dataset.botEdit ? state.bots.bots.find((x) => x.id === t.dataset.botEdit) : state.open; return openBotDialog(job); }
    if (t.id === 'bot-log') { const r = await api('POST', '/api/open', { path: state.open.meta.logFile }); return r.ok ? null : toast(r.error, 'bad'); }
    if (t.id === 'bot-restart' || t.dataset.botRestart) {
      const id = t.dataset.botRestart || state.open.id;
      if (!confirm('Restart this bot now?')) return;
      toast('Restarting…');
      const r = await api('POST', '/api/bots/restart', { id });
      toast(r.ok ? 'Restarted' : r.error || `Restart failed (exit ${r.code})`, r.ok ? 'ok' : 'bad');
      return setTimeout(() => (state.tab === 'bots' ? loadBots() : loadBoard()), 2500);
    }
    if (t.dataset.runAgent) { toast(`Running ${t.dataset.runAgent}…`); await api('POST', '/api/workforce/agent', { id: t.dataset.runAgent, run: true }); return loadWorkforce(); }
    if (t.dataset.decide) { await api('POST', '/api/workforce/proposal', { id: t.dataset.decide, decision: t.dataset.decision, standing: Boolean(t.dataset.standing) }); return loadWorkforce(); }
    if (t.dataset.adopt) { await api('POST', '/api/workforce/scout/adopt', { id: t.dataset.adopt, tier: t.dataset.tier }); toast('Added to automations'); return loadWorkforce(); }
    if (t.dataset.runAuto) {
      if (t.dataset.tier === 'manual' && !confirm('This automation touches customers, money, or the public. Run it now?')) return;
      await api('POST', '/api/automations/run', { id: t.dataset.runAuto, confirmed: true });
      toast('Started');
      return setTimeout(loadAutomations, 800);
    }
    if (t.dataset.autoLog) {
      const runs = await api('GET', `/api/automations/runs?id=${encodeURIComponent(t.dataset.autoLog)}`);
      const pre = $(`#log-${CSS.escape(t.dataset.autoLog)}`);
      pre.hidden = !pre.hidden;
      pre.textContent = runs[0] ? (runs[0].output || runs[0].error || '(no output)') : '';
      return;
    }
    if (t.id === 'write-briefing') { toast('Writing briefing…'); await api('POST', '/api/workforce/agent', { id: 'reporter', run: true }); return loadBriefing(); }
  } catch (err) {
    toast(err.message, 'bad');
  }
});

document.addEventListener('change', async (ev) => {
  const t = ev.target;
  try {
    if (t.id === 'pause-all') { await api('POST', '/api/workforce/pause', { paused: t.checked }); return loadWorkforce(); }
    if (t.dataset.agent) return api('POST', '/api/workforce/agent', { id: t.dataset.agent, enabled: t.checked });
    if (t.dataset.autoEnabled) return api('POST', '/api/automations/state', { id: t.dataset.autoEnabled, enabled: t.checked });
    if (t.dataset.autoStanding) return api('POST', '/api/automations/state', { id: t.dataset.autoStanding, autoApproved: t.checked });
  } catch (err) {
    toast(err.message, 'bad');
  }
});

$('#drawer-note').addEventListener('change', () => override({ note: $('#drawer-note').value }));
$('#search').addEventListener('input', (e) => { state.search = e.target.value; renderBoard(); });
$('#bot-form').addEventListener('submit', async (e) => {
  const f = e.target;
  const body = Object.fromEntries(new FormData(f).entries());
  body.expected = f.elements.expected.checked;
  body.autoRestart = f.elements.autoRestart.checked;
  if (f.dataset.match && !body.process) body.match = f.dataset.match;
  try {
    await api('POST', '/api/bots/registry', body);
    toast('Bot saved');
    loadBots();
  } catch (err) {
    toast(err.message, 'bad');
  }
});
$('#add-form').addEventListener('submit', async (e) => {
  const fd = new FormData(e.target);
  const body = Object.fromEntries(fd.entries());
  if (!body.title) return;
  await api('POST', '/api/job/manual', body);
  e.target.reset();
  loadBoard();
  toast('Tracking it');
});
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') { e.preventDefault(); $('#search').focus(); }
  if (e.key === 'Escape') closeDrawer();
  if (e.key === 'r' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') $('#refresh').click();
});

const params = new URLSearchParams(location.search);
loadBoard()
  .then(() => { if (params.get('open')) openJob(params.get('open')); })
  .catch((err) => toast(err.message, 'bad'));
loadWorkforce().catch(() => {});
loadBots().catch(() => {});
showTab(params.get('tab') || 'home');
connectEvents();
setInterval(() => { if (state.tab === 'board' || state.tab === 'home') loadBoard().catch(() => {}); }, 30000);
setInterval(() => { if (state.tab === 'home') loadHome().catch(() => {}); }, 60000);
setInterval(() => { if (state.tab === 'arcade') loadArcade().catch(() => {}); }, 15000);
