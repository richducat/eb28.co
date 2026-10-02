/* EB28 Mission Control — character art.
 * Original pixel archetypes in the spirit of the Fund Manager agents grid: suits, ties,
 * glasses, headsets and role props, drawn procedurally with 3-tone shading and a dark
 * outline pass. Two outputs:
 *   Sprites.person(spec, frame)  -> 16x24 map sprite (canvas), cached
 *   Sprites.portrait(spec)       -> 48x56 bust portrait card (canvas), cached
 * A spec is plain data, so any agent/job/bot can be given a stable look from its id.
 */
(() => {
  const INK = '#14101c';
  const shade = (hex, k) => {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
    return `#${[n >> 16, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`;
  };
  const hash = (s) => {
    let h = 2166136261;
    for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return (h >>> 0) / 4294967295;
  };
  const pick = (arr, r) => arr[Math.floor(r * arr.length) % arr.length];

  const SKIN = ['#f5d0a9', '#e8b48a', '#d19a6a', '#a8714a', '#7a4e32', '#f0c8b4'];
  const HAIR = ['#2a1d14', '#4a2f1c', '#6b4325', '#a0662e', '#d8b060', '#1a1a22', '#8c8c94', '#d8d8de', '#7a2e1c'];

  /** Add a 1px dark outline around everything drawn (the SNES sprite look). */
  function outline(c, color = INK) {
    const { width: w, height: h } = c.canvas;
    const img = c.getImageData(0, 0, w, h);
    const a = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : img.data[(y * w + x) * 4 + 3]);
    const out = [];
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) if (!a(x, y) && (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1))) out.push([x, y]);
    c.fillStyle = color;
    for (const [x, y] of out) c.fillRect(x, y, 1, 1);
  }

  /* ---------- map sprite: 16 x 24 ---------- */
  function drawPerson(c, s, frame) {
    const p = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    const skin = s.skin;
    const skinS = shade(skin, 0.82);
    const hair = s.hair;
    const hairS = shade(hair, 0.7);
    const top = s.suit || s.shirt;
    const topS = shade(top, 0.72);
    const topL = shade(top, 1.25);
    const step = frame === 1;
    // cape behind everything
    if (s.cape) { p(3, 12, 10, 10, shade(s.cape, 0.8)); p(4, 12, 8, 9, s.cape); }
    // legs + shoes (walking frame splays them)
    const pants = s.pants || '#2a3050';
    if (step) { p(4, 19, 3, 3, pants); p(9, 19, 3, 3, pants); p(3, 22, 4, 2, s.shoes || '#3a2414'); p(9, 22, 4, 2, s.shoes || '#3a2414'); }
    else { p(5, 19, 3, 4, pants); p(8, 19, 3, 4, pants); p(4, 23, 4, 1, s.shoes || '#3a2414'); p(8, 23, 4, 1, s.shoes || '#3a2414'); p(7, 19, 1, 3, shade(pants, 0.7)); }
    // arms
    p(3, 12, 2, 6, top); p(11, 12, 2, 6, topS); p(3, 18, 2, 1, skin); p(11, 18, 2, 1, skinS);
    // torso
    p(5, 12, 6, 7, top); p(5, 12, 1, 7, topL); p(10, 12, 1, 7, topS);
    if (s.suit) {
      p(7, 12, 2, 4, s.shirt || '#f2f2f2');
      if (s.tie) { p(7, 13, 2, 4, s.tie); p(7, 12, 2, 1, shade(s.tie, 1.2)); }
      p(6, 12, 1, 3, topL); p(9, 12, 1, 3, topS);
    } else if (s.tie) { p(7, 12, 2, 5, s.tie); }
    if (s.coat) { p(5, 12, 1, 7, '#f4f4f4'); p(10, 12, 1, 7, '#dcdce4'); }
    // neck + head
    p(7, 11, 2, 1, skinS);
    p(5, 4, 6, 6, skin); p(6, 10, 4, 1, skin); p(10, 5, 1, 5, skinS); p(4, 6, 1, 2, skinS); p(11, 6, 1, 2, skinS);
    // face
    p(6, 7, 1, 1, INK); p(9, 7, 1, 1, INK); p(7, 9, 2, 1, shade(skin, 0.7));
    if (s.glasses) { p(5, 6, 2, 2, 'rgba(180,220,255,.55)'); p(9, 6, 2, 2, 'rgba(180,220,255,.55)'); p(5, 6, 6, 1, INK); p(7, 7, 2, 1, INK); }
    // hair styles
    const hs = s.hairStyle;
    if (hs !== 'bald') { p(5, 2, 6, 2, hair); p(4, 3, 8, 2, hair); p(6, 1, 4, 1, hair); p(10, 3, 1, 2, hairS); }
    if (hs === 'side') { p(5, 4, 3, 1, hair); p(4, 5, 1, 2, hair); }
    if (hs === 'long') { p(4, 5, 1, 7, hair); p(11, 5, 1, 7, hairS); p(3, 8, 1, 4, hair); p(12, 8, 1, 4, hairS); }
    if (hs === 'messy') { p(5, 0, 1, 2, hair); p(8, 0, 1, 2, hair); p(10, 1, 1, 2, hairS); p(4, 4, 2, 1, hair); }
    if (hs === 'bun') { p(7, -1, 3, 2, hair); p(4, 5, 1, 4, hair); }
    if (hs === 'bald') { p(4, 5, 1, 3, s.hair); p(11, 5, 1, 3, hairS); p(6, 4, 2, 1, shade(skin, 1.12)); }
    if (hs === 'cap') { p(4, 2, 8, 3, s.capColor || '#c02028'); p(10, 4, 3, 1, shade(s.capColor || '#c02028', 0.7)); }
    // headset
    if (s.prop === 'headset') { p(4, 2, 1, 6, INK); p(11, 2, 1, 6, INK); p(5, 1, 6, 1, INK); p(11, 8, 2, 1, INK); p(12, 9, 1, 1, '#e04040'); }
    // hats
    if (s.hat === 'crown') { p(5, -1, 6, 2, '#f8d838'); p(5, -3, 1, 2, '#f8d838'); p(7, -3, 2, 2, '#f8d838'); p(10, -3, 1, 2, '#f8d838'); p(7, -1, 2, 1, '#e04040'); }
    if (s.hat === 'leaf') { p(6, -2, 4, 3, '#40a848'); p(7, -4, 2, 2, '#40a848'); p(4, -1, 2, 1, '#40a848'); p(10, -1, 2, 1, '#40a848'); p(7, -2, 1, 3, '#287830'); }
    // props in hand
    const pr = s.prop;
    if (pr === 'book') { p(0, 14, 4, 5, s.propColor || '#3060c0'); p(1, 15, 2, 3, '#f0f0f0'); }
    if (pr === 'clipboard') { p(12, 13, 4, 6, '#a06830'); p(13, 14, 2, 4, '#f4f4f4'); p(13, 15, 2, 1, '#888'); }
    if (pr === 'laptop') { p(0, 15, 5, 3, '#9aa0b0'); p(1, 15, 3, 2, '#40e0ff'); }
    if (pr === 'chart') { p(12, 12, 4, 6, '#f4f4f4'); p(12, 16, 1, 1, '#2d9c67'); p(13, 15, 1, 1, '#2d9c67'); p(14, 14, 1, 1, '#2d9c67'); p(15, 13, 1, 1, '#e04040'); }
    if (pr === 'mug') { p(12, 15, 3, 3, '#f4f4f4'); p(15, 16, 1, 1, '#f4f4f4'); }
    if (pr === 'wrench') { p(12, 13, 1, 6, '#9aa0b0'); p(11, 12, 3, 2, '#9aa0b0'); }
    if (pr === 'letter') { p(12, 15, 4, 3, '#f4f4f4'); p(12, 15, 4, 1, '#e04040'); }
    if (pr === 'shield') { p(12, 13, 4, 5, '#4888e8'); p(13, 14, 2, 3, '#f8d838'); }
    if (pr === 'broom') { p(13, 9, 1, 11, '#a06830'); p(12, 20, 3, 3, '#d8b060'); }
  }

  function drawRobot(c, s, frame) {
    const p = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    const body = s.suit || '#606878';
    const metal = '#b8c0d8';
    p(7, 0, 2, 2, frame ? '#f8d838' : '#e04040'); p(7, 2, 2, 2, '#888');
    p(3, 4, 10, 7, metal); p(4, 5, 8, 4, '#20283a'); p(5, 6, 2, 2, '#40e0ff'); p(9, 6, 2, 2, '#40e0ff'); p(12, 4, 1, 7, '#7880a0');
    p(4, 12, 8, 7, body); p(5, 13, 6, 3, shade(body, 1.3)); p(6, 14, 4, 1, '#f8d838');
    p(2, 12, 2, 6, metal); p(12, 12, 2, 6, '#7880a0');
    p(5, 19, 2, 4, metal); p(9, 19, 2, 4, '#7880a0'); p(4, 23, 3, 1, '#40404a'); p(9, 23, 3, 1, '#40404a');
    if (s.hat === 'leaf') { p(6, -2, 4, 3, '#40a848'); p(7, -4, 2, 2, '#40a848'); }
  }

  const cache = new Map();
  function person(spec, frame = 0) {
    const key = `p|${JSON.stringify(spec)}|${frame}`;
    if (cache.has(key)) return cache.get(key);
    const cv = document.createElement('canvas');
    cv.width = 16;
    cv.height = 28; // 4px headroom for hats
    const c = cv.getContext('2d');
    c.translate(0, 4);
    if (spec.robot) drawRobot(c, spec, frame);
    else drawPerson(c, spec, frame);
    c.setTransform(1, 0, 0, 1, 0, 0);
    outline(c);
    cache.set(key, cv);
    return cv;
  }

  /* ---------- portrait card: 48 x 56 bust with a role backdrop ---------- */
  function backdrop(c, s) {
    const p = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    const bg = s.bg || '#26304a';
    p(0, 0, 48, 56, bg);
    p(0, 0, 48, 2, shade(bg, 1.3));
    const scene = s.scene;
    if (scene === 'charts') {
      p(2, 4, 16, 12, '#f4f4f4'); for (let i = 0; i < 6; i += 1) p(4 + i * 2, 14 - [2, 4, 3, 7, 6, 9][i], 1, [2, 4, 3, 7, 6, 9][i], i % 2 ? '#2d9c67' : '#4888e8');
      p(31, 5, 15, 10, '#f4f4f4'); for (let i = 0; i < 12; i += 1) p(32 + i, 12 - Math.round(Math.sin(i / 2) * 3 + i / 3), 1, 1, '#e04040');
    } else if (scene === 'code') {
      p(2, 3, 18, 14, '#0c1a14'); p(29, 3, 17, 14, '#0c1a14');
      for (let i = 0; i < 5; i += 1) { p(4, 5 + i * 2, 4 + ((i * 5) % 9), 1, '#40e070'); p(31, 5 + i * 2, 3 + ((i * 7) % 10), 1, i % 2 ? '#40e0ff' : '#40e070'); }
    } else if (scene === 'books') {
      for (let r = 0; r < 2; r += 1) { p(1, 4 + r * 9, 46, 1, '#6b4325'); for (let i = 0; i < 11; i += 1) p(2 + i * 4, 5 + r * 9 - (i % 3), 3, 7 + (i % 3), ['#7a2e1c', '#2a4a8a', '#2d7a4a', '#a07a20'][i % 4]); }
    } else if (scene === 'castle') {
      p(0, 30, 48, 26, shade(bg, 0.8)); for (let i = 0; i < 6; i += 1) p(i * 9, 26, 6, 4, shade(bg, 0.8));
      p(36, 4, 1, 12, '#ddd'); p(37, 4, 7, 5, s.accent || '#e04040');
    } else if (scene === 'gears') {
      for (const [x, y] of [[8, 10], [38, 12]]) { c.fillStyle = shade(bg, 1.45); c.beginPath(); c.arc(x, y, 6, 0, Math.PI * 2); c.fill(); p(x - 2, y - 2, 4, 4, bg); }
    } else if (scene === 'globe') {
      c.fillStyle = '#2860c8'; c.beginPath(); c.arc(9, 10, 7, 0, Math.PI * 2); c.fill(); p(6, 7, 4, 3, '#40a848'); p(10, 11, 3, 3, '#40a848');
    }
  }

  function drawBust(c, s) {
    // head + shoulders at roughly 2.4x map scale with extra facial detail
    const p = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    if (s.kind === 'alien') {
      const sk = s.alienSkin || '#3a3f4e';
      const gl = s.glow || '#7cf8ff';
      p(23, 0, 2, 7, shade(sk, 0.7)); p(21, -2, 6, 4, gl);
      p(12, 6, 24, 4, sk); p(8, 10, 32, 16, sk); p(10, 26, 28, 4, sk); p(14, 30, 20, 4, sk);
      p(10, 10, 8, 6, shade(sk, 1.35)); p(36, 12, 4, 14, shade(sk, 0.7));
      p(12, 16, 10, 8, '#05060a'); p(26, 16, 10, 8, '#05060a'); p(14, 24, 6, 2, '#05060a'); p(28, 24, 6, 2, '#05060a');
      p(14, 18, 4, 2, gl); p(28, 18, 4, 2, gl); p(19, 22, 2, 2, '#fff'); p(33, 22, 2, 2, '#fff');
      p(16, 36, 16, 20, '#16181f'); p(19, 39, 2, 12, '#e8e8f0'); p(21, 42, 2, 6, '#e8e8f0'); p(26, 39, 2, 12, gl);
      p(8, 36, 8, 20, sk); p(32, 36, 8, 20, shade(sk, 0.7));
      return;
    }
    if (s.kind === 'mech') {
      p(10, 4, 28, 20, '#2d3748'); p(12, 6, 24, 5, '#718096'); p(14, 14, 20, 6, '#0b0f19'); p(16, 15, 16, 3, '#ff9f43');
      p(22, -2, 4, 7, '#a0aec0'); p(21, -4, 6, 3, '#e53e3e');
      p(2, 26, 44, 30, '#4a5568'); p(2, 26, 44, 4, '#718096'); p(0, 28, 8, 12, '#2d3748'); p(40, 28, 8, 12, '#2d3748');
      for (let i = 0; i < 5; i += 1) p(6 + i * 8, 48, 5, 4, i % 2 ? '#f6c90e' : '#1a202c');
      p(30, 34, 10, 10, '#e53e3e'); p(32, 36, 6, 6, '#fff5f5'); p(34, 38, 2, 2, '#e53e3e');
      return;
    }
    const skin = s.skin;
    const skinS = shade(skin, 0.82);
    const skinH = shade(skin, 1.08);
    const hair = s.hair;
    const hairS = shade(hair, 0.7);
    const top = s.suit || s.shirt;
    if (s.robot) {
      p(12, 14, 24, 18, '#b8c0d8'); p(14, 17, 20, 9, '#20283a'); p(17, 19, 4, 4, '#40e0ff'); p(27, 19, 4, 4, '#40e0ff'); p(22, 8, 4, 6, '#888'); p(22, 6, 4, 3, '#e04040');
      p(8, 34, 32, 22, s.suit || '#606878'); p(14, 38, 20, 6, shade(s.suit || '#606878', 1.3)); p(20, 40, 8, 2, '#f8d838');
      return;
    }
    if (s.cape) { p(4, 38, 40, 18, shade(s.cape, 0.8)); }
    // shoulders / jacket
    p(8, 40, 32, 16, top); p(8, 40, 3, 16, shade(top, 1.2)); p(37, 40, 3, 16, shade(top, 0.72));
    if (s.coat) { p(10, 40, 4, 16, '#f4f4f4'); p(34, 40, 4, 16, '#dcdce4'); }
    if (s.suit) {
      p(19, 40, 10, 16, s.shirt || '#f2f2f2');
      p(16, 40, 4, 10, shade(top, 1.15)); p(28, 40, 4, 10, shade(top, 0.8));
      if (s.tie) { p(22, 41, 4, 15, s.tie); p(22, 41, 4, 2, shade(s.tie, 1.25)); }
    } else if (s.tie) { p(22, 41, 4, 15, s.tie); }
    if (s.prop === 'headset') { p(10, 12, 2, 18, INK); p(36, 12, 2, 18, INK); p(12, 9, 24, 2, INK); p(36, 28, 6, 2, INK); p(40, 29, 2, 2, '#e04040'); }
    // neck + head
    p(20, 34, 8, 6, skinS);
    p(14, 12, 20, 20, skin); p(16, 32, 16, 3, skin); p(31, 14, 3, 18, skinS); p(14, 12, 20, 2, skinH);
    p(12, 20, 2, 6, skinS); p(34, 20, 2, 6, skinS);
    // brows, eyes, nose, mouth
    p(17, 18, 5, 1, shade(hair, 0.8)); p(26, 18, 5, 1, shade(hair, 0.8));
    p(18, 21, 3, 2, '#ffffff'); p(27, 21, 3, 2, '#ffffff'); p(19, 21, 2, 2, INK); p(28, 21, 2, 2, INK);
    p(23, 23, 2, 4, skinS); p(22, 27, 1, 1, skinS);
    p(20, 29, 8, 1, shade(skin, 0.6)); p(21, 30, 6, 1, shade(skin, 0.9));
    if (s.glasses) { c.strokeStyle = INK; c.lineWidth = 1; c.strokeRect(16.5, 19.5, 7, 5); c.strokeRect(25.5, 19.5, 7, 5); p(23, 21, 3, 1, INK); p(17, 20, 6, 1, 'rgba(255,255,255,.35)'); p(26, 20, 6, 1, 'rgba(255,255,255,.35)'); }
    // hair
    const hs = s.hairStyle;
    if (hs !== 'bald') { p(13, 6, 22, 8, hair); p(15, 4, 18, 3, hair); p(12, 10, 3, 8, hair); p(33, 10, 3, 8, hairS); p(16, 5, 8, 2, shade(hair, 1.25)); }
    if (hs === 'side') { p(14, 12, 10, 3, hair); p(24, 12, 3, 2, hair); }
    if (hs === 'long') { p(10, 12, 5, 26, hair); p(33, 12, 5, 26, hairS); }
    if (hs === 'messy') { for (let i = 0; i < 6; i += 1) p(14 + i * 3, 2 + (i % 2) * 2, 3, 4, i % 2 ? hairS : hair); }
    if (hs === 'bun') { p(19, 0, 10, 6, hair); p(11, 12, 4, 14, hair); }
    if (hs === 'bald') { p(12, 14, 3, 8, hair); p(33, 14, 3, 8, hairS); p(18, 12, 6, 2, shade(skin, 1.15)); }
    if (hs === 'cap') { p(12, 6, 24, 8, s.capColor || '#c02028'); p(30, 12, 10, 3, shade(s.capColor || '#c02028', 0.7)); }
    if (s.hat === 'crown') { p(15, 2, 18, 5, '#f8d838'); for (const x of [15, 22, 30]) p(x, -2, 3, 5, '#f8d838'); p(22, 3, 4, 3, '#e04040'); }
    if (s.hat === 'leaf') { p(18, 0, 12, 7, '#40a848'); p(22, -4, 4, 5, '#40a848'); p(12, 4, 6, 3, '#40a848'); p(30, 4, 6, 3, '#40a848'); p(23, 0, 2, 7, '#287830'); }
    // held prop peeking in at the bottom
    if (s.prop === 'book') { p(2, 44, 10, 12, s.propColor || '#3060c0'); p(4, 46, 6, 8, '#f0f0f0'); }
    if (s.prop === 'clipboard') { p(36, 42, 11, 14, '#a06830'); p(38, 45, 7, 10, '#f4f4f4'); for (let i = 0; i < 3; i += 1) p(39, 47 + i * 2, 5, 1, '#999'); }
    if (s.prop === 'laptop') { p(1, 46, 16, 10, '#9aa0b0'); p(3, 47, 12, 7, '#40e0ff'); }
    if (s.prop === 'chart') { p(36, 42, 11, 14, '#f4f4f4'); for (let i = 0; i < 4; i += 1) p(38 + i * 2, 53 - i * 2, 2, 1 + i * 2, '#2d9c67'); }
    if (s.prop === 'mug') { p(37, 46, 7, 8, '#f4f4f4'); p(44, 48, 2, 3, '#f4f4f4'); }
    if (s.prop === 'letter') { p(35, 46, 12, 8, '#f4f4f4'); p(35, 46, 12, 2, '#e04040'); }
    if (s.prop === 'shield') { p(36, 42, 11, 13, '#4888e8'); p(39, 45, 5, 7, '#f8d838'); }
  }

  function portrait(spec) {
    const key = `b|${JSON.stringify(spec)}`;
    if (cache.has(key)) return cache.get(key);
    const cv = document.createElement('canvas');
    cv.width = 48;
    cv.height = 56;
    const c = cv.getContext('2d');
    const fig = document.createElement('canvas');
    fig.width = 48;
    fig.height = 60;
    const f = fig.getContext('2d');
    f.translate(0, 4);
    drawBust(f, spec);
    f.setTransform(1, 0, 0, 1, 0, 0);
    outline(f);
    backdrop(c, spec);
    c.drawImage(fig, 0, -4);
    cache.set(key, cv);
    return cv;
  }

  /* ---------- archetypes ---------- */
  // Each returns a spec; `seed` adds stable per-character variety (skin, hair, tie).
  function vary(seed, base) {
    const r = (k) => hash(`${seed}|${k}`);
    return {
      skin: pick(SKIN, r('skin')),
      hair: base.hairStyle === 'bald' ? pick(['#8c8c94', '#d8d8de'], r('hair')) : pick(HAIR, r('hair')),
      hairStyle: base.hairStyle || pick(['short', 'side', 'long', 'messy', 'bun', 'short', 'side'], r('style')),
      glasses: base.glasses !== undefined ? base.glasses : r('glasses') < 0.35,
      ...base,
    };
  }

  const ARCHETYPES = {
    researcher: { label: 'Researcher', suit: '#2a3a6a', shirt: '#f2f2f2', tie: '#d97757', prop: 'book', scene: 'books', bg: '#3a2c24' },
    engineer: { label: 'Engineer', shirt: '#e8ecf4', tie: '#10a37f', prop: 'headset', scene: 'code', bg: '#16222e' },
    analyst: { label: 'Analyst', suit: '#1e2a4a', shirt: '#dfe8ff', tie: '#4888e8', prop: 'chart', scene: 'charts', bg: '#26304a', glasses: true },
    operator: { label: 'Operator', suit: '#3a3a44', shirt: '#f2f2f2', tie: '#f0c838', prop: 'wrench', scene: 'gears', bg: '#2a2a34' },
    clerk: { label: 'Clerk', suit: '#5a4a2a', shirt: '#f4ecd8', tie: '#a02020', prop: 'letter', scene: 'books', bg: '#3a3020' },
    medic: { label: 'Care', shirt: '#e8f4f0', coat: true, prop: 'clipboard', scene: 'gears', bg: '#24403a' },
    builder: { label: 'Builder', shirt: '#d8a828', hairStyle: 'cap', capColor: '#d8a828', prop: 'wrench', scene: 'gears', bg: '#3a3020' },
    creative: { label: 'Creative', shirt: '#a050d8', prop: 'laptop', scene: 'globe', bg: '#2e2040' },
  };

  /** A stable look for anything on the map. */
  function specFor(kind, id, extra = {}) {
    const base = ARCHETYPES[kind] || ARCHETYPES.analyst;
    return { ...vary(id, base), ...extra };
  }

  /* ---------- 32-bit bots: alien Grok bots, Hermes messenger, generic bot (24 x 32) ---------- */
  function drawAlien(c, s, frame) {
    const p = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    const skin = s.alienSkin || '#3a3f4e';
    const skinL = shade(skin, 1.35);
    const skinD = shade(skin, 0.7);
    const glow = s.glow || '#7cf8ff';
    const hover = frame ? 1 : 0;
    // antenna with pulsing tip
    p(11, 0 + hover, 2, 4, skinD); p(10, -2 + hover, 4, 3, frame ? glow : shade(glow, 0.6));
    // big oval head
    p(6, 4 + hover, 12, 2, skin); p(4, 6 + hover, 16, 8, skin); p(5, 14 + hover, 14, 2, skin); p(7, 16 + hover, 10, 2, skin);
    p(5, 6 + hover, 4, 3, skinL); p(6, 5 + hover, 4, 1, skinL); p(18, 7 + hover, 2, 7, skinD);
    // huge glossy eyes with reflections
    p(6, 9 + hover, 5, 4, '#05060a'); p(13, 9 + hover, 5, 4, '#05060a'); p(7, 13 + hover, 3, 1, '#05060a'); p(14, 13 + hover, 3, 1, '#05060a');
    p(7, 10 + hover, 2, 1, glow); p(14, 10 + hover, 2, 1, glow); p(9, 12 + hover, 1, 1, '#ffffff'); p(16, 12 + hover, 1, 1, '#ffffff');
    p(11, 16 + hover, 2, 1, skinD);
    // slim armored body with xAI-style slash
    p(8, 18 + hover, 8, 8, '#16181f'); p(9, 19 + hover, 6, 6, '#2a2e3a'); p(10, 20 + hover, 1, 4, '#e8e8f0'); p(11, 21 + hover, 1, 2, '#e8e8f0'); p(13, 20 + hover, 1, 4, glow);
    p(5, 18 + hover, 3, 6, skin); p(16, 18 + hover, 3, 6, skinD); p(4, 24 + hover, 3, 2, skinL); p(17, 24 + hover, 3, 2, skin);
    // hover jets instead of legs
    p(9, 26 + hover, 2, 2, '#16181f'); p(13, 26 + hover, 2, 2, '#16181f');
    p(9, 28 + hover, 2, 1 + (frame ? 2 : 1), glow); p(13, 28 + hover, 2, 1 + (frame ? 1 : 2), glow);
    if (s.hat === 'leaf') { p(9, -4, 6, 3, '#40a848'); p(11, -6, 2, 2, '#40a848'); }
  }

  function drawMessenger(c, s, frame) {
    const p = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    const gold = '#e8b830';
    const goldL = '#f8e070';
    const goldD = '#a07818';
    // winged helmet
    p(7, 2, 10, 9, gold); p(8, 2, 6, 2, goldL); p(16, 3, 1, 8, goldD);
    p(2 - frame, 3, 5, 2, '#f4f4f4'); p(3 - frame, 5, 4, 2, '#dcdce4'); p(17 + frame, 3, 5, 2, '#f4f4f4'); p(17 + frame, 5, 4, 2, '#dcdce4');
    p(8, 6, 8, 3, '#20283a'); p(9, 7, 2, 1, '#40e0ff'); p(13, 7, 2, 1, '#40e0ff');
    // body with satchel of messages
    p(7, 12, 10, 9, '#3a3a52'); p(8, 13, 8, 3, gold); p(10, 14, 4, 1, goldL);
    p(4, 12, 3, 7, '#5a5a78'); p(17, 12, 3, 7, '#3a3a52');
    p(15, 16, 6, 5, '#7a4e2a'); p(16, 17, 4, 2, '#f4f4f4');
    p(8, 21, 3, 6, '#5a5a78'); p(13, 21, 3, 6, '#3a3a52'); p(7, 27, 4, 2, gold); p(13, 27, 4, 2, gold);
    p(5, 27, 2, 1, '#f4f4f4'); p(17, 27, 2, 1, '#f4f4f4');
  }

  function drawBot32(c, s, frame) {
    const p = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    const body = s.suit || '#606878';
    p(11, 0, 2, 3, '#888'); p(10, -1, 4, 2, frame ? '#f8d838' : '#e04040');
    p(5, 3, 14, 10, '#b8c0d8'); p(6, 5, 12, 5, '#20283a'); p(8, 6, 3, 3, '#40e0ff'); p(13, 6, 3, 3, '#40e0ff'); p(17, 3, 2, 10, '#7880a0');
    p(6, 14, 12, 9, body); p(8, 15, 8, 4, shade(body, 1.3)); p(10, 16, 4, 2, '#f8d838');
    p(3, 14, 3, 8, '#b8c0d8'); p(18, 14, 3, 8, '#7880a0');
    p(7, 23, 4, 6, '#b8c0d8'); p(13, 23, 4, 6, '#7880a0'); p(6, 29, 5, 2, '#40404a'); p(13, 29, 5, 2, '#40404a');
    if (s.hat === 'leaf') { p(9, -4, 6, 3, '#40a848'); }
  }

  function bot(spec, frame = 0) {
    const key = `bot|${JSON.stringify(spec)}|${frame}`;
    if (cache.has(key)) return cache.get(key);
    const cv = document.createElement('canvas');
    cv.width = 24;
    cv.height = 40; // 8px headroom for antennas and hats
    const c = cv.getContext('2d');
    c.translate(0, 8);
    if (spec.kind === 'alien') drawAlien(c, spec, frame);
    else if (spec.kind === 'messenger') drawMessenger(c, spec, frame);
    else drawBot32(c, spec, frame);
    c.setTransform(1, 0, 0, 1, 0, 0);
    outline(c);
    cache.set(key, cv);
    return cv;
  }

  /* ---------- the Watchdog: a big war mech (48 x 56) ---------- */
  // pose: 'idle' | 'walk' | 'grab' | 'carry' | 'stomp'
  // armor palettes: the main-island Watchdog and one overlord mech per island
  const MECH_SKINS = {
    watchdog: { armor: '#4a5568', armorL: '#718096', armorD: '#2d3748', hazard: '#f6c90e', red: '#e53e3e', visor: '#ff9f43' },
    backrooms: { armor: '#8a7a3a', armorL: '#c8b45a', armorD: '#5a4e22', hazard: '#1a1a1a', red: '#f6c90e', visor: '#fff6a0' },
    funpark: { armor: '#d0508a', armorL: '#ff8ac0', armorD: '#8a2a5a', hazard: '#4ab8ff', red: '#ffe45c', visor: '#4affd0' },
    cyber: { armor: '#161a26', armorL: '#2a3248', armorD: '#07090f', hazard: '#2affd0', red: '#ff2a3a', visor: '#ff2a3a' },
  };
  function drawMech(c, pose, frame, skin = 'watchdog') {
    const p = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    const K = MECH_SKINS[skin] || MECH_SKINS.watchdog;
    const { armor, armorL, armorD, hazard, red } = K;
    const step = pose === 'walk' || pose === 'carry' ? frame : 0;
    // legs (heavy, digitigrade)
    const lx = step ? 2 : 0;
    p(10 - lx, 34, 8, 12, armorD); p(11 - lx, 35, 6, 5, armorL); p(8 - lx, 46, 12, 5, armorD); p(8 - lx, 50, 12, 2, '#1a202c');
    p(30 + lx, 34, 8, 12, armorD); p(31 + lx, 35, 6, 5, armor); p(28 + lx, 46, 12, 5, armorD); p(28 + lx, 50, 12, 2, '#1a202c');
    for (let i = 0; i < 3; i += 1) { p(9 - lx + i * 4, 47, 2, 2, hazard); p(29 + lx + i * 4, 47, 2, 2, hazard); }
    // hips + torso
    p(12, 30, 24, 6, armorD);
    p(8, 12, 32, 20, armor); p(8, 12, 32, 3, armorL); p(36, 12, 4, 20, armorD);
    for (let i = 0; i < 4; i += 1) p(10 + i * 7, 27, 4, 3, i % 2 ? hazard : '#1a202c');
    // cockpit with glowing visor
    p(16, 4, 16, 11, armorD); p(17, 5, 14, 3, armorL);
    p(18, 9, 12, 4, '#0b0f19'); p(19, 10, 10, 2, pose === 'stomp' ? red : frame ? shade(K.visor, 1.2) : K.visor);
    p(23, 0, 2, 5, '#a0aec0'); p(22, -2, 4, 2, frame ? red : '#9b2c2c');
    // shoulder cannons
    p(2, 10, 8, 8, armorD); p(0, 12, 4, 4, '#1a202c'); p(38, 10, 8, 8, armorD); p(44, 12, 4, 4, '#1a202c');
    p(3, 11, 6, 2, armorL); p(39, 11, 6, 2, armorL);
    // arms: raised to carry, reaching to grab, or down
    if (pose === 'carry' || pose === 'grab') {
      p(4, 2, 5, 12, armor); p(39, 2, 5, 12, armorD); p(3, -2, 7, 4, '#a0aec0'); p(38, -2, 7, 4, '#a0aec0');
      p(3, -4, 2, 3, '#a0aec0'); p(8, -4, 2, 3, '#a0aec0'); p(38, -4, 2, 3, '#a0aec0'); p(43, -4, 2, 3, '#a0aec0');
    } else if (pose === 'stomp') {
      p(2, 18, 6, 14, armor); p(40, 18, 6, 14, armorD); p(0, 30, 10, 6, '#a0aec0'); p(38, 30, 10, 6, '#a0aec0');
    } else {
      p(3, 18, 5, 14, armor); p(40, 18, 5, 14, armorD); p(2, 31, 7, 5, '#a0aec0'); p(39, 31, 7, 5, '#a0aec0');
      p(2, 35, 2, 2, '#a0aec0'); p(7, 35, 2, 2, '#a0aec0'); p(39, 35, 2, 2, '#a0aec0'); p(44, 35, 2, 2, '#a0aec0');
    }
    // unit markings
    p(12, 17, 10, 6, '#1a202c'); p(13, 18, 2, 4, hazard); p(16, 18, 2, 4, hazard); p(19, 18, 2, 4, hazard);
    p(28, 17, 6, 6, red); p(29, 18, 4, 4, '#fff5f5'); p(30, 19, 2, 2, red);
  }

  function mech(pose = 'idle', frame = 0, skin = 'watchdog') {
    const key = `mech|${pose}|${frame}|${skin}`;
    if (cache.has(key)) return cache.get(key);
    const cv = document.createElement('canvas');
    cv.width = 48;
    cv.height = 60;
    const c = cv.getContext('2d');
    c.translate(0, 6);
    drawMech(c, pose, frame, skin);
    c.setTransform(1, 0, 0, 1, 0, 0);
    outline(c);
    cache.set(key, cv);
    return cv;
  }

  window.Sprites = { person, portrait, bot, mech, specFor, ARCHETYPES, shade, hash };
})();
