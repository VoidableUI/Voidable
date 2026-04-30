import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

export class VoidFileUpload extends VoidElement {
  @property({ type: String }) accept = '';
  @property({ type: Boolean, reflect: true }) multiple = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Number }) maxSize = 0;
  @property({ type: String, reflect: true }) error = '';

  private _files: File[] = [];

  private get _input(): HTMLInputElement {
    return this.querySelector('input[type="file"]') as HTMLInputElement;
  }

  render() {
    return html`
      <input
        type="file"
        style="display:none"
        accept=${this.accept || nothing}
        ?multiple=${this.multiple}
        ?disabled=${this.disabled}
        @change=${this._onInputChange}
      />
      <div
        class="void-file-upload-dropzone"
        tabindex=${this.disabled ? '-1' : '0'}
        role="button"
        aria-disabled=${this.disabled ? 'true' : 'false'}
        @click=${this._onDropzoneClick}
        @keydown=${this._onDropzoneKeydown}
        @dragover=${this._onDragOver}
        @dragleave=${this._onDragLeave}
        @drop=${this._onDrop}
      >
        <span class="void-file-upload-text">
          Drop files here or <span class="void-file-upload-browse">browse</span>
        </span>
      </div>
      ${this._files.length > 0 ? html`
        <div class="void-file-upload-files">
          ${this._files.map((file, index) => html`
            <div class="void-file-upload-file">
              <span class="void-file-upload-filename">${file.name}</span>
              <button
                class="void-file-upload-remove"
                aria-label="Remove ${file.name}"
                ?disabled=${this.disabled}
                @click=${() => this._removeFile(index)}
              >×</button>
            </div>
          `)}
        </div>
      ` : nothing}
      ${this.error ? html`<span class="void-file-upload-error">${this.error}</span>` : nothing}
    `;
  }

  private _onDropzoneClick = (): void => {
    if (this.disabled) return;
    this._input?.click();
  };

  private _onDropzoneKeydown = (e: KeyboardEvent): void => {
    if (this.disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._input?.click();
    }
  };

  private _onDragOver = (e: DragEvent): void => {
    if (this.disabled) return;
    e.preventDefault();
    this.setAttribute('dragging', '');
  };

  private _onDragLeave = (): void => {
    this.removeAttribute('dragging');
  };

  private _onDrop = (e: DragEvent): void => {
    e.preventDefault();
    this.removeAttribute('dragging');
    if (this.disabled) return;
    const files = Array.from(e.dataTransfer?.files ?? []);
    this._addFiles(files);
  };

  private _onInputChange = (e: Event): void => {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    this._addFiles(files);
    input.value = '';
  };

  private _addFiles(incoming: File[]): void {
    const valid = incoming.filter(file => {
      if (this.maxSize > 0 && file.size > this.maxSize) return false;
      if (this.accept) {
        const accepted = this.accept.split(',').map(s => s.trim());
        const matches = accepted.some(type => {
          if (type.startsWith('.')) return file.name.toLowerCase().endsWith(type.toLowerCase());
          if (type.endsWith('/*')) return file.type.startsWith(type.slice(0, -1));
          return file.type === type;
        });
        if (!matches) return false;
      }
      return true;
    });

    if (valid.length === 0) return;

    this._files = this.multiple ? [...this._files, ...valid] : valid;
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      detail: { files: [...this._files] },
    }));
  }

  private _removeFile(index: number): void {
    this._files = this._files.filter((_, i) => i !== index);
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      detail: { files: [...this._files] },
    }));
  }
}

if (!customElements.get('void-file-upload')) {
  customElements.define('void-file-upload', VoidFileUpload);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-file-upload': VoidFileUpload;
  }
}
