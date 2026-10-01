/* EB28 Mission Control — Arcade view.
 * A 16-bit style live map of every job, bot, and workforce agent. Pure canvas, no assets:
 * sprites are drawn from tiny pixel templates and tinted per source.
 * Usage: Arcade.mount(canvas, { onOpen(jobId) }); Arcade.update(board, workforce, events?)
 */
(() => {
  const W = 480;
  const H = 372;
  const HUD = 18;

  /* ---------- palette (SNES-ish, limited) ---------- */
  const C = {
    ink: '#14101f', night: '#1e1838', wall: '#3b2f5c', wallHi: '#5a4a8a', text: '#f8f4e3', dim: '#9d93c2',
    gold: '#f7c843', red: '#e8434f', green: '#4fd06b', blue: '#4aa3ff', orange: '#ff9a3c', purple: '#a35cff', gray: '#7d7891', skin: '#f2c49b', skin2: '#c98d5e',
  };
  const SOURCE = {
    'claude-code': { shirt: '#d97757', hair: '#5b3a29', label: 'CLAUDE' },
    codex: { shirt: '#10a37f', hair: '#222034', label: 'CODEX' },
    gemini: { shirt: '#4285f4', hair: '#e8d16a', label: 'GEMINI' },
    openclaw: { shirt: '#e8434f', hair: '#2b2b2b', label: 'OPENCLAW' },
    hermes: { shirt: '#c9a227', hair: '#ffffff', label: 'HERMES' },
    github: { shirt: '#6e7681', hair: '#111111', label: 'PR' },
    manual: { shirt: '#9d93c2', hair: '#3a2a1a', label: 'TASK' },
    automation: { shirt: '#f7c843', hair: '#444444', label: 'AUTO' },
    dot: { shirt: '#3fa34d', hair: '#7a4bd1', label: 'OG KUSH' },
  };

  /* ---------- rooms ---------- */
  // Two rows of rooms with a corridor between them. Status rooms + Bot Garage + HQ.
  const ROW1 = HUD + 6;
  const ROW_H = 110;
  const CORR = ROW1 + ROW_H; // corridor top
  const ROW2 = CORR + 18;
  const ROW2_H = 104;
  const CORR2 = ROW2 + ROW2_H;
  const ROW3 = CORR2 + 18;
  const ROOMS = {
    needs_you: { x: 6, y: ROW1, w: 150, h: ROW_H, name: 'NEEDS YOU', floor: ['#5a2338', '#4c1d30'], accent: C.red },
    working: { x: 162, y: ROW1, w: 170, h: ROW_H, name: 'WORKSHOP', floor: ['#264d3b', '#1f4031'], accent: C.green },
    bots: { x: 338, y: ROW1, w: 136, h: ROW_H, name: 'BOT GARAGE', floor: ['#2f3442', '#272b37'], accent: C.blue },
    follow_up: { x: 6, y: ROW2, w: 150, h: ROW2_H, name: 'FOLLOW-UP', floor: ['#5a4a23', '#4d3f1d'], accent: C.gold },
    hq: { x: 162, y: ROW2, w: 170, h: ROW2_H, name: 'WORKFORCE HQ', floor: ['#3d2a5c', '#33234e'], accent: C.purple },
    done: { x: 338, y: ROW2, w: 136, h: 62, name: 'DONE', floor: ['#22445a', '#1c394b'], accent: C.blue },
    failed: { x: 338, y: ROW2 + 64, w: 136, h: ROW2_H - 64, name: 'INFIRMARY', floor: ['#4a2a2a', '#3d2222'], accent: C.red },
    crew: { x: 6, y: ROW3, w: 468, h: H - ROW3 - 6, name: 'HERMES CREW', floor: ['#4a3a1c', '#3f3118'], accent: '#c9a227' },
  };
  const AGENT_TARGET = { triage: 'needs_you', 'follow-up': 'follow_up', 'bot-watchdog': 'bots', janitor: 'done', 'pr-steward': 'working', 'ops-runner': 'working', 'automation-scout': 'working', reporter: 'hq' };
  const MAX_PER_ROOM = { done: 10, failed: 5 };

  /* ---------- pixel templates (16x16) ---------- */
  // K outline, H hair/hat, S skin, E eye, C shirt, P pants, B boots, L leaf, G gold, M metal, V visor
  const PERSON = [
    '................', '.....KKKKKK.....', '....KHHHHHHK....', '...KHHHHHHHHK...', '...KHSSSSSSHK...', '...KSESSSSESK...', '...KSSSSSSSSK...', '....KSSSSSSK....',
    '...KCCCCCCCCK...', '..KSCCCCCCCCSK..', '..KSCCCCCCCCSK..', '...KCCCCCCCCK...', '...KPPPPPPPPK...', '...KPPK..KPPK...', '...KBBK..KBBK...', '....KK....KK....',
  ];
  const PERSON_STEP = PERSON.slice(0, 13).concat(['...KPPK..KPPK...', '..KBBK....KBBK..', '..KK........KK..']);
  const ROBOT = [
    '.......G........', '.......K........', '....KKKKKKKK....', '...KMMMMMMMMK...', '...KMVVVVVVMK...', '...KMVEVVEVMK...', '...KMMMMMMMMK...', '....KKKKKKKK....',
    '..KKCCCCCCCCKK..', '.KMKCCGGCCCCKMK.', '.KMKCCCCCCCCKMK.', '..KKCCCCCCCCKK..', '...KMMMMMMMMK...', '...KMMK..KMMK...', '...KKKK..KKKK...', '................',
  ];
  const LEAF_HAT = ['.......L........', '..L...LLL...L...', '...L..LLL..L....', '....LLLLLLL.....', '.....LLLLL......', '..KKKKKKKKKKKK..'];
  const CROWN = ['....G..G..G.....', '....GGGGGGG.....'];

  const spriteCache = new Map();
  function sprite(template, pal, overlay) {
    const key = template.join('') + JSON.stringify(pal) + (overlay ? overlay.join('') : '');
    if (spriteCache.has(key)) return spriteCache.get(key);
    const cv = document.createElement('canvas');
    cv.width = 16;
    cv.height = 16;
    const g = cv.getContext('2d');
    const paint = (rows, dy = 0) => rows.forEach((row, y) => [...row].forEach((ch, x) => {
      const col = pal[ch];
      if (col) { g.fillStyle = col; g.fillRect(x, y + dy, 1, 1); }
    }));
    paint(template);
    if (overlay) paint(overlay, -1);
    spriteCache.set(key, cv);
    return cv;
  }
  const basePal = (shirt, hair) => ({ K: C.ink, H: hair, S: C.skin, E: C.ink, C: shirt, P: '#2a2f4a', B: '#4a2d1a', L: '#3fa34d', G: C.gold, M: '#b9c2d6', V: '#2de2e6' });

  /* ---------- state ---------- */
  let cv; let g; let opts = {};
  const actors = new Map(); // id -> actor
  const particles = [];
  const ticker = [];
  let hud = { needs: 0, working: 0, bots: 0, done: 0, failed: 0, agents: 0, crew: 0 };
  let hover = null;
  let lastT = 0;
  let frame = 0;
  let running = false;

  function roomOf(job) {
    if (job.source === 'bot') return 'bots';
    return ROOMS[job.status] ? job.status : 'follow_up';
  }

  function isDot(job) {
    if (dotTarget === 'codex-voice') return Boolean(job.meta && job.meta.agent === 'Dot');
    return job.id === dotTarget;
  }

  function slot(room, i) {
    const r = ROOMS[room];
    const cols = Math.max(1, Math.floor((r.w - 16) / 22));
    const x = r.x + 10 + (i % cols) * 22;
    const y = r.y + 22 + Math.floor(i / cols) * 26;
    return { x, y: Math.min(y, r.y + r.h - 20) };
  }

  function pathTo(a, from, to) {
    // Walk out to the corridor, along it, then into the destination room.
    const corrY = (Math.max(from.y, to.y) > CORR2 ? CORR2 : CORR) + 3;
    const pts = [];
    if (Math.abs(from.y - to.y) > 30 || Math.abs(from.x - to.x) > 60) {
      pts.push({ x: from.x, y: corrY }, { x: to.x, y: corrY });
    }
    pts.push(to);
    a.path = pts;
  }

  function say(text, color = C.text) {
    ticker.unshift({ text, color, t: performance.now() });
    ticker.length = Math.min(ticker.length, 4);
  }

  function burst(x, y, color, n = 10) {
    for (let i = 0; i < n; i += 1) particles.push({ x, y, vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 60 - 10, life: 0.8, color });
  }

  /* ---------- data in ---------- */
  let dotTarget = 'codex-voice';
  let loaded = false;
  function update(board, workforce, crew = [], dotCfg) {
    if (!board) return;
    if (dotCfg && dotCfg.target) dotTarget = dotCfg.target;
    const jobs = board.columns.flatMap((c) => c.jobs);
    const firstLoad = !loaded;
    loaded = true;
    const seen = new Set();
    const perRoom = {};
    hud = { needs: 0, working: 0, bots: 0, done: 0, failed: 0, agents: 0, crew: 0 };
    for (const j of jobs) {
      const room = roomOf(j);
      perRoom[room] = (perRoom[room] || 0) + 1;
      if (room === 'needs_you') hud.needs += 1;
      if (room === 'working') hud.working += 1;
      if (room === 'bots') hud.bots += 1;
      if (room === 'done') hud.done += 1;
      if (room === 'failed') hud.failed += 1;
      const idx = perRoom[room] - 1;
      if (MAX_PER_ROOM[room] && idx >= MAX_PER_ROOM[room]) continue; // overflow shown as +N
      const id = `job:${j.id}`;
      seen.add(id);
      const dest = slot(room, idx);
      const dot = isDot(j);
      const style = dot ? SOURCE.dot : SOURCE[j.source] || SOURCE.manual;
      let a = actors.get(id);
      if (!a) {
        const start = { x: ROOMS.hq.x + ROOMS.hq.w / 2, y: ROOMS.hq.y + 30 };
        // Jobs already there when the map opens stand in place; new ones walk in from HQ.
        a = { id, kind: j.source === 'bot' ? 'bot' : 'job', x: firstLoad ? dest.x : start.x, y: firstLoad ? dest.y : start.y, path: [], room, jobId: j.id, phase: Math.random() * 6 };
        if (!firstLoad) {
          pathTo(a, start, dest);
          say(`New: ${(j.title || '').slice(0, 30)}`, C.gold);
        }
        actors.set(id, a);
      } else if (a.room !== room) {
        say(`${(j.title || '').slice(0, 28)} → ${ROOMS[room].name}`, ROOMS[room].accent);
        burst(a.x + 8, a.y, ROOMS[room].accent);
        pathTo(a, { x: a.x, y: a.y }, dest);
      } else if (!a.path.length && (a.x !== dest.x || a.y !== dest.y)) {
        a.path = [dest];
      }
      Object.assign(a, { room, job: j, title: j.title, style, dot, status: j.status, dest });
      if (a.path.length) a.path[a.path.length - 1] = dest;
    }
    for (const room of Object.keys(MAX_PER_ROOM)) ROOMS[room].overflow = Math.max(0, (perRoom[room] || 0) - MAX_PER_ROOM[room]);

    // Workforce agents live in HQ and walk to the room they work on while running.
    const agents = (workforce && workforce.agents) || [];
    agents.forEach((ag, i) => {
      const id = `agent:${ag.id}`;
      seen.add(id);
      const home = slot('hq', i);
      let a = actors.get(id);
      if (!a) {
        a = { id, kind: 'agent', x: home.x, y: home.y, path: [], room: 'hq', phase: Math.random() * 6 };
        actors.set(id, a);
      }
      const recent = ag.lastRunAt && Date.now() - Date.parse(ag.lastRunAt) < 90e3;
      const busy = ag.running || recent;
      if (ag.enabled) hud.agents += 1;
      const target = busy ? AGENT_TARGET[ag.id] || 'hq' : 'hq';
      if (a.targetRoom !== target) {
        if (target !== 'hq') say(`${ag.name} heads to ${ROOMS[target].name}`, C.purple);
        const r = ROOMS[target];
        const dest = target === 'hq' ? home : { x: r.x + r.w - 26, y: r.y + r.h - 22 };
        pathTo(a, { x: a.x, y: a.y }, dest);
        a.targetRoom = target;
      }
      Object.assign(a, { title: `${ag.name}: ${ag.lastSummary || ag.role || ''}`, agent: ag, home, busy, enabled: ag.enabled });
    });

    // Hermes crew: one desk each on the bottom floor; busy members type and show a spark.
    crew.forEach((m, i) => {
      const id = m.id;
      seen.add(id);
      const desk = slot('crew', i);
      let a = actors.get(id);
      if (!a) {
        a = { id, kind: 'crew', x: desk.x, y: desk.y, path: [], room: 'crew', phase: Math.random() * 6 };
        actors.set(id, a);
      }
      if (m.busy) hud.crew += 1;
      const isKush = dotTarget === m.id;
      Object.assign(a, { title: `${isKush ? 'OG Kush · ' : ''}${m.title} (${m.name}) · ${m.busy ? 'working' : 'idle'}`, busy: m.busy, crewName: m.name, dest: desk, dotSkin: isKush });
    });

    // Dot (OG Kush) is a permanent resident of HQ, and visits any Dot-delegated job.
    for (const a of actors.values()) if (a.kind === 'bot' || a.kind === 'job') a.dotSkin = a.jobId === dotTarget;
    const dotJob = dotTarget === 'codex-voice' ? jobs.find((j) => isDot(j) && j.status !== 'done') : null;
    if (dotTarget === 'codex-voice') seen.add('agent:dot');
    let dot = actors.get('agent:dot');
    const dotHome = { x: ROOMS.hq.x + ROOMS.hq.w - 26, y: ROOMS.hq.y + 18 };
    if (!dot) {
      dot = { id: 'agent:dot', kind: 'dot', x: dotHome.x, y: dotHome.y, path: [], room: 'hq', phase: 0 };
      actors.set('agent:dot', dot);
    }
    const dotKey = dotJob ? `job:${dotJob.id}` : 'home';
    if (dot.targetKey !== dotKey) {
      const tgt = dotJob && actors.get(`job:${dotJob.id}`);
      pathTo(dot, { x: dot.x, y: dot.y }, tgt ? { x: tgt.dest.x + 14, y: tgt.dest.y } : dotHome);
      if (dotJob) say(`OG Kush is on: ${(dotJob.title || '').slice(0, 26)}`, '#7ee07e');
      dot.targetKey = dotKey;
    }
    dot.title = dotJob ? `Dot (OG Kush) · working on ${dotJob.title}` : 'Dot (OG Kush) · chilling in HQ, ready for work';
    dot.style = SOURCE.dot;
    if (dotTarget !== 'codex-voice') actors.delete('agent:dot');

    for (const id of [...actors.keys()]) if (!seen.has(id)) actors.delete(id);
  }

  /* ---------- drawing ---------- */
  function text(str, x, y, color = C.text, size = 8, align = 'left') {
    g.font = `${size}px "Press Start 2P", "Silkscreen", monospace`;
    g.textAlign = align;
    g.textBaseline = 'top';
    g.fillStyle = C.ink;
    g.fillText(str, x + 1, y + 1);
    g.fillStyle = color;
    g.fillText(str, x, y);
  }

  function drawRoom(key, r) {
    // floor tiles
    for (let ty = r.y; ty < r.y + r.h; ty += 8) {
      for (let tx = r.x; tx < r.x + r.w; tx += 8) {
        g.fillStyle = ((tx - r.x) / 8 + (ty - r.y) / 8) % 2 ? r.floor[0] : r.floor[1];
        g.fillRect(tx, ty, Math.min(8, r.x + r.w - tx), Math.min(8, r.y + r.h - ty));
      }
    }
    // back wall
    g.fillStyle = C.wall;
    g.fillRect(r.x, r.y, r.w, 13);
    g.fillStyle = C.wallHi;
    g.fillRect(r.x, r.y + 12, r.w, 1);
    // border
    g.strokeStyle = C.ink;
    g.lineWidth = 2;
    g.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
    // door into the corridor
    g.fillStyle = C.night;
    const doorY = r.y < CORR ? r.y + r.h - 2 : r.y > CORR2 ? r.y - 1 : r.y + r.h - 2;
    g.fillRect(r.x + r.w / 2 - 8, doorY, 16, 3);
    // sign
    g.fillStyle = r.accent;
    g.fillRect(r.x + 4, r.y + 3, 3, 7);
    text(r.name, r.x + 10, r.y + 3, C.text, 6);
    if (r.overflow) text(`+${r.overflow}`, r.x + r.w - 4, r.y + 3, C.gold, 6, 'right');

    // props
    if (key === 'working') {
      for (let i = 0; i < 6; i += 1) {
        const s = slot('working', i);
        g.fillStyle = '#6b4a2b';
        g.fillRect(s.x - 1, s.y + 12, 18, 5);
        g.fillStyle = '#20303f';
        g.fillRect(s.x + 3, s.y + 6, 10, 7);
        g.fillStyle = frame % 20 < 10 ? '#4fd06b' : '#39a554';
        g.fillRect(s.x + 4, s.y + 7, 8, 5);
      }
    }
    if (key === 'crew') {
      for (let i = 0; i < 40; i += 1) {
        const s2 = slot('crew', i);
        if (s2.y > r.y + r.h - 20) break;
        g.fillStyle = '#7a5530';
        g.fillRect(s2.x - 1, s2.y + 12, 18, 4);
      }
    }
    if (key === 'bots') {
      g.fillStyle = '#ffd23f';
      for (let x = r.x + 4; x < r.x + r.w - 4; x += 10) g.fillRect(x, r.y + r.h - 6, 5, 2);
    }
    if (key === 'hq') {
      // a big board on the wall showing the live counts
      g.fillStyle = '#10131f';
      g.fillRect(r.x + r.w - 72, r.y + 2, 68, 9);
      text(`${hud.needs}!  ${hud.working}*  ${hud.done}v`, r.x + r.w - 68, r.y + 3, C.gold, 6);
    }
    if (key === 'done') {
      g.fillStyle = C.gold;
      g.fillRect(r.x + r.w - 14, r.y + 18, 8, 6);
      g.fillRect(r.x + r.w - 12, r.y + 24, 4, 4);
    }
  }

  function drawActor(a, t) {
    const moving = a.path.length > 0;
    const step = moving && Math.floor(t * 8 + a.phase) % 2;
    let img;
    let bob = 0;
    if (a.kind === 'bot') {
      const p = basePal(a.status === 'failed' ? C.gray : (a.job && a.job.meta && a.job.meta.providerColor) || '#555', C.gray);
      if (a.job && a.job.meta && a.job.meta.provider === 'grok') p.C = '#222';
      img = sprite(ROBOT, p, a.dotSkin ? LEAF_HAT : null);
      bob = a.status === 'working' ? Math.round(Math.sin(t * 6 + a.phase)) : 0;
    } else if (a.kind === 'agent') {
      img = sprite(step ? PERSON_STEP : PERSON, basePal(a.enabled ? C.purple : C.gray, '#2a1a4a'), CROWN);
      bob = a.busy && !moving ? Math.round(Math.sin(t * 10 + a.phase)) : 0;
    } else if (a.kind === 'crew') {
      img = sprite(PERSON, a.dotSkin ? basePal(SOURCE.dot.shirt, SOURCE.dot.hair) : basePal(a.busy ? '#c9a227' : '#6d5a2e', '#3a2a10'), a.dotSkin ? LEAF_HAT : null);
      bob = a.busy ? Math.floor(t * 8 + a.phase) % 2 : 0;
    } else if (a.kind === 'dot') {
      img = sprite(step ? PERSON_STEP : PERSON, basePal(SOURCE.dot.shirt, SOURCE.dot.hair), LEAF_HAT);
      bob = Math.round(Math.sin(t * 3)) ;
    } else {
      const st = a.style || SOURCE.manual;
      const pal = basePal(st.shirt, st.hair);
      if (a.status === 'failed') Object.assign(pal, { C: C.gray, S: '#b7b2c9' });
      img = sprite(step ? PERSON_STEP : PERSON, pal, a.dot || a.dotSkin ? LEAF_HAT : null);
      if (a.status === 'working' && !moving) bob = Math.floor(t * 8 + a.phase) % 2; // typing
      if (a.status === 'needs_you' && !moving) bob = -Math.abs(Math.round(Math.sin(t * 5 + a.phase) * 2));
    }
    const x = Math.round(a.x);
    const y = Math.round(a.y) + bob;
    // shadow
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.fillRect(x + 3, Math.round(a.y) + 15, 10, 2);
    if (a.status === 'failed' && a.kind === 'job' && !moving) {
      g.save();
      g.translate(x + 8, y + 12);
      g.rotate(-Math.PI / 2);
      g.drawImage(img, -8, -8);
      g.restore();
    } else {
      g.drawImage(img, x, y);
    }
    // status bubbles
    if (!moving) {
      if (a.status === 'needs_you') bubble(x + 10, y - 9, '!', C.red, t);
      else if (a.status === 'follow_up') bubble(x + 10, y - 9, '...', C.gold, t);
      else if (a.status === 'done' && Math.floor(t * 2 + a.phase) % 4 === 0) spark(x + 12, y - 2);
      else if (a.status === 'working' && a.kind === 'job' && Math.random() < 0.04) particles.push({ x: x + 8, y: y + 4, vx: (Math.random() - 0.5) * 20, vy: -25, life: 0.7, color: '#7dffa1', ch: Math.random() < 0.5 ? '1' : '0' });
      else if (a.kind === 'agent' && a.busy) bubble(x + 10, y - 9, '*', C.purple, t);
      else if (a.kind === 'crew' && a.busy && Math.floor(t + a.phase) % 3 === 0) spark(x + 13, y - 1);
    }
    if (a.kind === 'dot' || a.dotSkin) text('OG KUSH', x + 8, y - 8, '#7ee07e', 5, 'center');
    if (hover === a) {
      g.strokeStyle = C.gold;
      g.lineWidth = 1;
      g.strokeRect(x - 1.5, y - 1.5, 19, 19);
    }
  }

  function bubble(x, y, s, color, t) {
    const w = Math.max(9, s.length * 5 + 4);
    const dy = Math.round(Math.sin(t * 4) * 1);
    g.fillStyle = C.text;
    g.fillRect(x, y + dy, w, 8);
    g.fillRect(x + 2, y + dy + 8, 2, 2);
    g.strokeStyle = C.ink;
    g.lineWidth = 1;
    g.strokeRect(x + 0.5, y + dy + 0.5, w - 1, 7);
    text(s, x + w / 2, y + dy + 1, color, 6, 'center');
  }

  function spark(x, y) {
    g.fillStyle = C.gold;
    g.fillRect(x, y - 2, 1, 5);
    g.fillRect(x - 2, y, 5, 1);
  }

  function drawHud(t) {
    g.fillStyle = C.ink;
    g.fillRect(0, 0, W, HUD);
    g.fillStyle = C.wallHi;
    g.fillRect(0, HUD - 2, W, 1);
    text('MISSION CONTROL', 6, 5, C.gold, 7);
    const items = [['!', hud.needs, C.red], ['WORK', hud.working, C.green], ['BOTS', hud.bots, C.blue], ['DONE', hud.done, C.text], ['KO', hud.failed, C.red], ['CREW', hud.agents, C.purple], ['HERMES', hud.crew, '#c9a227']];
    let x = 112;
    for (const [k, v, col] of items) {
      text(`${k} ${String(v).padStart(2, '0')}`, x, 6, col, 6);
      x += 48;
    }
    // ticker on the corridor
    g.fillStyle = C.night;
    g.fillRect(0, CORR, W, ROW2 - CORR);
    g.fillStyle = '#2a2350';
    for (let x2 = (-Math.floor(t * 20) % 16); x2 < W; x2 += 16) g.fillRect(x2, CORR + 8, 8, 1);
    g.fillStyle = C.night;
    g.fillRect(0, CORR2, W, ROW3 - CORR2);
    g.fillStyle = '#2a2350';
    for (let x3 = (Math.floor(t * 20) % 16) - 16; x3 < W; x3 += 16) g.fillRect(x3, CORR2 + 8, 8, 1);
    const msg = ticker[0];
    if (msg) {
      const age = (performance.now() - msg.t) / 1000;
      if (age < 12) text(`> ${msg.text}`, 8, CORR + 5, msg.color, 6);
    } else {
      text('> all quiet. the crew is on watch.', 8, CORR + 5, C.dim, 6);
    }
  }

  function step(dt) {
    const speed = 70;
    for (const a of actors.values()) {
      if (!a.path.length) continue;
      const p = a.path[0];
      const dx = p.x - a.x;
      const dy = p.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d < 1.5) {
        a.x = p.x;
        a.y = p.y;
        a.path.shift();
        if (!a.path.length && a.kind === 'job' && a.status === 'done') burst(a.x + 8, a.y, C.gold, 14);
      } else {
        const m = Math.min(d, speed * dt);
        a.x += (dx / d) * m;
        a.y += (dy / d) * m;
      }
    }
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 90 * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function render(ts) {
    if (!running) return;
    const t = ts / 1000;
    const dt = Math.min(0.05, lastT ? t - lastT : 0.016);
    lastT = t;
    frame += 1;
    step(dt);
    g.fillStyle = C.night;
    g.fillRect(0, 0, W, H);
    for (const [k, r] of Object.entries(ROOMS)) drawRoom(k, r);
    drawHud(t);
    const list = [...actors.values()].sort((a, b) => a.y - b.y);
    for (const a of list) drawActor(a, t);
    for (const p of particles) {
      if (p.ch) text(p.ch, p.x, p.y, p.color, 5);
      else { g.fillStyle = p.color; g.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); }
    }
    if (hover) tooltip(hover);
    requestAnimationFrame(render);
  }

  function tooltip(a) {
    const s = (a.title || '').slice(0, 52);
    const w = Math.min(W - 8, s.length * 5 + 10);
    let x = Math.round(a.x + 8 - w / 2);
    x = Math.max(4, Math.min(W - w - 4, x));
    const y = a.y > H / 2 ? Math.round(a.y) - 16 : Math.round(a.y) + 20;
    g.fillStyle = C.ink;
    g.fillRect(x, y, w, 11);
    g.strokeStyle = C.gold;
    g.lineWidth = 1;
    g.strokeRect(x + 0.5, y + 0.5, w - 1, 10);
    text(s, x + 5, y + 3, C.text, 5);
  }

  function hit(ev) {
    const rect = cv.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * W;
    const y = ((ev.clientY - rect.top) / rect.height) * H;
    let best = null;
    for (const a of actors.values()) if (x >= a.x && x <= a.x + 16 && y >= a.y && y <= a.y + 16) best = !best || a.y > best.y ? a : best;
    return best;
  }

  function mount(canvas, options = {}) {
    cv = canvas;
    opts = options;
    cv.width = W;
    cv.height = H;
    g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    cv.addEventListener('mousemove', (ev) => {
      hover = hit(ev);
      cv.style.cursor = hover && hover.jobId ? 'pointer' : 'default';
    });
    cv.addEventListener('mouseleave', () => { hover = null; });
    cv.addEventListener('click', (ev) => {
      const a = hit(ev);
      if (a && a.jobId && opts.onOpen) opts.onOpen(a.jobId);
    });
  }

  function start() {
    if (running || !cv) return;
    running = true;
    lastT = 0;
    requestAnimationFrame(render);
  }

  function stop() {
    running = false;
  }

  window.Arcade = { mount, update, start, stop, say, _actors: actors };
})();
