/* EB28 Mission Control — Arcade: a Super Mario World style archipelago of every job, bot and agent.
 * Everything is drawn procedurally (no image assets). The big main island holds the status
 * landmarks (Needs You castle, Workshop, Goal, Ghost House…), HQ, the clock tower, the Bot
 * Fortress and Hermes Village. Each company has its own themed island, joined by bridges,
 * with districts by kind of work: the Backrooms (coders), the Fun Park (content, social,
 * creative) and the company Office (where its overlord lives). Jobs live on their company's
 * island while they work and walk the roads to the main island when they need you, finish,
 * or fail. The Watchdog is a war mech that hauls failed agents to the Ghost House.
 *
 *   Arcade.mount(canvas, { onSelect(selection) });  Arcade.select(selection);
 *   Arcade.update(board, workforce, crew, dotCfg, schedule);  Arcade.start(); Arcade.stop();
 *   Arcade.camera(cmd)  — 'in' | 'out' | 'fit' | 'main' | <island id>
 */
(() => {
  const T = 16; // tile size
  const COLS = 160;
  const ROWS = 92;
  const W = COLS * T; // 2560
  const H = ROWS * T; // 1472
  const GAP = 18; // spacing between characters in a crowd

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

  /* ---------- islands: one big theme each ---------- */
  const ISLANDS = [
    { id: 'main', name: 'MISSION CONTROL', c: [80, 46], r: [25, 17], theme: 'main' },
    { id: 'backrooms', name: 'THE BACKROOMS', c: [26, 46], r: [22, 30], theme: 'backrooms', color: '#c8b45a' },
    { id: 'funpark', name: 'FUN PARK', c: [134, 46], r: [22, 30], theme: 'funpark', color: '#ff5a7a' },
  ];
  // Companies are departments in the Backrooms and rides in the Fun Park.
  const ZONES = [
    { id: 'tyfys', name: 'TYFYS', biz: ['tyfys'], color: '#c8102e', ride: 'coaster' },
    { id: 'eb28', name: 'EB28', biz: ['eb28'], color: '#2d9c67', ride: 'ferris' },
    { id: 'inspection', name: 'INSPECTION', biz: ['inspection'], color: '#2f6fdb', ride: 'carousel' },
    { id: 'apps', name: 'APPS', biz: ['apps', 'syncstep'], color: '#f59e0b', ride: 'tagdome' },
    { id: 'other', name: 'GENERAL', biz: ['other'], color: '#8a8a9a', ride: 'slides' },
  ];
  const ZONE_OF = {};
  for (const z of ZONES) for (const b of z.biz) ZONE_OF[b] = z.id;
  const RIDE_NAME = { coaster: 'COASTER', ferris: 'FERRIS WHEEL', carousel: 'CAROUSEL', tagdome: 'LASER TAG', slides: 'SLIDES' };

  /* ---------- road network (tile coords); every edge is axis-aligned ---------- */
  const NODES = {
    HQ: [80, 48], N1: [80, 43], S1: [80, 52], NYC: [67, 43], NY: [67, 40], WK: [80, 39], BC: [93, 43], BT: [93, 40],
    FUC: [66, 52], FU: [66, 49], DC: [94, 52], DN: [94, 49], FC1: [86, 52], FC2: [86, 56], FL: [90, 56], CC: [71, 52], CR: [71, 56],
    W1: [61, 43], E1: [99, 43],
  };
  const EDGES = [
    ['HQ', 'N1'], ['HQ', 'S1'], ['N1', 'NYC'], ['NYC', 'NY'], ['N1', 'WK'], ['N1', 'BC'], ['BC', 'BT'], ['NYC', 'W1'], ['BC', 'E1'],
    ['S1', 'CC'], ['CC', 'FUC'], ['FUC', 'FU'], ['CC', 'CR'], ['S1', 'FC1'], ['FC1', 'DC'], ['DC', 'DN'], ['FC1', 'FC2'], ['FC2', 'FL'],
  ];
  // Each themed island: two hallways (y=43 and y=68), a spine, five zone doors, one bridge.
  const ZONE_SPOTS = { tyfys: [-14, 36, 'a', 43], eb28: [10, 36, 'b', 43], other: [0, 30, 'c', 43], inspection: [-14, 61, 'a', 68], apps: [10, 61, 'b', 68] };
  function islandRoads(prefix, cx, mirror, bridgeFrom) {
    const X = (dx) => cx + (mirror ? -dx : dx);
    NODES[`${prefix}_dock`] = [X(14), 43];
    NODES[`${prefix}_b43`] = [X(10), 43]; NODES[`${prefix}_c43`] = [X(0), 43]; NODES[`${prefix}_a43`] = [X(-14), 43];
    NODES[`${prefix}_b68`] = [X(10), 68]; NODES[`${prefix}_c68`] = [X(0), 68]; NODES[`${prefix}_a68`] = [X(-14), 68];
    EDGES.push([bridgeFrom, `${prefix}_dock`], [`${prefix}_dock`, `${prefix}_b43`], [`${prefix}_b43`, `${prefix}_c43`], [`${prefix}_c43`, `${prefix}_a43`],
      [`${prefix}_c43`, `${prefix}_c68`], [`${prefix}_b68`, `${prefix}_c68`], [`${prefix}_c68`, `${prefix}_a68`]);
    for (const [zone, [dx, y, col, hall]] of Object.entries(ZONE_SPOTS)) {
      NODES[`${prefix}_${zone}`] = [X(dx), y];
      EDGES.push([`${prefix}_${col}${hall}`, `${prefix}_${zone}`]);
    }
  }
  islandRoads('backrooms', 26, false, 'W1'); // dock faces east, toward the main island
  islandRoads('funpark', 134, true, 'E1'); // mirrored: dock faces west

  /* ---------- places ---------- */
  // node = road node at the door; the building is drawn above it, the crowd below.
  const PLACES = {
    needs_you: { name: 'NEEDS YOU', blurb: 'Waiting on your answer or approval', node: 'NY', cols: 5, kind: 'castle' },
    working: { name: 'WORKSHOP', blurb: 'Agents busy right now', node: 'WK', cols: 6, kind: 'workshop' },
    bots: { name: 'BOT FORTRESS', blurb: 'Always-on bots (Grok, Hermes...) and the Watchdog', node: 'BT', cols: 4, kind: 'fortress' },
    follow_up: { name: 'FOLLOW-UP', blurb: 'Idle, stale or needs a nudge', node: 'FU', cols: 5, kind: 'post' },
    hq: { name: 'HQ', blurb: 'Your workforce agents + Dot', node: 'HQ', cols: 5, kind: 'house' },
    done: { name: 'GOAL', blurb: 'Finished in the last day', node: 'DN', cols: 6, kind: 'goal', max: 12 },
    failed: { name: 'GHOST HOUSE', blurb: 'Crashed or errored. Check these', node: 'FL', cols: 4, kind: 'ghost', max: 8 },
    crew: { name: 'HERMES VILLAGE', blurb: 'Your Hermes profile agents', node: 'CR', cols: 11, kind: 'village' },
  };
  for (const z of ZONES) {
    PLACES[`backrooms:${z.id}`] = { name: `${z.name} DEPT`, blurb: `The Backrooms: ${z.name} coders and office work`, node: `backrooms_${z.id}`, cols: 5, kind: 'dept', zone: z, island: 'backrooms', max: 12 };
    PLACES[`funpark:${z.id}`] = { name: `${z.name} ${RIDE_NAME[z.ride]}`, blurb: `Fun Park: ${z.name} content, social and creative`, node: `funpark_${z.id}`, cols: 5, kind: 'ride', zone: z, island: 'funpark', max: 12 };
  }
  for (const p of Object.values(PLACES)) p.door = NODES[p.node];
  const ADJ = {};
  for (const [a, b] of EDGES) { (ADJ[a] ||= []).push(b); (ADJ[b] ||= []).push(a); }

  // The clock tower is a landmark, not a status: it shows when scheduled agents run next.
  const CLOCK = { door: [73, 47] };
  // Hermes chief-of-staff profiles -> the realm (business) each one oversees on the map.
  const REALMS = {
    cos: { business: '*', grand: true, short: 'CHIEF', label: 'Grand Chief of Staff' },
    'hermes-cos': { business: '*', liaison: true, short: 'HERMES', label: 'Hermes Chief (Grok liaison)' },
    'tyfys-cos': { business: 'tyfys', short: 'TYFYS', label: 'TYFYS Overlord' },
    'eb28-cos': { business: 'eb28', short: 'EB28', label: 'EB28 Overlord' },
    'insprent-cos': { business: 'inspection', short: 'INSPECT', label: 'Inspection Rent Overlord' },
    'labstudio-cos': { business: 'apps', short: 'LABSTUDIO', label: 'Lab Studio Overlord' },
  };
  const AGENT_TARGET = { triage: 'needs_you', 'follow-up': 'follow_up', janitor: 'done', 'pr-steward': 'working', 'ops-runner': 'working', 'automation-scout': 'working', reporter: 'hq' };

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
  const FLOOR = [];
  const ISLE = [];
  const DECOR = [];
  function buildMap() {
    for (let y = 0; y < ROWS; y += 1) {
      LAND[y] = []; PATH[y] = []; PLAZA[y] = []; FLOOR[y] = []; ISLE[y] = [];
      for (let x = 0; x < COLS; x += 1) {
        LAND[y][x] = false; PATH[y][x] = false; PLAZA[y][x] = false; FLOOR[y][x] = ''; ISLE[y][x] = '';
        for (const isl of ISLANDS) {
          const nx = (x + 0.5 - isl.c[0]) / isl.r[0];
          const ny = (y + 0.5 - isl.c[1]) / isl.r[1];
          const n = (hash(x >> 1, y >> 1, 7) - 0.5) * 0.22 + (hash(x, y, 3) - 0.5) * 0.08;
          if (nx * nx + ny * ny + n < 1) { LAND[y][x] = true; ISLE[y][x] = isl.id; }
        }
      }
    }
    const mark = (x, y) => { if (y >= 0 && y < ROWS && x >= 0 && x < COLS) PATH[y][x] = true; };
    for (const [a, b] of EDGES) {
      const [x0, y0] = NODES[a];
      const [x1, y1] = NODES[b];
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x += 1) for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y += 1) mark(x, y);
    }
    for (const [id, p] of Object.entries(PLACES)) {
      const [dx, dy] = p.door;
      const half = (Math.ceil(p.cols / 2) * GAP) / T + 0.5;
      const floor = p.kind === 'ride' ? 'rainbow' : '';
      for (let y = dy - 4; y <= dy + 3; y += 1) {
        for (let x = Math.floor(dx - half); x <= Math.ceil(dx + half); x += 1) {
          if (y < 0 || y >= ROWS || x < 0 || x >= COLS || !LAND[y][x]) continue;
          PLAZA[y][x] = true;
          if (floor && y >= dy && !PATH[y][x]) FLOOR[y][x] = floor;
        }
      }
      p.id = id;
    }
    for (let y = CLOCK.door[1] - 3; y <= CLOCK.door[1]; y += 1) for (let x = CLOCK.door[0] - 1; x <= CLOCK.door[0] + 1; x += 1) PLAZA[y][x] = true;
    for (let y = 2; y < ROWS - 2; y += 1) {
      for (let x = 1; x < COLS - 1; x += 1) {
        if (!LAND[y][x] || PATH[y][x] || PLAZA[y][x] || !LAND[y + 1][x]) continue;
        const isl = ISLANDS.find((i) => i.id === ISLE[y][x]);
        const r = hash(x, y, 11);
        const coast = !LAND[y - 1][x] || !LAND[y][x - 1] || !LAND[y][x + 1] || !LAND[y + 2][x];
        const theme = isl ? isl.theme : 'main';
        if (theme === 'backrooms') {
          // endless partition walls, flickering panels, coolers and sad plants
          if (!coast && x % 6 === 0 && y % 5 !== 0 && r < 0.75) DECOR.push({ x, y, type: 'pwall' });
          else if (!coast && y % 7 === 3 && x % 4 === 1 && r < 0.8) DECOR.push({ x, y, type: 'hwall' });
          else if (r > 0.94) DECOR.push({ x, y, type: hash(x, y, 13) < 0.5 ? 'cooler' : 'plant' });
          else if (r > 0.9) DECOR.push({ x, y, type: 'chair' });
          continue;
        }
        if (theme === 'funpark') {
          if (r < (coast ? 0.3 : 0.05)) DECOR.push({ x, y, type: hash(x, y, 17) < 0.6 ? 'palm' : 'tree' });
          else if (r > 0.9) DECOR.push({ x, y, type: ['balloon', 'candy', 'bench', 'fountain', 'lamp', 'balloon'][Math.floor(hash(x, y, 13) * 6)] });
          continue;
        }
        const tree = coast ? 0.42 : 0.12;
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

  /* ---------- bridges and themed floors ---------- */
  function drawBridge(x, y) {
    const X = x * T;
    const Y = y * T;
    const horiz = isPath(x - 1, y) || isPath(x + 1, y);
    const vert = isPath(x, y - 1) || isPath(x, y + 1);
    if (horiz && !vert) {
      px(X, Y + 3, T, 10, P.wood[2]);
      for (let i = 0; i < 4; i += 1) px(X + i * 4, Y + 3, 1, 10, P.wood[1]);
      px(X, Y + 2, T, 1, P.wood[0]); px(X, Y + 13, T, 2, P.wood[0]);
      px(X + 1, Y + 1, 2, 2, P.wood[3]); px(X + 1, Y + 12, 2, 3, P.wood[1]);
      px(X, Y + 15, T, 1, 'rgba(0,0,40,.35)');
    } else {
      px(X + 3, Y, 10, T, P.wood[2]);
      for (let i = 0; i < 4; i += 1) px(X + 3, Y + i * 4, 10, 1, P.wood[1]);
      px(X + 2, Y, 1, T, P.wood[0]); px(X + 13, Y, 2, T, P.wood[0]);
      px(X + 1, Y + 1, 2, 2, P.wood[3]);
      px(X + 15, Y, 1, T, 'rgba(0,0,40,.35)');
    }
  }

  function drawFloor(x, y, kind) {
    const X = x * T;
    const Y = y * T;
    if (kind === 'carpet') {
      // the Backrooms: damp mono-yellow carpet
      px(X, Y, T, T, '#b8a858');
      for (let i = 0; i < 5; i += 1) px(X + Math.floor(hash(x, y, i + 1) * 15), Y + Math.floor(hash(x, y, i + 9) * 15), 1, 1, '#a89848');
      if (hash(x, y, 31) < 0.18) { px(X + 4, Y + 6, 6, 3, '#9c8c40'); px(X + 5, Y + 5, 3, 1, '#9c8c40'); }
      px(X, Y, T, 1, '#c4b464');
    } else if (kind === 'rainbow') {
      // the Fun Park: bright checker tiles
      const cols = ['#ff5a7a', '#ffb43c', '#ffe45c', '#5ad07a', '#4ab8ff', '#a070ff'];
      const c = cols[(x + y) % cols.length];
      px(X, Y, T, T, c);
      px(X, Y, T, 2, Sprites.shade(c, 1.2));
      px(X, Y + 14, T, 2, Sprites.shade(c, 0.82));
      if ((x + y) % 2) px(X + 6, Y + 6, 4, 4, 'rgba(255,255,255,.35)');
    }
  }

  /* ---------- themed decor ---------- */
  function drawThemeDecor(d, f) {
    const X = d.x * T;
    const Y = d.y * T;
    switch (d.type) {
      case 'palm': {
        px(X + 7, Y - 2, 2, 16, P.wood[2]); px(X + 7, Y - 2, 1, 16, P.wood[3]);
        const sway = (f + d.x) % 12 < 6 ? 0 : 1;
        px(X + sway, Y - 6, 7, 3, P.grass[1]); px(X + 9 + sway, Y - 6, 7, 3, P.grass[1]);
        px(X + 2 + sway, Y - 9, 12, 4, P.grass[2]); px(X + 4 + sway, Y - 10, 8, 2, P.grass[3]);
        px(X + 6, Y - 4, 4, 3, P.wood[1]);
        px(X + 3, Y + 14, 10, 2, 'rgba(0,0,0,.25)');
        break;
      }
      case 'flag': {
        px(X + 3, Y - 14, 1, 28, P.stone[3]);
        const wave = Math.floor(f / 3 + d.x) % 2;
        for (let i = 0; i < 5; i += 1) px(X + 4, Y - 14 + i * 2 + wave * (i % 2), 11, 1, i % 2 ? P.white : P.red[1]);
        px(X + 4, Y - 14, 5, 5, '#1d3a8a');
        px(X + 5, Y - 13, 1, 1, P.white); px(X + 7, Y - 13, 1, 1, P.white); px(X + 6, Y - 11, 1, 1, P.white);
        px(X + 1, Y + 13, 5, 2, P.stone[1]);
        break;
      }
      case 'tent': {
        for (let i = 0; i < 8; i += 1) px(X + 8 - i, Y + 2 + i, i * 2 + 1, 1, i % 3 ? '#6b7a3a' : '#55622c');
        px(X + 6, Y + 6, 4, 4, '#2a2e14');
        px(X, Y + 10, 16, 2, '#55622c');
        break;
      }
      case 'sandbag': {
        for (let i = 0; i < 3; i += 1) { px(X + i * 5, Y + 10, 5, 3, '#c8b078'); px(X + i * 5, Y + 12, 5, 1, '#9a8458'); }
        px(X + 2, Y + 7, 5, 3, '#c8b078'); px(X + 8, Y + 7, 5, 3, '#c8b078');
        break;
      }
      case 'neon': {
        const on = Math.floor(f / 4 + d.x) % 7 !== 0;
        px(X + 1, Y - 2, 14, 10, '#1a1028');
        px(X + 2, Y - 1, 12, 8, on ? '#ff4fd8' : '#5a1a50');
        px(X + 4, Y + 1, 8, 1, on ? '#ffffff' : '#9a5a90'); px(X + 4, Y + 4, 6, 1, on ? '#4ffff0' : '#2a6060');
        px(X + 7, Y + 8, 2, 6, P.stone[1]);
        break;
      }
      case 'fence': {
        for (let i = 0; i < 4; i += 1) { px(X + i * 4 + 1, Y + 6, 2, 8, P.white); px(X + i * 4 + 1, Y + 5, 2, 1, '#dcdce4'); }
        px(X, Y + 8, T, 1, P.white); px(X, Y + 11, T, 1, P.white);
        break;
      }
      case 'mailbox': {
        px(X + 5, Y + 4, 6, 5, '#3060c0'); px(X + 5, Y + 4, 6, 1, '#4888e8'); px(X + 7, Y + 9, 2, 6, P.wood[1]); px(X + 11, Y + 3, 1, 3, P.red[2]);
        break;
      }
      case 'dish': {
        px(X + 7, Y + 6, 2, 9, P.stone[2]);
        g.fillStyle = P.stone[3]; g.beginPath(); g.ellipse(X + 8, Y + 4, 7, 4, -0.5, 0, Math.PI * 2); g.fill();
        px(X + 8, Y + 1, 1, 3, P.stone[1]);
        if (Math.floor(f / 5) % 2) px(X + 8, Y, 1, 1, '#40e0ff');
        break;
      }
      case 'home': {
        // a small home for the island's agents
        const roof = d.color || P.red[1];
        px(X - 2, Y + 4, 20, 11, '#f0e8d8'); px(X - 2, Y + 14, 20, 1, '#c8c0b0');
        for (let i = 0; i < 7; i += 1) px(X - 4 + i, Y + 3 - i, 24 - i * 2, 1, i % 2 ? roof : Sprites.shade(roof, 0.8));
        px(X + 5, Y + 8, 5, 7, P.wood[1]);
        px(X - 0, Y + 7, 4, 4, Math.floor(f / 8 + d.x) % 5 ? '#ffe9a0' : '#7a8aa0'); px(X + 12, Y + 7, 4, 4, '#ffe9a0');
        break;
      }
      default:
        drawDecor(d, f);
    }
  }

  /* ---------- island ground ---------- */
  function drawBackroomsTile(x, y) {
    const X = x * T;
    const Y = y * T;
    drawFloor(x, y, 'carpet');
    if (isPath(x, y)) { px(X + 2, Y + 2, 12, 12, '#a49448'); px(X + 2, Y + 2, 12, 1, '#b4a458'); }
    // ceiling grid shadow lines every few tiles
    if (x % 4 === 0) px(X, Y, 1, T, 'rgba(90,80,30,.25)');
    if (y % 4 === 0) px(X, Y, T, 1, 'rgba(90,80,30,.25)');
    if (!land(x, y + 1)) { px(X, Y + 10, T, 6, '#8a7a40'); px(X, Y + 10, T, 1, '#6a5a28'); for (let i = 0; i < 4; i += 1) px(X + i * 4 + 1, Y + 12, 2, 3, '#a89848'); }
    if (!land(x - 1, y)) px(X, Y, 2, T, '#8a7a40');
    if (!land(x + 1, y)) px(X + T - 2, Y, 2, T, '#8a7a40');
    if (!land(x, y - 1)) px(X, Y, T, 2, '#e0d090');
  }

  function drawParkTile(x, y) {
    const X = x * T;
    const Y = y * T;
    px(X, Y, T, T, '#e8dcc4');
    px(X, Y, T, 1, '#f4ecd8'); px(X, Y, 1, T, '#f4ecd8'); px(X + 15, Y, 1, T, '#d4c8ac'); px(X, Y + 15, T, 1, '#d4c8ac');
    if (hash(x, y, 51) < 0.08) px(X + 5, Y + 6, 3, 2, ['#ff5a7a', '#4ab8ff', '#ffe45c'][Math.floor(hash(x, y, 52) * 3)]);
    if (isPath(x, y)) { const c = ['#ff7a9a', '#ffc45c', '#7ad07a', '#6ab8ff'][(x + y) % 4]; px(X + 1, Y + 1, 14, 14, c); px(X + 1, Y + 1, 14, 2, Sprites.shade(c, 1.15)); }
    if (!land(x, y + 1)) { px(X, Y + 10, T, 6, '#c86a4a'); px(X, Y + 10, T, 1, '#a04a2a'); for (let i = 0; i < 4; i += 1) px(X + i * 4, Y + 12, 2, 2, '#ffd0a0'); }
    if (!land(x, y - 1)) px(X, Y, T, 2, '#fff8e8');
  }

  /* ---------- Backrooms decor ---------- */
  function drawBackroomsDecor(d, f) {
    const X = d.x * T;
    const Y = d.y * T;
    if (d.type === 'pwall') { px(X + 6, Y - 6, 4, 22, '#d8c880'); px(X + 6, Y - 6, 4, 2, '#ece0a0'); px(X + 9, Y - 4, 1, 20, '#b8a860'); px(X + 6, Y + 14, 4, 2, '#8a7a40'); }
    else if (d.type === 'hwall') { px(X - 2, Y - 2, 20, 14, '#d8c880'); for (let i = 0; i < 5; i += 1) px(X - 2 + i * 4, Y - 2, 2, 14, '#cab86e'); px(X - 2, Y - 4, 20, 2, '#ece0a0'); px(X - 2, Y + 12, 20, 2, '#8a7a40'); }
    else if (d.type === 'cooler') { px(X + 4, Y + 2, 8, 12, '#e8eef4'); px(X + 5, Y - 4, 6, 7, '#9ad0f0'); px(X + 6, Y - 3, 2, 4, '#c8ecff'); px(X + 5, Y + 7, 2, 2, '#4080e0'); }
    else if (d.type === 'plant') { px(X + 5, Y + 9, 6, 6, '#8a5a3a'); px(X + 3, Y + 2, 4, 8, '#5a7a3a'); px(X + 8, Y + 1, 4, 9, '#4a6a2a'); px(X + 6, Y + 4, 3, 6, '#7a8a4a'); }
    else if (d.type === 'chair') { px(X + 4, Y + 6, 8, 3, '#4a4a5a'); px(X + 4, Y + 1, 8, 5, '#5a5a6a'); px(X + 7, Y + 9, 2, 4, '#2a2a3a'); px(X + 4, Y + 13, 8, 1, '#2a2a3a'); }
  }

  /* ---------- Fun Park decor ---------- */
  function drawParkDecor(d, f) {
    const X = d.x * T;
    const Y = d.y * T;
    if (d.type === 'balloon') {
      const bob = Math.round(Math.sin(f / 6 + d.x) * 2);
      const c = ['#ff5a7a', '#4ab8ff', '#ffe45c', '#a070ff'][d.x % 4];
      px(X + 7, Y - 2 + bob, 1, 16, '#888'); px(X + 4, Y - 10 + bob, 8, 9, c); px(X + 5, Y - 9 + bob, 2, 2, '#ffffff');
    } else if (d.type === 'candy') {
      px(X + 1, Y + 4, 14, 10, '#ffffff'); for (let i = 0; i < 4; i += 1) px(X + 1 + i * 4, Y - 2, 2, 6, i % 2 ? '#ff5a7a' : '#ffffff');
      px(X, Y - 3, 16, 2, '#ff5a7a'); px(X + 4, Y + 6, 4, 4, '#ffb0d0'); px(X + 9, Y + 6, 4, 4, '#b0e0ff');
    } else if (d.type === 'bench') {
      px(X + 1, Y + 7, 14, 3, '#a86028'); px(X + 1, Y + 4, 14, 2, '#c87838'); px(X + 2, Y + 10, 2, 4, '#3a3a3a'); px(X + 12, Y + 10, 2, 4, '#3a3a3a');
    } else if (d.type === 'fountain') {
      px(X - 2, Y + 6, 20, 8, '#a8b0c0'); px(X, Y + 7, 16, 5, '#4aa8f0');
      const sp = Math.floor(f / 2) % 3;
      px(X + 7, Y - 2 - sp, 2, 9 + sp, '#c8ecff'); px(X + 4, Y + 2 - sp, 2, 2, '#c8ecff'); px(X + 10, Y + 2, 2, 2, '#c8ecff');
    } else if (d.type === 'lamp') {
      px(X + 7, Y - 8, 2, 22, '#3a3a4a'); px(X + 4, Y - 11, 8, 4, Math.floor(f / 10 + d.x) % 9 ? '#fff0a0' : '#a09060');
    } else drawThemeDecor(d, f);
  }

  /* ---------- company departments (Backrooms) ---------- */
  function drawDept(cx, by, f, z, count) {
    // a cubicle block with CRT monitors, under buzzing tubes, with the company banner
    px(cx - 36, by - 40, 72, 40, '#d4c47a');
    for (let i = 0; i < 18; i += 1) px(cx - 36 + i * 4, by - 40, 2, 40, '#cab86e');
    px(cx - 36, by - 4, 72, 4, '#8a7a40');
    for (let k = 0; k < 3; k += 1) {
      const x0 = cx - 32 + k * 23;
      px(x0, by - 26, 20, 20, '#bfae62'); px(x0, by - 26, 20, 2, '#e0d090');
      px(x0 + 3, by - 16, 14, 4, '#7a5a3a');
      const on = hash(Math.floor(f / 3), k, 7 + count) > 0.08;
      px(x0 + 6, by - 24, 9, 8, '#d8d0c0'); px(x0 + 7, by - 23, 7, 5, on ? '#3af070' : '#1a3a1a');
      if (on && count) px(x0 + 8, by - 22 + (Math.floor(f / 2 + k) % 3), 4, 1, '#c8ffd0');
    }
    for (let i = 0; i < 3; i += 1) {
      const flick = hash(Math.floor(f / 2), i, 43) < 0.1;
      px(cx - 28 + i * 22, by - 46, 14, 3, flick ? '#8a8a70' : '#fbfff0');
      if (!flick) { g.fillStyle = 'rgba(255,255,220,.16)'; g.fillRect(cx - 32 + i * 22, by - 43, 22, 14); }
    }
    px(cx - 30, by - 58, 60, 11, P.ink); px(cx - 29, by - 57, 58, 9, z.color);
    text(`${z.name} DEPT`, cx, by - 55, P.white, 5, 'center', Sprites.shade(z.color, 0.5));
  }

  /* ---------- company rides (Fun Park) ---------- */
  const RAINBOW = ['#ff5a7a', '#ffb43c', '#ffe45c', '#5ad07a', '#4ab8ff', '#a070ff'];
  function drawRide(cx, by, f, z, count) {
    const speed = count ? 1 : 0.35;
    const t = f / 10;
    if (z.ride === 'ferris') {
      const wy = by - 40;
      px(cx - 10, by - 2, 20, 2, P.stone[1]); px(cx - 9, wy, 2, 40, P.stone[2]); px(cx + 7, wy, 2, 40, P.stone[2]);
      g.strokeStyle = '#f0f0f8'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(cx, wy, 26, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(cx, wy, 8, 0, Math.PI * 2); g.stroke();
      for (let i = 0; i < 8; i += 1) {
        const a = t * 0.6 * speed + (i * Math.PI) / 4;
        const ex = cx + Math.cos(a) * 26;
        const ey = wy + Math.sin(a) * 26;
        g.beginPath(); g.moveTo(cx, wy); g.lineTo(ex, ey); g.stroke();
        px(ex - 4, ey, 8, 6, RAINBOW[i % 6]); px(ex - 4, ey, 8, 1, '#ffffff');
      }
      px(cx - 3, wy - 3, 6, 6, z.color);
    } else if (z.ride === 'coaster') {
      // track loop on stilts with a cart racing around it
      for (let i = 0; i < 6; i += 1) px(cx - 36 + i * 14, by - 22 + (i % 2) * 8, 2, 22 - (i % 2) * 8, P.stone[2]);
      g.strokeStyle = z.color; g.lineWidth = 3;
      g.beginPath(); g.moveTo(cx - 40, by - 16); g.bezierCurveTo(cx - 20, by - 50, cx - 5, by - 60, cx + 4, by - 36); g.arc(cx + 14, by - 36, 10, Math.PI, Math.PI * 3); g.bezierCurveTo(cx + 30, by - 40, cx + 34, by - 20, cx + 42, by - 16); g.stroke();
      g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.stroke();
      const k = ((t * 0.5 * speed) % 1);
      const cxk = cx - 40 + k * 82;
      const cyk = by - 16 - Math.sin(k * Math.PI) * 34;
      px(cxk - 5, cyk - 4, 10, 5, '#ffe45c'); px(cxk - 4, cyk - 6, 3, 2, P.skin[2]); px(cxk + 1, cyk - 6, 3, 2, P.skin[1]);
    } else if (z.ride === 'carousel') {
      const rot = Math.floor(t * 4 * speed);
      px(cx - 30, by - 8, 60, 8, '#f0e0c0'); px(cx - 30, by - 8, 60, 2, '#ffffff');
      for (let i = 0; i < 12; i += 1) px(cx - 30 + i * 5, by - 46 + Math.abs(6 - i) * 0.6, 5, 10, RAINBOW[(i + rot) % 6]);
      px(cx - 32, by - 38, 64, 3, z.color); px(cx - 1, by - 56, 2, 12, P.gold[2]); px(cx - 4, by - 58, 8, 3, P.gold[2]);
      for (let i = 0; i < 5; i += 1) {
        const hx = cx - 24 + i * 12;
        const hy = by - 26 + Math.round(Math.sin(t * 2 + i) * 3);
        px(hx, by - 35, 1, 27, '#d8c890'); px(hx - 4, hy, 9, 5, i % 2 ? '#ffffff' : '#c08a5a'); px(hx + 3, hy - 3, 3, 3, i % 2 ? '#ffffff' : '#c08a5a');
      }
    } else if (z.ride === 'tagdome') {
      g.fillStyle = '#2a1a4a'; g.beginPath(); g.arc(cx, by - 4, 34, Math.PI, Math.PI * 2); g.fill();
      g.strokeStyle = '#5a3a8a'; g.lineWidth = 1;
      for (let i = 1; i < 4; i += 1) { g.beginPath(); g.arc(cx, by - 4, 34 - i * 8, Math.PI, Math.PI * 2); g.stroke(); }
      for (let i = 0; i < 3; i += 1) {
        const a = Math.PI + 0.4 + ((t * 0.9 * speed + i * 0.8) % 2.3);
        g.strokeStyle = ['#ff2a6a', '#2affd0', '#ffe42a'][i]; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(cx - 20 + i * 20, by - 6); g.lineTo(cx + Math.cos(a) * 30, by - 4 + Math.sin(a) * 30); g.stroke();
      }
      px(cx - 8, by - 14, 16, 10, '#0a0614'); text('LASER', cx, by - 30, '#2affd0', 5, 'center', '#2a1a4a');
    } else {
      // slide tower + ball pit
      px(cx - 26, by - 44, 12, 44, '#4ab8ff'); px(cx - 28, by - 48, 16, 5, '#ff5a7a');
      for (let i = 0; i < 16; i += 1) px(cx - 14 + i * 2, by - 40 + i * 2, 4, 3, '#ffd23c');
      px(cx + 6, by - 12, 34, 12, '#2a6ad0'); px(cx + 6, by - 12, 34, 2, '#5a9af0');
      for (let i = 0; i < 20; i += 1) px(cx + 8 + ((i * 7) % 30), by - 10 + ((i * 3 + Math.floor(t * 3)) % 7), 3, 3, RAINBOW[i % 6]);
    }
    // ride sign in the company color
    g.font = '5px "Press Start 2P", monospace';
    const label = `${z.name} ${RIDE_NAME[z.ride]}`;
    const w = Math.ceil(g.measureText(label).width) + 8;
    px(cx - w / 2 - 1, by - 74, w + 2, 10, P.ink); px(cx - w / 2, by - 73, w, 8, z.color);
    text(label, cx, by - 72, P.white, 5, 'center', Sprites.shade(z.color, 0.5));
  }

  const bannerRects = {};
  function drawIslandBanner(isl, f) {
    if (isl.id === 'main') return;
    const x = isl.c[0] * T + 8;
    const y = (isl.c[1] - isl.r[1] + 2.2) * T;
    g.font = '8px "Press Start 2P", monospace';
    const w = Math.ceil(g.measureText(isl.name).width) + 18;
    px(x - w / 2 - 3, y + 12, 3, 12, P.wood[0]); px(x + w / 2, y + 12, 3, 12, P.wood[0]);
    px(x - w / 2 - 2, y - 2, w + 4, 16, P.ink);
    px(x - w / 2, y, w, 12, P.wood[2]); px(x - w / 2, y, w, 2, P.wood[3]);
    text(isl.name, x, y + 2, P.white, 8, 'center');
    bannerRects[isl.id] = { x: x - w / 2 - 2, y: y - 2, w: w + 4, h: 16 };
    px(x - w / 2 + 3, y + 4, 4, 4, isl.color);
    px(x + w / 2 - 7, y + 4, 4, 4, isl.color);
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

  function fmtIn(ms) {
    if (ms <= 0) return 'NOW';
    const m = Math.round(ms / 60000);
    if (m < 1) return `${Math.max(1, Math.round(ms / 1000))}S`;
    if (m < 60) return `${m}M`;
    const h = Math.floor(m / 60);
    return h < 24 ? `${h}H` : `${Math.floor(h / 24)}D`;
  }

  function drawClock(f) {
    const cx = CLOCK.door[0] * T + 8;
    const by = CLOCK.door[1] * T;
    const next = schedule[0];
    const soon = next && Date.parse(next.nextRunAt) - Date.now() < 10e3;
    const shake = soon ? (Math.floor(f) % 2 ? 1 : -1) : 0;
    px(cx - 14, by - 2, 28, 3, 'rgba(0,0,0,.2)');
    px(cx - 10, by - 46, 20, 46, P.stone[1]);
    px(cx - 10, by - 46, 3, 46, P.stone[2]);
    px(cx + 8, by - 46, 2, 46, P.stone[0]);
    for (let r = 0; r < 8; r += 1) px(cx - 10, by - 44 + r * 6, 20, 1, P.stone[0]);
    for (let i = 0; i < 9; i += 1) px(cx - 12 + i * 1.2, by - 47 - i, 24 - i * 2.4, 1, i % 2 ? P.sea[0] : P.sea[1]);
    // bell (rings when an agent is about to run)
    px(cx - 3 + shake, by - 60, 6, 5, P.gold[2]);
    px(cx - 4 + shake, by - 56, 8, 1, P.gold[1]);
    // clock face with real hands
    const fy = by - 33;
    g.fillStyle = P.white;
    g.beginPath(); g.arc(cx, fy, 7, 0, Math.PI * 2); g.fill();
    g.strokeStyle = P.ink; g.lineWidth = 1; g.stroke();
    const now = new Date();
    const hand = (ang, len, c) => { g.strokeStyle = c; g.beginPath(); g.moveTo(cx + 0.5, fy + 0.5); g.lineTo(cx + 0.5 + Math.sin(ang) * len, fy + 0.5 - Math.cos(ang) * len); g.stroke(); };
    hand(((now.getHours() % 12) + now.getMinutes() / 60) * (Math.PI / 6), 3.5, P.ink);
    hand(now.getMinutes() * (Math.PI / 30), 5.5, P.ink);
    hand(now.getSeconds() * (Math.PI / 30), 5.5, P.red[1]);
    px(cx - 3, by - 14, 6, 14, P.wood[0]);
    if (soon) text('DING', cx + 12, by - 64, P.gold[2], 5, 'left');
    Object.assign(clockRect, { x: cx - 12, y: by - 62, w: 24, h: 62 });
    // sign
    const label = next ? `NEXT ${fmtIn(Date.parse(next.nextRunAt) - Date.now())}` : 'IDLE';
    g.font = '6px "Press Start 2P", monospace';
    const w = Math.ceil(g.measureText(label).width) + 10;
    const sx = Math.round(cx - w / 2);
    const sy = by + 4;
    px(sx - 1, sy - 1, w + 2, 12, P.ink);
    px(sx, sy, w, 10, P.sea[1]);
    px(sx, sy, w, 1, P.sea[2]);
    text(label, cx, sy + 2, P.white, 6, 'center');
    signRects.clock = { x: sx, y: sy, w, h: 10 };
  }

  function cursor(x, y, t) {
    // the SMW map cursor: a bouncing arrow over whatever is selected
    const dy = Math.round(Math.abs(Math.sin(t * 5)) * -3);
    const ax = Math.round(x + 8);
    const ay = Math.round(y - 14 + dy);
    px(ax - 4, ay - 1, 9, 2, P.ink);
    px(ax - 3, ay, 7, 2, P.gold[2]);
    px(ax - 2, ay + 2, 5, 1, P.gold[2]);
    px(ax - 1, ay + 3, 3, 1, P.gold[2]);
    px(ax, ay + 4, 1, 1, P.gold[1]);
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
    const y = Math.min(by + 10 + Math.max(1, rows) * 24, H - 28);
    px(x - 1, y - 1, w + 2, 12, P.ink);
    px(x, y, w, 10, P.wood[2]);
    px(x, y, w, 1, P.wood[3]);
    px(x, y + 9, w, 1, P.wood[1]);
    text(label, cx, y + 2, count ? P.white : P.dirt[4], 6, 'center');
    signRects[id] = { x, y, w, h: 10 };
  }

  function bubble(x, y, s, color, t) {
    const dy = Math.round(Math.sin(t * 4));
    px(x, y + dy, 9, 9, P.ink);
    px(x + 1, y + dy + 1, 7, 7, P.white);
    px(x + 2, y + dy + 9, 2, 2, P.ink);
    text(s, x + 5, y + dy + 2, color, 5, 'center', P.white);
  }

  /* ---------- who looks like what (see sprites.js) ---------- */
  const SOURCE_ARCHETYPE = { 'claude-code': 'researcher', codex: 'engineer', gemini: 'analyst', openclaw: 'creative', hermes: 'clerk', github: 'engineer', automation: 'operator', manual: 'analyst' };
  const AGENT_LOOK = {
    triage: ['medic', { prop: 'clipboard' }], 'follow-up': ['clerk', { prop: 'letter' }], reporter: ['researcher', { prop: 'book' }], 'automation-scout': ['analyst', { prop: 'chart' }],
    'ops-runner': ['operator', { prop: 'wrench' }], 'pr-steward': ['engineer', { prop: 'laptop' }], janitor: ['builder', { prop: 'broom' }], 'bot-watchdog': ['operator', { prop: 'shield' }],
  };
  const CREW_LOOK = {
    finance: 'analyst', legal: 'researcher', health: 'medic', grocery: 'builder', school: 'clerk', family: 'creative', relations: 'creative', projects: 'builder', solana: 'engineer',
    upwork: 'clerk', outbound: 'engineer', integration: 'engineer', teslaware: 'builder', 'biz-research': 'researcher', bizops: 'operator', lifeadmin: 'clerk',
  };

  /** Stable sprite spec for an actor. */
  function specOf(a) {
    const S = window.Sprites;
    if (!S) return null;
    const leaf = a.dot || a.dotSkin || a.kind === 'dot' ? { hat: 'leaf' } : {};
    if (a.kind === 'bot') {
      const m = (a.job && a.job.meta) || {};
      const failed = a.status === 'failed';
      if (m.provider === 'grok') return { kind: 'alien', robot: true, alienSkin: failed ? '#5a5a66' : '#3a3f4e', glow: failed ? '#9aa0aa' : '#7cf8ff', label: 'Grok Bot', scene: 'globe', bg: '#141826', ...leaf };
      if (m.provider === 'hermes') return { kind: 'messenger', robot: true, label: 'Hermes', scene: 'gears', bg: '#2a2410', ...leaf };
      return { kind: 'bot', robot: true, suit: failed ? P.ghost[2] : m.providerColor || '#606878', label: 'Bot', scene: 'gears', bg: '#20283a', ...leaf };
    }
    if (a.kind === 'mech') return { kind: 'mech', robot: true, label: 'Watchdog', scene: 'gears', bg: '#2a1a1a' };
    if (a.kind === 'overlord') return a.spec;
    if (a.kind === 'agent') {
      const [kind, extra] = AGENT_LOOK[a.id.replace(/^agent:/, '')] || ['operator', {}];
      return S.specFor(kind, a.id, { tie: '#9060d8', ...extra, ...(a.enabled ? {} : { suit: '#585868' }) });
    }
    if (a.kind === 'dot') return S.specFor('creative', 'dot', { shirt: '#40a848', hair: '#8050d8', hairStyle: 'messy', hat: 'leaf', label: 'OG Kush' });
    if (a.kind === 'crew') return S.specFor(CREW_LOOK[a.crewName] || 'clerk', a.id, { tie: '#d8a828', ...leaf });
    const kind = SOURCE_ARCHETYPE[(a.job && a.job.source) || ''] || 'analyst';
    return S.specFor(kind, a.id, leaf);
  }

  /* ---------- state ---------- */
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
  let schedule = []; // [{ name, nextRunAt }]
  let selected = null; // { type, id }
  const clockRect = { x: 0, y: 0, w: 0, h: 0 };
  let landLayer = null;
  let seaFrames = [];
  let shake = 0;
  let placeCounts = {};

  const nodeXY = (id) => ({ x: NODES[id][0] * T, y: NODES[id][1] * T - 4 });

  function slot(placeId, i) {
    const p = PLACES[placeId];
    const row = Math.floor(i / p.cols);
    const col = i % p.cols;
    return { x: Math.round(p.door[0] * T + (col - (p.cols - 1) / 2) * GAP), y: p.door[1] * T + 6 + row * 24 };
  }

  /** Shortest road route between two nodes (breadth-first; the network is small). */
  function route(from, to) {
    if (!from || from === to) return [to];
    const prev = { [from]: null };
    const queue = [from];
    while (queue.length) {
      const n = queue.shift();
      if (n === to) break;
      for (const m of ADJ[n] || []) if (!(m in prev)) { prev[m] = n; queue.push(m); }
    }
    if (!(to in prev)) return [to];
    const out = [];
    for (let n = to; n; n = prev[n]) out.unshift(n);
    return out;
  }

  /** Walk along the roads to `toNode`, then step to `dest` (a crowd slot near it). */
  function walkTo(a, toNode, dest) {
    const ids = route(a.node || 'HQ', toNode);
    a.path = ids.slice(a.node === ids[0] ? 1 : 0).map(nodeXY).concat([dest]);
    a.node = toNode;
  }

  function say(msg, color = P.white) {
    ticker.unshift({ text: msg, color, t: performance.now() });
    ticker.length = Math.min(ticker.length, 5);
  }

  function burst(x, y, color, n = 10) {
    for (let i = 0; i < n; i += 1) particles.push({ x, y, vx: (Math.random() - 0.5) * 70, vy: -Math.random() * 70 - 10, life: 0.9, color });
  }

  /* ---------- where a job belongs ---------- */
  const CREATIVE = /\b(social|content|post|posts|video|blog|seo|marketing|brand|design|creative|ads?|campaign|newsletter|thumbnail|image|artwork|copy|reel|tiktok|instagram|youtube|buffer)\b/i;
  const CODER_SOURCES = new Set(['claude-code', 'codex', 'github', 'gemini', 'openclaw']);
  function districtOf(j) {
    const hay = `${j.title || ''} ${(j.meta && j.meta.automationId) || ''} ${(j.tags || []).join(' ')}`;
    if (CREATIVE.test(hay)) return 'funpark';
    if (CODER_SOURCES.has(j.source)) return 'backrooms';
    return 'office';
  }
  function placeOf(j) {
    if (j.source === 'bot') return 'bots';
    if (j.status === 'needs_you' || j.status === 'done' || j.status === 'failed') return j.status;
    const zone = ZONE_OF[j.business] || 'other';
    return districtOf(j) === 'funpark' ? `funpark:${zone}` : `backrooms:${zone}`;
  }
  const isDot = (j) => (dotTarget === 'codex-voice' ? Boolean(j.meta && j.meta.agent === 'Dot') : j.id === dotTarget);

  /* ---------- the Watchdog mech ---------- */
  let mech = null;
  function ensureMech(agent) {
    if (!mech) {
      const home = nodeXY('BT');
      mech = { id: 'agent:bot-watchdog', kind: 'mech', node: 'BT', x: home.x + 40, y: home.y + 20, path: [], phase: 0, tasks: [], task: null, pose: 'idle', until: 0, cooldown: {}, home: { x: home.x + 40, y: home.y + 20 } };
      actors.set(mech.id, mech);
    }
    if (agent) Object.assign(mech, { title: `Watchdog mech · ${agent.lastSummary || agent.role || ''}`, busy: agent.running || (agent.lastRunAt && Date.now() - Date.parse(agent.lastRunAt) < 90e3), enabled: agent.enabled, agent });
    return mech;
  }

  function mechStep(m, now) {
    if (m.path.length) { m.pose = m.task && m.task.phase === 'haul' ? 'carry' : 'walk'; return; }
    if (now < m.until) return;
    const t = m.task;
    if (!t) {
      m.pose = 'idle';
      const next = m.tasks.shift();
      if (next) {
        const target = actors.get(next.target);
        if (!target || target.carriedBy) return;
        target.path = [];
        m.task = { ...next, phase: 'go' };
        walkTo(m, target.node || 'HQ', { x: Math.round(target.x) - 30, y: Math.round(target.y) - 6 });
        say(next.type === 'carry' ? `WATCHDOG is hauling ${(target.title || '').slice(0, 24)} to the Ghost House` : `WATCHDOG is checking on ${(target.title || '').slice(0, 26)}`, '#ff9f43');
      } else if (Math.abs(m.x - m.home.x) + Math.abs(m.y - m.home.y) > 4) {
        walkTo(m, 'BT', m.home);
      }
      return;
    }
    const target = actors.get(t.target);
    // the job recovered (or vanished) before pickup: stand down
    if (!target || (t.type === 'carry' && !target.carriedBy && target.status !== 'failed')) {
      if (target) target.awaitingCarry = false;
      m.task = null;
      m.pose = 'idle';
      return;
    }
    if (t.phase === 'go') {
      if (t.type === 'carry') {
        m.pose = 'grab'; m.until = now + 0.8; t.phase = 'grab';
      } else {
        m.pose = 'stomp'; m.until = now + 1.4; t.phase = 'stomp'; shake = 0.5; target.scolded = now + 2.5;
        burst(target.x + 8, target.y + 12, '#c8b078', 14);
      }
      return;
    }
    if (t.phase === 'grab') {
      target.carriedBy = m.id;
      target.path = [];
      t.phase = 'haul';
      const dest = t.dest || slot('failed', 0);
      walkTo(m, PLACES[t.toPlace || 'failed'].node, { x: dest.x - 16, y: dest.y - 4 });
      return;
    }
    if (t.phase === 'haul') {
      const dest = t.dest || slot('failed', 0);
      target.carriedBy = null;
      target.awaitingCarry = false;
      target.x = dest.x; target.y = dest.y; target.node = PLACES[t.toPlace || 'failed'].node; target.place = t.toPlace || 'failed';
      burst(dest.x + 8, dest.y + 4, P.ghost[3], 16);
      shake = 0.3;
      m.pose = 'idle'; m.until = now + 0.6; m.task = null;
      return;
    }
    // stomp finished
    m.pose = 'idle'; m.task = null;
  }

  /* ---------- data in ---------- */
  function update(board, workforce, crew = [], dotCfg, sched = []) {
    if (!board) return;
    schedule = sched.filter((x) => x.nextRunAt).sort((a, b) => Date.parse(a.nextRunAt) - Date.parse(b.nextRunAt));
    if (dotCfg && dotCfg.target) dotTarget = dotCfg.target;
    const firstLoad = !loaded;
    loaded = true;
    const jobs = board.columns.flatMap((c) => c.jobs);
    const seen = new Set();
    const idx = {};
    placeCounts = idx;
    counts = { needs_you: 0, working: 0, bots: 0, done: 0, failed: 0, follow_up: 0 };
    for (const j of jobs) {
      if (j.source === 'bot') counts.bots += 1;
      else counts[j.status] = (counts[j.status] || 0) + 1;
      const place = placeOf(j);
      const i = (idx[place] = (idx[place] || 0) + 1) - 1;
      if (PLACES[place].max && i >= PLACES[place].max) continue;
      const id = `job:${j.id}`;
      seen.add(id);
      const dest = slot(place, i);
      let a = actors.get(id);
      if (!a) {
        const start = nodeXY('HQ');
        a = { id, kind: j.source === 'bot' ? 'bot' : 'job', x: firstLoad ? dest.x : start.x, y: firstLoad ? dest.y : start.y, path: [], node: firstLoad ? PLACES[place].node : 'HQ', place, jobId: j.id, phase: Math.random() * 6 };
        actors.set(id, a);
        if (!firstLoad) { say(`NEW  ${(j.title || '').slice(0, 34)}`, P.gold[3]); walkTo(a, PLACES[place].node, dest); }
      } else if (a.place !== place && !a.carriedBy) {
        a.awaitingCarry = false;
        say(`${(j.title || '').slice(0, 26)} -> ${PLACES[place].name}`, place === 'failed' ? P.red[3] : place === 'needs_you' ? P.gold[2] : P.grass[4]);
        if (place === 'failed' && a.kind === 'job') {
          // the Watchdog comes and hauls it away
          ensureMech().tasks.push({ type: 'carry', target: id, toPlace: 'failed', dest });
          a.awaitingCarry = true;
          a.path = [];
        } else {
          burst(a.x + 8, a.y, P.gold[2]);
          walkTo(a, PLACES[place].node, dest);
        }
        a.place = place;
      } else if (!a.carriedBy && !a.awaitingCarry) {
        if (a.path.length) a.path[a.path.length - 1] = dest;
        else if (a.x !== dest.x || a.y !== dest.y) a.path = [dest];
      }
      const dot = isDot(j);
      Object.assign(a, { job: j, title: j.title, status: j.status, dest, dot });
    }

    // Mission Control workforce: live at HQ, walk out to the place they are working on.
    const agents = (workforce && workforce.agents) || [];
    counts.hq = agents.length + (dotTarget === 'codex-voice' ? 1 : 0);
    let hqIndex = 0;
    agents.forEach((ag) => {
      if (ag.id === 'bot-watchdog') { seen.add(ensureMech(ag).id); return; }
      const id = `agent:${ag.id}`;
      seen.add(id);
      const home = slot('hq', hqIndex);
      hqIndex += 1;
      let a = actors.get(id);
      if (!a) { a = { id, kind: 'agent', x: home.x, y: home.y, path: [], node: 'HQ', place: 'hq', target: 'hq', phase: Math.random() * 6 }; actors.set(id, a); }
      const busy = ag.running || (ag.lastRunAt && Date.now() - Date.parse(ag.lastRunAt) < 90e3);
      const target = busy && ag.enabled ? AGENT_TARGET[ag.id] || 'hq' : 'hq';
      if (a.target !== target) {
        if (target !== 'hq') say(`${ag.name.toUpperCase()} heads to ${PLACES[target].name}`, P.purple[3]);
        const d = PLACES[target].door;
        walkTo(a, PLACES[target].node, target === 'hq' ? home : { x: d[0] * T + 30, y: d[1] * T - 6 });
        a.place = target;
        a.target = target;
      }
      Object.assign(a, { title: `${ag.name} (workforce) · ${ag.lastSummary || ag.role || ''}`, busy, enabled: ag.enabled });
    });
    if (!agents.some((x) => x.id === 'bot-watchdog')) seen.add(ensureMech().id);

    // The Watchdog disciplines stuck bots now and then.
    const m = ensureMech();
    const nowS = performance.now() / 1000;
    if (!m.task && !m.tasks.length) {
      const stuck = [...actors.values()].find((x) => x.kind === 'bot' && (x.status === 'needs_you' || x.status === 'failed') && !(m.cooldown[x.id] > nowS));
      if (stuck) { m.tasks.push({ type: 'discipline', target: stuck.id }); m.cooldown[stuck.id] = nowS + 300; }
    }

    // Chiefs of staff become realm overlords; everyone else lives in the village.
    const lords = crew.filter((x) => REALMS[x.name]);
    const villagers = crew.filter((x) => !REALMS[x.name]);
    counts.crew = villagers.length;
    villagers.forEach((x, i) => {
      seen.add(x.id);
      const d = slot('crew', i);
      let a = actors.get(x.id);
      if (!a) { a = { id: x.id, kind: 'crew', x: d.x, y: d.y, path: [], node: 'CR', place: 'crew', phase: Math.random() * 6 }; actors.set(x.id, a); }
      Object.assign(a, { title: `${x.title} (Hermes ${x.name}) · ${x.busy ? 'working' : 'idle'}`, busy: x.busy, crewName: x.name, dotSkin: dotTarget === x.id });
    });
    const businesses = board.businesses || [];
    lords.forEach((x, i) => {
      seen.add(x.id);
      const realm = REALMS[x.name];
      const biz = businesses.find((b) => b.id === realm.business);
      const zone = realm.business !== '*' ? ZONE_OF[realm.business] : null;
      let a = actors.get(x.id);
      if (!a) {
        const homeNode = zone ? `backrooms_${zone}` : 'HQ';
        const h = nodeXY(homeNode);
        a = { id: x.id, kind: 'overlord', x: h.x - 30 + i * 8, y: h.y + 26, path: [], node: homeNode, place: zone ? `backrooms:${zone}` : 'hq', phase: Math.random() * 6, pauseUntil: performance.now() / 1000 + 1 + i, log: [], cursor: i };
        actors.set(x.id, a);
      }
      const cape = realm.grand ? '#f8d838' : realm.liaison ? '#d8a828' : (biz && biz.color) || '#9060d8';
      Object.assign(a, {
        realm, lordName: x.name, short: realm.short, zone, businessName: biz ? biz.full || biz.name : realm.label, title: `${realm.label} · ${x.title}`, busy: x.busy,
        spec: window.Sprites ? Sprites.specFor('analyst', x.id, { suit: realm.grand ? '#1a1a22' : '#2a2a3a', tie: cape, cape, hat: realm.grand ? 'crown' : undefined, prop: 'clipboard', scene: 'castle', bg: Sprites.shade(cape, 0.35), accent: cape, label: realm.label }) : null,
      });
    });
    for (const a of actors.values()) if (a.kind === 'job' || a.kind === 'bot') a.dotSkin = a.jobId === dotTarget;

    // Dot (OG Kush) roams HQ and visits any thread it handed to Codex.
    if (dotTarget === 'codex-voice') {
      seen.add('agent:dot');
      let dot = actors.get('agent:dot');
      const home = slot('hq', hqIndex);
      if (!dot) { dot = { id: 'agent:dot', kind: 'dot', x: home.x, y: home.y, path: [], node: 'HQ', place: 'hq', target: 'hq', phase: 0 }; actors.set('agent:dot', dot); }
      const dj = jobs.find((j) => isDot(j) && j.status !== 'done');
      const target = dj ? placeOf(dj) : 'hq';
      if (dot.target !== target) {
        if (dj) say(`OG KUSH is on: ${(dj.title || '').slice(0, 26)}`, '#90f090');
        const d = PLACES[target].door;
        walkTo(dot, PLACES[target].node, target === 'hq' ? home : { x: d[0] * T - 34, y: d[1] * T - 4 });
        dot.place = target;
        dot.target = target;
      }
      dot.title = dj ? `Dot · OG Kush · on "${dj.title}"` : 'Dot · OG Kush · chilling at HQ';
    }
    for (const id of [...actors.keys()]) if (!seen.has(id)) actors.delete(id);
  }
  /* ---------- drawing actors ---------- */
  function drawActor(a, t) {
    if (a.kind === 'mech') return drawMech(a, t);
    const moving = a.path.length > 0 || Boolean(a.carriedBy);
    const stepping = a.path.length > 0 && Math.floor(t * 8 + a.phase) % 2;
    let bob = 0;
    if (a.kind === 'bot') bob = Math.round(Math.sin(t * 3 + a.phase) * 1.5);
    else if (a.kind === 'agent' || a.kind === 'crew') bob = a.busy && !moving ? Math.floor(t * 6 + a.phase) % 2 : 0;
    else if (a.kind === 'dot') bob = moving ? 0 : Math.round(Math.sin(t * 2.5));
    else if (a.kind === 'job' && !moving && a.status === 'working') bob = Math.floor(t * 8 + a.phase) % 2;
    else if (a.kind === 'job' && !moving && a.status === 'needs_you') bob = -Math.abs(Math.round(Math.sin(t * 5 + a.phase) * 2));
    const scolded = a.scolded && a.scolded > t;
    const jitter = scolded ? Math.round(Math.sin(t * 60)) : 0;
    const spec = specOf(a);
    const x = Math.round(a.x) + jitter;
    const y = Math.round(a.y) + bob;
    if (a.status === 'needs_you' && !moving) {
      g.fillStyle = `rgba(248,64,56,${0.25 + 0.2 * Math.sin(t * 6 + a.phase)})`;
      g.fillRect(x, Math.round(a.y) + 12, 16, 5);
      g.fillRect(x + 2, Math.round(a.y) + 11, 12, 7);
    }
    if (a.kind === 'overlord') {
      g.fillStyle = `${a.spec.cape}55`;
      g.beginPath(); g.ellipse(x + 8, Math.round(a.y) + 15, 11, 4, 0, 0, Math.PI * 2); g.fill();
    }
    if (!a.carriedBy) { g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x + 3, Math.round(a.y) + 14, 10, 2); }
    let top = y - 12;
    if (a.kind === 'bot' && spec) {
      top = y - 24;
      g.drawImage(Sprites.bot(spec, Math.floor(t * 4 + a.phase) % 2), x - 4, top);
    } else if (spec) {
      const img = Sprites.person(spec, stepping ? 1 : 0);
      if (a.status === 'failed' && a.kind === 'job' && !moving) {
        g.save(); g.globalAlpha = 0.75; g.translate(x + 12, Math.round(a.y) + 10); g.rotate(-Math.PI / 2); g.drawImage(img, -14, -8); g.restore();
      } else {
        g.drawImage(img, x, top);
      }
    }
    if (!moving) {
      if (scolded) bubble(x + 9, top - 8, '!!', P.red[1], t);
      else if (a.kind === 'overlord' && a.checking) bubble(x + 9, top - 8, '✓', '#2d9c67', t);
      else if (a.status === 'needs_you') bubble(x + 9, top - 6, '!', P.red[1], t);
      else if (a.status === 'follow_up' && a.kind === 'job') bubble(x + 9, top - 6, '?', P.gold[0], t);
      else if (a.status === 'done' && Math.floor(t * 2 + a.phase) % 5 === 0) star(x + 13, top + 4, Math.floor(t * 10));
      else if (a.status === 'working' && a.kind === 'job' && Math.random() < 0.03) particles.push({ x: x + 8, y: top, vx: (Math.random() - 0.5) * 20, vy: -28, life: 0.8, color: '#90ffb0', ch: Math.random() < 0.5 ? '1' : '0' });
      else if ((a.kind === 'agent' || a.kind === 'crew') && a.busy && Math.floor(t + a.phase) % 3 === 0) star(x + 13, top + 2, Math.floor(t * 10));
    }
    if (a.kind === 'overlord') text(a.short, x + 8, Math.round(a.y) + 18, a.spec.cape, 5, 'center');
    if (hover === a) { g.strokeStyle = 'rgba(248,216,56,.8)'; g.lineWidth = 1; g.strokeRect(x - 1.5, top + 1.5, a.kind === 'bot' ? 23 : 19, a.kind === 'bot' ? 39 : 27); }
  }

  function drawMech(m, t) {
    const frame = Math.floor(t * 5) % 2;
    const x = Math.round(m.x);
    const y = Math.round(m.y);
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.beginPath(); g.ellipse(x + 24, y + 50, 20, 5, 0, 0, Math.PI * 2); g.fill();
    g.drawImage(Sprites.mech(m.pose || 'idle', frame), x, y - 6);
    // whatever it is hauling rides above its raised claws
    for (const a of actors.values()) {
      if (a.carriedBy !== m.id) continue;
      a.x = m.x + 16;
      a.y = m.y - 30;
      g.save(); g.translate(Math.round(a.x) + 8, Math.round(a.y) + 4); g.rotate(Math.sin(t * 8) * 0.25);
      const spec = specOf(a);
      if (spec) g.drawImage(Sprites.person(spec, 0), -8, -16);
      g.restore();
      if (Math.random() < 0.08) bubble(Math.round(a.x) + 12, Math.round(a.y) - 22, '!', P.red[1], t);
    }
    if (m.pose === 'stomp' && Math.random() < 0.3) burst(x + 24, y + 48, '#c8b078', 3);
    if (hover === m) { g.strokeStyle = 'rgba(248,216,56,.8)'; g.lineWidth = 1; g.strokeRect(x - 1.5, y - 7.5, 51, 61); }
    text('WATCHDOG', x + 24, y + 56, '#ff9f43', 5, 'center');
  }

  /* ---------- static land layer + animated sea ---------- */
  function buildLayers() {
    landLayer = document.createElement('canvas');
    landLayer.width = W;
    landLayer.height = H;
    const prev = g;
    g = landLayer.getContext('2d');
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (land(x, y)) {
          const theme = ISLE[y][x];
          if (theme === 'backrooms') { drawBackroomsTile(x, y); continue; }
          if (theme === 'funpark') { if (FLOOR[y][x] && !isPath(x, y)) drawFloor(x, y, FLOOR[y][x]); else drawParkTile(x, y); continue; }
          drawGrass(x, y);
          if (FLOOR[y][x]) drawFloor(x, y, FLOOR[y][x]);
          else if (isPath(x, y)) drawPath(x, y);
          else if (PLAZA[y][x]) drawPlaza(x, y);
        } else {
          drawShore(x, y, 0);
          if (isPath(x, y)) drawBridge(x, y);
        }
      }
    }
    seaFrames = [0, 1, 2, 3].map((f) => {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      g = c.getContext('2d');
      for (let y = 0; y < 4; y += 1) for (let x = 0; x < 4; x += 1) drawWater(x, y, f * 2);
      return c;
    });
    g = prev;
  }

  function fish(t) {
    const cycle = 6;
    const k = Math.floor(t / cycle);
    const ph = (t % cycle) / 1.2;
    if (ph > 1) return;
    const spots = [[52, 20], [108, 20], [80, 6], [80, 84], [52, 74], [108, 74], [2, 46], [157, 46], [70, 72]];
    const [sx, sy] = spots[k % spots.length];
    const x = sx * T + ph * 24;
    const y = sy * T - Math.sin(ph * Math.PI) * 18;
    px(x, y, 8, 6, P.red[2]); px(x + 1, y + 1, 3, 2, P.red[3]); px(x + 6, y + 1, 1, 1, P.ink); px(x - 3, y, 3, 6, P.red[1]); px(x + 2, y - 2, 3, 2, P.white);
  }

  function clouds(t) {
    for (let i = 0; i < 9; i += 1) {
      const cx = ((t * (4 + (i % 4)) + i * 260) % (W + 120)) - 80;
      const cy = 40 + ((i * 173) % (H - 120));
      g.fillStyle = 'rgba(255,255,255,.45)';
      g.fillRect(Math.round(cx), Math.round(cy), 48, 9);
      g.fillRect(Math.round(cx + 8), Math.round(cy - 6), 26, 7);
      g.fillRect(Math.round(cx + 16), Math.round(cy - 10), 14, 5);
      g.fillStyle = 'rgba(150,180,230,.28)';
      g.fillRect(Math.round(cx + 2), Math.round(cy + 8), 44, 2);
    }
  }

  /* ---------- camera ---------- */
  const cam = { x: 80 * T, y: 46 * T, z: 1, tx: 80 * T, ty: 46 * T, tz: 1 };
  let cw = 800;
  let ch = 560;
  let dpr = 1;
  const minZoom = () => Math.min(cw / W, ch / H) * 0.92;
  const clampCam = () => {
    cam.tz = Math.max(minZoom(), Math.min(6, cam.tz));
    const hw = cw / 2 / cam.tz;
    const hh = ch / 2 / cam.tz;
    cam.tx = W < hw * 2 ? W / 2 : Math.max(hw - 40, Math.min(W - hw + 40, cam.tx));
    cam.ty = H < hh * 2 ? H / 2 : Math.max(hh - 40, Math.min(H - hh + 40, cam.ty));
  };
  function frameRect(x0, y0, x1, y1, instant = false) {
    cam.tz = Math.min(cw / (x1 - x0), ch / (y1 - y0)) * 0.94;
    cam.tx = (x0 + x1) / 2;
    cam.ty = (y0 + y1) / 2;
    clampCam();
    if (instant) Object.assign(cam, { x: cam.tx, y: cam.ty, z: cam.tz });
  }
  function frameIsland(id, instant) {
    const isl = ISLANDS.find((i) => i.id === id);
    if (!isl) return frameRect(0, 0, W, H, instant);
    frameRect((isl.c[0] - isl.r[0] - 1) * T, (isl.c[1] - isl.r[1] - 2) * T, (isl.c[0] + isl.r[0] + 1) * T, (isl.c[1] + isl.r[1] + 1) * T, instant);
  }
  function camera(cmd) {
    if (cmd === 'in') cam.tz *= 1.4;
    else if (cmd === 'out') cam.tz /= 1.4;
    else if (cmd === 'fit') frameRect(0, 0, W, H);
    else if (cmd === 'main') frameIsland('main');
    else frameIsland(cmd);
    clampCam();
  }
  const toWorld = (sx, sy) => ({ x: cam.x + (sx - cw / 2) / cam.z, y: cam.y + (sy - ch / 2) / cam.z });
  const toScreen = (wx, wy) => ({ x: (wx - cam.x) * cam.z + cw / 2, y: (wy - cam.y) * cam.z + ch / 2 });

  function resize() {
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    cw = Math.max(200, Math.round(r.width));
    ch = Math.max(200, Math.round(r.height));
    dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(cw * dpr);
    cv.height = Math.round(ch * dpr);
    g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    clampCam();
  }

  /* ---------- screen-space overlays ---------- */
  function hud() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    px(0, 0, cw, 24, 'rgba(16,16,24,.88)');
    px(0, 24, cw, 1, P.gold[1]);
    text('MISSION CONTROL', 10, 8, P.gold[2], 8);
    const items = [['!', counts.needs_you, P.red[3]], ['WORK', counts.working, P.grass[3]], ['BOTS', counts.bots, P.sea[3]], ['GOAL', counts.done, P.gold[3]], ['BOO', counts.failed, P.ghost[3]], ['CREW', counts.crew, P.gold[2]]];
    let x = 160;
    for (const [k, v, c] of items) { if (x > cw - 90) break; text(`${k}x${String(v || 0).padStart(2, '0')}`, x, 9, c, 7); x += 96; }
    const msg = ticker[0];
    const age = msg ? (performance.now() - msg.t) / 1000 : 99;
    px(0, ch - 18, cw, 18, 'rgba(16,16,24,.85)');
    px(0, ch - 18, cw, 1, P.gold[1]);
    text(age < 14 ? `> ${msg.text}` : '> drag to explore · scroll to zoom · click anyone', 10, ch - 12, age < 14 ? msg.color : P.stone[3], 7);
    minimap();
    if (hover) tooltip(hover);
  }

  const mini = { x: 0, y: 0, w: 0, h: 0 };
  function minimap() {
    const w = Math.min(190, cw * 0.22);
    const h = (w * H) / W;
    Object.assign(mini, { x: cw - w - 10, y: ch - h - 28, w, h });
    px(mini.x - 3, mini.y - 3, w + 6, h + 6, 'rgba(10,10,20,.8)');
    px(mini.x, mini.y, w, h, P.sea[0]);
    if (landLayer) g.drawImage(landLayer, mini.x, mini.y, w, h);
    const s = w / W;
    for (const a of actors.values()) {
      if (a.status !== 'needs_you') continue;
      px(mini.x + a.x * s - 1, mini.y + a.y * s - 1, 3, 3, P.red[2]);
    }
    const tl = toWorld(0, 0);
    const br = toWorld(cw, ch);
    g.strokeStyle = P.gold[2]; g.lineWidth = 1;
    g.strokeRect(mini.x + Math.max(0, tl.x) * s + 0.5, mini.y + Math.max(0, tl.y) * s + 0.5, Math.min(W, br.x - tl.x) * s, Math.min(H, br.y - tl.y) * s);
  }

  function tooltip(a) {
    const s = (a.title || '').slice(0, 70);
    const p = toScreen(a.x + 8, a.y - 14);
    g.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    const w = Math.ceil(g.measureText(s).width) + 14;
    const x = Math.max(4, Math.min(cw - w - 4, Math.round(p.x - w / 2)));
    const y = Math.max(28, Math.round(p.y - 30 * Math.min(cam.z, 2)));
    px(x, y, w, 18, 'rgba(16,16,24,.92)');
    px(x, y, w, 1, P.gold[2]);
    g.fillStyle = P.white; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText(s, x + 7, y + 9);
  }

  /* ---------- simulation ---------- */
  function patrol(a, now) {
    if (a.path.length || now < a.pauseUntil) return;
    if (a.target && !a.arrived) {
      a.arrived = true;
      a.checking = true;
      a.pauseUntil = now + 2.2;
      const t = actors.get(a.target);
      if (t) { a.log.unshift({ at: Date.now(), what: t.title || t.id, status: t.status || '' }); a.log.length = Math.min(a.log.length, 8); }
      return;
    }
    a.checking = false;
    let targets;
    const realmBiz = a.realm.business;
    if (a.realm.grand) targets = [...actors.values()].filter((x) => x.kind === 'overlord' && x !== a);
    else if (a.realm.liaison) targets = [...actors.values()].filter((x) => x.kind === 'bot' || x.kind === 'crew' || x.kind === 'dot' || x.kind === 'mech');
    else targets = [...actors.values()].filter((x) => (x.kind === 'job' || x.kind === 'bot') && x.job && !x.carriedBy && (x.job.business === realmBiz || (realmBiz === 'apps' && x.job.business === 'syncstep')));
    targets.sort((x, y) => (y.status === 'needs_you') - (x.status === 'needs_you'));
    if (!targets.length) {
      const nodes = a.zone ? [`backrooms_${a.zone}`, `funpark_${a.zone}`, 'NY', 'HQ'] : Object.values(PLACES).map((p) => p.node);
      const n = nodes[(a.cursor += 1) % nodes.length];
      const d = nodeXY(n);
      walkTo(a, n, { x: d.x + 26, y: d.y + 2 });
      a.target = null; a.arrived = false; a.pauseUntil = 0;
      return;
    }
    const t = targets[(a.cursor += 1) % targets.length];
    walkTo(a, t.node || 'HQ', { x: Math.round(t.x) + 14, y: Math.round(t.y) + 2 });
    a.target = t.id;
    a.arrived = false;
  }

  function step(dt) {
    const now = performance.now() / 1000;
    for (const a of actors.values()) {
      if (a.kind === 'overlord') patrol(a, now);
      if (a.kind === 'mech') mechStep(a, now);
      if (a.carriedBy || !a.path.length) continue;
      const p = a.path[0];
      const dx = p.x - a.x;
      const dy = p.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d < 1.5) {
        a.x = p.x; a.y = p.y; a.path.shift();
        if (!a.path.length && a.status === 'done') burst(a.x + 8, a.y, P.gold[2], 14);
      } else {
        const speed = a.kind === 'overlord' ? 80 : a.kind === 'mech' ? 56 : 64;
        const m = Math.min(d, speed * dt);
        a.x += (dx / d) * m;
        a.y += (dy / d) * m;
      }
    }
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 90 * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    shake = Math.max(0, shake - dt);
    // ease the camera toward its target
    const k = Math.min(1, dt * 10);
    cam.x += (cam.tx - cam.x) * k;
    cam.y += (cam.ty - cam.y) * k;
    cam.z += (cam.tz - cam.z) * k;
  }

  const FRAME_MS = 1000 / 30;
  let lastDraw = 0;
  function render(ts) {
    if (!running) return;
    if (ts - lastDraw < (document.hidden ? 2000 : FRAME_MS - 1)) { requestAnimationFrame(render); return; }
    lastDraw = ts;
    const t = ts / 1000;
    const dt = Math.min(0.05, lastT ? t - lastT : 0.016);
    lastT = t;
    const f = Math.floor(t * 10);
    step(dt);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = P.sea[0];
    g.fillRect(0, 0, cv.width, cv.height);
    const sx = shake ? (Math.random() - 0.5) * 4 : 0;
    const sy = shake ? (Math.random() - 0.5) * 4 : 0;
    const z = cam.z * dpr;
    g.setTransform(z, 0, 0, z, dpr * (cw / 2 - cam.x * cam.z + sx), dpr * (ch / 2 - cam.y * cam.z + sy));
    g.imageSmoothingEnabled = false;
    const tl = toWorld(0, 0);
    const br = toWorld(cw, ch);
    const vis = (x, y, m = 80) => x > tl.x - m && x < br.x + m && y > tl.y - m && y < br.y + m;
    g.fillStyle = g.createPattern(seaFrames[Math.floor(t * 3) % seaFrames.length], 'repeat');
    g.fillRect(Math.max(-64, tl.x - 64), Math.max(-64, tl.y - 64), Math.min(W + 128, br.x - tl.x + 128), Math.min(H + 128, br.y - tl.y + 128));
    g.drawImage(landLayer, 0, 0);
    const layers = [];
    for (const d of DECOR) {
      if (!vis(d.x * T, d.y * T)) continue;
      const th = ISLE[d.y][d.x];
      layers.push({ y: d.y * T + 15, draw: th === 'backrooms' ? () => drawBackroomsDecor(d, f) : th === 'funpark' ? () => drawParkDecor(d, f) : () => drawThemeDecor(d, f) });
    }
    for (const [id, p] of Object.entries(PLACES)) {
      if (!vis(p.door[0] * T, p.door[1] * T, 120)) continue;
      const isl = p.island && ISLANDS.find((i) => i.id === p.island);
      const n = id === 'hq' ? counts.hq : id === 'crew' ? counts.crew : placeCounts[id] || 0;
      layers.push({ y: p.door[1] * T - 2, draw: () => {
        const cx = p.door[0] * T + 8;
        const by = p.door[1] * T;
        if (p.kind === 'dept') drawDept(cx, by, f, p.zone, n);
        else if (p.kind === 'ride') drawRide(cx, by, f, p.zone, n);
        else drawPlace(id, p, f, n);
      } });
    }
    for (const isl of ISLANDS) if (vis(isl.c[0] * T, (isl.c[1] - isl.r[1]) * T, 200)) layers.push({ y: (isl.c[1] - isl.r[1] + 2) * T, draw: () => drawIslandBanner(isl, f) });
    if (vis(CLOCK.door[0] * T, CLOCK.door[1] * T)) layers.push({ y: CLOCK.door[1] * T - 2, draw: () => drawClock(f) });
    for (const a of actors.values()) if (!a.carriedBy && vis(a.x, a.y)) layers.push({ y: a.y + (a.kind === 'mech' ? 44 : 14), draw: () => drawActor(a, t) });
    layers.sort((a, b) => a.y - b.y);
    for (const l of layers) l.draw();
    for (const [id, p] of Object.entries(PLACES)) {
      if (!vis(p.door[0] * T, p.door[1] * T, 120)) continue;
      sign(id, p, id === 'hq' ? counts.hq || 0 : id === 'crew' ? counts.crew || 0 : placeCounts[id] || 0);
    }
    for (const p of particles) {
      if (p.ch) text(p.ch, p.x, p.y, p.color, 5);
      else px(p.x, p.y, 2, 2, p.color);
    }
    fish(t);
    clouds(t);
    const sel = selected && selected.type === 'actor' && actors.get(selected.id);
    if (sel) cursor(sel.x + (sel.kind === 'mech' ? 16 : 0), sel.y - (sel.kind === 'mech' ? 20 : sel.kind === 'bot' ? 24 : 12), t);
    else if (selected && selected.type === 'place') {
      const p = selected.id === 'clock' ? { door: CLOCK.door } : PLACES[selected.id];
      if (p) cursor(p.door[0] * T, p.door[1] * T - (selected.id === 'clock' ? 66 : 62), t);
    }
    hud();
    requestAnimationFrame(render);
  }

  /* ---------- input ---------- */
  function hit(sx, sy) {
    const { x, y } = toWorld(sx, sy);
    let best = null;
    for (const a of actors.values()) {
      const big = a.kind === 'mech';
      const x0 = a.x - (a.kind === 'bot' ? 4 : 0);
      const w = big ? 48 : a.kind === 'bot' ? 24 : 16;
      const y0 = a.y - (big ? 6 : a.kind === 'bot' ? 22 : 10);
      const h = big ? 58 : a.kind === 'bot' ? 38 : 26;
      if (x >= x0 && x <= x0 + w && y >= y0 && y <= y0 + h) best = !best || a.y > best.y ? a : best;
    }
    if (best) return best;
    for (const [id, r] of Object.entries(signRects)) if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return { sign: id };
    for (const [id, r] of Object.entries(bannerRects)) if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return { island: id };
    if (x >= clockRect.x && x <= clockRect.x + clockRect.w && y >= clockRect.y && y <= clockRect.y + clockRect.h) return { sign: 'clock' };
    for (const [id, p] of Object.entries(PLACES)) {
      const cx = p.door[0] * T + 8;
      const by = p.door[1] * T;
      if (x >= cx - 30 && x <= cx + 30 && y >= by - 58 && y <= by) return { sign: id };
    }
    return null;
  }

  /** What the sidebar needs to know about the current selection. */
  function describe(sel) {
    if (!sel) return null;
    if (sel.type === 'place') return { type: 'place', id: sel.id };
    if (sel.type === 'island') return { type: 'island', id: sel.id };
    const a = actors.get(sel.id);
    if (!a) return null;
    if (a.kind === 'job' || a.kind === 'bot') return { type: 'job', id: a.jobId };
    if (a.kind === 'agent') return { type: 'agent', id: a.id.replace(/^agent:/, '') };
    if (a.kind === 'mech') return { type: 'agent', id: 'bot-watchdog' };
    if (a.kind === 'crew') return { type: 'crew', id: a.id };
    if (a.kind === 'dot') return { type: 'dot', id: 'dot' };
    if (a.kind === 'overlord') return { type: 'overlord', id: a.id };
    return null;
  }

  function select(sel) {
    if (sel && sel.type === 'job') selected = { type: 'actor', id: `job:${sel.id}` };
    else if (sel && sel.type === 'agent') selected = { type: 'actor', id: `agent:${sel.id}` };
    else if (sel && (sel.type === 'crew' || sel.type === 'overlord')) selected = { type: 'actor', id: sel.id };
    else if (sel && sel.type === 'dot') selected = { type: 'actor', id: 'agent:dot' };
    else if (sel && sel.type === 'place') selected = { type: 'place', id: sel.id };
    else if (sel && sel.type === 'island') { selected = sel; frameIsland(sel.id); }
    else selected = null;
    // bring the selection into view
    const a = selected && selected.type === 'actor' && actors.get(selected.id);
    if (a && (a.x < toWorld(0, 0).x || a.x > toWorld(cw, ch).x || a.y < toWorld(0, 0).y || a.y > toWorld(cw, ch).y)) { cam.tx = a.x; cam.ty = a.y; clampCam(); }
  }

  function mount(canvas, options = {}) {
    cv = canvas;
    opts = options;
    buildMap();
    buildLayers();
    resize();
    frameIsland('main', true);
    new ResizeObserver(() => resize()).observe(cv);
    let drag = null;
    cv.addEventListener('pointerdown', (ev) => {
      drag = { x: ev.clientX, y: ev.clientY, cx: cam.tx, cy: cam.ty, moved: false };
      cv.setPointerCapture(ev.pointerId);
    });
    cv.addEventListener('pointermove', (ev) => {
      const r = cv.getBoundingClientRect();
      const sx = ev.clientX - r.left;
      const sy = ev.clientY - r.top;
      if (drag) {
        const dx = ev.clientX - drag.x;
        const dy = ev.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
        if (drag.moved) { cam.tx = drag.cx - dx / cam.z; cam.ty = drag.cy - dy / cam.z; clampCam(); cam.x = cam.tx; cam.y = cam.ty; cv.style.cursor = 'grabbing'; return; }
      }
      const h = sx > mini.x && sy > mini.y && sx < mini.x + mini.w && sy < mini.y + mini.h ? null : hit(sx, sy);
      hover = h && !h.sign ? h : null;
      cv.style.cursor = h ? 'pointer' : 'grab';
    });
    cv.addEventListener('pointerup', (ev) => {
      const r = cv.getBoundingClientRect();
      const sx = ev.clientX - r.left;
      const sy = ev.clientY - r.top;
      const wasDrag = drag && drag.moved;
      drag = null;
      cv.style.cursor = 'grab';
      if (wasDrag) return;
      if (sx > mini.x && sy > mini.y && sx < mini.x + mini.w && sy < mini.y + mini.h) {
        cam.tx = ((sx - mini.x) / mini.w) * W;
        cam.ty = ((sy - mini.y) / mini.h) * H;
        clampCam();
        return;
      }
      const h = hit(sx, sy);
      if (h && h.island) return enterIsland(h.island);
      selected = !h ? null : h.sign ? { type: 'place', id: h.sign } : { type: 'actor', id: h.id };
      if (opts.onSelect) opts.onSelect(describe(selected));
    });
    cv.addEventListener('mouseleave', () => { hover = null; });
    cv.addEventListener('wheel', (ev) => {
      ev.preventDefault();
      const r = cv.getBoundingClientRect();
      const before = toWorld(ev.clientX - r.left, ev.clientY - r.top);
      cam.tz *= Math.exp(-ev.deltaY * 0.0016);
      clampCam();
      cam.z = cam.tz;
      const after = toWorld(ev.clientX - r.left, ev.clientY - r.top);
      cam.tx += before.x - after.x; cam.ty += before.y - after.y;
      cam.x = cam.tx; cam.y = cam.ty;
      clampCam();
    }, { passive: false });
    cv.addEventListener('dblclick', (ev) => {
      const r = cv.getBoundingClientRect();
      const w = toWorld(ev.clientX - r.left, ev.clientY - r.top);
      const isl = ISLE[Math.floor(w.y / T)] && ISLE[Math.floor(w.y / T)][Math.floor(w.x / T)];
      if (isl) enterIsland(isl);
    });
    cv.tabIndex = 0;
    cv.addEventListener('keydown', (ev) => {
      const k = ev.key.toLowerCase();
      const stepPx = 80 / cam.z;
      if (k === 'arrowleft' || k === 'a') cam.tx -= stepPx;
      else if (k === 'arrowright' || k === 'd') cam.tx += stepPx;
      else if (k === 'arrowup' || k === 'w') cam.ty -= stepPx;
      else if (k === 'arrowdown' || k === 's') cam.ty += stepPx;
      else if (k === '+' || k === '=') cam.tz *= 1.25;
      else if (k === '-') cam.tz /= 1.25;
      else if (k === '0') frameRect(0, 0, W, H);
      else if (k === 'h') frameIsland('main');
      else return;
      ev.preventDefault();
      clampCam();
    });
  }

  /** Fly into an island and show its directory in the sidebar. */
  function enterIsland(id) {
    frameIsland(id);
    selected = { type: 'island', id };
    if (opts.onSelect) opts.onSelect({ type: 'island', id });
  }

  const start = () => { if (running || !cv) return; running = true; lastT = 0; requestAnimationFrame(render); };
  const stop = () => { running = false; };

  /** Portrait spec + overlord info for the sidebar. */
  function info(sel) {
    if (!sel) return null;
    const id = sel.type === 'job' ? `job:${sel.id}` : sel.type === 'agent' ? `agent:${sel.id}` : sel.type === 'dot' ? 'agent:dot' : sel.id;
    const a = actors.get(id);
    if (!a) return null;
    return { spec: specOf(a), kind: a.kind, realm: a.realm, businessName: a.businessName, log: a.log || [], checking: a.checking, title: a.title, island: a.island };
  }
  function team() {
    return [...actors.values()].filter((a) => a.kind === 'overlord' || a.kind === 'agent' || a.kind === 'crew' || a.kind === 'dot' || a.kind === 'mech').map((a) => ({ id: a.id, kind: a.kind, spec: specOf(a), name: a.kind === 'overlord' ? a.realm.label : a.kind === 'mech' ? 'Watchdog Mech' : (a.title || '').split(' · ')[0].split(' (')[0], sel: describe({ type: 'actor', id: a.id }) }));
  }

  window.Arcade = { mount, update, start, stop, say, select, info, team, camera, placeOf, enterIsland, PLACES, ISLANDS, ZONES, _actors: actors };
})();
