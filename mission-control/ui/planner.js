/* Today (day sheet), Calendar and Tasks. Uses api/esc/toast/showTab from app.js at runtime. */
(function () {
  const P = { day: null, today: null, cal: { view: 'week', anchor: null, data: null, hidden: new Set(), range: null }, tasks: [], taskFilter: 'all', dueTab: 'today' };
  const ymd = (d = new Date()) => new Date(d).toLocaleDateString('en-CA');
  const addDays = (day, n) => { const d = new Date(`${day}T12:00:00`); d.setDate(d.getDate() + n); return ymd(d); };
  const dateOf = (day) => new Date(`${day}T12:00:00`);
  const fmtDay = (day, opts = { weekday: 'long', month: 'long', day: 'numeric' }) => dateOf(day).toLocaleDateString(undefined, opts);
  const hm = (iso) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(':00', '').replace(' ', '').toLowerCase();
  const time12 = (t) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, '0')}` : ''}${h < 12 ? 'am' : 'pm'}`; };
  const relDay = (day) => {
    const t = ymd();
    if (day === t) return 'Today';
    if (day === addDays(t, 1)) return 'Tomorrow';
    if (day === addDays(t, -1)) return 'Yesterday';
    const diff = Math.round((dateOf(day) - dateOf(t)) / 864e5);
    if (diff > 0 && diff < 7) return dateOf(day).toLocaleDateString(undefined, { weekday: 'long' });
    return dateOf(day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };
  const bizName = (id) => {
    const b = ((state.board && state.board.businesses) || []).find((x) => x.id === id);
    return b ? b.name : id;
  };
  const bizColor = (id) => {
    const b = ((state.board && state.board.businesses) || []).find((x) => x.id === id);
    return b ? b.color : '#6b7280';
  };
  const KIND = { task: '✅', snooze: '💤', followup: '↩️', tyfys: '🎖️', trading: '📈' };

  /* ================= TODAY ================= */
  async function loadToday() {
    P.day = P.day || ymd();
    const data = await api('GET', `/api/today?date=${P.day}`);
    P.today = data;
    renderToday();
  }

  function renderToday() {
    const t = P.today;
    if (!t) return;
    const isToday = t.date === ymd();
    setTitle(isToday ? 'Today' : relDay(t.date), fmtDay(t.date));
    const dueCount = t.due.today.length + t.due.overdue.length;
    const pill = $('#pill-today');
    if (pill && isToday) { pill.hidden = !dueCount; pill.textContent = dueCount; }
    $('#today-chips').innerHTML = [
      chip('📅', `${t.events.length} event${t.events.length === 1 ? '' : 's'}`),
      chip('✅', `${t.due.today.length} due`),
      t.due.overdue.length ? chip('⚠️', `${t.due.overdue.length} overdue`, 'bad') : '',
      t.stats.needsYou ? chip('📥', `${t.stats.needsYou} need you`, 'you', 'data-goto="home"') : '',
      chip('⚙️', `${t.stats.working} agents working`),
    ].join('');
    window.keepTyping($('#tab-today'), () => {
      paintFocus(t);
      paintSchedule(t);
      paintDue(t);
      paintNeeds(t);
      paintTracking(t);
      paintNotes(t);
      paintTomorrow(t);
    });
  }
  const chip = (icon, text, cls = '', attrs = '') => `<span class="tchip ${cls}" ${attrs}><i>${icon}</i>${esc(text)}</span>`;
  const panelHead = (title, right = '') => `<div class="panel-h"><h2>${title}</h2>${right}</div>`;

  function paintFocus(t) {
    const f = t.sheet.focus || [];
    const rows = [0, 1, 2].map((i) => {
      const it = f[i] || { text: '', done: false };
      return `<div class="focus-row ${it.done ? 'done' : ''}">
        <label class="check"><input type="checkbox" data-focus-done="${i}" ${it.done ? 'checked' : ''} ${it.text ? '' : 'disabled'} /><span></span></label>
        <span class="num">${i + 1}</span>
        <input class="focus-in" data-focus="${i}" value="${esc(it.text)}" placeholder="${['The one thing that would make today a win', 'Second priority', 'Third priority'][i]}" />
      </div>`;
    }).join('');
    $('#focus-panel').innerHTML = panelHead('🎯 Focus for the day', '<button class="ghost small" data-focus-suggest>✨ Suggest</button>') + rows;
  }

  function paintSchedule(t) {
    const now = Date.now();
    const isToday = t.date === ymd();
    const allDay = t.events.filter((e) => e.allDay);
    const timed = t.events.filter((e) => !e.allDay);
    let nowShown = !isToday;
    const next = isToday ? timed.find((e) => Date.parse(e.start) > now) : null;
    const rows = [];
    for (const e of timed) {
      const past = isToday && Date.parse(e.end) < now;
      const live = isToday && Date.parse(e.start) <= now && Date.parse(e.end) >= now;
      if (!nowShown && Date.parse(e.start) > now) { rows.push(`<div class="now-line"><span>Now · ${hm(new Date().toISOString())}</span></div>`); nowShown = true; }
      rows.push(`<div class="ev ${past ? 'past' : ''} ${live ? 'live' : ''} ${next === e ? 'next' : ''}" data-ev-link="${esc(e.link)}" title="Open in Google Calendar">
        <div class="ev-time">${hm(e.start)}<small>${hm(e.end)}</small></div>
        <div class="ev-bar" style="background:${esc(e.color)}"></div>
        <div class="ev-body"><div class="ev-title">${esc(e.title)}${live ? '<span class="badge live">Now</span>' : next === e ? `<span class="badge">In ${untilShort(e.start)}</span>` : ''}</div>
        <div class="ev-sub">${esc(e.calendar)}${e.location ? ` · ${esc(e.location.split(',')[0])}` : ''}</div></div>
      </div>`);
    }
    if (!nowShown && timed.length) rows.push(`<div class="now-line"><span>Now · ${hm(new Date().toISOString())}</span></div>`);
    const head = panelHead('🗓️ Schedule', '<button class="ghost small" data-goto="calendar">Open calendar →</button>');
    let body = '';
    if (t.calendarSetup) body = '<div class="empty">No calendars connected yet.</div>';
    else if (!t.events.length) body = `<div class="empty">Nothing on the calendar ${isToday ? 'today' : 'this day'}. 🌤️</div>`;
    else body = `${allDay.length ? `<div class="allday">${allDay.map((e) => `<span class="ad" style="--c:${esc(e.color)}" data-ev-link="${esc(e.link)}">${esc(e.title)}</span>`).join('')}</div>` : ''}<div class="timeline">${rows.join('')}</div>`;
    const errs = (t.calendarErrors || []).length ? `<div class="errors small">${t.calendarErrors.map(esc).join(' · ')}</div>` : '';
    $('#schedule-panel').innerHTML = head + body + errs;
  }
  function untilShort(iso) {
    const m = Math.max(1, Math.round((Date.parse(iso) - Date.now()) / 60000));
    return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}`;
  }

  function paintDue(t) {
    const tabs = [['overdue', 'Overdue'], ['today', t.date === ymd() ? 'Today' : relDay(t.date)], ['tomorrow', 'Tomorrow'], ['week', 'Next 7 days'], ['later', 'Later'], ['someday', 'No date']];
    if (!t.due[P.dueTab] || (P.dueTab === 'today' && !t.due.today.length && t.due.overdue.length && !P.dueTabPicked)) P.dueTab = t.due.overdue.length && !t.due.today.length ? 'overdue' : 'today';
    const list = t.due[P.dueTab] || [];
    $('#due-panel').innerHTML = panelHead('📌 What\'s due', '<button class="ghost small" data-goto="tasks">All tasks →</button>')
      + `<div class="seg">${tabs.map(([k, l]) => `<button data-due-tab="${k}" class="${P.dueTab === k ? 'on' : ''} ${k === 'overdue' && t.due.overdue.length ? 'warn' : ''}">${l}<b>${t.due[k].length}</b></button>`).join('')}</div>
      <div class="add-row"><input data-task-quick="${t.date}" placeholder="Add a task${P.dueTab === 'today' ? ' for today' : ''}… (try: “Send invoice fri 2pm #eb28”)" /></div>
      <div class="items">${list.length ? list.map(itemRow).join('') : `<div class="empty">${P.dueTab === 'overdue' ? 'Nothing overdue. 🎉' : 'Nothing here.'}</div>`}</div>`;
  }

  function itemRow(it) {
    const isTask = it.kind === 'task';
    const when = [it.due && P.dueTab !== 'today' ? relDay(it.due) : '', it.time ? time12(it.time) : ''].filter(Boolean).join(' · ');
    return `<div class="item ${it.priority === 'high' ? 'hi' : ''}" ${isTask ? '' : `data-item-open="${esc(it.id)}" data-item-kind="${esc(it.kind)}"`}>
      ${isTask ? `<label class="check"><input type="checkbox" data-task-done="${esc(it.id)}" /><span></span></label>` : `<span class="kind">${KIND[it.kind] || '•'}</span>`}
      <div class="item-main"><div class="item-t">${it.priority === 'high' ? '<span class="star">★</span>' : ''}${esc(it.title)}</div>
      <div class="item-s">${when ? `<span>${esc(when)}</span>` : ''}${it.business ? `<span class="bz" style="--c:${esc(bizColor(it.business))}">${esc(bizName(it.business))}</span>` : ''}${it.note ? `<span>${esc(it.note)}</span>` : ''}</div></div>
    </div>`;
  }

  function paintNeeds(t) {
    const list = t.needsYou.slice(0, 5);
    const label = { approve: 'Approve', answer: 'Answer', fix: 'Fix', review: 'Review' };
    $('#needs-panel').innerHTML = panelHead(`📥 Needs you <span class="count">${t.needsYou.length}</span>`, '<button class="ghost small" data-goto="home">Open inbox →</button>')
      + (list.length ? `<div class="items">${list.map((n) => `<div class="item" data-goto="home"><span class="ask-tag ${esc(n.ask || 'review')}">${label[n.ask] || 'Review'}</span><div class="item-main"><div class="item-t">${esc(n.title)}</div><div class="item-s"><span>${esc(n.source)}</span>${n.business ? `<span class="bz" style="--c:${esc(bizColor(n.business))}">${esc(bizName(n.business))}</span>` : ''}</div></div></div>`).join('')}</div>`
        : '<div class="empty">You\'re clear. Nothing is waiting on you. ✨</div>');
  }

  function paintTracking(t) {
    const done = t.habits.filter((h) => t.sheet.habits[h.id]).length;
    const pct = t.habits.length ? Math.round((done / t.habits.length) * 100) : 0;
    $('#track-panel').innerHTML = panelHead('📊 Daily tracking', `<span class="muted small">${done}/${t.habits.length} habits</span>`)
      + `<div class="ring-row"><div class="ring" style="--p:${pct}"><b>${pct}%</b></div><div class="habits">${t.habits.map((h) => `<button class="habit ${t.sheet.habits[h.id] ? 'on' : ''}" data-habit="${esc(h.id)}"><i>${esc(h.emoji)}</i><span>${esc(h.name)}</span>${t.streaks[h.id] ? `<small>🔥${t.streaks[h.id]}</small>` : ''}</button>`).join('')}</div></div>
      <div class="statgrid">
        <div><b>${t.stats.tasksDone}</b><span>tasks done</span></div>
        <div><b>${t.stats.agentsDone}</b><span>agent jobs finished</span></div>
        <div><b>${t.stats.repliesSent}</b><span>replies sent</span></div>
        <div><b>${t.stats.events}</b><span>events</span></div>
      </div>
      <details class="edit-habits"><summary>Edit habits</summary><textarea data-habits-edit rows="5" placeholder="One per line: emoji name">${esc(t.habits.map((h) => `${h.emoji} ${h.name}`).join('\n'))}</textarea><button class="small" data-habits-save>Save habits</button></details>`;
  }

  function paintNotes(t) {
    const cur = document.activeElement && document.activeElement.matches('[data-day-notes]');
    if (cur) return;
    $('#notes-panel').innerHTML = panelHead('📝 Notes', '<span class="muted small" id="notes-saved"></span>')
      + `<textarea class="notes" data-day-notes rows="6" placeholder="Wins, ideas, what happened today…">${esc(t.sheet.notes || '')}</textarea>`;
  }

  function paintTomorrow(t) {
    const tm = addDays(t.date, 1);
    const ev = t.tomorrowEvents.filter((e) => !e.allDay).slice(0, 5);
    const dueTm = t.due.tomorrow.length;
    $('#tomorrow-panel').innerHTML = panelHead(`🌙 ${t.date === ymd() ? 'Tomorrow' : relDay(tm)}`, `<button class="ghost small" data-day="1">View →</button>`)
      + `<div class="muted small">${fmtDay(tm)} · ${t.tomorrowEvents.length} event${t.tomorrowEvents.length === 1 ? '' : 's'} · ${dueTm} due</div>`
      + (ev.length ? `<div class="mini-ev">${ev.map((e) => `<div><span class="dotc" style="background:${esc(e.color)}"></span><b>${hm(e.start)}</b> ${esc(e.title)}</div>`).join('')}</div>` : '<div class="empty">Nothing scheduled yet.</div>');
  }

  /* ---------- today actions ---------- */
  let notesTimer = null;
  async function saveFocus() {
    const rows = [...document.querySelectorAll('[data-focus]')].map((inp) => ({ text: inp.value.trim(), done: Boolean(document.querySelector(`[data-focus-done="${inp.dataset.focus}"]`)?.checked) }));
    const sheet = await api('POST', '/api/day', { date: P.today.date, focus: rows });
    P.today.sheet = sheet;
  }

  document.addEventListener('change', async (ev) => {
    const el = ev.target;
    try {
      if (el.matches('[data-focus]')) return saveFocus();
      if (el.matches('[data-focus-done]')) { await saveFocus(); el.closest('.focus-row').classList.toggle('done', el.checked); if (el.checked) toast('Nice. One down. 💪', 'ok'); return; }
      if (el.matches('[data-task-done]')) {
        await api('POST', '/api/tasks', { id: el.dataset.taskDone, patch: { done: el.checked } });
        if (el.checked) toast('Task done ✓', 'ok');
        return refreshAll();
      }
      if (el.matches('[data-task-due]')) { await api('POST', '/api/tasks', { id: el.dataset.taskDue, patch: { due: el.value || null } }); return refreshAll(); }
      if (el.matches('[data-task-biz]')) { await api('POST', '/api/tasks', { id: el.dataset.taskBiz, patch: { business: el.value || null } }); return refreshAll(); }
    } catch (err) { toast(err.message, 'bad'); }
  });

  document.addEventListener('input', (ev) => {
    if (!ev.target.matches('[data-day-notes]')) return;
    clearTimeout(notesTimer);
    const day = P.today.date;
    const val = ev.target.value;
    const tag = $('#notes-saved');
    if (tag) tag.textContent = 'Saving…';
    notesTimer = setTimeout(async () => {
      try { const s = await api('POST', '/api/day', { date: day, notes: val }); P.today.sheet = s; if ($('#notes-saved')) $('#notes-saved').textContent = 'Saved'; } catch (err) { toast(err.message, 'bad'); }
    }, 700);
  });

  document.addEventListener('keydown', async (ev) => {
    const el = ev.target;
    if (ev.key === 'Enter' && el.matches('[data-focus]')) { ev.preventDefault(); el.blur(); }
    if (ev.key === 'Enter' && el.matches('[data-task-quick]')) {
      ev.preventDefault();
      const text = el.value.trim();
      if (!text) return;
      try {
        const def = el.dataset.taskQuick;
        const t = await api('POST', '/api/tasks', { add: { text, defaultDue: def && def !== 'none' && P.dueTab === 'today' ? def : undefined } });
        el.value = '';
        toast(`Added: ${t.title}${t.due ? ` · ${relDay(t.due)}${t.time ? ` ${time12(t.time)}` : ''}` : ''}`, 'ok');
        refreshAll();
      } catch (err) { toast(err.message, 'bad'); }
    }
    if (ev.key === 'Enter' && el.matches('[data-task-title]')) { ev.preventDefault(); el.blur(); }
  });

  document.addEventListener('focusout', async (ev) => {
    const el = ev.target;
    if (!el.matches || !el.matches('[data-task-title]')) return;
    const v = el.value.trim();
    if (v && v !== el.defaultValue) { try { await api('POST', '/api/tasks', { id: el.dataset.taskTitle, patch: { title: v } }); refreshAll(); } catch (err) { toast(err.message, 'bad'); } }
  });

  document.addEventListener('click', async (ev) => {
    const t = ev.target.closest('[data-day],[data-due-tab],[data-habit],[data-habits-save],[data-focus-suggest],[data-goto],[data-ev-link],[data-item-open],[data-cal-nav],[data-cal-view],[data-cal-toggle],[data-cal-day],[data-task-filter],[data-task-del],[data-task-star],[data-cal-refresh]');
    if (!t) return;
    const d = t.dataset;
    try {
      if (d.day !== undefined) { P.day = d.day === '0' ? ymd() : addDays(P.day || ymd(), Number(d.day)); if (state.tab !== 'today') showTab('today'); else await loadToday(); return; }
      if (d.dueTab) { P.dueTab = d.dueTab; P.dueTabPicked = true; return paintDue(P.today); }
      if (d.habit) { P.today.sheet = await api('POST', '/api/day', { date: P.today.date, habit: d.habit }); return loadToday(); }
      if ('habitsSave' in d) {
        const lines = $('[data-habits-edit]').value.split('\n').map((l) => l.trim()).filter(Boolean);
        const habits = lines.map((l) => { const m = l.match(/^(\p{Extended_Pictographic}️?|\S{1,2})\s+(.+)$/u); return m ? { emoji: m[1], name: m[2] } : { emoji: '✅', name: l }; });
        await api('POST', '/api/habits', { habits });
        toast('Habits saved', 'ok');
        return loadToday();
      }
      if ('focusSuggest' in d) {
        t.disabled = true; t.textContent = 'Thinking…';
        const r = await api('POST', '/api/today/suggest', { date: P.today.date });
        const cur = P.today.sheet.focus || [];
        const merged = [0, 1, 2].map((i) => (cur[i] && cur[i].text ? cur[i] : { text: r.focus[i] || '', done: false })).filter((x) => x.text);
        P.today.sheet = await api('POST', '/api/day', { date: P.today.date, focus: merged });
        return renderToday();
      }
      if (d.goto) return showTab(d.goto);
      if (d.evLink) { if (d.evLink) await api('POST', '/api/open', { url: d.evLink }); return; }
      if (d.itemOpen) {
        if (d.itemKind === 'tyfys') return showTab('tyfys');
        if (d.itemKind === 'trading') return showTab('trading');
        showTab('board');
        return openJob(d.itemOpen);
      }
      if (d.calNav !== undefined) return calNav(d.calNav);
      if (d.calView) { P.cal.view = d.calView; return loadCalendar(); }
      if (d.calToggle) { P.cal.hidden.has(d.calToggle) ? P.cal.hidden.delete(d.calToggle) : P.cal.hidden.add(d.calToggle); return renderCalendar(); }
      if (d.calDay) { P.cal.anchor = d.calDay; P.cal.view = 'week'; return loadCalendar(); }
      if ('calRefresh' in d) return loadCalendar(true);
      if (d.taskFilter) { P.taskFilter = d.taskFilter; return renderTasks(); }
      if (d.taskDel) { await api('POST', '/api/tasks', { delete: d.taskDel }); toast('Task deleted'); return refreshAll(); }
      if (d.taskStar) { const tk = P.tasks.find((x) => x.id === d.taskStar); await api('POST', '/api/tasks', { id: d.taskStar, patch: { priority: tk && tk.priority === 'high' ? 'normal' : 'high' } }); return refreshAll(); }
    } catch (err) { toast(err.message, 'bad'); }
  });

  function refreshAll() {
    if (state.tab === 'today') loadToday();
    if (state.tab === 'tasks') loadTasks();
    if (state.tab === 'calendar') loadCalendar();
  }

  /* ================= CALENDAR ================= */
  function weekStart(day) { const d = dateOf(day); return addDays(day, -((d.getDay() + 6) % 7)); } // Monday
  function rangeFor() {
    const a = P.cal.anchor || ymd();
    if (P.cal.view === 'week') { const s = weekStart(a); return [s, addDays(s, 7)]; }
    if (P.cal.view === 'agenda') return [a, addDays(a, 14)];
    const first = `${a.slice(0, 8)}01`;
    const s = weekStart(first);
    return [s, addDays(s, 42)];
  }
  function calNav(dir) {
    const a = P.cal.anchor || ymd();
    if (dir === '0') P.cal.anchor = ymd();
    else if (P.cal.view === 'month') { const d = dateOf(`${a.slice(0, 8)}15`); d.setMonth(d.getMonth() + Number(dir)); P.cal.anchor = ymd(d); }
    else P.cal.anchor = addDays(a, Number(dir) * (P.cal.view === 'week' ? 7 : 14));
    return loadCalendar();
  }
  async function loadCalendar(fresh = false) {
    const [s, e] = rangeFor();
    P.cal.range = [s, e];
    renderCalendar(true);
    P.cal.data = await api('GET', `/api/calendar?start=${s}&end=${e}${fresh ? '&fresh=1' : ''}`);
    renderCalendar();
  }
  function calTitle() {
    const [s, e] = P.cal.range;
    if (P.cal.view === 'month') return dateOf(`${(P.cal.anchor || ymd()).slice(0, 8)}15`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const a = dateOf(s);
    const b = dateOf(addDays(e, -1));
    const mo = (d) => d.toLocaleDateString(undefined, { month: 'short' });
    return a.getMonth() === b.getMonth() ? `${mo(a)} ${a.getDate()} – ${b.getDate()}, ${b.getFullYear()}` : `${mo(a)} ${a.getDate()} – ${mo(b)} ${b.getDate()}, ${b.getFullYear()}`;
  }
  function eventsOn(day) {
    const d = P.cal.data;
    if (!d) return [];
    return d.events.filter((e) => !P.cal.hidden.has(e.calendarId) && !(e.recurring && P.cal.hidden.has('routines')) && (e.allDay ? e.start <= day && (e.end > day || e.end === e.start) : ymd(e.start) === day));
  }
  const tasksOn = (day) => (P.cal.data ? P.cal.data.tasks.filter((t) => t.due === day && !t.done && !P.cal.hidden.has('tasks')) : []);

  function renderCalendar(loading = false) {
    const root = $('#cal-root');
    if (!root) return;
    setTitle('Calendar', P.cal.data && P.cal.data.calendars ? `${P.cal.data.calendars.map((c) => c.name).join(' · ')}` : 'Your Google calendars, read-only');
    const d = P.cal.data;
    const cals = d && d.calendars ? d.calendars : [];
    const bar = `<div class="cal-bar">
      <div class="cal-nav"><button class="icon" data-cal-nav="-1">‹</button><button data-cal-nav="0">Today</button><button class="icon" data-cal-nav="1">›</button><h2>${esc(calTitle())}</h2>${loading ? '<span class="muted small">Loading…</span>' : ''}</div>
      <div class="cal-right">
        <div class="cal-filters">${cals.map((c) => `<button class="cf ${P.cal.hidden.has(c.id) ? 'off' : ''}" data-cal-toggle="${esc(c.id)}"><span style="background:${esc(c.color)}"></span>${esc(c.name)}</button>`).join('')}<button class="cf ${P.cal.hidden.has('tasks') ? 'off' : ''}" data-cal-toggle="tasks"><span style="background:var(--text)"></span>Tasks</button><button class="cf ${P.cal.hidden.has('routines') ? 'off' : ''}" data-cal-toggle="routines" title="Repeating events like daily routines"><span style="background:var(--faint)"></span>Routines</button></div>
        <div class="seg">${['week', 'month', 'agenda'].map((v) => `<button data-cal-view="${v}" class="${P.cal.view === v ? 'on' : ''}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}</div>
        <button class="icon" data-cal-refresh title="Refresh from Google">↻</button>
      </div></div>`;
    let body = '';
    if (d && d.setup) body = '<div class="empty big">No calendars connected yet.</div>';
    else if (!d) body = '<div class="empty big">Loading your calendar…</div>';
    else if (P.cal.view === 'week') body = weekView();
    else if (P.cal.view === 'month') body = monthView();
    else body = agendaView();
    const errs = d && d.errors && d.errors.length ? `<div class="errors small">${d.errors.map(esc).join(' · ')}</div>` : '';
    root.innerHTML = bar + body + errs;
    if (P.cal.view === 'week' && !loading) {
      const grid = root.querySelector('.wk-scroll');
      if (grid && !P.cal.scrolled) { grid.scrollTop = 7 * HOUR - 10; P.cal.scrolled = true; }
    }
  }

  const HOUR = 52;
  function lanes(evs) {
    // place overlapping events side by side
    const sorted = [...evs].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
    const out = [];
    let group = [];
    let groupEnd = 0;
    const flush = () => { const cols = []; for (const e of group) { let c = cols.findIndex((end) => end <= Date.parse(e.start)); if (c < 0) { c = cols.length; cols.push(0); } cols[c] = Date.parse(e.end); out.push({ e, col: c, cols: 0, group }); } for (const o of out.filter((x) => x.group === group)) o.cols = cols.length; };
    for (const e of sorted) {
      if (group.length && Date.parse(e.start) >= groupEnd) { flush(); group = []; groupEnd = 0; }
      group.push(e);
      groupEnd = Math.max(groupEnd, Date.parse(e.end));
    }
    if (group.length) flush();
    return out;
  }
  function weekView() {
    const [s] = P.cal.range;
    const days = [...Array(7)].map((_, i) => addDays(s, i));
    const today = ymd();
    const head = `<div class="wk-head"><div class="wk-gutter"></div>${days.map((d) => `<div class="wk-day ${d === today ? 'today' : ''}" data-cal-day="${d}"><span>${dateOf(d).toLocaleDateString(undefined, { weekday: 'short' })}</span><b>${dateOf(d).getDate()}</b></div>`).join('')}</div>`;
    const allday = `<div class="wk-allday"><div class="wk-gutter small muted">all-day</div>${days.map((d) => `<div class="wk-ad">${eventsOn(d).filter((e) => e.allDay).map((e) => `<span class="ad" style="--c:${esc(e.color)}" data-ev-link="${esc(e.link)}" title="${esc(e.title)}">${esc(e.title)}</span>`).join('')}${tasksOn(d).map((t) => `<span class="ad task ${t.priority === 'high' ? 'hi' : ''}" title="${esc(t.title)}">✅ ${t.time ? `${time12(t.time)} ` : ''}${esc(t.title)}</span>`).join('')}</div>`).join('')}</div>`;
    const hours = [...Array(24)].map((_, h) => `<div class="wk-hr" style="top:${h * HOUR}px"><span>${h === 0 ? '' : `${((h + 11) % 12) + 1}${h < 12 ? 'am' : 'pm'}`}</span></div>`).join('');
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    const cols = days.map((d) => {
      const evs = eventsOn(d).filter((e) => !e.allDay);
      const blocks = lanes(evs).map(({ e, col, cols: n }) => {
        const st = new Date(e.start);
        const en = new Date(e.end);
        const top = (st.getHours() * 60 + st.getMinutes()) / 60 * HOUR;
        const h = Math.max(18, ((en - st) / 3600e3) * HOUR - 2);
        return `<div class="wk-ev" data-ev-link="${esc(e.link)}" title="${esc(e.title)} · ${hm(e.start)}–${hm(e.end)}${e.location ? ` · ${esc(e.location)}` : ''}" style="top:${top}px;height:${h}px;left:calc(${(col / n) * 100}% + 2px);width:calc(${100 / n}% - 4px);--c:${esc(e.color)}"><b>${esc(e.title)}</b><small>${hm(e.start)}${h > 34 ? `–${hm(e.end)}` : ''}</small></div>`;
      }).join('');
      return `<div class="wk-col ${d === today ? 'today' : ''}">${blocks}${d === today ? `<div class="wk-now" style="top:${(nowMin / 60) * HOUR}px"></div>` : ''}</div>`;
    }).join('');
    return `<div class="wk">${head}${allday}<div class="wk-scroll"><div class="wk-grid" style="height:${24 * HOUR}px"><div class="wk-gutter">${hours}</div>${cols}</div></div></div>`;
  }
  function monthView() {
    const [s] = P.cal.range;
    const month = (P.cal.anchor || ymd()).slice(0, 7);
    const today = ymd();
    const names = [...Array(7)].map((_, i) => dateOf(addDays(s, i)).toLocaleDateString(undefined, { weekday: 'short' }));
    const cells = [...Array(42)].map((_, i) => {
      const d = addDays(s, i);
      const items = [...eventsOn(d).sort((x, y) => Number(x.recurring) - Number(y.recurring) || String(x.start).localeCompare(String(y.start))).map((e) => `<div class="mo-it" style="--c:${esc(e.color)}">${e.allDay ? '' : `<b>${hm(e.start)}</b> `}${esc(e.title)}</div>`), ...tasksOn(d).map((t) => `<div class="mo-it task">✅ ${esc(t.title)}</div>`)];
      return `<div class="mo-cell ${d.slice(0, 7) !== month ? 'other' : ''} ${d === today ? 'today' : ''}" data-cal-day="${d}"><span class="mo-n">${dateOf(d).getDate()}</span>${items.slice(0, 4).join('')}${items.length > 4 ? `<div class="mo-more">+${items.length - 4} more</div>` : ''}</div>`;
    }).join('');
    return `<div class="mo"><div class="mo-head">${names.map((n) => `<div>${n}</div>`).join('')}</div><div class="mo-grid">${cells}</div></div>`;
  }
  function agendaView() {
    const [s, e] = P.cal.range;
    const out = [];
    for (let d = s; d < e; d = addDays(d, 1)) {
      const evs = eventsOn(d);
      const tk = tasksOn(d);
      if (!evs.length && !tk.length) continue;
      out.push(`<div class="ag-day"><div class="ag-date ${d === ymd() ? 'today' : ''}"><b>${dateOf(d).getDate()}</b><span>${esc(relDay(d))}</span></div><div class="ag-items">
        ${evs.map((x) => `<div class="ag-it" data-ev-link="${esc(x.link)}"><span class="dotc" style="background:${esc(x.color)}"></span><span class="ag-t">${x.allDay ? 'All day' : `${hm(x.start)} – ${hm(x.end)}`}</span><span class="ag-title">${esc(x.title)}</span><span class="muted small">${esc(x.calendar)}${x.location ? ` · ${esc(x.location.split(',')[0])}` : ''}</span></div>`).join('')}
        ${tk.map((t) => `<div class="ag-it"><span>✅</span><span class="ag-t">${t.time ? time12(t.time) : 'Task'}</span><span class="ag-title">${esc(t.title)}</span></div>`).join('')}
      </div></div>`);
    }
    return `<div class="agenda">${out.join('') || '<div class="empty big">Nothing in the next two weeks.</div>'}</div>`;
  }

  /* ================= TASKS ================= */
  async function loadTasks() {
    P.tasks = await api('GET', '/api/tasks');
    renderTasks();
  }
  function renderTasks() {
    const today = ymd();
    const open = P.tasks.filter((t) => !t.done && (P.taskFilter === 'all' || t.business === P.taskFilter || (P.taskFilter === 'high' && t.priority === 'high')));
    const done = P.tasks.filter((t) => t.done).sort((a, b) => String(b.doneAt).localeCompare(String(a.doneAt))).slice(0, 15);
    const g = { Overdue: [], Today: [], Tomorrow: [], 'Next 7 days': [], Later: [], 'No date': [] };
    for (const t of open) {
      if (!t.due) g['No date'].push(t);
      else if (t.due < today) g.Overdue.push(t);
      else if (t.due === today) g.Today.push(t);
      else if (t.due === addDays(today, 1)) g.Tomorrow.push(t);
      else if (t.due <= addDays(today, 7)) g['Next 7 days'].push(t);
      else g.Later.push(t);
    }
    const sort = (a, b) => String(a.due || '9').localeCompare(String(b.due || '9')) || String(a.time || '99').localeCompare(String(b.time || '99'));
    const overdue = g.Overdue.length;
    const pill = $('#pill-tasks');
    if (pill) { pill.hidden = !overdue; pill.textContent = overdue; }
    setTitle('Tasks', `${open.length} open${overdue ? ` · ${overdue} overdue` : ''}`);
    const bizList = (state.board && state.board.businesses) || [];
    const used = [...new Set(P.tasks.map((t) => t.business).filter(Boolean))];
    const filters = [['all', 'All'], ['high', '★ Important'], ...used.map((b) => [b, bizName(b)])];
    const row = (t) => `<div class="trow ${t.priority === 'high' ? 'hi' : ''} ${t.done ? 'done' : ''}">
      <label class="check"><input type="checkbox" data-task-done="${esc(t.id)}" ${t.done ? 'checked' : ''} /><span></span></label>
      <input class="t-title" data-task-title="${esc(t.id)}" value="${esc(t.title)}" />
      <button class="star-btn ${t.priority === 'high' ? 'on' : ''}" data-task-star="${esc(t.id)}" title="Important">★</button>
      <input type="date" class="t-date ${t.due && t.due < today && !t.done ? 'late' : ''}" data-task-due="${esc(t.id)}" value="${esc(t.due || '')}" title="Due date" />
      <span class="t-time">${t.time ? esc(time12(t.time)) : ''}</span>
      <select class="t-biz" data-task-biz="${esc(t.id)}"><option value="">No business</option>${bizList.map((b) => `<option value="${esc(b.id)}" ${t.business === b.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select>
      <button class="icon ghost" data-task-del="${esc(t.id)}" title="Delete">×</button>
    </div>`;
    $('#tasks-root').innerHTML = `
      <div class="task-add"><input data-task-quick="none" placeholder="Add a task… e.g. “Call the VA about John tomorrow 3pm #tyfys !”" /><span class="muted small">Press Enter. Dates, times, <b>#business</b> and <b>!</b> for important are understood.</span></div>
      <div class="chips-row">${filters.map(([k, l]) => `<button class="fchip ${P.taskFilter === k ? 'on' : ''}" data-task-filter="${esc(k)}">${esc(l)}</button>`).join('')}</div>
      ${Object.entries(g).filter(([, l]) => l.length).map(([name, l]) => `<div class="tgroup ${name === 'Overdue' ? 'late' : ''}"><h3>${name} <span>${l.length}</span></h3>${l.sort(sort).map(row).join('')}</div>`).join('') || '<div class="empty big">No open tasks. Add one above. ✨</div>'}
      ${done.length ? `<details class="tgroup donegrp"><summary>Completed recently (${done.length})</summary>${done.map(row).join('')}</details>` : ''}`;
  }

  function setTitle(t, sub = '') {
    $('#page-title').textContent = t;
    $('#page-sub').textContent = sub;
  }

  window.Planner = { loadToday, loadCalendar: () => loadCalendar(false), loadTasks, setTitle, refreshAll };
})();
