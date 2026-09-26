// Publication ring for the homepage. Data comes from data/ring.json (built by scripts/build_ring.py).

(async () => {
const ring = document.getElementById('ring'); if (!ring) return;
const data = await (await fetch(ring.dataset.src || 'data/ring.json')).json();
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const emph = t => esc(t).replace(/\*([^*]+)\*/g, '<em>$1</em>');   // *word* marks the highlighted phrase
const QUESTIONS = (data.questions && data.questions.length ? data.questions : []).map(q => [emph(q.text), q.key]);
const TAX = data.taxonomy, AREAS = ['comm', 'mh', 'ip', 'meth', 'cs'];
const subArea = {}; for (const a of AREAS) for (const s in TAX[a].subs) subArea[s] = a;
const colOf = s => TAX[subArea[s]].col;
const yr = p => p.year === 'in press' ? 2026.5 : +p.year;
const N = data.nodes.map(p => ({ ...p, y: yr(p), s1: p.subs[0], s2: p.subs[1] || null }));
const byKey = Object.fromEntries(N.map(p => [p.key, p]));
const linkUrl = p => p.doi ? 'https://doi.org/' + p.doi : p.preprint || p.url || ('publications.html#' + p.key);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- geometry ----------
const W = 760, H = 700, cx = 380, cy = 350, R = 206;
const AGAP = 0.12, SGAP = 0.03, FLOOR = 9;
const subs = AREAS.flatMap(a => Object.keys(TAX[a].subs));
const cnt = Object.fromEntries(subs.map(s => [s, N.filter(p => p.s1 === s).length]));
const cntAny = Object.fromEntries(subs.map(s => [s, N.filter(p => p.subs.includes(s)).length]));
const weight = s => cnt[s] + FLOOR;
const totalW = subs.reduce((t, s) => t + weight(s), 0), free = 2 * Math.PI - AGAP * AREAS.length - SGAP * AREAS.length;
const arc = {}, areaArc = {}; let a0 = -Math.PI / 2 - 0.35;
for (const a of AREAS) { const ss = Object.keys(TAX[a].subs); const start = a0;
  ss.forEach((s, i) => { const span = free * weight(s) / totalW; arc[s] = [a0, a0 + span]; a0 += span + (i < ss.length - 1 ? SGAP : 0); });
  areaArc[a] = [start, a0]; a0 += AGAP; }
const P = (r, t) => [cx + r * Math.cos(t), cy + r * Math.sin(t)];
const arcPath = (r, s, e, rev) => { const [x0, y0] = P(r, rev ? e : s), [x1, y1] = P(r, rev ? s : e); return `M${x0},${y0} A${r},${r} 0 ${e - s > Math.PI ? 1 : 0} ${rev ? 0 : 1} ${x1},${y1}`; };
const NS = 'http://www.w3.org/2000/svg';
const S = (tag, at, parent) => { const el = document.createElementNS(NS, tag); for (const k in at) el.setAttribute(k, at[k]); if (parent) parent.appendChild(el); return el; };
const svg = S('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Map of lab publications by research area' });
const gDefs = S('defs', {}, svg), gArcs = S('g', {}, svg), gChords = S('g', {}, svg), gDots = S('g', {}, svg), gLabels = S('g', {}, svg);

// positions: dots inside the arc, ordered by year within each sub-arc
const pos = {};
for (const s of subs) { const ps = N.filter(p => p.s1 === s).sort((a, b) => a.y - b.y || a.key.localeCompare(b.key)); const [st, en] = arc[s];
  ps.forEach((p, i) => { pos[p.key] = st + (en - st) * (i + 0.5) / ps.length; }); }
// chord targets: spread incoming chords along each target sub-arc
const links = N.flatMap(p => p.subs.slice(1).map(s2 => ({ p, s1: p.s1, s2, id: p.key + '-' + s2 })));
const incoming = {}; for (const l of links) (incoming[l.s2] = incoming[l.s2] || []).push(l);
const tgt = {};
for (const s in incoming) { const ls = incoming[s].sort((a, b) => pos[a.p.key] - pos[b.p.key]); const [st, en] = arc[s], pad = (en - st) * 0.12;
  ls.forEach((l, i) => { tgt[l.id] = st + pad + (en - st - 2 * pad) * (ls.length === 1 ? 0.5 : i / (ls.length - 1)); }); }

// arcs and labels
for (const a of AREAS) {
  const ss = Object.keys(TAX[a].subs);
  ss.forEach((s, i) => {
    const [st, en] = arc[s];
    S('path', { d: arcPath(R, st, en), stroke: TAX[a].col, 'stroke-width': 9, fill: 'none', opacity: i ? 0.55 : 1, 'stroke-linecap': 'butt' }, gArcs);
    const mid = (st + en) / 2, bottom = Math.sin(mid) > 0.15;   // labels along the arc; flipped on the lower half so they read left to right
    const id = 'sp-' + s; S('path', { id, d: arcPath(bottom ? R + 32 : R + 22, st - 0.3, en + 0.3, bottom), fill: 'none' }, gDefs);
    const t = S('text', { class: 'sub-label', 'data-sub': s }, gLabels); const tp = S('textPath', { href: '#' + id, startOffset: '50%', 'text-anchor': 'middle' }, t); tp.textContent = TAX[a].subs[s];
    S('path', { class: 'hit', d: arcPath(R + 26, st, en), stroke: 'transparent', 'stroke-width': 30, fill: 'none', 'data-sub': s }, gLabels);
  });
  const [st, en] = areaArc[a], mid = (st + en) / 2, c = Math.cos(mid); let [lx, ly] = P(R + 64, mid);
  const anchor = c > 0.35 ? 'start' : c < -0.35 ? 'end' : 'middle', tw = TAX[a].name.length * 7.4;   // keep the label inside the drawing box
  if (anchor === 'start') lx = Math.min(lx, W - tw - 4); if (anchor === 'end') lx = Math.max(lx, tw + 4); if (anchor === 'middle') lx = Math.min(W - tw / 2 - 4, Math.max(tw / 2 + 4, lx));
  const t = S('text', { class: 'area-label', x: lx, y: ly + 4, fill: TAX[a].col, 'text-anchor': anchor }, gLabels); t.textContent = TAX[a].name;
}
// chords with a colour gradient from the main area to the linked area
for (const l of links) { const p = l.p, [x1, y1] = P(R - 16, pos[p.key]), [x2, y2] = P(R - 8, tgt[l.id]);
  const gid = 'g-' + l.id, g = S('linearGradient', { id: gid, gradientUnits: 'userSpaceOnUse', x1, y1, x2, y2 }, gDefs);
  S('stop', { offset: '0', 'stop-color': colOf(l.s1) }, g); S('stop', { offset: '1', 'stop-color': colOf(l.s2) }, g);
  const bend = subArea[l.s1] === subArea[l.s2] ? 0.62 : 0.12;   // same-area chords stay near the rim
  const [mx, my] = P(R * bend, (pos[p.key] + tgt[l.id]) / 2 + (Math.abs(pos[p.key] - tgt[l.id]) > Math.PI ? Math.PI : 0));
  S('path', { class: 'chord', d: `M${x1},${y1} Q${mx},${my} ${x2},${y2}`, stroke: `url(#${gid})`, 'data-key': p.key, 'data-subs': l.s1 + ' ' + l.s2 }, gChords);
}
// dots: solid, coloured by main area; outlined when led by the lab
for (const p of N) { const [x, y] = P(R - 16, pos[p.key]), r = 6, g = S('g', { class: 'dot', 'data-key': p.key, 'data-subs': p.subs.join(' ') }, gDots);
  S('circle', { class: 'halo', cx: x, cy: y, r: 13, fill: colOf(p.s1), opacity: 0 }, g);
  S('circle', { cx: x, cy: y, r, fill: colOf(p.s1) }, g);
  if (p.primary) S('circle', { cx: x, cy: y, r: r + 1.6, fill: 'none', stroke: '#1c1a17', 'stroke-width': 1.4 }, g);
}
const tip = document.getElementById('tip'), stip = document.getElementById('stip'); ring.insertBefore(svg, tip);
function showSubTip(sub) {   // horizontal card in the corner of the box nearest the sub-arc, clear of the circle
  const a = subArea[sub];
  const n = cntAny[sub], main = cnt[sub];
  stip.innerHTML = `<span class="area" style="color:${TAX[a].col}">${esc(TAX[a].name)}</span><span class="sub">${esc(TAX[a].subs[sub])}</span><span class="desc">${esc(TAX.desc[sub] || '')}</span><span class="n">${n} paper${n === 1 ? '' : 's'}${n > main ? ` (${main} as main area)` : ''}</span>`;
  stip.style.borderTopColor = TAX[a].col;
  stip.style.opacity = 1;
}
const dotXY = Object.fromEntries(N.map(p => [p.key, P(R - 16, pos[p.key])]));
const gFlag = S('g', { class: 'flag' }, svg);
const flagC = S('circle', { r: 12, stroke: '#faf7f2', 'stroke-width': 2 }, gFlag);
const flagT = S('text', { 'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: '#fff', style: 'font-family: Fraunces, serif; font-weight: 600; font-size: 12.5px' }, gFlag);
function drawFlag() {   // the current question's dot grows into a numbered badge
  const p = byKey[hoverKey], on = p && !hovDot && !hovSub;
  gFlag.style.display = on ? '' : 'none'; if (!on) return;
  const [bx, by] = dotXY[p.key];
  flagC.setAttribute('cx', bx); flagC.setAttribute('cy', by); flagC.setAttribute('fill', colOf(p.s1));
  flagT.setAttribute('x', bx); flagT.setAttribute('y', by + 0.5); flagT.textContent = qNum;
}



// ---------- interaction ----------
let hoverKey = null, hovDot = null, hovSub = null;   // question paper, hovered paper, hovered subarea
const hotEls = [...svg.querySelectorAll('.chord, .dot')].map(el => ({ el, key: el.dataset.key, subs: el.dataset.subs.split(' ') }));
const subEls = [...svg.querySelectorAll('.sub-label')];
let lastState = '';
function render() {   // an active hover always wins; the question highlight only applies when nothing is hovered
  const state = `${hovDot}|${hovSub}|${hoverKey}|${qNum}`; if (state === lastState) return; lastState = state;
  const k = hovDot || (hovSub ? null : hoverKey), sub = hovSub;
  svg.classList.toggle('dim', !!(hovDot || hovSub));
  svg.classList.toggle('soft', !hovDot && !hovSub && !!hoverKey);
  for (const h of hotEls) h.el.classList.toggle('hot', h.key === k || (sub !== null && h.subs.includes(sub)));
  for (const el of subEls) el.classList.toggle('hot', el.dataset.sub === sub);
  drawFlag();
}

function showTip(p) {   // paper card in the top-left corner, like the subarea card, so it never covers the ring
  if (tip.dataset.key === p.key) return; tip.dataset.key = p.key;
  const col = colOf(p.s1);
  tip.innerHTML = `<span class="area" style="color:${col}">${esc(TAX[subArea[p.s1]].subs[p.s1])}</span><span class="title">${esc(p.title)}</span><span class="meta">${esc(p.venue)} · ${esc(p.year)}${p.primary ? ' · led by our lab' : ''}</span><span class="go">Click to read ${p.doi ? 'at the publisher' : p.preprint ? 'the preprint' : 'the paper'} ↗</span>`;
  tip.style.borderTopColor = col; tip.style.opacity = 1;
}

function nearestDot(ev) {   // nearest dot to the pointer, within 16 screen pixels; the browser's own screen matrix handles letterboxing, zoom, and any transform
  const m = svg.getScreenCTM(); if (!m) return null;
  const pt = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse()), px = pt.x, py = pt.y;
  let best = null, bd = 16 / m.a;
  for (const key in dotXY) { const [x, y] = dotXY[key], d = Math.hypot(x - px, y - py); if (d < bd) { bd = d; best = key; } }
  return best;
}

svg.addEventListener('pointermove', ev => {   // sticky hover: a dot or area stays highlighted until another is reached or the pointer leaves the ring
  const k = nearestDot(ev), h = ev.target.closest('.hit');
  if (k) { showTip(byKey[k]); stip.style.opacity = 0; hovDot = k; hovSub = null; svg.style.cursor = 'pointer'; }
  else if (h) { tip.style.opacity = 0; tip.dataset.key = ''; if (hovSub !== h.dataset.sub) showSubTip(h.dataset.sub); hovDot = null; hovSub = h.dataset.sub; svg.style.cursor = 'default'; }
  else { svg.style.cursor = 'default'; }   // between targets the last hover stays; only leaving the ring hands focus back to the example question
  render();
});
svg.addEventListener('pointerenter', () => stop());   // the example questions hold still while the pointer is over the ring
svg.addEventListener('pointerleave', () => { tip.style.opacity = 0; tip.dataset.key = ''; stip.style.opacity = 0; hovDot = null; hovSub = null; render(); start(); });
svg.addEventListener('click', ev => { const k = nearestDot(ev); if (k) window.open(linkUrl(byKey[k]), '_blank', 'noopener'); });

// ---------- rotating questions ----------
const qwrap = document.getElementById('qwrap'), asked = document.getElementById('asked');
const qel = document.createElement('div'); qel.className = 'q'; qwrap.appendChild(qel);
let qi = 0, timer = null, swap = null, qNum = 1;
function showQ(i) {
  const [html, key] = QUESTIONS[i], p = byKey[key], col = p ? colOf(p.s1) : '#1c1a17';
  clearTimeout(swap); qel.classList.remove('show');
  swap = setTimeout(() => { qel.style.setProperty('--q-col', col); qel.innerHTML = '<span>' + html + '</span>'; qel.classList.add('show'); }, 380);
  asked.innerHTML = p ? `<span class="dot" style="background:${col}"></span>Asked in <a href="${esc(linkUrl(p))}" target="_blank" rel="noopener">${esc(p.title)}</a> (${esc(p.venue)}, ${esc(p.year)})` : '';
  document.getElementById('qn').innerHTML = 'Example<br>question'; const bd = document.getElementById('qbadge'); bd.textContent = i + 1; bd.style.background = col; qNum = i + 1;
  hoverKey = key; render();
}
const go = d => { qi = (qi + d + QUESTIONS.length) % QUESTIONS.length; showQ(qi); };
let auto = !reduced && QUESTIONS.length > 1;
const start = () => { if (auto && !timer) timer = setInterval(() => go(1), 6000); }, stop = () => { clearInterval(timer); timer = null; };
document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());   // no work while the tab is hidden
document.getElementById('next').onclick = () => { go(1); auto = false; stop(); };
document.getElementById('prev').onclick = () => { go(-1); auto = false; stop(); };
start();
if (QUESTIONS.length) showQ(0);
})();
