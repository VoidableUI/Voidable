import { component$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';
import './global.css';

export default component$(() => {
  const eventLog = useSignal<string[]>([]);

  // Load Voidable components client-side only
  useVisibleTask$(() => {
    import('@voidable/ui');
  });

  const logEvent = $((name: string, detail?: string) => {
    const entry = `[${new Date().toLocaleTimeString()}] ${name}${detail ? ': ' + detail : ''}`;
    eventLog.value = [entry, ...eventLog.value].slice(0, 20);
  });

  return (
    <div>
      <h1>Voidable + Qwik Integration Test</h1>

      <div class="component-section">
        <h2>Button</h2>
        <void-button
          variant="filled"
          onVoid-click$={() => logEvent('void-click', 'Button clicked')}
        >
          Click Me
        </void-button>
      </div>

      <div class="component-section">
        <h2>Input</h2>
        <void-input
          label="Name"
          onVoid-change$={(e: CustomEvent) =>
            logEvent('void-change', `Input: ${e.detail?.value ?? ''}`)
          }
          onVoid-input$={(e: CustomEvent) =>
            logEvent('void-input', `Input: ${e.detail?.value ?? ''}`)
          }
        />
      </div>

      <div class="component-section">
        <h2>Switch</h2>
        <void-switch
          onVoid-toggle$={(e: CustomEvent) =>
            logEvent('void-toggle', `Switch: ${e.detail?.checked ?? ''}`)
          }
        >
          Toggle me
        </void-switch>
      </div>

      <div class="component-section">
        <h2>Select</h2>
        <void-select
          label="Choose option"
          onVoid-change$={(e: CustomEvent) =>
            logEvent('void-change', `Select: ${e.detail?.value ?? ''}`)
          }
        >
          <void-option value="alpha">Alpha</void-option>
          <void-option value="beta">Beta</void-option>
          <void-option value="gamma">Gamma</void-option>
        </void-select>
      </div>

      <div class="component-section">
        <h2>Checkbox</h2>
        <void-checkbox
          onVoid-change$={(e: CustomEvent) =>
            logEvent('void-change', `Checkbox: ${e.detail?.checked ?? ''}`)
          }
        >
          Accept terms
        </void-checkbox>
      </div>

      <div class="component-section">
        <h2>Badge</h2>
        <void-badge>Status OK</void-badge>
      </div>

      <div class="event-log">
        <h3>Event Log</h3>
        {eventLog.value.length === 0 ? (
          <p>No events yet. Interact with components above.</p>
        ) : (
          eventLog.value.map((entry, i) => <p key={i}>{entry}</p>)
        )}
      </div>
    </div>
  );
});
