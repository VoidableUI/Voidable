// Password visibility toggle for void-action-input
document.addEventListener('void-action', (e) => {
  const el = e.target;
  if (el.tagName === 'VOID-ACTION-INPUT' && (el.type === 'password' || el.type === 'text')) {
    const visible = el.type === 'text';
    el.type = visible ? 'password' : 'text';
    el.icon = visible ? 'eye' : 'eye-off';
  }
});

// Pagination navigation — translate void-pagination click into URL navigation
document.addEventListener('void-change', (e) => {
  if (e.target.tagName !== 'VOID-PAGINATION') return;
  const url = new URL(window.location.href);
  url.searchParams.set('page', e.detail.value);
  if (window.Turbo) {
    window.Turbo.visit(url.toString());
  } else {
    window.location.href = url.toString();
  }
});

// Dialog open/close triggers via data attributes — replaces inline onclick
// handlers in templates. Usage:
//   <button data-open-dialog="my-dialog">Open</button>
//   <button data-close-dialog="my-dialog">Close</button>
document.addEventListener('click', (e) => {
  const opener = e.target.closest('[data-open-dialog]');
  if (opener) {
    const target = document.getElementById(opener.getAttribute('data-open-dialog'));
    if (target) target.open = true;
    return;
  }
  const closer = e.target.closest('[data-close-dialog]');
  if (closer) {
    const target = document.getElementById(closer.getAttribute('data-close-dialog'));
    if (target) target.open = false;
  }
});

// Clickable table rows — navigate to data-href on click. Remember the
// current URL keyed by the destination so closing the resource modal can
// return to the exact page (with pagination/filters intact) instead of
// the parent index path.
document.addEventListener('click', (e) => {
  const row = e.target.closest('tr.row-clickable');
  if (!row) return;
  const href = row.dataset.href;
  if (!href) return;
  sessionStorage.setItem('voidable:return:' + href, window.location.href);
  if (window.Turbo) {
    window.Turbo.visit(href);
  } else {
    window.location.href = href;
  }
});

// Dialog close → if the user came from a row click, navigate back to
// their saved index URL (Turbo restores the cached snapshot, preserving
// pagination/scroll). On direct URL nav (no saved return), fall back to
// the dialog's data-close-href.
document.addEventListener('void-close', (e) => {
  if (e.target.tagName !== 'VOID-DIALOG') return;
  const href = e.target.getAttribute('data-close-href');
  if (!href) return;
  const target = sessionStorage.getItem('voidable:return:' + window.location.pathname) || href;
  if (window.Turbo) {
    window.Turbo.visit(target);
  } else {
    window.location.href = target;
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
