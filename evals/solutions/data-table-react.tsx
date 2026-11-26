import { useMemo, useState } from 'react';
import type {} from '@voidable/ui/types/react';

type User = { id: number; name: string; email: string; role: string; status: string };

const users: User[] = [
  { id: 1, name: 'Ada Lovelace', email: 'ada@example.com', role: 'Admin', status: 'active' },
  { id: 2, name: 'Grace Hopper', email: 'grace@example.com', role: 'Editor', status: 'active' },
  { id: 3, name: 'Alan Turing', email: 'alan@example.com', role: 'Viewer', status: 'active' },
  { id: 4, name: 'Katherine Johnson', email: 'katherine@example.com', role: 'Admin', status: 'invited' },
  { id: 5, name: 'Linus Torvalds', email: 'linus@example.com', role: 'Editor', status: 'suspended' },
  { id: 6, name: 'Margaret Hamilton', email: 'margaret@example.com', role: 'Viewer', status: 'active' },
  { id: 7, name: 'Dennis Ritchie', email: 'dennis@example.com', role: 'Admin', status: 'active' },
  { id: 8, name: 'Barbara Liskov', email: 'barbara@example.com', role: 'Editor', status: 'invited' },
  { id: 9, name: 'Ken Thompson', email: 'ken@example.com', role: 'Viewer', status: 'active' },
  { id: 10, name: 'Radia Perlman', email: 'radia@example.com', role: 'Admin', status: 'suspended' },
  { id: 11, name: 'Edsger Dijkstra', email: 'edsger@example.com', role: 'Editor', status: 'active' },
  { id: 12, name: 'Frances Allen', email: 'frances@example.com', role: 'Viewer', status: 'invited' },
  { id: 13, name: 'Donald Knuth', email: 'donald@example.com', role: 'Admin', status: 'active' },
  { id: 14, name: 'Hedy Lamarr', email: 'hedy@example.com', role: 'Editor', status: 'active' },
  { id: 15, name: 'John McCarthy', email: 'john@example.com', role: 'Viewer', status: 'suspended' },
  { id: 16, name: 'Sophie Wilson', email: 'sophie@example.com', role: 'Admin', status: 'invited' },
  { id: 17, name: 'Tim Berners-Lee', email: 'tim@example.com', role: 'Editor', status: 'active' },
  { id: 18, name: 'Adele Goldberg', email: 'adele@example.com', role: 'Viewer', status: 'active' },
  { id: 19, name: 'Vint Cerf', email: 'vint@example.com', role: 'Admin', status: 'active' },
  { id: 20, name: 'Mary Keller', email: 'mary@example.com', role: 'Editor', status: 'suspended' },
  { id: 21, name: 'Bjarne Stroustrup', email: 'bjarne@example.com', role: 'Viewer', status: 'active' },
  { id: 22, name: 'Lynn Conway', email: 'lynn@example.com', role: 'Admin', status: 'active' },
  { id: 23, name: 'Guido van Rossum', email: 'guido@example.com', role: 'Editor', status: 'invited' },
];

const STATUS_COLOR: Record<string, 'success' | 'info' | 'error'> = { active: 'success', invited: 'info', suspended: 'error' };
const PAGE = 10;

export default function App() {
  const [rows, setRows] = useState(users);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => rows.filter((u) => u.name.toLowerCase().includes(query.toLowerCase())), [rows, query]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE, current * PAGE);

  return (
    <main style={{ padding: 'var(--void-space-4)', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 'var(--void-space-4)' }}>
      <h1>Users</h1>
      <div style={{ display: 'flex', gap: 'var(--void-space-2)', flexWrap: 'wrap', alignItems: 'end' }}>
        <void-field label="Search users" style={{ flex: '1 1 12rem' }}>
          <void-input
            type="search"
            value={query}
            onvoid-input={(e) => {
              setQuery(e.detail.value);
              setPage(1);
            }}
          ></void-input>
        </void-field>
        <void-button variant="filled">Invite user</void-button>
      </div>
      <void-scroll-area orientation="horizontal">
        <void-table hoverable>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>
                    <void-badge color={STATUS_COLOR[u.status]}>{u.status}</void-badge>
                  </td>
                  <td>
                    <void-dropdown-menu
                      side="bottom" align="end"
                      onvoid-select={(e) => {
                        if (e.detail.item.textContent?.trim() === 'Delete') setRows((rs) => rs.filter((r) => r.id !== u.id));
                      }}
                    >
                      <void-dropdown-menu-trigger><void-button size="sm" aria-label={`Actions for ${u.name}`}>⋯</void-button></void-dropdown-menu-trigger>
                      <void-dropdown-menu-content>
                        <void-dropdown-menu-item>Edit</void-dropdown-menu-item>
                        <void-dropdown-menu-item destructive>Delete</void-dropdown-menu-item>
                      </void-dropdown-menu-content>
                    </void-dropdown-menu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </void-table>
      </void-scroll-area>
      <void-pagination total={pages} value={current} onvoid-change={(e) => setPage(e.detail.value)}></void-pagination>
    </main>
  );
}
