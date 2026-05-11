import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Navigation/Stepper',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Step progress indicator for multi-stage wizards, onboarding flows, and checkout sequences that need to show the user where they are and how many steps remain.',
      },
    },
  },
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 5, step: 1 } },
    steps: { control: 'text' },
  },
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { value: 1, steps: 'Details,Payment,Confirm' },
  render: (args) => html`<void-stepper value=${args.value} steps=${args.steps}></void-stepper>`,
};

export const FirstStep: Story = {
  render: () => html`<void-stepper value=${0} steps=${'Account,Billing,Confirm,Done'}></void-stepper>`,
};

export const LastStep: Story = {
  render: () => html`<void-stepper value=${3} steps=${'Account,Billing,Confirm,Done'}></void-stepper>`,
};

export const TwoSteps: Story = {
  render: () => html`<void-stepper value=${1} steps=${'Start,Finish'}></void-stepper>`,
};

export const ManySteps: Story = {
  render: () => html`<void-stepper value=${2} steps=${'One,Two,Three,Four,Five,Six'}></void-stepper>`,
};
