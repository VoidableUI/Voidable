import { describe, it, expect, afterEach } from 'vitest';
import { Application, Controller } from '@hotwired/stimulus';
import { VoidEventController } from '../src/controller.js';

let app: Application | undefined;

afterEach(() => {
  app?.stop();
  app = undefined;
  document.body.innerHTML = '';
});

const tick = () => new Promise((r) => setTimeout(r, 10));

describe('VoidEventController (deprecated)', () => {
  it('does not re-dispatch events (no recursion)', async () => {
    let calls = 0;
    class FormController extends Controller {
      submit() {
        calls++;
      }
    }

    document.body.innerHTML = `
      <div data-controller="form">
        <void-button
          data-controller="void-event"
          data-void-event-events-value="void-click"
          data-action="void-click->form#submit">Save</void-button>
      </div>`;

    app = Application.start();
    app.register('void-event', VoidEventController);
    app.register('form', FormController);
    await tick();

    const btn = document.querySelector('void-button')!;
    expect(() => btn.dispatchEvent(new CustomEvent('void-click', { bubbles: true }))).not.toThrow();
    expect(calls).toBe(1);
  });

  it('works with a plain data-action and no void-event controller', async () => {
    let calls = 0;
    class FormController extends Controller {
      submit() {
        calls++;
      }
    }

    document.body.innerHTML = `
      <div data-controller="form">
        <void-button data-action="void-click->form#submit">Save</void-button>
      </div>`;

    app = Application.start();
    app.register('form', FormController);
    await tick();

    document.querySelector('void-button')!.dispatchEvent(new CustomEvent('void-click', { bubbles: true }));
    expect(calls).toBe(1);
  });
});
