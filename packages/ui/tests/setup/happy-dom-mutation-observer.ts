// happy-dom 20 registers each MutationObserver on the observed node through a
// WeakRef to an arrow function that nothing else references, so a garbage
// collection between observe() and the next mutation silently stops delivery
// (MutationObserverListener.js: `callback: new WeakRef((record) => this.report(record))`).
// Browsers keep observers alive while their targets are, and ProjectionController
// relies on that. Pin the callback for as long as the listener is registered.
const proto = globalThis.Node?.prototype as unknown as Record<symbol, unknown> | undefined;
const observeSymbol = proto && Object.getOwnPropertySymbols(proto).find(s => s.description === 'observeMutations');

if (proto && observeSymbol && typeof proto[observeSymbol] === 'function') {
  const original = proto[observeSymbol] as (this: Node, listener: { callback?: WeakRef<object>; pinned?: object }) => void;
  proto[observeSymbol] = function (this: Node, listener) {
    if (listener && !listener.pinned) listener.pinned = listener.callback?.deref();
    return original.call(this, listener);
  };
}
