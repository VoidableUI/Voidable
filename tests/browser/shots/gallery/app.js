// SPDX-License-Identifier: MIT
//
// The gallery's behaviour. The data is the JSON in #gallery-data (see
// shots/gallery.mjs). One capture: a grid to browse and zoom. Two captures:
// the changed images by amount of change, each viewable side by side, with an
// overlay slider, and as a highlighted difference.
const data = JSON.parse(document.getElementById('gallery-data').textContent);
const compare = data.mode === 'compare';
const $ = (id) => document.getElementById(id);
const lookName = new Map(data.looks.map((l) => [l.id, l.kind === 'skin' ? `${l.name} skin` : l.name]));
const pageTitle = new Map(data.pages.map((p) => [p.id, p.title]));
const pageGroup = new Map(data.pages.map((p) => [p.id, p.group]));
const groupTitle = { screens: 'Screens', sheet: 'Component sheet and states', overlays: 'Open overlays' };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const percent = (r) => (r >= 0.1 ? `${(r * 100).toFixed(0)}%` : r >= 0.001 ? `${(r * 100).toFixed(1)}%` : '<0.1%');
const label = (it) => `${pageTitle.get(it.page)?.split(':')[0] ?? it.page} · ${lookName.get(it.look)} · ${it.scheme} · ${it.width}px`;
const STATUS = { changed: ['warning', 'changed'], added: ['info', 'new'], removed: ['error', 'removed'], same: ['default', 'unchanged'] };

// ── The page's own colour scheme: follows the system, the button overrides it. ──
const root = document.documentElement;
function setScheme(s) {
  root.dataset.theme = s;
  $('scheme').textContent = s === 'dark' ? 'Light' : 'Dark';
  $('scheme').setAttribute('aria-label', `Switch this page to ${s === 'dark' ? 'light' : 'dark'}`);
  try { localStorage.setItem('void-gallery-scheme', s); } catch {}
}
let saved = null;
try { saved = localStorage.getItem('void-gallery-scheme'); } catch {}
setScheme(saved || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
$('scheme').addEventListener('click', () => setScheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));

// ── Header ──
document.title = data.title;
$('eyebrow').textContent = compare ? `${data.baseLabel} to ${data.headLabel}` : 'Reference pages';
$('title').textContent = data.title;
$('meta').textContent = `${data.summary.total} images · ${data.pages.filter((p) => p.group !== 'stories').length} pages${data.summary.stories ? ` and ${new Set(data.pages.filter((p) => p.group === 'stories')).size} stories` : ''} · ${data.looks.length} looks · ${data.schemes.join(' and ')} · ${data.widths.join(' and ')} px · generated ${data.generated}`;
if (data.fallbackMarkup.length && compare) {
  const n = $('notice');
  n.hidden = false;
  n.textContent = `The ${data.baseLabel} ref has no reference markup for ${data.fallbackMarkup.join(', ')}: those pages show this checkout's markup in the ${data.baseLabel} ref's styles.`;
}
const hasStories = data.summary.stories > 0;
const refItems = data.items.filter((i) => !i.page.startsWith('story:'));
const refCount = (st) => refItems.filter((i) => i.status === st).length;
const fig = (name, value, caption) => `<void-figure><span data-void-type="label">${name}</span><span data-void-type="value">${value}</span><span data-void-type="caption">${caption}</span></void-figure>`;
$('summary').innerHTML = compare
  ? fig('Changed', refCount('changed'), `of ${refItems.length} reference images`) +
    fig('Unchanged', refCount('same'), 'identical in both') +
    fig('New', refCount('added'), `only in ${data.headLabel}`) +
    fig('Removed', refCount('removed'), `only in ${data.baseLabel}`) +
    (hasStories ? fig('Stories changed', data.summary.storiesChanged, `of ${data.summary.stories} (regression only)`) : '')
  : fig('Images', refItems.length, 'full page') + fig('Pages', data.pages.filter((p) => p.group !== 'stories').length, data.pages.map((p) => p.group).filter((g, i, a) => a.indexOf(g) === i).length + ' groups') + fig('Looks', data.looks.length, 'themes and skins') + fig('Widths', data.widths.length, data.widths.join(' and ') + ' px');

