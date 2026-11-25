// happy-dom 20 registers each MutationObserver on the observed node through a
// WeakRef to an arrow function that nothing else references, so a garbage
// collection between observe() and the next mutation silently stops delivery
// (MutationObserverListener.js: `callback: new WeakRef((record) => this.report(record))`).
// Browsers keep observers alive while their targets are, and ProjectionController
// relies on that. Pin the callback for as long as the listener is registered.
//
// This patches a happy-dom internal. If an upgrade renames or removes it, fail
// loudly instead of silently running the suite with flaky observers: check whether
// the upstream bug is fixed and drop this file, or update the symbol name.
const proto = globalThis.Node?.prototype as unknown as Record<symbol, unknown> | undefined;
const observeSymbol = proto && Object.getOwnPropertySymbols(proto).find(s => s.description === 'observeMutations');

if (!proto || !observeSymbol || typeof proto[observeSymbol] !== 'function') {
  throw new Error(
    'tests/setup/happy-dom-mutation-observer.ts: happy-dom no longer exposes Node.prototype[observeMutations]; ' +
      'the MutationObserver GC workaround cannot be applied. Re-check the happy-dom MutationObserver ' +
      'implementation and update or remove this setup file.'
  );
}

const original = proto[observeSymbol] as (this: Node, listener: { callback?: WeakRef<object>; pinned?: object }) => void;
proto[observeSymbol] = function (this: Node, listener: { callback?: WeakRef<object>; pinned?: object }) {
  if (listener && !listener.pinned) listener.pinned = listener.callback?.deref();
  return original.call(this, listener);
};
