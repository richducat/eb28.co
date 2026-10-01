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

const state = { board: null, workforce: null, automations: [], filter: new Set(), search: '', open: null, tab: 'board' };

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
        const status = !r ? 'never run' : r.status === 'running' ? '⏳ running' : r.ok ? `✅ ok ${ago(r.finishedAt)}` : `❌ failed ${ago(r.finishedAt)}`;
        return `<div class="tile">
          <div class="row"><span class="name">${esc(a.title)}</span><span class="tier ${a.tier}">${a.tier}</span></div>
          <div class="role">${esc(a.description)}</div>
          <div class="foot"><code>${esc(a.command.join(' '))}</code></div>
          <div class="foot"><span>${a.schedule ? `⏰ ${esc(a.schedule)}` : 'on demand'}</span><span class="${r && !r.ok && r.status !== 'running' ? 'bad' : ''}">${status}</span>${a.autoApproved ? '<span class="ok">standing approval</span>' : ''}</div>
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
  if (id === 'workforce') loadWorkforce();
  if (id === 'bots') loadBots();
  if (id === 'automations') loadAutomations();
  if (id === 'briefing') loadBriefing();
  if (id === 'arcade') loadArcade().then(() => window.Arcade.start());
  else if (window.Arcade) window.Arcade.stop();
}

/* ---------- arcade ---------- */
const arcade = { crew: [], dot: { target: 'codex-voice' }, mounted: false };
async function loadArcade() {
  if (!arcade.mounted) {
    window.Arcade.mount($('#arcade'), {
      onOpen: (id) => openJob(id),
      onPlace: (id) => {
        const el = document.getElementById(`place-${id}`);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('flash');
        setTimeout(() => el.classList.remove('flash'), 1600);
      },
    });
    arcade.mounted = true;
  }
  const [board, workforce, crew, dot] = await Promise.all([
    state.board ? state.board : api('GET', '/api/board'),
    api('GET', '/api/workforce'),
    api('GET', '/api/crew').catch(() => []),
    api('GET', '/api/dot').catch(() => ({ target: 'codex-voice' })),
  ]);
  state.board = board;
  state.workforce = workforce;
  Object.assign(arcade, { crew, dot });
  renderDotPicker();
  window.Arcade.update(board, workforce, crew, dot);
  renderLegend(board, workforce, crew);
}

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
  if (li) openJob(li.dataset.openJob);
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
if (params.get('tab')) showTab(params.get('tab'));
connectEvents();
setInterval(() => { if (state.tab === 'board') loadBoard().catch(() => {}); }, 30000);
setInterval(() => { if (state.tab === 'arcade') loadArcade().catch(() => {}); }, 15000);
