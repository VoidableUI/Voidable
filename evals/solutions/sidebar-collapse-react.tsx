import { useState } from 'react';
import type {} from '@voidable/ui/types/react';

const ICONS: Record<string, string> = {
  Inbox: 'M3 12h5l2 3h4l2-3h5M5 5h14l2 7v7H3v-7z',
  Drafts: 'M4 20h4L19 9l-4-4L4 16z',
  Sent: 'M3 11l18-8-8 18-2-8z',
  Archive: 'M3 4h18v4H3zM5 8v12h14V8M10 12h4',
};
const LINKS = ['Inbox', 'Drafts', 'Sent', 'Archive'];

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <void-sidebar collapsed={collapsed} aria-label="Mail">
        <div style={{ display: 'grid', gap: 'var(--void-space-1)', padding: 'var(--void-space-2)' }}>
          <void-button size="sm" aria-expanded={!collapsed} onvoid-click={() => setCollapsed((c) => !c)}>
            {collapsed ? '»' : '«'}
            <span style={collapsed ? hidden : undefined}>{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
          </void-button>
          {LINKS.map((name) => (
            <a
              key={name}
              href={`/${name.toLowerCase()}`}
              aria-current={name === 'Inbox' ? 'page' : undefined}
              style={{ display: 'flex', gap: 'var(--void-space-2)', alignItems: 'center', padding: 'var(--void-space-2)', color: 'inherit', textDecoration: 'none' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d={ICONS[name]} />
              </svg>
              <span style={collapsed ? hidden : undefined}>{name}</span>
            </a>
          ))}
        </div>
      </void-sidebar>
      <main style={{ flex: 1, minWidth: 0, padding: 'var(--void-space-4)' }}>
        <h1>Inbox</h1>
        <p>No new messages.</p>
      </main>
    </div>
  );
}

// Visually hidden but still read by screen readers.
const hidden = { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' } as const;
