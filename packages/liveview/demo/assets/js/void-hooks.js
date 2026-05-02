// VoidEvent hook — bridges CustomEvents from Voidable web components to LiveView pushEvent
export const VoidHooks = {
  VoidEvent: {
    mounted() {
      this._bindings = [];
      const events = (this.el.dataset.voidEvents || "").split(",").filter(Boolean);
      events.forEach(eventName => {
        const handler = (e) => {
          this.pushEvent(eventName, e.detail || {});
        };
        this.el.addEventListener(eventName, handler);
        this._bindings.push({ eventName, handler });
      });
    },
    updated() {
      // Rebind if data-void-events changed
      this.destroyed();
      this.mounted();
    },
    destroyed() {
      (this._bindings || []).forEach(({ eventName, handler }) => {
        this.el.removeEventListener(eventName, handler);
      });
      this._bindings = [];
    }
  }
};

// VoidDOM — preserves client-managed attributes during LiveView DOM patching
export const VoidDOM = {
  onBeforeElUpdated(from, to) {
    if (!from.tagName.startsWith("VOID-")) return;
    const preserveAttrs = [
      "aria-expanded", "aria-selected", "aria-checked", "aria-hidden",
      "open", "active", "checked", "selected"
    ];
    preserveAttrs.forEach(attr => {
      if (from.hasAttribute(attr) && !to.hasAttribute(attr)) {
        to.setAttribute(attr, from.getAttribute(attr));
      }
    });
  }
};
