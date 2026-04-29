// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidAvatar } from '../../src/components/avatar.js';

describe('VoidAvatar', () => {
  it('extends VoidElement', () => {
    expect(Object.getPrototypeOf(VoidAvatar)).toBe(VoidElement);
  });

  describe('default property values', () => {
    let el: VoidAvatar;

    beforeEach(() => {
      el = document.createElement('void-avatar') as VoidAvatar;
    });

    it('defaults src to empty string', () => {
      expect(el.src).toBe('');
    });

    it('defaults alt to empty string', () => {
      expect(el.alt).toBe('');
    });

    it('defaults initials to empty string', () => {
      expect(el.initials).toBe('');
    });

    it('defaults size to "md"', () => {
      expect(el.size).toBe('md');
    });
  });

  describe('ARIA', () => {
    it('sets role="img" when connected', () => {
      const el = document.createElement('void-avatar') as VoidAvatar;
      document.body.appendChild(el);
      expect(el.getAttribute('role')).toBe('img');
    });

    it('sets aria-label from alt when connected', () => {
      const el = document.createElement('void-avatar') as VoidAvatar;
      el.alt = 'Profile photo';
      document.body.appendChild(el);
      expect(el.getAttribute('aria-label')).toBe('Profile photo');
    });

    it('falls back to initials for aria-label when alt is empty', () => {
      const el = document.createElement('void-avatar') as VoidAvatar;
      el.initials = 'KW';
      document.body.appendChild(el);
      expect(el.getAttribute('aria-label')).toBe('KW');
    });

    it('updates aria-label when alt changes', async () => {
      const el = document.createElement('void-avatar') as VoidAvatar;
      document.body.appendChild(el);
      el.alt = 'New label';
      await el.updateComplete;
      expect(el.getAttribute('aria-label')).toBe('New label');
    });

    it('updates aria-label when initials changes', async () => {
      const el = document.createElement('void-avatar') as VoidAvatar;
      document.body.appendChild(el);
      el.initials = 'JD';
      await el.updateComplete;
      expect(el.getAttribute('aria-label')).toBe('JD');
    });
  });

  describe('render', () => {
    it('renders initials span when no src', async () => {
      const el = document.createElement('void-avatar') as VoidAvatar;
      el.initials = 'KW';
      document.body.appendChild(el);
      await el.updateComplete;
      const span = el.querySelector('.void-avatar-initials');
      expect(span).not.toBeNull();
      expect(span?.textContent).toBe('KW');
    });

    it('renders img element when src is provided', async () => {
      const el = document.createElement('void-avatar') as VoidAvatar;
      el.src = 'https://example.com/avatar.png';
      el.alt = 'User avatar';
      document.body.appendChild(el);
      await el.updateComplete;
      const img = el.querySelector('img');
      expect(img).not.toBeNull();
      expect(img?.getAttribute('src')).toBe('https://example.com/avatar.png');
      expect(img?.getAttribute('alt')).toBe('User avatar');
    });

    it('renders nothing when src and initials are both empty', async () => {
      const el = document.createElement('void-avatar') as VoidAvatar;
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.querySelector('img')).toBeNull();
      expect(el.querySelector('.void-avatar-initials')).toBeNull();
    });
  });
});
