// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidFileUpload } from '../../src/components/file-upload.js';

if (!customElements.get('void-file-upload')) {
  customElements.define('void-file-upload', VoidFileUpload);
}

function makeFile(name: string, size = 100, type = 'text/plain'): File {
  return new File(['x'.repeat(size)], name, { type });
}

/**
 * Happy-dom's DragEvent constructor ignores the `dataTransfer` init option,
 * so we must attach it manually via Object.defineProperty.
 */
function makeDropEvent(dt: DataTransfer): DragEvent {
  const ev = new DragEvent('drop', { bubbles: true });
  Object.defineProperty(ev, 'dataTransfer', { value: dt });
  return ev;
}

describe('VoidFileUpload', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidFileUpload)).toBe(VoidElement);
    });

    it('is registered as void-file-upload', () => {
      expect(customElements.get('void-file-upload')).toBe(VoidFileUpload);
    });
  });

  describe('default property values', () => {
    let el: VoidFileUpload;

    beforeEach(() => {
      el = document.createElement('void-file-upload') as VoidFileUpload;
    });

    it('accept defaults to empty string', () => {
      expect(el.accept).toBe('');
    });

    it('multiple defaults to false', () => {
      expect(el.multiple).toBe(false);
    });

    it('disabled defaults to false', () => {
      expect(el.disabled).toBe(false);
    });

    it('maxSize defaults to 0', () => {
      expect(el.maxSize).toBe(0);
    });

    it('error defaults to empty string', () => {
      expect(el.error).toBe('');
    });
  });

  describe('rendering', () => {
    let el: VoidFileUpload;

    beforeEach(async () => {
      el = document.createElement('void-file-upload') as VoidFileUpload;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('renders a hidden file input', () => {
      const input = el.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.classList.contains('void-file-upload-input')).toBe(true);
    });

    it('renders a dropzone', () => {
      expect(el.querySelector('.void-file-upload-dropzone')).not.toBeNull();
    });

    it('does not render file list when no files', () => {
      expect(el.querySelector('.void-file-upload-files')).toBeNull();
    });

    it('does not render error when error is empty', () => {
      expect(el.querySelector('.void-file-upload-error')).toBeNull();
    });

    it('renders error message when error is set', async () => {
      el.error = 'Upload failed';
      await el.updateComplete;
      const errorEl = el.querySelector('.void-file-upload-error');
      expect(errorEl?.textContent).toBe('Upload failed');
    });

    it('passes accept to the file input', async () => {
      el.accept = 'image/*';
      await el.updateComplete;
      const input = el.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input.accept).toBe('image/*');
    });

    it('passes multiple to the file input', async () => {
      el.multiple = true;
      await el.updateComplete;
      const input = el.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input.multiple).toBe(true);
    });
  });

  describe('drag events', () => {
    let el: VoidFileUpload;

    beforeEach(async () => {
      el = document.createElement('void-file-upload') as VoidFileUpload;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('adds dragging attribute on dragover', async () => {
      const dropzone = el.querySelector('.void-file-upload-dropzone') as HTMLElement;
      dropzone.dispatchEvent(new DragEvent('dragover', { bubbles: true }));
      await el.updateComplete;
      expect(el.hasAttribute('dragging')).toBe(true);
    });

    it('removes dragging attribute on dragleave', async () => {
      const dropzone = el.querySelector('.void-file-upload-dropzone') as HTMLElement;
      dropzone.dispatchEvent(new DragEvent('dragover', { bubbles: true }));
      await el.updateComplete;
      dropzone.dispatchEvent(new DragEvent('dragleave', { bubbles: true }));
      await el.updateComplete;
      expect(el.hasAttribute('dragging')).toBe(false);
    });

    it('removes dragging attribute on drop', async () => {
      const dropzone = el.querySelector('.void-file-upload-dropzone') as HTMLElement;
      dropzone.dispatchEvent(new DragEvent('dragover', { bubbles: true }));
      await el.updateComplete;
      dropzone.dispatchEvent(new DragEvent('drop', { bubbles: true }));
      await el.updateComplete;
      expect(el.hasAttribute('dragging')).toBe(false);
    });

    it('does not add dragging attribute when disabled', async () => {
      el.disabled = true;
      await el.updateComplete;
      const dropzone = el.querySelector('.void-file-upload-dropzone') as HTMLElement;
      dropzone.dispatchEvent(new DragEvent('dragover', { bubbles: true }));
      await el.updateComplete;
      expect(el.hasAttribute('dragging')).toBe(false);
    });
  });

  describe('file list', () => {
    let el: VoidFileUpload;

    beforeEach(async () => {
      el = document.createElement('void-file-upload') as VoidFileUpload;
      el.multiple = true;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('shows file list after drop', async () => {
      const file = makeFile('test.txt');
      const dt = new DataTransfer();
      dt.items.add(file);
      const dropzone = el.querySelector('.void-file-upload-dropzone') as HTMLElement;
      dropzone.dispatchEvent(makeDropEvent(dt));
      await el.updateComplete;
      expect(el.querySelector('.void-file-upload-files')).not.toBeNull();
      expect(el.querySelector('.void-file-upload-filename')?.textContent).toBe('test.txt');
    });

    it('shows a remove button per file', async () => {
      const file = makeFile('a.txt');
      const dt = new DataTransfer();
      dt.items.add(file);
      const dropzone = el.querySelector('.void-file-upload-dropzone') as HTMLElement;
      dropzone.dispatchEvent(makeDropEvent(dt));
      await el.updateComplete;
      expect(el.querySelectorAll('.void-file-upload-remove').length).toBe(1);
    });

    it('removes file when remove button clicked', async () => {
      const file = makeFile('remove-me.txt');
      const dt = new DataTransfer();
      dt.items.add(file);
      const dropzone = el.querySelector('.void-file-upload-dropzone') as HTMLElement;
      dropzone.dispatchEvent(makeDropEvent(dt));
      await el.updateComplete;
      const btn = el.querySelector('.void-file-upload-remove') as HTMLElement;
      btn.click();
      await el.updateComplete;
      expect(el.querySelector('.void-file-upload-files')).toBeNull();
    });

    it('accumulates files when multiple=true', async () => {
      const dt1 = new DataTransfer();
      dt1.items.add(makeFile('a.txt'));
      const dt2 = new DataTransfer();
      dt2.items.add(makeFile('b.txt'));
      const dropzone = el.querySelector('.void-file-upload-dropzone') as HTMLElement;
      dropzone.dispatchEvent(makeDropEvent(dt1));
      await el.updateComplete;
      dropzone.dispatchEvent(makeDropEvent(dt2));
      await el.updateComplete;
      expect(el.querySelectorAll('.void-file-upload-file').length).toBe(2);
    });

    it('replaces files when multiple=false', async () => {
      el.multiple = false;
      await el.updateComplete;
      const dt1 = new DataTransfer();
      dt1.items.add(makeFile('a.txt'));
      const dt2 = new DataTransfer();
      dt2.items.add(makeFile('b.txt'));
      const dropzone = el.querySelector('.void-file-upload-dropzone') as HTMLElement;
      dropzone.dispatchEvent(makeDropEvent(dt1));
      await el.updateComplete;
      dropzone.dispatchEvent(makeDropEvent(dt2));
      await el.updateComplete;
      expect(el.querySelectorAll('.void-file-upload-file').length).toBe(1);
    });
  });

  describe('void-change event', () => {
    let el: VoidFileUpload;

    beforeEach(async () => {
      el = document.createElement('void-file-upload') as VoidFileUpload;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('dispatches void-change on drop with files', async () => {
      let detail: { files: File[] } | null = null;
      el.addEventListener('void-change', (e) => { detail = (e as CustomEvent).detail; });
      const file = makeFile('test.txt');
      const dt = new DataTransfer();
      dt.items.add(file);
      const dropzone = el.querySelector('.void-file-upload-dropzone') as HTMLElement;
      dropzone.dispatchEvent(makeDropEvent(dt));
      await el.updateComplete;
      expect(detail).not.toBeNull();
      expect(Array.isArray(detail?.files)).toBe(true);
      expect(detail?.files[0].name).toBe('test.txt');
    });

    it('dispatches void-change on file removal', async () => {
      const dt = new DataTransfer();
      dt.items.add(makeFile('test.txt'));
      const dropzone = el.querySelector('.void-file-upload-dropzone') as HTMLElement;
      dropzone.dispatchEvent(makeDropEvent(dt));
      await el.updateComplete;

      let detail: { files: File[] } | null = null;
      el.addEventListener('void-change', (e) => { detail = (e as CustomEvent).detail; });
      const btn = el.querySelector('.void-file-upload-remove') as HTMLElement;
      btn.click();
      await el.updateComplete;
      expect(detail?.files.length).toBe(0);
    });

    it('void-change bubbles', async () => {
      let fired = false;
      document.body.addEventListener('void-change', () => { fired = true; }, { once: true });
      const dt = new DataTransfer();
      dt.items.add(makeFile('test.txt'));
      const dropzone = el.querySelector('.void-file-upload-dropzone') as HTMLElement;
      dropzone.dispatchEvent(makeDropEvent(dt));
      await el.updateComplete;
      expect(fired).toBe(true);
    });
  });

  describe('maxSize validation', () => {
    let el: VoidFileUpload;

    beforeEach(async () => {
      el = document.createElement('void-file-upload') as VoidFileUpload;
      el.maxSize = 50;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('rejects files exceeding maxSize', async () => {
      let fired = false;
      el.addEventListener('void-change', () => { fired = true; });
      const dt = new DataTransfer();
      dt.items.add(makeFile('big.txt', 100));
      const dropzone = el.querySelector('.void-file-upload-dropzone') as HTMLElement;
      dropzone.dispatchEvent(makeDropEvent(dt));
      await el.updateComplete;
      expect(el.querySelector('.void-file-upload-files')).toBeNull();
      expect(fired).toBe(false);
    });

    it('accepts files within maxSize', async () => {
      const dt = new DataTransfer();
      dt.items.add(makeFile('small.txt', 10));
      const dropzone = el.querySelector('.void-file-upload-dropzone') as HTMLElement;
      dropzone.dispatchEvent(makeDropEvent(dt));
      await el.updateComplete;
      expect(el.querySelector('.void-file-upload-files')).not.toBeNull();
    });
  });

  describe('accept validation', () => {
    let el: VoidFileUpload;

    beforeEach(async () => {
      el = document.createElement('void-file-upload') as VoidFileUpload;
      el.accept = '.png,.jpg';
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('rejects files not matching accept', async () => {
      let fired = false;
      el.addEventListener('void-change', () => { fired = true; });
      const dt = new DataTransfer();
      dt.items.add(makeFile('doc.pdf', 100, 'application/pdf'));
      const dropzone = el.querySelector('.void-file-upload-dropzone') as HTMLElement;
      dropzone.dispatchEvent(makeDropEvent(dt));
      await el.updateComplete;
      expect(fired).toBe(false);
    });

    it('accepts files matching accept by extension', async () => {
      const dt = new DataTransfer();
      dt.items.add(makeFile('photo.png', 100, 'image/png'));
      const dropzone = el.querySelector('.void-file-upload-dropzone') as HTMLElement;
      dropzone.dispatchEvent(makeDropEvent(dt));
      await el.updateComplete;
      expect(el.querySelector('.void-file-upload-files')).not.toBeNull();
    });
  });

  describe('disabled state', () => {
    let el: VoidFileUpload;

    beforeEach(async () => {
      el = document.createElement('void-file-upload') as VoidFileUpload;
      el.disabled = true;
      document.body.appendChild(el);
      await el.updateComplete;
    });

    afterEach(() => {
      el.remove();
    });

    it('reflects disabled attribute', () => {
      expect(el.hasAttribute('disabled')).toBe(true);
    });

    it('does not dispatch void-change on drop when disabled', async () => {
      let fired = false;
      el.addEventListener('void-change', () => { fired = true; });
      const dt = new DataTransfer();
      dt.items.add(makeFile('test.txt'));
      const dropzone = el.querySelector('.void-file-upload-dropzone') as HTMLElement;
      dropzone.dispatchEvent(makeDropEvent(dt));
      await el.updateComplete;
      expect(fired).toBe(false);
    });

    it('sets aria-disabled on dropzone', async () => {
      const dropzone = el.querySelector('.void-file-upload-dropzone') as HTMLElement;
      expect(dropzone.getAttribute('aria-disabled')).toBe('true');
    });
  });
});
