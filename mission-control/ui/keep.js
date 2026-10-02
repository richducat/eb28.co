/**
 * Re-render a container without losing what Richard is typing: text in inputs and
 * textareas, the focused field and cursor, and which <details> sections are open.
 * Fields are matched by their data-* attributes (or id/name), so they must be stable.
 */
window.keepTyping = function keepTyping(el, render) {
  if (!el) return render();
  const SEL = 'input:not([type=checkbox]):not([type=radio]):not([type=hidden]), textarea, select';
  const keyOf = (f, i) => [...f.attributes].filter((a) => a.name.startsWith('data-')).map((a) => `${a.name}=${a.value}`).join('&') || f.id || f.name || `#${i}`;
  const before = [...el.querySelectorAll(SEL)];
  const saved = new Map();
  before.forEach((f, i) => { if (f.value && f.tagName !== 'SELECT') saved.set(keyOf(f, i), f.value); else if (f.tagName === 'SELECT' && f.dataset.touched) saved.set(keyOf(f, i), f.value); });
  const act = document.activeElement;
  const focusKey = act && el.contains(act) && before.includes(act) ? keyOf(act, before.indexOf(act)) : null;
  const caret = focusKey && typeof act.selectionStart === 'number' ? [act.selectionStart, act.selectionEnd] : null;
  const detailKey = (d) => `${d.className}|${(d.querySelector('summary') || {}).textContent || ''}`;
  const open = new Set([...el.querySelectorAll('details[open]')].map(detailKey));
  const result = render();
  [...el.querySelectorAll(SEL)].forEach((f, i) => {
    const k = keyOf(f, i);
    if (saved.has(k)) { f.value = saved.get(k); if (f.tagName === 'SELECT') f.dataset.touched = '1'; }
    if (k === focusKey) { f.focus(); if (caret) try { f.setSelectionRange(caret[0], caret[1]); } catch { /* not a text field */ } }
  });
  if (open.size) el.querySelectorAll('details').forEach((d) => { if (open.has(detailKey(d))) d.open = true; });
  return result;
};
document.addEventListener('change', (ev) => { if (ev.target.tagName === 'SELECT') ev.target.dataset.touched = '1'; });
