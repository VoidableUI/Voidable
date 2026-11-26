import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { InternalsFormControl, type FormSubmission } from '../form-control.js';
import { useProjection } from '../projection.js';
import { uid } from '../keyboard.js';

useProjection();

/** Why a file was not taken: `type` (not matched by `accept`), `size` (over `max-size`) or `count` (more files than the zone takes). */
export type FileRejectReason = 'type' | 'size' | 'count';

/**
 * Drag-and-drop file picker for document uploads, image attachment flows, and import wizards.
 *
 * @fires {CustomEvent<{ rejected: { file: File; reason: 'type' | 'size' | 'count' }[] }>} void-reject - Files were refused: one entry per file with the reason. Does not bubble.
 */
export class VoidFileUpload extends InternalsFormControl(VoidElement) {
  /** The host's `aria-label` / `aria-labelledby` name the inner control. */
  static override labelTarget = '.void-file-upload-dropzone';

  /**
   * Comma-separated file types the zone takes, as on a native file input: extensions (`.pdf`), MIME
   * types (`image/png`) or wildcards (`image/*`). Other files are not taken: `void-reject` fires with
   * reason `type` and the zone shows an error.
   */
  @property({ type: String }) accept = '';
  /** Allow more than one file. Without it a new choice replaces the old one. */
  @property({ type: Boolean, reflect: true }) multiple = false;
  /** Stop the zone reacting and exclude the files from the form submission. */
  @property({ type: Boolean, reflect: true }) disabled = false;
  /** Largest allowed file in bytes. 0 (the default) means no limit. Larger files are rejected with reason `size`. */
  @property({ type: Number, attribute: 'max-size' }) maxSize = 0;
  /**
   * Error message shown under the zone; while it is set the drop zone is `aria-invalid` and described by
   * it. Set it for a server-side upload failure. The zone also sets it itself when it rejects a file
   * (see `void-reject`) and clears what it set on the next accepted selection; a message you set is
   * left alone.
   */
  @property({ type: String, reflect: true }) error = '';

  private _files: File[] = [];
  private _uid = uid('void-file-upload-error');
  /** The message we wrote into `error` (a rejection); an accepted selection clears it only while it is still there. */
  private _ownError = '';

  /** One entry per selected file. */
  protected formSubmission(): FormSubmission {
    return this._files;
  }

  protected formSnapshot(): unknown {
    return [...this._files];
  }

  protected formRestore(state: unknown): void {
    this._files = Array.isArray(state) ? [...state] : [];
    this.requestUpdate();
  }

  /** Files cannot be restored from serialised state. */
  formStateRestoreCallback(): void {}

  private get _input(): HTMLInputElement {
    return this.querySelector('input[type="file"]') as HTMLInputElement;
  }

  render() {
    return html`
      <input
        type="file"
        class="void-file-upload-input"
        accept=${this.accept || nothing}
        ?multiple=${this.multiple}
        ?disabled=${this.disabled}
        @change=${this._onInputChange}
      />
      <div
        class="void-file-upload-dropzone"
        tabindex=${this.formDisabled ? '-1' : '0'}
        role="button"
        aria-disabled=${this.formDisabled ? 'true' : nothing}
        aria-invalid=${this.error ? 'true' : nothing}
        aria-describedby=${this.error ? this._uid : nothing}
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
                type="button"
                class="void-file-upload-remove"
                aria-label="Remove ${file.name}"
                ?disabled=${this.disabled}
                @click=${() => this._removeFile(index)}
              >×</button>
            </div>
          `)}
        </div>
      ` : nothing}
      ${this.error ? html`<span class="void-file-upload-error" id=${this._uid} role="alert">${this.error}</span>` : nothing}
    `;
  }

  private _onDropzoneClick = (): void => {
    if (this.formDisabled) return;
    this._input?.click();
  };

  private _onDropzoneKeydown = (e: KeyboardEvent): void => {
    if (this.formDisabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._input?.click();
    }
  };

  private _onDragOver = (e: DragEvent): void => {
    if (this.disabled) return;
    e.preventDefault();
    this.setHostAttribute('dragging', '');
  };

  private _onDragLeave = (): void => {
    this.setHostAttribute('dragging', null);
  };

  private _onDrop = (e: DragEvent): void => {
    e.preventDefault();
    this.setHostAttribute('dragging', null);
    if (this.formDisabled) return;
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
    const rejected: { file: File; reason: FileRejectReason }[] = [];
    let valid: File[] = [];
    const accepted = this.accept.split(',').map(s => s.trim()).filter(Boolean);
    for (const file of incoming) {
      if (accepted.length > 0 && !accepted.some(type => {
        if (type.startsWith('.')) return file.name.toLowerCase().endsWith(type.toLowerCase());
        if (type.endsWith('/*')) return file.type.startsWith(type.slice(0, -1));
        return file.type === type;
      })) rejected.push({ file, reason: 'type' });
      else if (this.maxSize > 0 && file.size > this.maxSize) rejected.push({ file, reason: 'size' });
      else valid.push(file);
    }
    // Without `multiple` the zone takes one file: the first acceptable one, the rest are over the count.
    if (!this.multiple && valid.length > 1) {
      for (const file of valid.slice(1)) rejected.push({ file, reason: 'count' });
      valid = valid.slice(0, 1);
    }

    if (rejected.length > 0) {
      this.error = rejected.map(r => this._message(r.file, r.reason)).join(' ');
      this._ownError = this.error;
      this.dispatchEvent(new CustomEvent('void-reject', { bubbles: false, detail: { rejected } }));
    }

    if (valid.length === 0) return;
    if (rejected.length === 0) this._clearOwnError();

    this._files = this.multiple ? [...this._files, ...valid] : valid;
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      detail: { value: [...this._files], files: [...this._files] },
    }));
  }

  private _message(file: File, reason: FileRejectReason): string {
    if (reason === 'type') return `${file.name} is not an accepted file type.`;
    if (reason === 'size') return `${file.name} is larger than the ${this.maxSize} byte limit.`;
    return `${file.name} was not added: only one file can be chosen.`;
  }

  private _clearOwnError(): void {
    if (this._ownError && this.error === this._ownError) this.error = '';
    this._ownError = '';
  }

  private _removeFile(index: number): void {
    this._files = this._files.filter((_, i) => i !== index);
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      detail: { value: [...this._files], files: [...this._files] },
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
