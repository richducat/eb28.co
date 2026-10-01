/* EB28 Mission Control — Arcade: a Super Mario World style overworld of every job, bot and agent.
 * Everything is drawn procedurally (no image assets): an island with animated water, shoreline
 * cliffs, dirt paths, eyed hills, trees and flowers, plus a landmark per status. Jobs are little
 * characters standing at the landmark for their status; when a status changes they walk the
 * path to the new landmark. Usage:
 *   Arcade.mount(canvas, { onOpen(jobId), onPlace(placeId) });
 *   Arcade.update(board, workforce, crew, dotCfg);  Arcade.start(); Arcade.stop();
 */
(() => {
  const T = 16; // tile size
  const COLS = 32;
  const ROWS = 23;
  const W = COLS * T; // 512
  const H = ROWS * T; // 368

  /* ---------- palette: SNES-like 3–4 step ramps ---------- */
  const P = {
    ink: '#101018', white: '#f8f8f8',
    sea: ['#1848a0', '#2860c8', '#4888e8', '#a8d0f8'],
    grass: ['#185818', '#30902c', '#48b838', '#80e050', '#c0f080'],
    dirt: ['#784818', '#a86830', '#d09048', '#f0c070', '#f8e0a0'],
    cliff: ['#482810', '#704018', '#986028'],
    stone: ['#383850', '#585878', '#8888a8', '#c0c0d8'],
    red: ['#781018', '#c02028', '#f04838', '#f89878'],
    wood: ['#482008', '#784018', '#a86028', '#d09048'],
    gold: ['#886000', '#d8a000', '#f8d838', '#f8f8a0'],
    purple: ['#382060', '#6038a0', '#9060d8', '#c8a0f8'],
    ghost: ['#302838', '#504858', '#787088', '#b0a8c0'],
    skin: ['#a85830', '#e09868', '#f8c8a0'],
  };

  /* ---------- places ---------- */
  // door = tile the crowd gathers at; building drawn above it. route = path from the HQ door.
  const HQD = [16, 13];
  const PLACES = {
    needs_you: { name: 'NEEDS YOU', blurb: 'Waiting on your answer or approval', door: [7, 7], route: [HQD, [16, 9], [7, 9], [7, 7]], cols: 5, kind: 'castle' },
    working: { name: 'WORKSHOP', blurb: 'Agents busy right now', door: [16, 6], route: [HQD, [16, 9], [16, 6]], cols: 6, kind: 'workshop' },
    bots: { name: 'BOT FORTRESS', blurb: 'Always-on bots (Grok, Hermes...)', door: [25, 7], route: [HQD, [16, 9], [25, 9], [25, 7]], cols: 4, kind: 'fortress' },
    follow_up: { name: 'FOLLOW-UP', blurb: 'Idle, stale or needs a nudge', door: [6, 14], route: [HQD, [16, 15], [6, 15], [6, 14]], cols: 5, kind: 'post' },
    hq: { name: 'HQ', blurb: 'Your workforce agents + Dot', door: HQD, route: [HQD], cols: 5, kind: 'house' },
    done: { name: 'GOAL', blurb: 'Finished in the last day', door: [26, 14], route: [HQD, [16, 15], [26, 15], [26, 14]], cols: 6, kind: 'goal', max: 12 },
    failed: { name: 'GHOST HOUSE', blurb: 'Crashed or errored. Check these', door: [23, 19], route: [HQD, [16, 15], [21, 15], [21, 19], [23, 19]], cols: 4, kind: 'ghost', max: 8 },
    crew: { name: 'HERMES VILLAGE', blurb: 'Your Hermes profile agents', door: [10, 19], route: [HQD, [16, 15], [10, 15], [10, 19]], cols: 11, kind: 'village' },
  };
  const AGENT_TARGET = { triage: 'needs_you', 'follow-up': 'follow_up', 'bot-watchdog': 'bots', janitor: 'done', 'pr-steward': 'working', 'ops-runner': 'working', 'automation-scout': 'working', reporter: 'hq' };

  /* ---------- deterministic noise ---------- */
  const hash = (x, y, s = 0) => {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 2246822519)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };

  /* ---------- map generation ---------- */
  const LAND = [];
  const PATH = [];
  const PLAZA = [];
  const DECOR = [];
  function buildMap() {
    for (let y = 0; y < ROWS; y += 1) {
      LAND[y] = []; PATH[y] = []; PLAZA[y] = [];
      for (let x = 0; x < COLS; x += 1) {
        const nx = (x + 0.5 - 16) / 15.2;
        const ny = (y + 0.5 - 12) / 10.4;
        const n = (hash(x >> 1, y >> 1, 7) - 0.5) * 0.22 + (hash(x, y, 3) - 0.5) * 0.08;
        LAND[y][x] = y >= 2 && nx * nx + ny * ny + n < 1;
        PATH[y][x] = false;
        PLAZA[y][x] = false;
      }
    }
    const mark = (x, y) => { if (y >= 0 && y < ROWS && x >= 0 && x < COLS) { PATH[y][x] = true; LAND[y][x] = true; } };
    for (const p of Object.values(PLACES)) {
      for (let i = 1; i < p.route.length; i += 1) {
        const [x0, y0] = p.route[i - 1];
        const [x1, y1] = p.route[i];
        for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x += 1) mark(x, y0);
        for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y += 1) mark(x1, y);
      }
      const [dx, dy] = p.door;
      const half = (Math.ceil(p.cols / 2) * 14) / T + 0.5;
      for (let y = dy - 3; y <= dy + 1; y += 1) for (let x = Math.floor(dx - half); x <= Math.ceil(dx + half); x += 1) if (y >= 0 && y < ROWS && x >= 0 && x < COLS) { PLAZA[y][x] = true; LAND[y][x] = true; }
    }
    for (let y = 2; y < ROWS - 1; y += 1) {
      for (let x = 1; x < COLS - 1; x += 1) {
        if (!LAND[y][x] || PATH[y][x] || PLAZA[y][x] || !LAND[y + 1][x]) continue;
        const r = hash(x, y, 11);
        // denser trees near the coast, open meadows inland
        const coast = !LAND[y - 1][x] || !LAND[y][x - 1] || !LAND[y][x + 1] || !LAND[y + 2] || !LAND[y + 2][x];
        const tree = coast ? 0.42 : 0.14;
        if (r < tree) DECOR.push({ x, y, type: 'tree' });
        else if (r < tree + 0.06) DECOR.push({ x, y, type: 'hill' });
        else if (r < tree + 0.15) DECOR.push({ x, y, type: 'bush' });
        else if (r < tree + 0.33) DECOR.push({ x, y, type: 'flower', c: hash(x, y, 5) < 0.5 ? P.red[2] : P.gold[2] });
        else if (r < tree + 0.37) DECOR.push({ x, y, type: 'rock' });
      }
    }
  }
  const land = (x, y) => y >= 0 && y < ROWS && x >= 0 && x < COLS && LAND[y][x];
  const isPath = (x, y) => y >= 0 && y < ROWS && x >= 0 && x < COLS && PATH[y][x];

  /* ---------- low-level pixel helpers ---------- */
  let g;
  const px = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  function text(str, x, y, color = P.white, size = 8, align = 'left', outline = P.ink) {
    g.font = `${size}px "Press Start 2P", monospace`;
    g.textAlign = align;
    g.textBaseline = 'top';
    g.fillStyle = outline;
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) g.fillText(str, x + ox, y + oy);
    g.fillStyle = color;
    g.fillText(str, x, y);
  }

  /* ---------- tiles ---------- */
  function drawWater(x, y, f) {
    const X = x * T;
    const Y = y * T;
    px(X, Y, T, T, P.sea[1]);
    for (let i = 0; i < 3; i += 1) {
      const wx = (Math.floor(hash(x, y, i) * 12) + f * 2 + i * 5) % 16;
      const wy = Math.floor(hash(x, y, i + 9) * 14);
      px(X + wx, Y + wy, Math.min(4, 16 - wx), 1, P.sea[2]);
      if (hash(x, y, i + 20) < 0.3) px(X + ((wx + 3) % 15), Y + wy + 1, 2, 1, P.sea[0]);
    }
    if ((f + x + y) % 8 === 0 && hash(x, y, 33) < 0.25) px(X + 7, Y + 7, 2, 1, P.sea[3]);
  }

  function drawShore(x, y, f) {
    const X = x * T;
    const Y = y * T;
    const o = f % 4 < 2 ? 0 : 1;
    if (land(x, y - 1)) { px(X, Y + 3 + o, T, 2, P.sea[3]); px(X + 2 + o * 3, Y + 7, 5, 1, P.sea[2]); }
    if (land(x, y + 1)) px(X, Y + T - 3 - o, T, 2, P.sea[3]);
    if (land(x - 1, y)) px(X + o, Y, 2, T, P.sea[3]);
    if (land(x + 1, y)) px(X + T - 2 - o, Y, 2, T, P.sea[3]);
  }

  function drawGrass(x, y) {
    const X = x * T;
    const Y = y * T;
    // big soft patches of lighter/darker meadow give the island depth
    const patch = hash(x >> 2, y >> 2, 17) + (hash(x >> 1, y >> 1, 19) - 0.5) * 0.3;
    px(X, Y, T, T, patch < 0.3 ? '#40a830' : patch > 0.8 ? '#58c440' : P.grass[2]);
    for (let i = 0; i < 6; i += 1) {
      const gx = Math.floor(hash(x, y, i + 40) * 15);
      const gy = Math.floor(hash(x, y, i + 50) * 14);
      px(X + gx, Y + gy, 1, 2, P.grass[1]);
      px(X + gx + 1, Y + gy, 1, 1, P.grass[3]);
    }
    if (hash(x, y, 60) < 0.4) { const gx = Math.floor(hash(x, y, 61) * 12); px(X + gx, Y + 10, 1, 2, P.grass[1]); px(X + gx + 2, Y + 10, 1, 2, P.grass[1]); px(X + gx + 1, Y + 9, 1, 3, P.grass[1]); }
    if (!land(x, y - 1)) { px(X, Y, T, 2, P.grass[4]); px(X, Y + 2, T, 1, P.grass[3]); }
    if (!land(x - 1, y)) px(X, Y, 1, T, P.grass[1]);
    if (!land(x + 1, y)) px(X + T - 1, Y, 1, T, P.grass[1]);
    if (!land(x, y + 1)) {
      px(X, Y + 10, T, 6, P.cliff[1]);
      px(X, Y + 10, T, 1, P.grass[0]);
      for (let i = 0; i < 4; i += 1) px(X + i * 4 + (y % 2), Y + 12 + (i % 2), 2, 3, P.cliff[0]);
      px(X + 1, Y + 11, 3, 1, P.cliff[2]);
      px(X + 9, Y + 11, 4, 1, P.cliff[2]);
    }
  }

  function drawPlaza(x, y) {
    // trampled lighter grass where crowds stand
    const X = x * T;
    const Y = y * T;
    if (hash(x, y, 90) < 0.5) px(X + 3, Y + 5, 3, 1, P.grass[3]);
    if (hash(x, y, 91) < 0.5) px(X + 10, Y + 11, 2, 1, P.dirt[3]);
  }

  function drawPath(x, y) {
    const X = x * T;
    const Y = y * T;
    const n = isPath(x, y - 1);
    const s = isPath(x, y + 1);
    const w = isPath(x - 1, y);
    const e = isPath(x + 1, y);
    const x0 = w ? 0 : 3;
    const x1 = e ? T : T - 3;
    const y0 = n ? 0 : 3;
    const y1 = s ? T : T - 3;
    px(X + 3, Y + y0, 10, y1 - y0, P.dirt[2]);
    px(X + x0, Y + 3, x1 - x0, 10, P.dirt[2]);
    if (!n) px(X + 3, Y + 3, 10, 1, P.dirt[1]);
    if (!s) px(X + 3, Y + 12, 10, 1, P.dirt[0]);
    if (!w) px(X + 3, Y + 3, 1, 10, P.dirt[1]);
    if (!e) px(X + 12, Y + 3, 1, 10, P.dirt[0]);
    if (n && !w) px(X + 3, Y, 1, 3, P.dirt[1]);
    if (n && !e) px(X + 12, Y, 1, 3, P.dirt[0]);
    if (s && !w) px(X + 3, Y + 13, 1, 3, P.dirt[1]);
    if (s && !e) px(X + 12, Y + 13, 1, 3, P.dirt[0]);
    if (w && !n) px(X, Y + 3, 3, 1, P.dirt[1]);
    if (e && !n) px(X + 13, Y + 3, 3, 1, P.dirt[1]);
    if (w && !s) px(X, Y + 12, 3, 1, P.dirt[0]);
    if (e && !s) px(X + 13, Y + 12, 3, 1, P.dirt[0]);
    for (let i = 0; i < 3; i += 1) {
      const gx = 4 + Math.floor(hash(x, y, i + 70) * 8);
      const gy = 4 + Math.floor(hash(x, y, i + 80) * 8);
      px(X + gx, Y + gy, 1, 1, i ? P.dirt[1] : P.dirt[4]);
    }
    px(X + 5, Y + 5, 2, 1, P.dirt[3]);
  }

  function drawDecor(d, f) {
    const X = d.x * T;
    const Y = d.y * T;
    if (d.type === 'tree') {
      px(X + 3, Y + 14, 10, 2, 'rgba(0,0,0,.25)');
      px(X + 6, Y + 8, 4, 7, P.wood[1]);
      px(X + 6, Y + 8, 1, 7, P.wood[2]);
      px(X + 1, Y - 5, 14, 13, P.grass[0]);
      px(X + 2, Y - 7, 12, 15, P.grass[0]);
      px(X + 2, Y - 6, 12, 12, P.grass[1]);
      px(X + 3, Y - 6, 9, 10, P.grass[2]);
      px(X + 4, Y - 5, 4, 3, P.grass[3]);
      px(X + 5, Y - 4, 2, 1, P.grass[4]);
      px(X + 10, Y + 1, 2, 2, P.grass[1]);
    } else if (d.type === 'hill') {
      px(X + 1, Y + 4, 14, 12, P.grass[0]);
      px(X + 3, Y + 1, 10, 3, P.grass[0]);
      px(X + 2, Y + 4, 12, 11, P.grass[2]);
      px(X + 4, Y + 2, 8, 2, P.grass[2]);
      px(X + 4, Y + 3, 3, 2, P.grass[3]);
      px(X + 12, Y + 6, 1, 8, P.grass[1]);
      const blink = (f + d.x * 7) % 50 < 2;
      px(X + 5, Y + 7, 1, blink ? 1 : 3, P.ink);
      px(X + 10, Y + 7, 1, blink ? 1 : 3, P.ink);
    } else if (d.type === 'bush') {
      px(X + 1, Y + 8, 14, 7, P.grass[0]);
      px(X + 2, Y + 7, 5, 8, P.grass[1]);
      px(X + 8, Y + 6, 6, 8, P.grass[1]);
      px(X + 3, Y + 8, 3, 2, P.grass[3]);
      px(X + 9, Y + 7, 3, 2, P.grass[3]);
    } else if (d.type === 'flower') {
      // a little patch of three swaying flowers
      for (const [ox, oy, k] of [[2, 6, 0], [9, 3, 1], [6, 10, 2]]) {
        const sway = (f + d.x + k * 3) % 8 < 4 ? 0 : 1;
        const col = k === 2 ? P.white : d.c;
        px(X + ox + 1, Y + oy + 3, 1, 4, P.grass[0]);
        px(X + ox + sway, Y + oy, 3, 3, col);
        px(X + ox + 1 + sway, Y + oy + 1, 1, 1, k === 2 ? P.gold[2] : P.gold[3]);
        px(X + ox + 2, Y + oy + 5, 2, 1, P.grass[3]);
      }
    } else if (d.type === 'rock') {
      px(X + 4, Y + 9, 9, 6, P.stone[1]);
      px(X + 5, Y + 8, 7, 2, P.stone[2]);
      px(X + 6, Y + 9, 2, 1, P.stone[3]);
      px(X + 4, Y + 14, 9, 1, P.stone[0]);
    }
  }

  /* ---------- landmarks ---------- */
  function gear(x, y, f, c) {
    const a = f / 8;
    for (let i = 0; i < 6; i += 1) {
      const ang = a + (i * Math.PI) / 3;
      px(Math.round(x + Math.cos(ang) * 5) - 1, Math.round(y + Math.sin(ang) * 5) - 1, 3, 3, c);
    }
    px(x - 3, y - 3, 6, 6, c);
    px(x - 1, y - 1, 2, 2, P.wood[0]);
  }

  function star(x, y, f) {
    const s = Math.floor(f / 4) % 2;
    px(x - 1, y - 4 - s, 3, 9 + s * 2, P.gold[2]);
    px(x - 4 - s, y - 1, 9 + s * 2, 3, P.gold[2]);
    px(x, y, 1, 1, P.white);
  }

  function drawPlace(id, p, f, count) {
    const cx = p.door[0] * T + 8;
    const by = p.door[1] * T; // ground line
    const k = p.kind;
    px(cx - 28, by - 2, 56, 3, 'rgba(0,0,0,.2)');
    if (k === 'castle') {
      px(cx - 24, by - 30, 48, 30, P.stone[1]);
      for (let r = 0; r < 6; r += 1) for (let c = 0; c < 6; c += 1) px(cx - 24 + c * 8 + (r % 2) * 4, by - 30 + r * 5, 7, 4, P.stone[2]);
      px(cx - 24, by - 30, 48, 1, P.stone[3]);
      for (let i = 0; i < 6; i += 1) px(cx - 24 + i * 8, by - 34, 5, 4, P.stone[2]);
      for (const tx of [-30, 18]) {
        px(cx + tx, by - 44, 12, 44, P.stone[1]);
        px(cx + tx + 1, by - 44, 3, 44, P.stone[2]);
        px(cx + tx + 10, by - 44, 2, 44, P.stone[0]);
        px(cx + tx - 2, by - 52, 16, 8, P.red[1]);
        px(cx + tx, by - 56, 12, 4, P.red[2]);
        px(cx + tx + 3, by - 59, 6, 3, P.red[2]);
        px(cx + tx + 4, by - 58, 2, 2, P.red[3]);
        px(cx + tx + 4, by - 36, 4, 6, P.ink);
      }
      px(cx - 7, by - 16, 14, 16, P.wood[0]);
      px(cx - 6, by - 15, 12, 15, P.wood[1]);
      px(cx - 6, by - 15, 12, 2, P.wood[2]);
      px(cx - 1, by - 15, 1, 15, P.wood[0]);
      px(cx + 23, by - 72, 1, 14, P.ink);
      const wave = Math.floor(f / 3) % 3;
      px(cx + 24, by - 72 + (wave === 1 ? 1 : 0), 9, 5, P.red[2]);
      px(cx + 24 + 9, by - 71 + (wave === 2 ? 1 : 0), 2, 3, P.red[2]);
      px(cx + 24, by - 72, 9, 1, P.red[3]);
      if (count) {
        const on = Math.floor(f / 6) % 2;
        px(cx - 6, by - 52, 12, 15, P.ink);
        px(cx - 5, by - 51, 10, 13, on ? P.gold[2] : P.red[2]);
        text('!', cx + 1, by - 49, P.ink, 8, 'center', on ? P.gold[2] : P.red[2]);
      }
    } else if (k === 'workshop') {
      px(cx - 26, by - 26, 52, 26, P.wood[2]);
      for (let i = 0; i < 6; i += 1) px(cx - 26, by - 24 + i * 4, 52, 1, P.wood[1]);
      for (let i = 0; i < 12; i += 1) px(cx - 30 + i, by - 27 - i, 60 - i * 2, 1, i % 3 ? P.red[1] : P.red[0]);
      px(cx - 18, by - 39, 36, 2, P.red[2]);
      px(cx + 12, by - 46, 7, 14, P.stone[1]);
      px(cx + 12, by - 46, 7, 2, P.stone[2]);
      for (let i = 0; i < 3; i += 1) {
        if (!count && i) break;
        const tt = ((f + i * 10) % 30) / 30;
        const r = 2 + tt * 5;
        g.fillStyle = `rgba(240,240,248,${0.85 - tt * 0.75})`;
        g.fillRect(Math.round(cx + 15 + Math.sin(tt * 6 + i) * 3 - r / 2), Math.round(by - 50 - tt * 24), Math.round(r), Math.round(r));
      }
      const glow = count ? (Math.floor(f / 4) % 2 ? P.gold[2] : P.gold[3]) : P.stone[0];
      for (const wx of [-20, 12]) { px(cx + wx, by - 18, 8, 7, P.wood[0]); px(cx + wx + 1, by - 17, 6, 5, glow); px(cx + wx + 4, by - 17, 1, 5, P.wood[0]); }
      px(cx - 6, by - 16, 12, 16, P.wood[0]);
      px(cx - 5, by - 15, 10, 15, P.wood[1]);
      px(cx + 2, by - 8, 2, 2, P.gold[2]);
      gear(cx, by - 26, count ? f : 0, P.stone[3]);
    } else if (k === 'fortress') {
      px(cx - 22, by - 40, 44, 40, P.stone[0]);
      for (let r = 0; r < 8; r += 1) for (let c = 0; c < 5; c += 1) px(cx - 22 + c * 9 + (r % 2) * 4, by - 40 + r * 5, 8, 4, P.stone[1]);
      for (let i = 0; i < 5; i += 1) px(cx - 22 + i * 10, by - 45, 6, 5, P.stone[1]);
      px(cx - 8, by - 18, 16, 18, P.ink);
      for (let i = 0; i < 4; i += 1) px(cx - 7 + i * 4, by - 17, 2, 17, P.stone[0]);
      px(cx, by - 64, 1, 19, P.stone[3]);
      px(cx - 2, by - 66, 5, 3, Math.floor(f / 5) % 2 ? P.red[2] : P.red[0]);
      for (let i = 0; i < 3; i += 1) {
        const tt = ((f + i * 8) % 24) / 24;
        g.strokeStyle = `rgba(140,210,255,${1 - tt})`;
        g.lineWidth = 1;
        g.beginPath();
        g.arc(cx + 0.5, by - 64.5, 3 + tt * 12, Math.PI * 1.1, Math.PI * 1.9);
        g.stroke();
      }
      const blink = Math.floor(f / 7) % 2;
      px(cx - 18, by - 34, 6, 6, blink ? '#20c8e8' : '#108098');
      px(cx + 12, by - 34, 6, 6, blink ? '#108098' : '#20c8e8');
    } else if (k === 'post') {
      px(cx - 22, by - 24, 44, 24, P.gold[1]);
      px(cx - 22, by - 24, 44, 2, P.gold[2]);
      for (let i = 0; i < 10; i += 1) px(cx - 25 + i, by - 25 - i, 50 - i * 2, 1, i % 3 ? P.sea[1] : P.sea[0]);
      px(cx - 5, by - 15, 10, 15, P.wood[1]);
      px(cx - 18, by - 17, 8, 7, P.white);
      px(cx + 10, by - 17, 8, 7, P.white);
      const bounce = count && Math.floor(f / 5) % 2 ? -2 : 0;
      px(cx - 8, by - 46 + bounce, 16, 11, P.ink);
      px(cx - 7, by - 45 + bounce, 14, 9, P.white);
      for (let i = 0; i < 7; i += 1) { px(cx - 7 + i, by - 45 + bounce + Math.floor(i / 1.5), 1, 1, P.red[1]); px(cx + 6 - i, by - 45 + bounce + Math.floor(i / 1.5), 1, 1, P.red[1]); }
      px(cx + 26, by - 13, 7, 6, P.red[1]);
      px(cx + 26, by - 13, 7, 1, P.red[3]);
      px(cx + 29, by - 7, 1, 7, P.wood[0]);
    } else if (k === 'house') {
      px(cx - 20, by - 22, 40, 22, P.wood[3]);
      px(cx - 20, by - 22, 40, 2, P.white);
      for (let i = 0; i < 11; i += 1) px(cx - 24 + i * 0.6, by - 23 - i, 48 - i * 1.2, 1, i < 2 ? P.red[0] : P.red[1 + (i % 2)]);
      px(cx - 17, by - 34, 34, 2, P.red[3]);
      px(cx - 6, by - 14, 12, 14, P.wood[0]);
      px(cx + 10, by - 16, 7, 6, P.sea[2]);
      px(cx - 17, by - 16, 7, 6, P.sea[2]);
      const fx = cx + 32;
      px(fx - 6, by - 2, 12, 3, P.wood[0]);
      px(fx - 5, by - 3, 4, 2, P.wood[1]);
      const fl = Math.floor(f / 2) % 3;
      px(fx - 3, by - 7 - fl, 6, 5 + fl, P.red[2]);
      px(fx - 2, by - 6 - fl, 4, 4, P.gold[2]);
      px(fx - 1, by - 4, 2, 2, P.gold[3]);
    } else if (k === 'goal') {
      for (const gx of [-18, 16]) {
        px(cx + gx, by - 50, 3, 50, P.ink);
        px(cx + gx + 1, by - 50, 1, 50, P.stone[3]);
        px(cx + gx - 1, by - 54, 5, 4, P.stone[2]);
      }
      const tapeY = by - 46 + Math.round((Math.sin(f / 10) + 1) * 20);
      px(cx - 15, tapeY, 31, 3, P.gold[2]);
      px(cx - 15, tapeY, 31, 1, P.gold[3]);
      if (count) star(cx, by - 62, f);
    } else if (k === 'ghost') {
      px(cx - 20, by - 28, 40, 28, P.ghost[1]);
      for (let i = 0; i < 5; i += 1) px(cx - 20 + i * 8, by - 28, 1, 28, P.ghost[0]);
      for (let i = 0; i < 10; i += 1) px(cx - 23 + i, by - 29 - i, 46 - i * 2, 1, i % 2 ? P.ghost[0] : P.purple[0]);
      px(cx - 14, by - 22, 7, 7, P.ink);
      px(cx - 13, by - 21, 2, 2, P.gold[2]);
      px(cx + 7, by - 22, 7, 7, P.ink);
      px(cx + 11, by - 18, 2, 2, P.gold[2]);
      px(cx - 5, by - 14, 10, 14, P.ink);
      if (count) {
        const bx = cx + 22 + Math.round(Math.sin(f / 8) * 3);
        const byy = by - 42 + Math.round(Math.cos(f / 6) * 3);
        px(bx, byy, 11, 9, P.white);
        px(bx + 1, byy - 1, 9, 11, P.white);
        px(bx + 3, byy + 2, 1, 3, P.ink);
        px(bx + 7, byy + 2, 1, 3, P.ink);
        px(bx + 3, byy + 6, 5, 2, P.red[1]);
        px(bx - 1, byy + 3, 2, 2, P.white);
      }
    } else if (k === 'village') {
      px(cx - 18, by - 22, 36, 22, P.wood[2]);
      for (let i = 0; i < 10; i += 1) px(cx - 22 + i, by - 23 - i, 44 - i * 2, 1, i % 2 ? P.gold[1] : P.gold[2]);
      px(cx - 5, by - 14, 10, 14, P.wood[0]);
      px(cx - 14, by - 16, 6, 6, P.gold[3]);
      px(cx + 8, by - 16, 6, 6, P.gold[3]);
      for (const hx of [-56, -40, 30, 46]) {
        px(cx + hx, by - 10, 12, 10, P.wood[3]);
        for (let i = 0; i < 6; i += 1) px(cx + hx - 1 + i, by - 11 - i, 14 - i * 2, 1, P.red[1]);
        px(cx + hx + 4, by - 6, 4, 6, P.wood[0]);
      }
    }
  }

  const signRects = {};
  function sign(id, p, count) {
    const cx = p.door[0] * T + 8;
    const by = p.door[1] * T;
    const label = `${p.name} ${count}`;
    g.font = '6px "Press Start 2P", monospace';
    const w = Math.max(30, Math.ceil(g.measureText(label).width) + 10);
    const x = Math.round(cx - w / 2);
    const rows = Math.ceil(Math.min(count, p.max || 99) / p.cols);
    const y = Math.min(by + 8 + Math.max(1, rows) * 14, H - 28);
    px(x - 1, y - 1, w + 2, 12, P.ink);
    px(x, y, w, 10, P.wood[2]);
    px(x, y, w, 1, P.wood[3]);
    px(x, y + 9, w, 1, P.wood[1]);
    text(label, cx, y + 2, count ? P.white : P.dirt[4], 6, 'center');
    signRects[id] = { x, y, w, h: 10 };
  }

  /* ---------- characters (16x16, 3-tone) ---------- */
  // K outline, H hair, h hair shade, S skin, s skin shade, E eye, C shirt, c shirt shade, W shirt light, P pants, B boots
  const PERSON = [
    '.....KKKKK......', '....KHHHHHK.....', '...KHHHHHHhK....', '...KHSSSSShK....', '...KSESSESsK....', '...KSSSSSSsK....', '....KSsssSK.....', '...KKCCCCCKK....',
    '..KSKCCWCCcKSK..', '..KsKCCCCCcKsK..', '...KKCCCCCcKK...', '....KPPPPPPK....', '....KPPKKPPK....', '...KBBK..KBBK...', '...KKKK..KKKK...', '................',
  ];
  const PERSON_STEP = PERSON.slice(0, 12).concat(['....KPPKKPPK....', '..KBBK....KBBK..', '..KKKK....KKKK..', '................']);
  const ROBOT = [
    '.......G........', '.......K........', '...KKKKKKKKKK...', '..KMMMMMMMMMmK..', '..KMVVVVVVVVmK..', '..KMVEVVVVEVmK..', '..KMMMMMMMMMmK..', '...KKKKKKKKKK...',
    '..KKCCCCCCCcKK..', '.KMKCCGGGCCcKMK.', '.KmKCCCCCCCcKmK.', '..KKCCCCCCCcKK..', '...KMMMMMMMmK...', '...KMMK..KMmK...', '...KKKK..KKKK...', '................',
  ];
  const LEAF_HAT = ['.......L........', '..L...LLL...L...', '...L..LlL..L....', '....LLLlLLL.....', '.....LLLLL......', '...KKKKKKKKK....'];
  const CAP = ['....KKKKKKK.....', '...KCCCCCCCK....', '..KCCCWWCCcKK...'];

  const shade = (hex, amt) => {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v * amt)));
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  };
  const spriteCache = new Map();
  function sprite(template, pl, overlay) {
    const key = template.join('') + JSON.stringify(pl) + (overlay ? overlay.join('') : '');
    if (spriteCache.has(key)) return spriteCache.get(key);
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 16;
    const cg = c.getContext('2d');
    const paint = (rows, dy = 0) => rows.forEach((row, y) => [...row].forEach((ch, x) => {
      const col = pl[ch];
      if (col && y + dy >= 0) { cg.fillStyle = col; cg.fillRect(x, y + dy, 1, 1); }
    }));
    paint(template);
    if (overlay) paint(overlay, overlay === LEAF_HAT ? -1 : 0);
    spriteCache.set(key, c);
    return c;
  }
  const pal = (shirt, hair) => ({
    K: P.ink, H: hair, h: shade(hair, 0.7), S: P.skin[2], s: P.skin[1], E: P.ink, C: shirt, c: shade(shirt, 0.7), W: shade(shirt, 1.3),
    P: '#28305a', B: P.wood[0], L: '#40a848', l: '#287830', G: P.gold[2], M: '#b8c0d8', m: '#7880a0', V: '#28e0f0',
  });

  const SOURCE = {
    'claude-code': { shirt: '#e07850', hair: '#5a3020' },
    codex: { shirt: '#10b088', hair: '#202038' },
    gemini: { shirt: '#4880f0', hair: '#e8d068' },
    openclaw: { shirt: '#e84850', hair: '#303030' },
    hermes: { shirt: '#d8a828', hair: '#f0f0f0' },
    github: { shirt: '#788090', hair: '#181818' },
    manual: { shirt: '#a098c8', hair: '#3a2818' },
    automation: { shirt: '#f0c838', hair: '#484848' },
    dot: { shirt: '#40a848', hair: '#8050d8' },
  };

  /* ---------- actors ---------- */
  let cv; let opts = {};
  const actors = new Map();
  const particles = [];
  const ticker = [];
  let counts = {};
  let hover = null;
  let lastT = 0;
  let running = false;
  let loaded = false;
  let dotTarget = 'codex-voice';
  let bgFrames = [];

  const tileXY = ([x, y]) => ({ x: x * T, y: y * T - 4 });
  function slot(placeId, i) {
    const p = PLACES[placeId];
    const row = Math.floor(i / p.cols);
    const col = i % p.cols;
    return { x: Math.round(p.door[0] * T + (col - (p.cols - 1) / 2) * 14), y: p.door[1] * T + 4 + row * 14 };
  }

  function routeBetween(from, to) {
    if (from === to) return [];
    const back = PLACES[from].route.slice().reverse().map(tileXY);
    const out = PLACES[to].route.map(tileXY);
    return back.concat(out.slice(1));
  }

  function walk(a, toPlace, dest) {
    a.path = (a.place ? routeBetween(a.place, toPlace) : []).concat([dest]);
  }

  function say(msg, color = P.white) {
    ticker.unshift({ text: msg, color, t: performance.now() });
    ticker.length = Math.min(ticker.length, 5);
  }

  function burst(x, y, color, n = 10) {
    for (let i = 0; i < n; i += 1) particles.push({ x, y, vx: (Math.random() - 0.5) * 70, vy: -Math.random() * 70 - 10, life: 0.9, color });
  }

  const placeOf = (j) => (j.source === 'bot' ? 'bots' : PLACES[j.status] ? j.status : 'follow_up');
  const isDot = (j) => (dotTarget === 'codex-voice' ? Boolean(j.meta && j.meta.agent === 'Dot') : j.id === dotTarget);

  function update(board, workforce, crew = [], dotCfg) {
    if (!board) return;
    if (dotCfg && dotCfg.target) dotTarget = dotCfg.target;
    const firstLoad = !loaded;
    loaded = true;
    const jobs = board.columns.flatMap((c) => c.jobs);
    const seen = new Set();
    const idx = {};
    counts = {};
    for (const j of jobs) {
      const place = placeOf(j);
      counts[place] = (counts[place] || 0) + 1;
      const i = (idx[place] = (idx[place] || 0) + 1) - 1;
      if (PLACES[place].max && i >= PLACES[place].max) continue;
      const id = `job:${j.id}`;
      seen.add(id);
      const dest = slot(place, i);
      let a = actors.get(id);
      if (!a) {
        const hq = tileXY(HQD);
        a = { id, kind: j.source === 'bot' ? 'bot' : 'job', x: firstLoad ? dest.x : hq.x, y: firstLoad ? dest.y : hq.y, path: [], place: firstLoad ? place : 'hq', jobId: j.id, phase: Math.random() * 6 };
        actors.set(id, a);
        if (!firstLoad) { say(`NEW  ${(j.title || '').slice(0, 34)}`, P.gold[3]); walk(a, place, dest); a.place = place; }
      } else if (a.place !== place) {
        say(`${(j.title || '').slice(0, 26)} -> ${PLACES[place].name}`, place === 'failed' ? P.red[3] : place === 'needs_you' ? P.gold[2] : P.grass[4]);
        burst(a.x + 8, a.y, P.gold[2]);
        walk(a, place, dest);
        a.place = place;
      } else if (a.path.length) {
        a.path[a.path.length - 1] = dest;
      } else if (a.x !== dest.x || a.y !== dest.y) {
        a.path = [dest];
      }
      const dot = isDot(j);
      Object.assign(a, { job: j, title: j.title, status: j.status, dest, dot, style: dot ? SOURCE.dot : SOURCE[j.source] || SOURCE.manual });
    }

    const agents = (workforce && workforce.agents) || [];
    counts.hq = agents.length + (dotTarget === 'codex-voice' ? 1 : 0);
    agents.forEach((ag, i) => {
      const id = `agent:${ag.id}`;
      seen.add(id);
      const home = slot('hq', i);
      let a = actors.get(id);
      if (!a) { a = { id, kind: 'agent', x: home.x, y: home.y, path: [], place: 'hq', target: 'hq', phase: Math.random() * 6 }; actors.set(id, a); }
      const busy = ag.running || (ag.lastRunAt && Date.now() - Date.parse(ag.lastRunAt) < 90e3);
      const target = busy && ag.enabled ? AGENT_TARGET[ag.id] || 'hq' : 'hq';
      if (a.target !== target) {
        if (target !== 'hq') say(`${ag.name.toUpperCase()} heads to ${PLACES[target].name}`, P.purple[3]);
        const d = PLACES[target].door;
        walk(a, target, target === 'hq' ? home : { x: d[0] * T + 30, y: d[1] * T - 6 });
        a.place = target;
        a.target = target;
      }
      Object.assign(a, { title: `${ag.name} (workforce) · ${ag.lastSummary || ag.role || ''}`, busy, enabled: ag.enabled });
    });

    counts.crew = crew.length;
    crew.forEach((m, i) => {
      seen.add(m.id);
      const d = slot('crew', i);
      let a = actors.get(m.id);
      if (!a) { a = { id: m.id, kind: 'crew', x: d.x, y: d.y, path: [], place: 'crew', phase: Math.random() * 6 }; actors.set(m.id, a); }
      Object.assign(a, { title: `${m.title} (Hermes ${m.name}) · ${m.busy ? 'working' : 'idle'}`, busy: m.busy, dotSkin: dotTarget === m.id });
    });
    for (const a of actors.values()) if (a.kind === 'job' || a.kind === 'bot') a.dotSkin = a.jobId === dotTarget;

    if (dotTarget === 'codex-voice') {
      seen.add('agent:dot');
      let dot = actors.get('agent:dot');
      const home = slot('hq', agents.length);
      if (!dot) { dot = { id: 'agent:dot', kind: 'dot', x: home.x, y: home.y, path: [], place: 'hq', target: 'hq', phase: 0 }; actors.set('agent:dot', dot); }
      const dj = jobs.find((j) => isDot(j) && j.status !== 'done');
      const target = dj ? placeOf(dj) : 'hq';
      if (dot.target !== target) {
        if (dj) say(`OG KUSH is on: ${(dj.title || '').slice(0, 26)}`, '#90f090');
        const d = PLACES[target].door;
        walk(dot, target, target === 'hq' ? home : { x: d[0] * T - 34, y: d[1] * T - 4 });
        dot.place = target;
        dot.target = target;
      }
      dot.title = dj ? `Dot · OG Kush · on "${dj.title}"` : 'Dot · OG Kush · chilling at HQ';
    }
    for (const id of [...actors.keys()]) if (!seen.has(id)) actors.delete(id);
  }

  /* ---------- per-frame ---------- */
  function bubble(x, y, s, color, t) {
    const dy = Math.round(Math.sin(t * 4));
    px(x, y + dy, 9, 9, P.ink);
    px(x + 1, y + dy + 1, 7, 7, P.white);
    px(x + 2, y + dy + 9, 2, 2, P.ink);
    text(s, x + 5, y + dy + 2, color, 5, 'center', P.white);
  }

  function drawActor(a, t) {
    const moving = a.path.length > 0;
    const stepping = moving && Math.floor(t * 8 + a.phase) % 2;
    let img;
    let bob = 0;
    const hat = a.dot || a.dotSkin || a.kind === 'dot' ? LEAF_HAT : null;
    if (a.kind === 'bot') {
      const m = (a.job && a.job.meta) || {};
      const body = a.status === 'failed' ? P.ghost[2] : m.provider === 'grok' ? '#383848' : m.provider === 'hermes' ? '#d8a828' : m.providerColor || '#606878';
      img = sprite(ROBOT, pal(body, '#000000'), hat);
      bob = a.status === 'working' ? Math.round(Math.sin(t * 5 + a.phase)) : 0;
    } else if (a.kind === 'agent') {
      img = sprite(stepping ? PERSON_STEP : PERSON, pal(a.enabled ? P.purple[2] : P.ghost[2], '#402060'), CAP);
      bob = a.busy && !moving ? Math.floor(t * 8 + a.phase) % 2 : 0;
    } else if (a.kind === 'dot') {
      img = sprite(stepping ? PERSON_STEP : PERSON, pal(SOURCE.dot.shirt, SOURCE.dot.hair), LEAF_HAT);
      bob = moving ? 0 : Math.round(Math.sin(t * 2.5));
    } else if (a.kind === 'crew') {
      img = sprite(PERSON, a.dotSkin ? pal(SOURCE.dot.shirt, SOURCE.dot.hair) : pal(a.busy ? P.gold[2] : P.gold[1], '#e8e8f0'), hat);
      bob = a.busy ? Math.floor(t * 6 + a.phase) % 2 : 0;
    } else {
      const st = a.style || SOURCE.manual;
      const p2 = pal(st.shirt, st.hair);
      if (a.status === 'failed') Object.assign(p2, { C: P.ghost[2], c: P.ghost[1], W: P.ghost[3], S: P.ghost[3], s: P.ghost[2] });
      img = sprite(stepping ? PERSON_STEP : PERSON, p2, hat);
      if (!moving && a.status === 'working') bob = Math.floor(t * 8 + a.phase) % 2;
      if (!moving && a.status === 'needs_you') bob = -Math.abs(Math.round(Math.sin(t * 5 + a.phase) * 2));
    }
    const x = Math.round(a.x);
    const y = Math.round(a.y) + bob;
    if (a.status === 'needs_you' && !moving) {
      g.fillStyle = `rgba(248,64,56,${0.25 + 0.2 * Math.sin(t * 6 + a.phase)})`;
      g.fillRect(x, Math.round(a.y) + 12, 16, 5);
      g.fillRect(x + 2, Math.round(a.y) + 11, 12, 7);
    }
    g.fillStyle = 'rgba(0,0,0,.3)';
    g.fillRect(x + 3, Math.round(a.y) + 14, 10, 2);
    if (a.status === 'failed' && a.kind === 'job' && !moving) {
      g.save(); g.translate(x + 8, y + 10); g.rotate(-Math.PI / 2); g.drawImage(img, -8, -8); g.restore();
    } else {
      g.drawImage(img, x, y);
    }
    if (!moving) {
      if (a.status === 'needs_you') bubble(x + 9, y - 10, '!', P.red[1], t);
      else if (a.status === 'follow_up' && a.kind === 'job') bubble(x + 9, y - 10, '?', P.gold[0], t);
      else if (a.status === 'done' && Math.floor(t * 2 + a.phase) % 5 === 0) star(x + 13, y, Math.floor(t * 10));
      else if (a.status === 'working' && a.kind === 'job' && Math.random() < 0.03) particles.push({ x: x + 8, y: y + 2, vx: (Math.random() - 0.5) * 20, vy: -28, life: 0.8, color: '#90ffb0', ch: Math.random() < 0.5 ? '1' : '0' });
      else if ((a.kind === 'agent' || a.kind === 'crew') && a.busy && Math.floor(t + a.phase) % 3 === 0) star(x + 13, y - 1, Math.floor(t * 10));
    }
    if (a.kind === 'dot' || a.dotSkin) text('OG KUSH', x + 8, y - 9, '#90f090', 5, 'center');
    if (hover === a) { g.strokeStyle = P.gold[2]; g.lineWidth = 1; g.strokeRect(x - 1.5, y - 1.5, 19, 19); }
  }

  function renderBackground(f) {
    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    const prev = g;
    g = off.getContext('2d');
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (land(x, y)) {
          drawGrass(x, y);
          if (isPath(x, y)) drawPath(x, y);
          else if (PLAZA[y][x]) drawPlaza(x, y);
        } else {
          drawWater(x, y, f);
          drawShore(x, y, f);
        }
      }
    }
    g = prev;
    return off;
  }

  function fish(t) {
    // a cheep-cheep style fish hops out of the sea now and then
    const cycle = 7;
    const k = Math.floor(t / cycle);
    const ph = (t % cycle) / 1.2;
    if (ph > 1) return;
    const spots = [[1, 6], [30, 9], [2, 18], [29, 20], [20, 1]];
    const [sx, sy] = spots[k % spots.length];
    const x = sx * T + ph * 24;
    const y = sy * T - Math.sin(ph * Math.PI) * 18;
    px(x, y, 8, 6, P.red[2]);
    px(x + 1, y + 1, 3, 2, P.red[3]);
    px(x + 6, y + 1, 1, 1, P.ink);
    px(x - 3, y, 3, 6, P.red[1]);
    px(x + 2, y - 2, 3, 2, P.white);
  }

  function clouds(t) {
    for (let i = 0; i < 4; i += 1) {
      const cx = ((t * (4 + i) + i * 160) % (W + 80)) - 60;
      const cy = 30 + i * 80 + Math.sin(t / 3 + i) * 3;
      g.fillStyle = 'rgba(255,255,255,.5)';
      g.fillRect(Math.round(cx), Math.round(cy), 40, 8);
      g.fillRect(Math.round(cx + 6), Math.round(cy - 5), 22, 6);
      g.fillRect(Math.round(cx + 14), Math.round(cy - 9), 12, 5);
      g.fillStyle = 'rgba(150,180,230,.3)';
      g.fillRect(Math.round(cx + 2), Math.round(cy + 7), 36, 2);
    }
  }

  function hud() {
    px(0, 0, W, 20, 'rgba(16,16,24,.9)');
    px(0, 20, W, 1, P.gold[1]);
    text('MISSION CONTROL', 8, 7, P.gold[2], 7);
    const items = [['!', counts.needs_you, P.red[3]], ['WORK', counts.working, P.grass[3]], ['BOTS', counts.bots, P.sea[3]], ['GOAL', counts.done, P.gold[3]], ['BOO', counts.failed, P.ghost[3]], ['CREW', counts.crew, P.gold[2]]];
    let x = 132;
    for (const [k, v, c] of items) { text(`${k}x${String(v || 0).padStart(2, '0')}`, x, 7, c, 6); x += 63; }
    const msg = ticker[0];
    const age = msg ? (performance.now() - msg.t) / 1000 : 99;
    px(0, H - 14, W, 14, 'rgba(16,16,24,.85)');
    px(0, H - 14, W, 1, P.gold[1]);
    text(age < 14 ? `> ${msg.text}` : '> all quiet. hover anyone to see who they are, click to open.', 8, H - 9, age < 14 ? msg.color : P.stone[3], 6);
  }

  function tooltip(a) {
    const s = (a.title || '').slice(0, 64);
    g.font = '5px "Press Start 2P", monospace';
    const w = Math.min(W - 8, Math.ceil(g.measureText(s).width) + 12);
    const x = Math.max(4, Math.min(W - w - 4, Math.round(a.x + 8 - w / 2)));
    const y = a.y > H / 2 ? Math.round(a.y) - 18 : Math.round(a.y) + 20;
    px(x, y, w, 12, P.ink);
    px(x + 1, y + 1, w - 2, 10, '#283058');
    px(x + 1, y + 1, w - 2, 1, P.gold[2]);
    text(s, x + 6, y + 4, P.white, 5);
  }

  function step(dt) {
    for (const a of actors.values()) {
      if (!a.path.length) continue;
      const p = a.path[0];
      const dx = p.x - a.x;
      const dy = p.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d < 1.5) {
        a.x = p.x; a.y = p.y; a.path.shift();
        if (!a.path.length && a.status === 'done') burst(a.x + 8, a.y, P.gold[2], 14);
      } else {
        const m = Math.min(d, 64 * dt);
        a.x += (dx / d) * m;
        a.y += (dy / d) * m;
      }
    }
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 90 * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function render(ts) {
    if (!running) return;
    const t = ts / 1000;
    const dt = Math.min(0.05, lastT ? t - lastT : 0.016);
    lastT = t;
    const f = Math.floor(t * 10);
    step(dt);
    g.drawImage(bgFrames[Math.floor(t * 3) % bgFrames.length], 0, 0);
    const layers = [];
    for (const d of DECOR) layers.push({ y: d.y * T + 15, draw: () => drawDecor(d, f) });
    for (const [id, p] of Object.entries(PLACES)) layers.push({ y: p.door[1] * T - 2, draw: () => drawPlace(id, p, f, counts[id] || 0) });
    for (const a of actors.values()) layers.push({ y: a.y + 14, draw: () => drawActor(a, t) });
    layers.sort((a, b) => a.y - b.y);
    for (const l of layers) l.draw();
    for (const [id, p] of Object.entries(PLACES)) sign(id, p, counts[id] || 0);
    for (const p of particles) {
      if (p.ch) text(p.ch, p.x, p.y, p.color, 5);
      else px(p.x, p.y, 2, 2, p.color);
    }
    fish(t);
    clouds(t);
    hud();
    if (hover) tooltip(hover);
    requestAnimationFrame(render);
  }

  function hit(ev) {
    const r = cv.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * W;
    const y = ((ev.clientY - r.top) / r.height) * H;
    let best = null;
    for (const a of actors.values()) if (x >= a.x && x <= a.x + 16 && y >= a.y && y <= a.y + 16) best = !best || a.y > best.y ? a : best;
    if (best) return best;
    for (const [id, s] of Object.entries(signRects)) if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return { sign: id };
    return null;
  }

  function mount(canvas, options = {}) {
    cv = canvas;
    opts = options;
    cv.width = W;
    cv.height = H;
    g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    buildMap();
    bgFrames = [0, 1, 2, 3].map((f) => renderBackground(f * 2));
    cv.addEventListener('mousemove', (ev) => {
      const h = hit(ev);
      hover = h && !h.sign ? h : null;
      cv.style.cursor = h && (h.jobId || h.sign) ? 'pointer' : 'default';
    });
    cv.addEventListener('mouseleave', () => { hover = null; });
    cv.addEventListener('click', (ev) => {
      const h = hit(ev);
      if (h && h.jobId && opts.onOpen) opts.onOpen(h.jobId);
      else if (h && h.sign && opts.onPlace) opts.onPlace(h.sign);
    });
  }

  const start = () => { if (running || !cv) return; running = true; lastT = 0; requestAnimationFrame(render); };
  const stop = () => { running = false; };

  window.Arcade = { mount, update, start, stop, say, PLACES, _actors: actors };
})();
