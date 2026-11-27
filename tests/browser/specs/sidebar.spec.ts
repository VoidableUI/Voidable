// SPDX-License-Identifier: MIT
//
// Sidebar (#122): the rail's width comes from --void-sidebar-width set in CSS (on the sidebar or an ancestor),
// and the width attribute overrides it; a project switcher (a dropdown menu trigger) above the navigation
// links lines up with the links' icons and labels.
import { test, expect, load, type Page } from '../helpers/test';

async function mount(page: Page, html: string): Promise<void> {
  await page.evaluate(async (h) => {
    document.getElementById('case')?.remove();
    const d = document.createElement('div');
    d.id = 'case';
    d.innerHTML = h;
    document.body.append(d);
    await (window as any).__settle(d);
  }, html);
}

const widthOf = (page: Page, selector = 'void-sidebar') =>
  page.locator(selector).evaluate((el) => el.getBoundingClientRect().width);

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await load(page, '/blank');
});

test.describe('width', () => {
  const body = '<div>Navigation</div>';

  test('without a width attribute the rail follows --void-sidebar-width set on an ancestor', async ({ page }) => {
    await mount(page, `<div style="--void-sidebar-width: 301px; display: flex"><void-sidebar>${body}</void-sidebar></div>`);
    expect(await widthOf(page)).toBe(301);
  });

  test('without a width attribute the rail follows --void-sidebar-width set on the sidebar', async ({ page }) => {
    await mount(page, `<div style="display: flex"><void-sidebar style="--void-sidebar-width: 287px">${body}</void-sidebar></div>`);
    expect(await widthOf(page)).toBe(287);
  });

  test('without either it is the theme width, not the width of its content', async ({ page }) => {
    await mount(page, `<div style="display: flex"><void-sidebar>${body}</void-sidebar></div>`);
    const theme = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.width = 'var(--void-sidebar-width)';
      document.body.append(probe);
      const w = probe.getBoundingClientRect().width;
      probe.remove();
      return w;
    });
    expect(theme).toBeGreaterThan(100);
    expect(await widthOf(page)).toBe(theme);
  });

  test('the width attribute overrides the token, and removing it hands the width back', async ({ page }) => {
    await mount(page, `<div style="--void-sidebar-width: 301px; display: flex"><void-sidebar width="260px">${body}</void-sidebar></div>`);
    expect(await widthOf(page)).toBe(260);
    await page.locator('void-sidebar').evaluate(async (el: any) => {
      el.removeAttribute('width');
      await el.updateComplete;
    });
    await expect.poll(() => widthOf(page)).toBe(301);
  });

  test('collapsed uses collapsed-width, else the collapsed token', async ({ page }) => {
    await mount(page, `<div style="display: flex"><void-sidebar collapsed collapsed-width="64px">${body}</void-sidebar></div>`);
    await expect.poll(() => widthOf(page)).toBe(64);
    await mount(page, `<div style="--void-sidebar-collapsed-width: 70px; display: flex"><void-sidebar collapsed>${body}</void-sidebar></div>`);
    await expect.poll(() => widthOf(page)).toBe(70);
    await page.locator('void-sidebar').evaluate(async (el: any) => {
      el.collapsed = false;
      el.style.setProperty('--void-sidebar-width', '210px');
      await el.updateComplete;
    });
    await expect.poll(() => widthOf(page)).toBe(210);
  });
});

test.describe('project switcher above the links', () => {
  const icon = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6"/></svg>';
  const shell = `
    <void-shell nav="side" style="min-height: 400px">
      <void-sidebar>
        <void-dropdown-menu>
          <void-dropdown-menu-trigger>
            <void-button variant="ghost" id="switcher">${icon}<span>Project</span></void-button>
          </void-dropdown-menu-trigger>
          <void-dropdown-menu-content>
            <void-dropdown-menu-item>First</void-dropdown-menu-item>
          </void-dropdown-menu-content>
        </void-dropdown-menu>
        <void-nav-links>
          <a href="/" id="link" aria-current="page">${icon}<span>Overview</span></a>
          <a href="/inbox">${icon}<span>Inbox</span><void-spacer></void-spacer><span>12</span></a>
        </void-nav-links>
      </void-sidebar>
      <main></main>
    </void-shell>`;

  test('its icon and label start where the nav link icon and label start', async ({ page }) => {
    await mount(page, shell);
    const x = await page.evaluate(() => {
      const left = (el: Element) => el.getBoundingClientRect().left;
      const switcher = document.querySelector('#switcher')!;
      const link = document.querySelector('#link')!;
      return {
        switcherIcon: left(switcher.querySelector('svg')!),
        switcherLabel: left(switcher.querySelector('span')!),
        linkIcon: left(link.querySelector('svg')!),
        linkLabel: left(link.querySelector('span')!),
      };
    });
    expect(Math.abs(x.switcherIcon - x.linkIcon), JSON.stringify(x)).toBeLessThanOrEqual(1);
    expect(Math.abs(x.switcherLabel - x.linkLabel), JSON.stringify(x)).toBeLessThanOrEqual(1);
  });

  test('the trigger is as wide as the rail content, not narrower', async ({ page }) => {
    await mount(page, shell);
    const w = await page.evaluate(() => ({
      switcher: document.querySelector('#switcher')!.getBoundingClientRect().width,
      links: document.querySelector('void-nav-links')!.getBoundingClientRect().width,
    }));
    expect(Math.abs(w.switcher - w.links), JSON.stringify(w)).toBeLessThanOrEqual(1);
  });

  test('a link with an icon, a label and a trailing count keeps the count at the far end', async ({ page }) => {
    await mount(page, shell);
    const m = await page.evaluate(() => {
      const a = document.querySelectorAll('void-nav-links a')[1]!;
      const count = a.querySelectorAll('span')[1]!.getBoundingClientRect();
      const link = a.getBoundingClientRect();
      return { countRight: count.right, linkRight: link.right };
    });
    // The link's inline padding is all that lies between the count and the link's edge.
    expect(m.linkRight - m.countRight).toBeLessThan(24);
  });
});
