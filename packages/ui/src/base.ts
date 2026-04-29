import { LitElement } from 'lit';

export class VoidElement extends LitElement {
  createRenderRoot(): this {
    return this;
  }
}
