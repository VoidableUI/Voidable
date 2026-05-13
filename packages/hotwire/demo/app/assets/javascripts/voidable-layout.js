// Password visibility toggle for void-action-input
document.addEventListener('void-action', (e) => {
  const el = e.target;
  if (el.tagName === 'VOID-ACTION-INPUT' && (el.type === 'password' || el.type === 'text')) {
    const visible = el.type === 'text';
    el.type = visible ? 'password' : 'text';
    el.icon = visible ? 'eye' : 'eye-off';
  }
});

// Theme toggle
(function() {
  const html = document.documentElement;

  function applyTheme() {
    if (!localStorage.getItem('theme')) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      html.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      html.setAttribute('data-theme', localStorage.getItem('theme'));
    }
  }

  function syncToggle() {
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.toggleAttribute('checked', html.getAttribute('data-theme') === 'dark');
    }
  }

  applyTheme();
  syncToggle();
  document.addEventListener('turbo:load', syncToggle);

  document.addEventListener('void-change', (e) => {
    if (e.target.id !== 'theme-toggle') return;
    const next = e.detail.checked ? 'dark' : 'light';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });
})();

// Pagination navigation
document.addEventListener('turbo:load', () => {
  document.querySelector('void-pagination')?.addEventListener('void-change', (e) => {
    const url = new URL(window.location);
    url.searchParams.set('page', e.detail.value);
    Turbo.visit(url.toString());
  });
});
