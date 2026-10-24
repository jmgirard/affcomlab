// Check rendered reveal.js decks for content that runs past the slide edges.
// Runs as a Quarto post-render step (only the decks that render just built) or by hand:
//   node scripts/check_slides.mjs [deck.html ...]   (no arguments: every deck under docs/)
// Needs Google Chrome or Chromium; set CHROME to its path if it is somewhere else.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const TOLERANCE = 8; // px past the edge to ignore, e.g. the empty space under an image
const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, 'docs');

const isDeck = f => f.endsWith('.html') && readFileSync(f, 'utf8').includes('class="reveal"');
const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? (e.name === 'site_libs' ? [] : walk(join(d, e.name))) : [join(d, e.name)]);

let decks;
if (process.argv.length > 2) decks = process.argv.slice(2).map(f => resolve(f));
else if (process.env.QUARTO_PROJECT_OUTPUT_FILES) decks = process.env.QUARTO_PROJECT_OUTPUT_FILES.split('\n').filter(Boolean).map(f => resolve(ROOT, f));
else decks = walk(OUT);
decks = decks.filter(f => existsSync(f) && isDeck(f));
if (!decks.length) process.exit(0);

// Runs inside each deck: show every fragment, load every lazy image, then measure each slide.
const CHECK = `(async () => {
  await new Promise(r => Reveal.isReady() ? r() : Reveal.on('ready', r));
  const imgs = [...document.querySelectorAll('.reveal img')];
  imgs.forEach(i => { if (i.dataset.src && !i.getAttribute('src')) i.src = i.dataset.src; });
  await Promise.all(imgs.map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
  await document.fonts.ready;
  if (window.MathJax?.Hub) await new Promise(r => MathJax.Hub.Queue(r));
  if (window.MathJax?.startup) await MathJax.startup.promise;
  const { width: W, height: H } = Reveal.getConfig();
  const clips = e => { for (let p = e; p && !p.matches('section'); p = p.parentElement) {
    const cs = getComputedStyle(p);
    if (p !== e && cs.overflow !== 'visible' || cs.clip !== 'auto' || cs.visibility === 'hidden') return true;
  } return false; };
  // Measure what is visible (text, images, plots, code blocks), not container boxes and their padding.
  const visible = s => {
    const rects = [], walker = document.createTreeWalker(s, NodeFilter.SHOW_TEXT);
    for (let n; (n = walker.nextNode());) {
      if (!n.textContent.trim() || clips(n.parentElement)) continue;
      const range = document.createRange(); range.selectNodeContents(n);
      rects.push(...range.getClientRects());
    }
    for (const e of s.querySelectorAll('*'))
      if ((e.matches('img, svg, video, canvas, iframe, pre') || getComputedStyle(e).overflow !== 'visible') && !clips(e))
        rects.push(e.getBoundingClientRect());
    return rects.filter(r => r.width && r.height);
  };
  const out = [];
  for (const s of Reveal.getSlides()) {
    Reveal.slide(...Object.values(Reveal.getIndices(s)));
    s.querySelectorAll('.fragment').forEach(f => f.classList.add('visible'));
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const k = Reveal.getScale(), box = s.getBoundingClientRect();
    let below = 0, right = 0, code = 0;
    for (const r of visible(s)) {
      below = Math.max(below, Math.round((r.bottom - box.top) / k - H));
      right = Math.max(right, Math.round((r.right - box.left) / k - W));
    }
    for (const c of s.querySelectorAll('pre code')) code = Math.max(code, c.scrollWidth - c.clientWidth);
    const found = [];
    if (below > ${TOLERANCE}) found.push(below + 'px past the bottom');
    if (right > ${TOLERANCE}) found.push(right + 'px past the right edge');
    if (code > 1) found.push('code line ' + code + 'px too wide');
    if (found.length) {
      const title = s.querySelector('h1, h2')?.innerText.trim() || '(untitled)';
      out.push('slide ' + (Reveal.getSlides().indexOf(s) + 1) + ' "' + title + '": ' + found.join(', '));
    }
  }
  return out;
})()`;

const chrome = process.env.CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find(existsSync);
if (!chrome) { console.error('check_slides: no Chrome found; set CHROME to its path'); process.exit(1); }

const profile = mkdtempSync(join(tmpdir(), 'check-slides-'));
const proc = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--allow-file-access-from-files', '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });

let wsUrl;
for (let t = 0; t < 100 && !wsUrl; t++) {
  const f = join(profile, 'DevToolsActivePort');
  if (existsSync(f)) { const [port, path] = readFileSync(f, 'utf8').split('\n'); if (path) wsUrl = `ws://127.0.0.1:${port}${path}`; }
  else await new Promise(r => setTimeout(r, 100));
}
if (!wsUrl) { proc.kill(); console.error('check_slides: Chrome did not start'); process.exit(1); }

const ws = new WebSocket(wsUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const pending = new Map();
ws.onmessage = m => { const d = JSON.parse(m.data); if (pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}, sessionId) => new Promise((r, j) => {
  const n = ++id; pending.set(n, d => d.error ? j(new Error(d.error.message)) : r(d.result));
  ws.send(JSON.stringify({ id: n, method, params, sessionId }));
});

let problems = 0;
for (const deck of decks) {
  const name = relative(OUT, deck);
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  try {
    await send('Page.navigate', { url: pathToFileURL(deck).href }, sessionId);
    let ready = false;
    for (let t = 0; t < 100 && !ready; t++) {
      await new Promise(r => setTimeout(r, 100));
      ready = (await send('Runtime.evaluate', { expression: "typeof Reveal !== 'undefined' && document.readyState === 'complete'", returnByValue: true }, sessionId)).result.value;
    }
    if (!ready) throw new Error('reveal.js did not load');
    const res = await send('Runtime.evaluate', { expression: CHECK, awaitPromise: true, returnByValue: true, timeout: 60000 }, sessionId);
    if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
    const found = res.result.value;
    problems += found.length;
    console.log(found.length ? `check_slides: ${name}\n  ${found.join('\n  ')}` : `check_slides: ${name} ok`);
  } catch (e) {
    problems++; console.log(`check_slides: ${name} could not be checked: ${e.message}`);
  } finally {
    await send('Target.closeTarget', { targetId });
  }
}

ws.close();
await new Promise(r => { proc.once('exit', r); proc.kill(); });
rmSync(profile, { recursive: true, force: true });
if (problems) { console.log(`check_slides: ${problems} problem(s) found`); process.exit(1); }
