import { useState } from 'react';
import type {} from '@voidable/ui/types/react';

const initial = ['Ada Lovelace', 'Grace Hopper', 'Alan Turing', 'Katherine Johnson', 'Linus Torvalds'];
const initials = (n: string) => n.split(' ').map((w) => w[0]).join('');

export default function App() {
  const [members, setMembers] = useState(initial);
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const confirm = () => {
    if (!pending) return;
    setMembers((ms) => ms.filter((m) => m !== pending));
    setNotice(`${pending} was removed`);
    setPending(null);
  };

  return (
    <main style={{ maxWidth: '36rem', margin: '0 auto', padding: 'var(--void-space-4)', display: 'grid', gap: 'var(--void-space-4)' }}>
      <h1>Team members</h1>
      {notice && <void-alert color="success"><void-alert-description>{notice}</void-alert-description></void-alert>}
      <void-list dividers>
        {members.map((m) => (
          <void-list-item key={m}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--void-space-3)' }}>
              <void-avatar initials={initials(m)} alt={m} size="sm"></void-avatar>
              <span style={{ flex: 1 }}>{m}</span>
              <void-button size="sm" color="error" aria-label={`Remove ${m}`} onvoid-click={() => setPending(m)}>
                Remove
              </void-button>
            </div>
          </void-list-item>
        ))}
      </void-list>
      <void-dialog open={pending !== null} size="sm" onvoid-close={() => setPending(null)}>
        <void-dialog-title>{pending ? `Remove ${pending} from the team?` : ''}</void-dialog-title>
        <void-dialog-body>
          <p>They lose access to every project of this team.</p>
        </void-dialog-body>
        <void-dialog-actions>
          <void-button onvoid-click={() => setPending(null)}>Cancel</void-button>
          <void-button color="error" variant="filled" onvoid-click={confirm}>
            Remove
          </void-button>
        </void-dialog-actions>
      </void-dialog>
    </main>
  );
}