// ── Filters ──
const filters = { set: 'screens', page: 'all', look: 'all', scheme: 'all', width: 'all', status: compare ? 'changed' : 'all' };
const select = (id, name, options) =>
  `<void-field label="${name}" class="filter"><void-select id="f-${id}" aria-label="${name}"><select>${options.map(([v, t]) => `<option value="${esc(v)}"${filters[id] === v ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></void-select></void-field>`;
const seg = (id, name, options) =>
  `<void-segmented-control id="f-${id}" value="${filters[id]}" aria-label="${name}" size="sm">${options.map(([v, t]) => `<void-segmented-control-item value="${esc(v)}">${esc(t)}</void-segmented-control-item>`).join('')}</void-segmented-control>`;
$('filters').innerHTML = [
  ...(hasStories ? [seg('set', 'Set', [['screens', 'Reference pages'], ['stories', 'Component stories']])] : []),
  select('page', 'Page', [['all', 'All pages'], ...data.pages.filter((p) => p.group !== 'stories').map((p) => [p.id, p.title])]),
  select('look', 'Look', [['all', 'All themes and skins'], ...data.looks.map((l) => [l.id, lookName.get(l.id)])]),
  seg('scheme', 'Colour scheme', [['all', 'Both'], ...data.schemes.map((s) => [s, s[0].toUpperCase() + s.slice(1)])]),
  seg('width', 'Width', [['all', 'Both'], ...data.widths.map((w) => [String(w), `${w}px`])]),
  ...(compare ? [seg('status', 'Show', [['changed', 'Changed'], ['all', 'All']])] : []),
].join('');
for (const id of Object.keys(filters)) {
  const el = $(`f-${id}`);
  if (el) el.addEventListener('void-change', (e) => { filters[id] = String(e.detail.value); render(); });
}

// ── The grid ──
let shown = [];
const visible = (it) =>
  (filters.set === 'stories') === it.page.startsWith('story:') &&
  (filters.page === 'all' || it.page === filters.page) &&
  (filters.look === 'all' || it.look === filters.look) &&
  (filters.scheme === 'all' || it.scheme === filters.scheme) &&
  (filters.width === 'all' || String(it.width) === filters.width) &&
  (filters.status === 'all' || it.status === 'changed' || it.status === 'added' || it.status === 'removed');

/** A thumbnail: the top of the image, or for a change the area that changed. */
function thumb(it, index) {
  const src = it.status === 'changed' ? it.diff : it.head || it.base;
  let attrs = '';
  let inner = `<img src="${esc(src)}" alt="" loading="lazy" decoding="async">`;
  if (it.status === 'changed' && it.bbox) {
    // The frame shows the area that changed (see fitThumbs), not the top of the page.
    inner = '';
    attrs = ` data-src="${esc(src)}" data-box="${it.bbox.x},${it.bbox.y},${it.bbox.w},${it.bbox.h}" data-size="${it.size.head.join(',')}"`;
  }
  const [tone, text] = STATUS[it.status];
  const ratio = it.status === 'changed' ? percent(it.ratio) : text;
  return `<button class="thumb" type="button" data-i="${index}" aria-label="${esc(label(it))}${it.status === 'same' ? '' : `, ${text}${it.status === 'changed' ? ` ${ratio}` : ''}`}">
    <span class="thumb-image"${attrs}>${inner}</span>
    <span class="thumb-caption"><span>${esc(compare ? label(it) : `${lookName.get(it.look)} · ${it.scheme} · ${it.width}px`)}</span>${compare && it.status !== 'same' ? `<void-badge size="sm" color="${tone}">${ratio}</void-badge>` : ''}</span>
  </button>`;
}

function render() {
  shown = data.items.filter(visible);
  const grid = $('grid');
  let html = '';
  let lastGroup = '';
  shown.forEach((it, i) => {
    // One capture is grouped by page; a comparison is one list, worst first.
    if (!compare && it.page !== lastGroup) {
      lastGroup = it.page;
      html += `<h2>${esc(pageTitle.get(it.page))} <small>${esc(groupTitle[pageGroup.get(it.page)] ?? '')}</small></h2>`;
    }
    html += thumb(it, i);
  });
  grid.innerHTML = html;
  $('none').hidden = shown.length > 0;
  $('grid').hidden = shown.length === 0;
  fitThumbs();
}

/** Crops each changed thumbnail to the box around its change, with some of what surrounds it, to fill its frame. */
function fitThumbs() {
  for (const el of document.querySelectorAll('.thumb-image[data-box]')) {
    const [x, y, w, h] = el.dataset.box.split(',').map(Number);
    const [iw, ih] = el.dataset.size.split(',').map(Number);
    const W = el.clientWidth, H = el.clientHeight;
    if (!W || !H) continue;
    const pad = 32;
    const bx = Math.max(0, x - pad), by = Math.max(0, y - pad);
    const bw = Math.min(iw - bx, w + 2 * pad), bh = Math.min(ih - by, h + 2 * pad);
    const scale = Math.min(W / bw, H / bh, 1.5);
    el.style.backgroundImage = `url("${el.dataset.src}")`;
    el.style.backgroundSize = `${iw * scale}px ${ih * scale}px`;
    el.style.backgroundPosition = `${-bx * scale}px ${-by * scale}px`;
  }
}
addEventListener('resize', fitThumbs);
$('grid').addEventListener('click', (e) => {
  const b = e.target.closest('.thumb');
  if (b) openViewer(Number(b.dataset.i), b);
});

// ── The viewer ──
let current = -1;
let view = 'side';
let opener = null;
const BASE = 'Base';
const HEAD = 'Head';
const views = compare ? [['side', 'Side by side'], ['slider', 'Slider'], ['diff', 'Difference'], ['base', BASE], ['head', HEAD]] : [['fit', 'Fit width'], ['actual', 'Actual size']];

function renderViewer() {
  const it = shown[current];
  $('viewer-title').textContent = label(it);
  const [tone, text] = STATUS[it.status];
  $('viewer-status').innerHTML = compare ? `<void-badge color="${tone}">${text}${it.status === 'changed' ? ` ${percent(it.ratio)}` : ''}</void-badge>` : '';
  $('viewer-count').textContent = `${current + 1} of ${shown.length}`;
  const body = $('viewer-body');
  const naturalWidth = `${it.size?.head?.[0] ?? it.width}px`;
  const img = (src, alt) => `<img src="${esc(src)}" alt="${esc(alt)}">`;
  const style = `--natural-width:${view === 'actual' ? 'none' : `${(it.size?.head?.[0] ?? it.width) * 2}px`}`;
  if (!compare) {
    body.innerHTML = `<div class="single ${view === 'actual' ? 'actual' : ''}" style="${style}">${img(it.head, label(it))}</div>`;
  } else if (it.status === 'added') {
    body.innerHTML = `<div class="single" style="${style}">${img(it.head, `${HEAD}: ${label(it)}`)}</div>`;
  } else if (it.status === 'removed') {
    body.innerHTML = `<div class="single" style="${style}">${img(it.base, `${BASE}: ${label(it)}`)}</div>`;
  } else if (view === 'side') {
    body.innerHTML = `<div class="pane-row" style="${style}"><figure class="pane"><figcaption data-void-type="label">${esc(BASE)}</figcaption>${img(it.base, `${BASE}: ${label(it)}`)}</figure><figure class="pane"><figcaption data-void-type="label">${esc(HEAD)}</figcaption>${img(it.head, `${HEAD}: ${label(it)}`)}</figure></div>`;
  } else if (view === 'slider') {
    body.innerHTML = `<div class="slider-control"><span data-void-type="label">${esc(BASE)}</span><void-slider id="cut" min="0" max="100" value="50" aria-label="Position of the divider: left shows ${esc(BASE)}, right shows ${esc(HEAD)}"></void-slider><span data-void-type="label">${esc(HEAD)}</span></div><div class="slider-stage" id="stage" style="${style}">${img(it.head, `${HEAD}: ${label(it)}`)}<div class="over">${img(it.base, `${BASE}: ${label(it)}`)}</div><div class="rule"></div></div>`;
    const stage = $('stage');
    $('cut').addEventListener('void-input', (e) => stage.style.setProperty('--cut', `${e.detail.value}%`));
    $('cut').addEventListener('void-change', (e) => stage.style.setProperty('--cut', `${e.detail.value}%`));
  } else if (view === 'diff') {
    body.innerHTML = `<div class="single" style="${style}">${img(it.diff, `Difference: ${label(it)}`)}</div>`;
  } else {
    body.innerHTML = `<div class="single" style="${style}">${img(it[view], `${view}: ${label(it)}`)}</div>`;
  }
  body.scrollTop = 0;
  const seg = $('viewer-views');
  seg.hidden = false;
  if (seg.value !== view) seg.value = view;
}

function openViewer(i, from) {
  current = i;
  opener = from || document.activeElement;
  view = compare ? (shown[i].status === 'changed' ? 'side' : 'head') : 'fit';
  const seg = $('viewer-views');
  seg.innerHTML = views.map(([v, t]) => `<void-segmented-control-item value="${esc(v)}">${esc(t)}</void-segmented-control-item>`).join('');
  seg.value = view;
  $('viewer').hidden = false;
  document.body.style.overflow = 'hidden';
  $('main').inert = true;
  renderViewer();
  $('viewer-body').focus();
}
function closeViewer() {
  $('viewer').hidden = true;
  document.body.style.overflow = '';
  $('main').inert = false;
  if (opener?.isConnected) opener.focus();
  else document.querySelector(`.thumb[data-i="${current}"]`)?.focus();
}
const step = (d) => {
  if (current < 0) return;
  current = (current + d + shown.length) % shown.length;
  if (compare) view = shown[current].status === 'changed' ? view : 'head';
  renderViewer();
};
$('viewer-views').addEventListener('void-change', (e) => { view = String(e.detail.value); renderViewer(); });
$('viewer-prev').addEventListener('click', () => step(-1));
$('viewer-next').addEventListener('click', () => step(1));
$('viewer-close').addEventListener('click', closeViewer);
document.addEventListener('keydown', (e) => {
  if ($('viewer').hidden) return;
  const typing = e.target.closest?.('void-slider, void-segmented-control, input, select, void-select');
  if (e.key === 'Escape') { e.preventDefault(); closeViewer(); }
  else if (e.key === 'Tab') {
    // Keep focus in the viewer.
    const f = [...$('viewer').querySelectorAll('button, [tabindex="0"], input, [role="radio"], [role="slider"]')].filter((n) => n.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  } else if (!typing && e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  else if (!typing && e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  else if (!typing && /^[1-9]$/.test(e.key) && views[Number(e.key) - 1]) { view = views[Number(e.key) - 1][0]; renderViewer(); }
});

render();
document.documentElement.dataset.ready = '';
