// SPDX-License-Identifier: MIT
//
// Drives a server morph the way each framework does, through the real
// adapter, for specs/morph.spec.ts. Loaded by pages/morph-<engine>.html after
// that engine's scripts.
//
//   turbo     Turbo 8 morphChildren (Idiomorph with Turbo's morph events)
//             with VoidTurbo.start() from @voidable/ui-hotwire.
//   morphdom  morphdom with the callbacks Phoenix LiveView passes it, wired to
//             VoidDOM from @voidable/ui-liveview, as `dom: VoidDOM` does.
//   alpine    Alpine.morph with the hooks Livewire fires around it, wired to
//             registerLivewireHooks() from @voidable/ui-alpine.
(() => {
  const engine = window.Turbo ? 'turbo' : window.morphdom ? 'morphdom' : 'alpine';
  const root = () => document.getElementById('root');
  const container = (html) => {
    const t = document.createElement('div');
    t.id = 'root';
    t.innerHTML = html;
    return t;
  };
  let started = false;
  const livewireHooks = {};
  const fire = (name, payload) => (livewireHooks[name] || []).forEach((f) => f(payload));

  const engines = {
    turbo: {
      start: () => window.VoidTurbo.start(),
      morph: (html) => window.Turbo.morphChildren(root(), container(html)),
    },
    morphdom: {
      // Elements record the server's attributes themselves when they connect.
      start: () => {},
      morph: (html) =>
        window.morphdom(root(), container(html), {
          childrenOnly: true,
          onBeforeElUpdated: (from, to) => {
            window.VoidLV.VoidDOM.onBeforeElUpdated(from, to);
            return true;
          },
        }),
    },
    alpine: {
      start: () => {
        window.Livewire = { hook: (name, f) => (livewireHooks[name] ||= []).push(f) };
        window.VoidAlpine.registerLivewireHooks();
      },
      morph: (html) =>
        window.Alpine.morph(root(), container(html), {
          updating: (el, toEl, childrenOnly, skip) => el.nodeType === 1 && fire('morph.updating', { el, toEl, childrenOnly, skip }),
          updated: (el) => el.nodeType === 1 && fire('morph.updated', { el }),
          removing: (el, skip) => el.nodeType === 1 && fire('morph.removing', { el, skip }),
          removed: (el) => el.nodeType === 1 && fire('morph.removed', { el }),
          adding: (el, skip) => el.nodeType === 1 && fire('morph.adding', { el, skip }),
          added: (el) => el.nodeType === 1 && fire('morph.added', { el }),
          key: (el) => el.id,
          lookahead: false,
        }),
    },
  };

  window.__morph = {
    engine,
    /** First server render: plain HTML, then the adapter starts, as on page load. */
    async render(html) {
      root().innerHTML = html;
      await window.__settle(root());
      if (!started) {
        engines[engine].start();
        started = true;
      }
    },
    /** A server update: morph the root's children to `html`, then let components settle. */
    async morph(html) {
      engines[engine].morph(html);
      await window.__settle(root());
    },
    /** The same markup rendered fresh into #ref, the reference a morph must match. */
    async fresh(html) {
      const ref = document.getElementById('ref');
      ref.innerHTML = html;
      await window.__settle(ref);
    },
  };
})();
