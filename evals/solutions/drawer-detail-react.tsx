import { useEffect, useRef, useState } from 'react';
import type {} from '@voidable/ui/types/react';

type Order = { id: number; customer: string; total: string; status: string; items: string[] };

const orders: Order[] = [
  { id: 1042, customer: 'Grace Hopper', total: '$129.00', status: 'Paid', items: ['Mechanical keyboard', 'USB-C cable'] },
  { id: 1043, customer: 'Alan Turing', total: '$54.50', status: 'Refunded', items: ['Desk lamp'] },
  { id: 1044, customer: 'Ada Lovelace', total: '$310.00', status: 'Pending', items: ['Monitor arm', 'Webcam', 'Headset'] },
];

const COLOR: Record<string, 'success' | 'warning' | 'info'> = { Paid: 'success', Refunded: 'warning', Pending: 'info' };

export default function App() {
  const [selected, setSelected] = useState<Order | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const drawer = useRef<HTMLElement | null>(null);

  // The drawer neither moves focus in when it opens nor handles Escape while
  // focus is outside it: move focus to its first focusable element.
  useEffect(() => {
    if (!selected) return;
    requestAnimationFrame(() => drawer.current?.querySelector<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])')?.focus());
  }, [selected]);

  const close = () => {
    setSelected(null);
    // The drawer does not restore focus; return it to the order that opened it.
    requestAnimationFrame(() => opener.current?.focus());
  };

  return (
    <main style={{ maxWidth: '48rem', margin: '0 auto', padding: 'var(--void-space-4)' }}>
      <h1>Orders</h1>
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 'var(--void-space-2)' }}>
        {orders.map((o) => (
          <li key={o.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--void-space-3)', alignItems: 'center' }}>
            <void-button
              onvoid-click={(e) => {
                opener.current = e.currentTarget as HTMLElement;
                setSelected(o);
              }}
            >
              Order #{o.id}
            </void-button>
            <span>{o.customer}</span>
            <span>{o.total}</span>
          </li>
        ))}
      </ul>
      <void-drawer ref={drawer} side="right" open={selected !== null} heading={selected ? `Order #${selected.id}` : ''} onvoid-close={close}>
        {selected && (
          <div style={{ display: 'grid', gap: 'var(--void-space-3)' }}>
            <p>Customer: {selected.customer}</p>
            <p>
              Status: <void-badge color={COLOR[selected.status]}>{selected.status}</void-badge>
            </p>
            <p>Total: {selected.total}</p>
            <h3>Items</h3>
            <ul>
              {selected.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
        )}
      </void-drawer>
    </main>
  );
}
