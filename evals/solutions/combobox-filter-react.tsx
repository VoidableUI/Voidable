import type {} from '@voidable/ui/types/react';

const team = [
  { id: 'u1', name: 'Ada Lovelace' }, { id: 'u2', name: 'Grace Hopper' }, { id: 'u3', name: 'Alan Turing' },
  { id: 'u4', name: 'Katherine Johnson' }, { id: 'u5', name: 'Linus Torvalds' }, { id: 'u6', name: 'Margaret Hamilton' },
  { id: 'u7', name: 'Dennis Ritchie' }, { id: 'u8', name: 'Barbara Liskov' }, { id: 'u9', name: 'Ken Thompson' },
  { id: 'u10', name: 'Radia Perlman' }, { id: 'u11', name: 'Edsger Dijkstra' }, { id: 'u12', name: 'Frances Allen' },
  { id: 'u13', name: 'Donald Knuth' }, { id: 'u14', name: 'Hedy Lamarr' }, { id: 'u15', name: 'John McCarthy' },
  { id: 'u16', name: 'Sophie Wilson' }, { id: 'u17', name: 'Tim Berners-Lee' }, { id: 'u18', name: 'Adele Goldberg' },
  { id: 'u19', name: 'Vint Cerf' }, { id: 'u20', name: 'Mary Keller' }, { id: 'u21', name: 'Bjarne Stroustrup' },
  { id: 'u22', name: 'Lynn Conway' }, { id: 'u23', name: 'Guido van Rossum' },
];

export default function App() {
  return (
    <main style={{ maxWidth: '32rem', margin: '0 auto', padding: 'var(--void-space-4)' }}>
      <h1>Assign task</h1>
      <form action="/tasks/42/assign" method="post" style={{ display: 'grid', gap: 'var(--void-space-4)' }}>
        <void-field label="Assignee">
          <void-combobox name="assignee" placeholder="Search team members" required>
            {team.map((m) => (
              <void-option key={m.id} value={m.id}>
                {m.name}
              </void-option>
            ))}
          </void-combobox>
        </void-field>
        <div>
          <void-button type="submit" variant="filled">Assign</void-button>
        </div>
      </form>
    </main>
  );
}
