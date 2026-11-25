// The theme builder's behaviour (src/pages/theme/index.astro).
//
// State is one object: knob values (canonical CSS text, as the theme file
// writes them), an optional skin and name, and what is being looked at.
// Every change runs render(), which writes the state to four places: the
// preview frames (custom properties on their :root, exactly as the exported
// CSS will set them), the controls, the outputs, and the URL.
//
// The knob data, the link format, the CSS writer, the description and the
// random theme all come from @voidable/theme (build/knobs.js), so the page,
// the package and the `voidable` skill agree by construction.
import { color, contrast, over, hex } from '../../../packages/theme/build/css-eval.js';
import { builderUrl, describe, fontKey, fontStacks, fromParams, hueName, knobs, parseKnob, rng, slug, surprise, themeCss } from '../../../packages/theme/build/knobs.js';

type Values = Record<string, string>;
type Scheme = 'dark' | 'light';
interface State {
  values: Values;
  skin?: string;
  name: string;
  screen: string;
  device: 'desktop' | 'phone';
  view: Scheme | 'both';
}
interface Frame {
  el: HTMLElement;
  iframe: HTMLIFrameElement;
  scheme: Scheme;
  mirror: boolean;
}

const SCREENS = ['overview', 'table', 'form', 'settings', 'live'];
const DESKTOP = 1280;
const PHONE = { width: 390, height: 844 };

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const num = (v: string) => parseFloat(v);

