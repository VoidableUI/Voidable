// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidStepper } from '../../src/components/stepper.js';

describe('VoidStepper', () => {
  it('extends VoidElement', () => {
    expect(Object.getPrototypeOf(VoidStepper)).toBe(VoidElement);
  });

  it('registers as void-stepper custom element', () => {
    expect(customElements.get('void-stepper')).toBe(VoidStepper);
  });

  describe('default properties', () => {
    let el: VoidStepper;

    beforeEach(() => {
      el = document.createElement('void-stepper') as VoidStepper;
    });

    it('defaults value to 0', () => {
      expect(el.value).toBe(0);
    });

    it('defaults steps to empty string', () => {
      expect(el.steps).toBe('');
    });
  });

  describe('ARIA', () => {
    let el: VoidStepper;

    beforeEach(() => {
      el = document.createElement('void-stepper') as VoidStepper;
      document.body.appendChild(el);
    });

    it('sets role="navigation" on connect', () => {
      expect(el.getAttribute('role')).toBe('navigation');
    });

    it('sets aria-label="Progress" on connect', () => {
      expect(el.getAttribute('aria-label')).toBe('Progress');
    });
  });

  describe('rendering', () => {
    let el: VoidStepper;

    beforeEach(async () => {
      el = document.createElement('void-stepper') as VoidStepper;
      el.steps = 'A,B,C';
      el.value = 1;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('renders correct number of step items', () => {
      expect(el.querySelectorAll('.void-stepper-step').length).toBe(3);
    });

    it('renders correct number of connectors', () => {
      expect(el.querySelectorAll('.void-stepper-connector').length).toBe(2);
    });

    it('marks completed steps with data-state="completed"', () => {
      const steps = el.querySelectorAll('.void-stepper-step');
      expect(steps[0].getAttribute('data-state')).toBe('completed');
    });

    it('marks active step with data-state="active"', () => {
      const steps = el.querySelectorAll('.void-stepper-step');
      expect(steps[1].getAttribute('data-state')).toBe('active');
    });

    it('marks upcoming steps with data-state="upcoming"', () => {
      const steps = el.querySelectorAll('.void-stepper-step');
      expect(steps[2].getAttribute('data-state')).toBe('upcoming');
    });

    it('sets aria-current="step" on active step element', () => {
      const steps = el.querySelectorAll('.void-stepper-step');
      expect(steps[1].getAttribute('aria-current')).toBe('step');
    });

    it('does not set aria-current on non-active steps', () => {
      const steps = el.querySelectorAll('.void-stepper-step');
      expect(steps[0].hasAttribute('aria-current')).toBe(false);
      expect(steps[2].hasAttribute('aria-current')).toBe(false);
    });
  });

  describe('value changes', () => {
    it('updates step states when value changes', async () => {
      const el = document.createElement('void-stepper') as VoidStepper;
      el.steps = 'A,B,C';
      el.value = 0;
      document.body.appendChild(el);
      await el.updateComplete;

      el.value = 2;
      await el.updateComplete;

      const steps = el.querySelectorAll('.void-stepper-step');
      expect(steps[0].getAttribute('data-state')).toBe('completed');
      expect(steps[1].getAttribute('data-state')).toBe('completed');
      expect(steps[2].getAttribute('data-state')).toBe('active');
    });
  });

  describe('steps parsing', () => {
    it('renders no steps when steps is empty string', async () => {
      const el = document.createElement('void-stepper') as VoidStepper;
      el.steps = '';
      document.body.appendChild(el);
      await el.updateComplete;

      expect(el.querySelectorAll('.void-stepper-step').length).toBe(0);
    });

    it('trims whitespace from step labels', async () => {
      const el = document.createElement('void-stepper') as VoidStepper;
      el.steps = 'A , B , C';
      document.body.appendChild(el);
      await el.updateComplete;

      const labels = el.querySelectorAll('.void-stepper-label');
      expect(labels[0].textContent).toBe('A');
      expect(labels[1].textContent).toBe('B');
      expect(labels[2].textContent).toBe('C');
    });
  });
});