export function start(): void {
  const data = JSON.parse($('tb-data').textContent!) as { defaults: Values; presets: Record<string, Values> };
  const { defaults, presets } = data;
  const narrow = matchMedia('(max-width: 60rem)');

  // ── State, from the link ──
  const read = fromParams(new URLSearchParams(location.search), defaults, presets);
  const state: State = {
    values: read.values,
    skin: read.skin,
    name: read.name,
    screen: SCREENS.includes(read.view.screen ?? '') ? read.view.screen! : 'overview',
    device: read.view.device === 'phone' ? 'phone' : 'desktop',
    view: read.view.scheme === 'dark' || read.view.scheme === 'light' || read.view.scheme === 'both' ? read.view.scheme : 'both',
  };

  const root = document.documentElement;
  const rail = document.querySelector<HTMLElement>('.tb-rail')!;
  const canvas = $('tb-canvas');
  const framesEl = $('tb-frames');
  const live = $('tb-live');
  let frames: Frame[] = [];
  let split = 50;

  // ── Preview frames ──
  // The first frame is live. A second one mirrors it in the other scheme:
  // it follows the first frame's screen and scroll and takes no input.
  const siteScheme = (): Scheme => (root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
  const effective = () => {
    const isNarrow = narrow.matches;
    const device = isNarrow ? 'phone' : state.device;
    const view = isNarrow && state.view === 'both' ? siteScheme() : state.view;
    return { device, view } as const;
  };

  function applyTo(frame: Frame): void {
    const doc = frame.iframe.contentDocument;
    const el = doc?.documentElement;
    if (!el || !('ready' in el.dataset)) return;
    el.setAttribute('data-theme', frame.scheme);
    if (state.skin) el.setAttribute('data-void-skin', state.skin);
    else el.removeAttribute('data-void-skin');
    for (const k of knobs) el.style.setProperty(k.name, state.values[k.name]);
    el.inert = frame.mirror;
    const win = frame.iframe.contentWindow as (Window & { showScreen?: (id: string) => void }) | null;
    if (el.dataset.screen !== state.screen) win?.showScreen?.(state.screen);
  }

  function makeFrame(scheme: Scheme, mirror: boolean): Frame {
    const el = document.createElement('div');
    el.className = 'tb-frame';
    el.dataset.scheme = scheme;
    if (mirror) el.dataset.mirror = '';
    const iframe = document.createElement('iframe');
    iframe.title = mirror ? `Preview in the ${scheme} scheme (mirrors the first preview)` : `Preview of the application in the ${scheme} scheme`;
    iframe.src = `/theme/preview/?screen=${state.screen}`;
    if (mirror) {
      iframe.tabIndex = -1;
      iframe.setAttribute('aria-hidden', 'true');
    }
    el.append(iframe);
    const frame: Frame = { el, iframe, scheme, mirror };
    iframe.addEventListener('load', () => {
      applyTo(frame);
      if (!mirror) {
        // The mirror follows the live frame's scroll position.
        iframe.contentWindow?.addEventListener('scroll', syncScroll, { passive: true });
      }
    });
    return frame;
  }

  function syncScroll(): void {
    const [first, second] = frames;
    if (!second) return;
    const y = first.iframe.contentWindow?.scrollY ?? 0;
    second.iframe.contentWindow?.scrollTo(0, y);
  }

  let layoutKey = '';
  function layout(): void {
    const { device, view } = effective();
    const schemes: Scheme[] = view === 'both' ? ['dark', 'light'] : [view];
    const key = `${device}|${schemes.join()}`;
    canvas.dataset.device = device;
    canvas.dataset.view = view;
    if (key !== layoutKey) {
      layoutKey = key;
      // Keep frames whose scheme is still shown, so a loaded preview is not reloaded.
      const next = schemes.map((scheme, i) => {
        const kept = frames.find((f) => f.scheme === scheme && f.mirror === i > 0);
        return kept ?? makeFrame(scheme, i > 0);
      });
      frames = next;
      framesEl.replaceChildren(...next.map((f) => f.el));
      const overlay = device === 'desktop' && next.length === 2;
      for (const f of next) {
        f.el.toggleAttribute('data-overlay', overlay && f.mirror);
        f.el.querySelector('.tb-tag')?.remove();
        if (next.length === 2) {
          const tag = document.createElement('span');
          tag.className = 'tb-tag';
          tag.textContent = f.scheme;
          tag.toggleAttribute('data-end', f.mirror);
          f.el.append(tag);
        }
      }
      framesEl.querySelector('.tb-divider')?.remove();
      // before the frames in the document, so the keyboard reaches it before the preview
      if (overlay) framesEl.prepend(divider());
    }
    size();
    for (const f of frames) applyTo(f);
  }

  function size(): void {
    const { device } = effective();
    const cs = getComputedStyle(canvas);
    const w = canvas.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = canvas.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (w <= 0 || h <= 0) return;
    const overlay = frames.some((f) => 'overlay' in f.el.dataset);
    const side = frames.length === 2 && !overlay;
    const gap = side ? parseFloat(getComputedStyle(framesEl).columnGap) || 0 : 0;
    for (const f of frames) {
      let logicalW: number;
      let scale: number;
      let logicalH: number;
      if (device === 'desktop') {
        const boxW = side ? (w - gap) / 2 : w;
        logicalW = Math.max(DESKTOP, Math.min(boxW, 1600));
        scale = Math.min(1, boxW / logicalW);
        logicalH = h / scale;
      } else {
        const boxW = side ? Math.min(PHONE.width, (w - gap) / 2) : Math.min(PHONE.width, w);
        logicalW = PHONE.width;
        scale = boxW / logicalW;
        logicalH = Math.min(PHONE.height, h / scale);
      }
      f.iframe.style.width = `${logicalW}px`;
      f.iframe.style.height = `${logicalH}px`;
      f.iframe.style.transform = scale === 1 ? '' : `scale(${scale})`;
      if (!('overlay' in f.el.dataset)) {
        f.el.style.width = `${logicalW * scale}px`;
        f.el.style.height = `${logicalH * scale}px`;
      } else {
        f.el.style.width = '';
        f.el.style.height = '';
      }
    }
  }

  // The divider between the two schemes: a slider, for pointer and keys.
  function divider(): HTMLElement {
    const d = document.createElement('div');
    d.className = 'tb-divider';
    d.tabIndex = 0;
    d.setAttribute('role', 'slider');
    d.setAttribute('aria-label', 'Divider between the dark and the light preview');
    d.setAttribute('aria-orientation', 'horizontal');
    d.setAttribute('aria-valuemin', '5');
    d.setAttribute('aria-valuemax', '95');
    const set = (v: number) => {
      split = Math.min(95, Math.max(5, Math.round(v)));
      framesEl.style.setProperty('--tb-split', `${split}%`);
      d.setAttribute('aria-valuenow', String(split));
      d.setAttribute('aria-valuetext', `${split}% dark, ${100 - split}% light`);
    };
    set(split);
    d.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 10 : 2;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') set(split - step);
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') set(split + step);
      else if (e.key === 'Home') set(5);
      else if (e.key === 'End') set(95);
      else return;
      e.preventDefault();
    });
    d.addEventListener('pointerdown', (e) => {
      d.setPointerCapture(e.pointerId);
      // While dragging, the frames must not swallow the pointer.
      framesEl.style.pointerEvents = 'none';
      const move = (ev: PointerEvent) => {
        const box = framesEl.getBoundingClientRect();
        set(((ev.clientX - box.left) / box.width) * 100);
      };
      const up = () => {
        framesEl.style.pointerEvents = '';
        d.removeEventListener('pointermove', move);
        d.removeEventListener('pointerup', up);
        d.removeEventListener('pointercancel', up);
      };
      d.addEventListener('pointermove', move);
      d.addEventListener('pointerup', up);
      d.addEventListener('pointercancel', up);
    });
    // The divider itself must stay live while its container ignores the pointer.
    d.style.pointerEvents = 'auto';
    return d;
  }

  // ── Readouts beside the knobs ──
  const pct = (v: string) => `${Math.round(num(v) * 100)}%`;
  const format: Record<string, (v: string) => string> = {
    '--void-accent-hue': (v) => (num(state.values['--void-accent-chroma']) === 0 ? 'no colour' : `${num(v)}° ${hueName(num(v))}`),
    '--void-accent-chroma': (v) => (num(v) === 0 ? 'none' : num(v).toFixed(3).replace(/0$/, '')),
    '--void-neutral-hue': (v) => `${num(v)}° ${hueName(num(v))}`,
    '--void-neutral-chroma': (v) => (num(v) === 0 ? 'pure grey' : num(v).toFixed(3)),
    '--void-page-tint': pct,
    '--void-contrast': pct,
    '--void-chrome': pct,
    '--void-radius': (v) => (num(v) >= 100 ? 'pill' : v),
    '--void-density': (v) => `${Math.round(36 * num(v))}px controls`,
    '--void-rhythm': (v) => `${Math.round(72 * num(v))}px sections`,
    '--void-font-size': (v) => `${Math.round(num(v) * 16 * 10) / 10}px`,
    '--void-anim-scale': (v) => (num(v) === 0 ? 'off' : `×${num(v)}`),
  };

  // ── Contrast, from what the browser computed ──
  const probes: Record<Scheme, HTMLElement> = { dark: $('tb-probe-dark'), light: $('tb-probe-light') };
  function measure(): void {
    let failures = 0;
    let count = 0;
    const colours = {} as Record<Scheme, (token: string) => ReturnType<typeof color>>;
    for (const scheme of ['dark', 'light'] as const) {
      const probe = probes[scheme];
      for (const k of knobs) probe.style.setProperty(k.name, state.values[k.name]);
      if (state.skin) probe.setAttribute('data-void-skin', state.skin);
      else probe.removeAttribute('data-void-skin');
      const cs = getComputedStyle(probe);
      // The custom property's computed value has every var() substituted;
      // the evaluator the token export uses does the arithmetic.
      colours[scheme] = (token) => color(cs.getPropertyValue(`--void-color-${token}`).trim());
    }
    for (const li of document.querySelectorAll<HTMLElement>('.tb-pair')) {
      const min = Number(li.dataset.min);
      let fail = false;
      for (const scheme of ['dark', 'light'] as const) {
        const c = colours[scheme];
        const page = c('bg')!;
        const onRaw = c(li.dataset.on!)!;
        const on = onRaw.alpha < 1 ? over(onRaw, page) : onRaw;
        const fg = c(li.dataset.fg!)!;
        const ratio = contrast(fg, on);
        count++;
        if (ratio < min) {
          fail = true;
          failures++;
        }
        li.querySelector<HTMLElement>(`[data-ratio="${scheme}"]`)!.textContent = ratio.toFixed(ratio >= 10 ? 1 : 2);
        li.dataset[scheme] = ratio.toFixed(2);
        const sample = li.querySelector<HTMLElement>(`.tb-sample[data-scheme="${scheme}"]`)!;
        sample.style.setProperty('--tb-on', hex(on));
        sample.style.setProperty('--tb-fg', hex(fg.alpha < 1 ? over(fg, on) : fg));
      }
      li.toggleAttribute('data-fail', fail);
      li.title = `${li.querySelector('.tb-pair-name')!.textContent}: ${li.querySelector('[data-ratio="dark"]')!.textContent}:1 in dark, ${li.querySelector('[data-ratio="light"]')!.textContent}:1 in light; needs ${min}:1`;
    }
    const badge = $('tb-contrast-badge');
    badge.textContent = failures ? `${failures} of ${count} below AA` : `All ${count} pass AA`;
    badge.setAttribute('color', failures ? 'error' : 'success');
    root.dataset.tbContrast = failures ? 'fail' : 'pass';
  }

  // ── Outputs ──
  const currentCss = () =>
    themeCss(state.values, {
      name: state.name,
      skin: state.skin,
      comment: `${state.name ? `${state.name}: a` : 'A'} Voidable theme. Open it in the builder:\n   ${publicUrl()}`,
    });
  const currentUrl = (withView = false) =>
    builderUrl(state.values, defaults, { skin: state.skin, name: state.name, view: withView ? { screen: state.screen === 'overview' ? '' : state.screen } : {} }, `${location.origin}/theme/`);
  const publicUrl = () => builderUrl(state.values, defaults, { skin: state.skin, name: state.name });
  const currentPrompt = () => describe(state.values, defaults, { skin: state.skin, url: publicUrl() });
  const fileStem = () => state.name || 'theme';

  function usage(): string {
    const file = `${fileStem()}.css`;
    const attrs = [state.name ? `data-void-theme="${state.name}"` : '', state.skin ? `data-void-skin="${state.skin}"` : ''].filter(Boolean).join(' ');
    return [`@import '@voidable/theme';`, `@import './${file}';`, '', attrs ? `<html ${attrs}>` : `<html>`].join('\n');
  }

  function activePreset(): string | undefined {
    const same = (a: Values) => knobs.every((k) => (a[k.name] ?? defaults[k.name]) === state.values[k.name]);
    return Object.keys(presets).find((id) => same(presets[id]));
  }

  let urlTimer = 0;
  function render(): void {
    const v = state.values;
    // controls
    for (const slider of document.querySelectorAll<HTMLElement & { value: number }>('void-slider[data-knob]')) {
      const name = slider.dataset.knob!;
      const n = num(v[name]);
      const max = Number(slider.getAttribute('max'));
      slider.value = Math.min(n, max);
      const out = document.querySelector<HTMLOutputElement>(`output[data-out="${name}"]`);
      if (out) out.textContent = format[name]?.(v[name]) ?? v[name];
    }
    const pill = $('tb-pill') as HTMLElement & { checked: boolean };
    pill.checked = num(v['--void-radius']) >= 100;
    document.querySelector<HTMLElement>('void-slider[data-knob="--void-radius"]')!.toggleAttribute('disabled', pill.checked);
    for (const select of document.querySelectorAll<HTMLElement & { value: string }>('void-select[data-font]')) {
      select.value = fontKey(select.dataset.font!, v[select.dataset.font!]) ?? 'custom';
    }
    ($('tb-skin') as HTMLElement & { value: string }).value = state.skin ?? 'none';
    ($('tb-screen') as HTMLElement & { value: string }).value = state.screen;
    ($('tb-device') as HTMLElement & { value: string }).value = state.device;
    ($('tb-view') as HTMLElement & { value: string }).value = effective().view;
    const mono = num(v['--void-accent-chroma']) === 0;
    rail.toggleAttribute('data-mono', mono);
    $('tb-accent-note').textContent = mono ? 'No accent colour: primary actions are the inverse of the page. Raise vividness to add one.' : 'Primary actions, selection and focus.';
    rail.style.setProperty('--tb-accent-hue', v['--void-accent-hue']);
    rail.style.setProperty('--tb-neutral-hue', v['--void-neutral-hue']);
    const preset = activePreset();
    for (const b of document.querySelectorAll<HTMLElement>('[data-preset]')) b.setAttribute('aria-pressed', String(!state.skin && b.dataset.preset === preset));
    for (const b of document.querySelectorAll<HTMLElement>('[data-preset-skin]')) b.setAttribute('aria-pressed', String(state.skin === b.dataset.presetSkin && preset === 'void'));

    // preview and contrast
    layout();
    measure();

    // outputs
    $('tb-css').textContent = currentCss();
    ($('tb-url') as HTMLElement & { value: string }).value = publicUrl();
    $('tb-prompt').textContent = currentPrompt();
    $('tb-usage').textContent = usage();
    $('tb-filename').textContent = `${fileStem()}.css`;
    const nameInput = $('tb-name') as HTMLElement & { value: string };
    if (document.activeElement !== nameInput && !nameInput.contains(document.activeElement)) nameInput.value = state.name;

    // the address bar carries the theme, so a reload or a copied URL keeps it
    clearTimeout(urlTimer);
    urlTimer = window.setTimeout(() => {
      const next = new URL(currentUrl(true));
      const { device, view } = state;
      if (device !== 'desktop') next.searchParams.set('device', device);
      if (view !== 'both') next.searchParams.set('scheme', view);
      history.replaceState(null, '', next.pathname + next.search);
    }, 120);
  }

  const setKnob = (name: string, raw: string | number) => {
    const k = knobs.find((x) => x.name === name)!;
    const parsed = parseKnob(k, String(raw));
    if (parsed === undefined || parsed === state.values[name]) return;
    state.values = { ...state.values, [name]: parsed };
    render();
  };

  // ── Wiring ──
  // Buttons are listened to with void-click, which void-button dispatches for a
  // pointer click and for Enter or Space alike.
  for (const slider of document.querySelectorAll<HTMLElement>('void-slider[data-knob]')) {
    const on = (e: Event) => setKnob(slider.dataset.knob!, (e as CustomEvent<{ value: number }>).detail.value);
    slider.addEventListener('void-input', on);
    slider.addEventListener('void-change', on);
  }
  let lastRadius = '8px';
  $('tb-pill').addEventListener('void-change', (e) => {
    const on = (e as CustomEvent<{ checked: boolean }>).detail.checked;
    if (on) {
      if (num(state.values['--void-radius']) < 100) lastRadius = state.values['--void-radius'];
      setKnob('--void-radius', '999px');
    } else setKnob('--void-radius', lastRadius);
  });
  for (const select of document.querySelectorAll<HTMLElement>('void-select[data-font]')) {
    select.addEventListener('void-change', (e) => {
      const key = (e as CustomEvent<{ value: string }>).detail.value;
      const stack = (fontStacks as Record<string, Record<string, { css: string }>>)[select.dataset.font!][key];
      if (stack) setKnob(select.dataset.font!, stack.css);
    });
  }
  const onSeg = (id: string, apply: (value: string) => void) =>
    $(id).addEventListener('void-change', (e) => {
      apply((e as CustomEvent<{ value: string }>).detail.value);
      render();
    });
  onSeg('tb-skin', (v) => (state.skin = v === 'none' ? undefined : v));
  onSeg('tb-screen', (v) => (state.screen = v));
  onSeg('tb-device', (v) => (state.device = v === 'phone' ? 'phone' : 'desktop'));
  onSeg('tb-view', (v) => (state.view = v as State['view']));

  for (const b of document.querySelectorAll<HTMLElement>('[data-preset]')) {
    b.addEventListener('void-click', () => {
      state.values = { ...defaults, ...presets[b.dataset.preset!] };
      state.skin = undefined;
      render();
      say(`${b.textContent!.trim()} applied`);
    });
  }
  for (const b of document.querySelectorAll<HTMLElement>('[data-preset-skin]')) {
    b.addEventListener('void-click', () => {
      state.values = { ...defaults };
      state.skin = b.dataset.presetSkin;
      render();
      say(`${b.textContent!.trim()} applied`);
    });
  }
  $('tb-reset').addEventListener('void-click', () => {
    state.values = { ...defaults };
    state.skin = undefined;
    render();
    say('Reset to the default theme');
  });
  $('tb-surprise').addEventListener('void-click', () => {
    const seed = (Math.random() * 2 ** 32) >>> 0;
    state.values = surprise(defaults, rng(seed));
    render();
    say(`A new theme: ${describe(state.values, defaults).split('.')[0]}.`);
  });

  $('tb-name').addEventListener('void-input', (e) => {
    state.name = slug((e as CustomEvent<{ value: string }>).detail.value);
    render();
  });
  $('tb-name').addEventListener('void-change', () => {
    ($('tb-name') as HTMLElement & { value: string }).value = state.name;
  });

  function say(text: string): void {
    live.textContent = '';
    // a new text node, so the same message is announced twice in a row
    requestAnimationFrame(() => (live.textContent = text));
  }
  async function copy(button: HTMLElement, text: string, what: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // No clipboard permission (an insecure origin, an embedded frame): fall back to a selection.
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('aria-hidden', 'true');
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.append(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    const label = button.querySelector<HTMLElement>('[data-label]');
    if (label) {
      const before = label.dataset.before ?? label.textContent!;
      label.dataset.before = before;
      label.textContent = 'Copied';
      window.setTimeout(() => (label.textContent = before), 1600);
    }
    say(`${what} copied`);
  }
  function download(name: string, text: string, type: string): void {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    say(`${name} downloaded`);
  }
  for (const id of ['tb-copy-css', 'tb-copy-css-2']) $(id).addEventListener('void-click', () => copy($(id), currentCss(), 'Theme CSS'));
  for (const id of ['tb-copy-link', 'tb-copy-link-2']) $(id).addEventListener('void-click', () => copy($(id), publicUrl(), 'Link'));
  $('tb-copy-prompt').addEventListener('void-click', () => copy($('tb-copy-prompt'), currentPrompt(), 'Prompt'));
  $('tb-download-css').addEventListener('void-click', () => download(`${fileStem()}.css`, currentCss(), 'text/css'));

  // Token export: loaded on demand, so the page does not carry the
  // theme's source and the exporter until someone asks for them.
  const dtcg = async (what: 'knobs' | Scheme) => {
    const { exportDtcg } = await import('./theme-export');
    const json = exportDtcg(what, state.values, { skin: state.skin, name: state.name, url: publicUrl() });
    download(`${fileStem()}${what === 'knobs' ? '.knobs' : `.${what}`}.tokens.json`, json, 'application/json');
  };
  $('tb-dtcg-knobs').addEventListener('void-click', () => dtcg('knobs'));
  $('tb-dtcg-dark').addEventListener('void-click', () => dtcg('dark'));
  $('tb-dtcg-light').addEventListener('void-click', () => dtcg('light'));

  // The site's own scheme.
  $('tb-scheme').addEventListener('void-click', () => {
    const next = siteScheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try {
      localStorage.setItem('voidable-scheme', next);
    } catch {
      /* private mode */
    }
    render();
  });

  // The preview's own navigation switches screens too.
  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin) return;
    if (e.data?.type === 'void-preview-ready') for (const f of frames) applyTo(f);
    if (e.data?.type === 'void-preview-screen' && SCREENS.includes(e.data.screen) && e.data.screen !== state.screen) {
      state.screen = e.data.screen;
      render();
    }
  });

  new ResizeObserver(() => size()).observe(canvas);
  narrow.addEventListener('change', () => render());

  // The controls are custom elements: wait for them, then draw once.
  Promise.all(['void-slider', 'void-segmented-control', 'void-select', 'void-switch', 'void-input'].map((t) => customElements.whenDefined(t))).then(() => {
    render();
    root.dataset.tbReady = '';
  });
}
