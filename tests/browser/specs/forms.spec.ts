// SPDX-License-Identifier: MIT
//
// Form association in a real browser: every value-bearing control, inside
// and outside a <fieldset>, filled by real pointer and keyboard input, and
// the exact FormData the browser builds on submit.
import { test, expect, expectedFailure, load, settle, type Page } from '../helpers/test';

type Entries = [string, string][];
// Only the data: a custom element cannot be a form's submitter, so e.submitter is null for void-button.
const submits = (page: Page) => page.evaluate(() => (window as any).submits.splice(0).map((s: any) => s.data) as Entries[]);
const formData = (page: Page) => page.evaluate(() => (window as any).formData() as Entries);

const DEFAULTS: Entries = [
  ['user[name]', ''],
  ['user[email]', ''],
  ['user[bio]', ''],
  ['volume', '50'],
  ['q', ''],
  ['seats', '2'],
  ['start', ''],
  ['pin', ''],
  ['color', '#ff0000'],
  ['view', 'list'],
  ['framework', ''],
  ['title', 'Untitled'],
  ['cal', '2026-11-10'],
];

/** Fills every control the way a user would and returns the date picked in the date-picker. */
async function fillEverything(page: Page): Promise<string> {
  await page.locator('#i-name input').click();
  await page.keyboard.type('Ada Lovelace');
  await page.locator('#i-email input').click();
  await page.keyboard.type('ada@example.com');
  await page.locator('#i-bio textarea').click();
  await page.keyboard.type('Line one');
  await page.locator('#i-country select').selectOption('au');
  await page.locator('#i-remember').click();
  await page.locator('#i-langs void-checkbox[value=en]').click();
  await page.locator('#i-langs void-checkbox[value=fr]').click();
  await page.locator('#i-plan void-radio[value=pro]').click();
  await page.locator('#i-vol input').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.locator('#i-search input').click();
  await page.keyboard.type('query');
  await page.locator('#i-news').click();
  await page.locator('#i-seats').getByRole('button', { name: 'Increment' }).click();
  // The date-picker opens on the current month, so read back the day picked.
  await page.locator('#i-date input').click();
  const day = page.locator('#i-date [role=grid] button:not([disabled])').nth(9);
  const label = (await day.getAttribute('aria-label'))!;
  await day.click();
  const d = new Date(label.replace(/^\w+, /, ''));
  const picked = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  await page.locator('#i-pin input').first().click();
  await page.keyboard.type('4321');
  await page.locator('#i-tags input').click();
  await page.keyboard.type('alpha');
  await page.keyboard.press('Enter');
  await page.keyboard.type('beta');
  await page.keyboard.press('Enter');
  await page.locator('#i-color input[type=text], #i-color input:not([type])').first().click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('#123456');
  await page.keyboard.press('Tab');
  await page.locator('#i-fmt void-toggle[value=bold]').click();
  await page.locator('#i-view void-segmented-control-item[value=grid]').click();
  await page.locator('#i-fw input').click();
  await page.locator('#i-fw').getByRole('option', { name: 'Vue' }).click();
  await page.locator('#i-skills .void-multiselect-trigger').click();
  await page.locator('#i-skills').getByRole('option', { name: 'JS' }).click();
  await page.locator('#i-skills').getByRole('option', { name: 'HTML' }).click();
  await page.locator('h1').click();
  await page.locator('#i-title .void-editable-preview').focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('Report');
  await page.keyboard.press('Enter');
  await page.locator('#i-file input[type=file]').setInputFiles({ name: 'b.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') });
  await page.locator('#i-cal').getByRole('button', { name: 'Sunday, November 15, 2026' }).click();
  await settle(page);
  return picked;
}

const filled = (start: string): Entries => [
  ['user[name]', 'Ada Lovelace'],
  ['user[email]', 'ada@example.com'],
  ['user[bio]', 'Line one'],
  ['user[country]', 'au'],
  ['user[remember_me]', '1'],
  ['user[langs][]', 'en'],
  ['user[langs][]', 'fr'],
  ['user[plan]', 'pro'],
  ['volume', '60'],
  ['q', 'query'],
  ['newsletter', 'yes'],
  ['seats', '3'],
  ['start', start],
  ['pin', '4321'],
  ['tags', 'alpha'],
  ['tags', 'beta'],
  ['color', '#123456'],
  ['fmt', 'bold'],
  ['view', 'grid'],
  ['framework', 'vue'],
  ['skills', 'js'],
  ['skills', 'html'],
  ['title', 'Report'],
  ['doc', 'File(b.txt,2)'],
  ['cal', '2026-11-15'],
];

test.describe('form with every value-bearing control', () => {
  test.beforeEach(async ({ page }) => {
    await load(page, '/form');
  });

  test('submits the defaults before any input', async ({ page }) => {
    await page.locator('#b-submit').click();
    expect(await submits(page)).toEqual([DEFAULTS]);
  });

  test('submits exactly what the user entered, by the submit button', async ({ page }) => {
    const start = await fillEverything(page);
    await page.locator('#b-submit').click();
    expect(await submits(page)).toEqual([filled(start)]);
  });

  test('a real GET submission carries the same values to the server', async ({ page }) => {
    const start = await fillEverything(page);
    await page.evaluate(() => ((window as any).letSubmit = true));
    await Promise.all([page.waitForURL(/\/echo\?/), page.locator('#b-submit').click()]);
    const echoed = JSON.parse((await page.locator('#echo').textContent())!) as Entries;
    // A GET submission sends a file's name only.
    expect(echoed).toEqual(filled(start).map(([k, v]) => [k, v.startsWith('File(') ? 'b.txt' : v]));
  });

  test('Enter in a text field submits the form (implicit submission)', async ({ page }) => {
    await page.locator('#i-name input').click();
    await page.keyboard.type('Grace');
    await page.keyboard.press('Enter');
    const sent = await submits(page);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toEqual(DEFAULTS.map(([k, v]) => [k, k === 'user[name]' ? 'Grace' : v]));
  });

  test('Enter on the submit button submits once', async ({ page }) => {
    await page.locator('#b-submit').focus();
    await page.keyboard.press('Enter');
    expect(await submits(page)).toHaveLength(1);
  });

  test('the reset button restores every control to its initial value', async ({ page }) => {
    await fillEverything(page);
    await page.locator('#b-reset').click();
    await settle(page);
    expect(await formData(page)).toEqual(DEFAULTS);
    // And what the user sees follows.
    await expect(page.locator('#i-name input')).toHaveValue('');
    await expect(page.locator('#i-country select')).toHaveValue('');
    await expect(page.locator('#i-remember')).not.toHaveAttribute('checked', '');
    await expect(page.locator('#i-tags')).not.toContainText('alpha');
  });

  test('disabling the fieldset removes its controls from the submission', async ({ page }) => {
    await fillEverything(page);
    await page.evaluate(() => ((document.getElementById('fs') as HTMLFieldSetElement).disabled = true));
    await settle(page);
    const names = (await formData(page)).map(([k]) => k);
    for (const inside of ['newsletter', 'seats', 'start', 'pin', 'tags', 'color', 'fmt', 'view', 'framework', 'skills', 'title', 'doc']) {
      expect(names, `${inside} is inside the disabled fieldset`).not.toContain(inside);
    }
    expect(names).toEqual(['user[name]', 'user[email]', 'user[bio]', 'user[country]', 'user[remember_me]', 'user[langs][]', 'user[langs][]', 'user[plan]', 'volume', 'q', 'cal']);
  });

  test('nothing in a disabled fieldset can be reached with Tab', async ({ page }) => {
    expectedFailure('untracked:fieldset-disabled-focusable', 'toggle-group, editable and file-upload stay in the tab order inside a disabled fieldset');
    await page.evaluate(() => ((document.getElementById('fs') as HTMLFieldSetElement).disabled = true));
    await settle(page);
    await page.locator('#i-search input').focus();
    const reached = new Set<string>();
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      const id = await page.evaluate(() => (document.activeElement?.closest('[id^=i-],[id^=b-]') as HTMLElement | null)?.id ?? '');
      if (id === 'i-cal') break;
      if (id !== 'i-search') reached.add(id);
    }
    expect([...reached]).toEqual([]);
  });

  test('a control in the disabled fieldset ignores pointer input', async ({ page }) => {
    await page.evaluate(() => ((document.getElementById('fs') as HTMLFieldSetElement).disabled = true));
    await settle(page);
    await page.locator('#i-news').click({ force: true });
    await page.locator('#i-view void-segmented-control-item[value=grid]').click({ force: true });
    await page.locator('#i-fmt void-toggle[value=bold]').click({ force: true });
    expect(await page.evaluate(() => [(document.getElementById('i-news') as any).checked, (document.getElementById('i-view') as any).value, (document.getElementById('i-fmt') as any).value])).toEqual([false, 'list', '']);
  });
});

test.describe('auto-submit on void-change', () => {
  test.beforeEach(async ({ page }) => {
    await load(page, '/form');
    await page.evaluate(() => document.getElementById('f')!.addEventListener('void-change', (e) => (e.currentTarget as HTMLFormElement).requestSubmit()));
  });

  // Each row: a user action, the field name, and the value the submission must carry.
  const cases: [string, (p: Page) => Promise<void>, string, string][] = [
    ['input', async (p) => { await p.locator('#i-name input').click(); await p.keyboard.type('Z'); await p.keyboard.press('Tab'); }, 'user[name]', 'Z'],
    ['select', (p) => p.locator('#i-country select').selectOption('fj').then(() => {}), 'user[country]', 'fj'],
    ['checkbox', (p) => p.locator('#i-remember').click(), 'user[remember_me]', '1'],
    ['checkbox-group', (p) => p.locator('#i-langs void-checkbox[value=mi]').click(), 'user[langs][]', 'mi'],
    ['radio-group', (p) => p.locator('#i-plan void-radio[value=team]').click(), 'user[plan]', 'team'],
    ['slider', async (p) => { await p.locator('#i-vol input').focus(); await p.keyboard.press('ArrowRight'); }, 'volume', '55'],
    ['switch', (p) => p.locator('#i-news').click(), 'newsletter', 'yes'],
    ['number-input', (p) => p.locator('#i-seats').getByRole('button', { name: 'Increment' }).click(), 'seats', '3'],
    ['tags-input', async (p) => { await p.locator('#i-tags input').click(); await p.keyboard.type('t1'); await p.keyboard.press('Enter'); }, 'tags', 't1'],
    ['toggle-group', (p) => p.locator('#i-fmt void-toggle[value=italic]').click(), 'fmt', 'italic'],
    ['segmented-control', (p) => p.locator('#i-view void-segmented-control-item[value=grid]').click(), 'view', 'grid'],
    ['combobox', async (p) => { await p.locator('#i-fw input').click(); await p.locator('#i-fw').getByRole('option', { name: 'Lit' }).click(); }, 'framework', 'lit'],
    ['multiselect', async (p) => { await p.locator('#i-skills .void-multiselect-trigger').click(); await p.locator('#i-skills').getByRole('option', { name: 'CSS' }).click(); }, 'skills', 'css'],
    ['calendar', (p) => p.locator('#i-cal').getByRole('button', { name: 'Wednesday, November 18, 2026' }).click(), 'cal', '2026-11-18'],
    ['file-upload', (p) => p.locator('#i-file input[type=file]').setInputFiles({ name: 'a.txt', mimeType: 'text/plain', buffer: Buffer.from('abc') }), 'doc', 'File(a.txt,3)'],
    ['color-picker', async (p) => { await p.locator('#i-color input[type=text], #i-color input:not([type])').first().click(); await p.keyboard.press('ControlOrMeta+a'); await p.keyboard.type('#00ff00'); await p.keyboard.press('Tab'); }, 'color', '#00ff00'],
    ['pin-input', async (p) => { await p.locator('#i-pin input').first().click(); await p.keyboard.type('1234'); }, 'pin', '1234'],
  ];

  for (const [name, act, field, value] of cases) {
    test(`${name}: the submission triggered by void-change carries the new value`, async ({ page }) => {
      await act(page);
      await settle(page);
      const sent = await submits(page);
      expect(sent.length, 'at least one submission').toBeGreaterThan(0);
      expect(sent.at(-1)!.filter(([k]) => k === field).map(([, v]) => v)).toContain(value);
    });
  }
});

// Each control built twice, once directly in the form and once in a fieldset,
// given a value by property and submitted in the same task.
const CONTROLS: { tag: string; html: string; set: string; expect: Entries }[] = [
  { tag: 'void-input', html: '<void-input name="f"></void-input>', set: 'el.value = "x"', expect: [['f', 'x']] },
  { tag: 'void-textarea', html: '<void-textarea name="f"></void-textarea>', set: 'el.value = "x"', expect: [['f', 'x']] },
  { tag: 'void-select', html: '<void-select name="f"><option value="a">A</option><option value="b">B</option></void-select>', set: 'el.value = "b"', expect: [['f', 'b']] },
  { tag: 'void-checkbox', html: '<void-checkbox name="f" value="on1">C</void-checkbox>', set: 'el.checked = true', expect: [['f', 'on1']] },
  { tag: 'void-switch', html: '<void-switch name="f" value="on1">S</void-switch>', set: 'el.checked = true', expect: [['f', 'on1']] },
  { tag: 'void-checkbox-group', html: '<void-checkbox-group name="f" label="G"><void-checkbox value="a">A</void-checkbox><void-checkbox value="b">B</void-checkbox></void-checkbox-group>', set: 'el.value = ["b"]', expect: [['f', 'b']] },
  { tag: 'void-radio-group', html: '<void-radio-group name="f" label="R"><void-radio value="a">A</void-radio><void-radio value="b">B</void-radio></void-radio-group>', set: 'el.value = "b"', expect: [['f', 'b']] },
  { tag: 'void-slider', html: '<void-slider name="f" min="0" max="10" value="1"></void-slider>', set: 'el.value = 7', expect: [['f', '7']] },
  { tag: 'void-number-input', html: '<void-number-input name="f" value="1"></void-number-input>', set: 'el.value = 7', expect: [['f', '7']] },
  { tag: 'void-date-picker', html: '<void-date-picker name="f"></void-date-picker>', set: 'el.value = "2026-01-02"', expect: [['f', '2026-01-02']] },
  { tag: 'void-calendar', html: '<void-calendar name="f"></void-calendar>', set: 'el.value = "2026-01-02"', expect: [['f', '2026-01-02']] },
  { tag: 'void-pin-input', html: '<void-pin-input name="f" length="4"></void-pin-input>', set: 'el.value = "9876"', expect: [['f', '9876']] },
  { tag: 'void-tags-input', html: '<void-tags-input name="f"></void-tags-input>', set: 'el.value = ["a", "b"]', expect: [['f', 'a'], ['f', 'b']] },
  { tag: 'void-color-picker', html: '<void-color-picker name="f" value="#000000"></void-color-picker>', set: 'el.value = "#abcdef"', expect: [['f', '#abcdef']] },
  { tag: 'void-toggle-group', html: '<void-toggle-group name="f" multiple aria-label="T"><void-toggle value="a">A</void-toggle><void-toggle value="b">B</void-toggle></void-toggle-group>', set: 'el.value = "a,b"', expect: [['f', 'a'], ['f', 'b']] },
  { tag: 'void-segmented-control', html: '<void-segmented-control name="f" value="a" aria-label="S"><void-segmented-control-item value="a">A</void-segmented-control-item><void-segmented-control-item value="b">B</void-segmented-control-item></void-segmented-control>', set: 'el.value = "b"', expect: [['f', 'b']] },
  { tag: 'void-combobox', html: '<void-combobox name="f"><void-option value="a">A</void-option><void-option value="b">B</void-option></void-combobox>', set: 'el.value = "b"', expect: [['f', 'b']] },
  { tag: 'void-multiselect', html: '<void-multiselect name="f"><void-option value="a">A</void-option><void-option value="b">B</void-option></void-multiselect>', set: 'el.value = ["a", "b"]', expect: [['f', 'a'], ['f', 'b']] },
  { tag: 'void-editable', html: '<void-editable name="f" value="a"></void-editable>', set: 'el.value = "b"', expect: [['f', 'b']] },
  { tag: 'void-action-input', html: '<void-action-input name="f" action-label="Go"></void-action-input>', set: 'el.value = "x"', expect: [['f', 'x']] },
];

test.describe('same-tick requestSubmit() after setting a value', () => {
  test.beforeEach(async ({ page }) => {
    await load(page, '/blank');
  });

  for (const c of CONTROLS) {
    for (const inFieldset of [false, true]) {
      test(`${c.tag}${inFieldset ? ' in a fieldset' : ''}`, async ({ page }) => {
        const result = await page.evaluate(
          async ({ html, set, inFieldset }) => {
            const form = document.createElement('form');
            form.innerHTML = inFieldset ? `<fieldset>${html}</fieldset>` : html;
            document.body.append(form);
            await (window as any).__settle(form);
            const el = form.querySelector('[name=f]') as any;
            let data: [string, string][] | null = null;
            form.addEventListener('submit', (e) => {
              e.preventDefault();
              data = [...new FormData(form)].map(([k, v]) => [k, String(v)]);
            });
            new Function('el', set)(el);
            form.requestSubmit();
            return data;
          },
          { html: c.html, set: c.set, inFieldset },
        );
        expect(result).toEqual(c.expect);
      });
    }
  }
});

test.describe('required controls block submission until filled', () => {
  test.beforeEach(async ({ page }) => {
    await load(page, '/blank');
  });

  // Controls that always hold a value (slider, colour, segmented, editable, calendar) cannot be empty.
  const REQUIRED = CONTROLS.filter((c) => !['void-slider', 'void-color-picker', 'void-segmented-control', 'void-editable', 'void-calendar'].includes(c.tag)).map((c) =>
    // A select without a placeholder selects its first option, which is valid, as a native select does.
    c.tag === 'void-select' ? { ...c, html: c.html.replace('<void-select name="f"', '<void-select name="f" placeholder="Pick"') } : c,
  );

  for (const c of REQUIRED) {
    test(`${c.tag}`, async ({ page, pageErrors }) => {
      if (c.tag === 'void-number-input') expectedFailure('untracked:number-input-required', 'an empty required number-input is valid and its submit button does nothing');
      if (c.tag === 'void-file-upload') expectedFailure('untracked:required-not-focusable', 'an invalid file-upload does not receive focus on a blocked submit');
      if (['void-pin-input', 'void-tags-input', 'void-toggle-group', 'void-combobox', 'void-multiselect', 'void-date-picker'].includes(c.tag)) {
        expectedFailure('untracked:required-not-focusable', `Firefox reports "The invalid form control is not focusable" for ${c.tag}: the host has no validation anchor, so no message is shown`, { browsers: ['firefox'] });
      }
      const r = await page.evaluate(
        async ({ html, set }) => {
          const form = document.createElement('form');
          form.innerHTML = html.replace(' name="f"', ' name="f" required') + '<button id="go">Go</button>';
          document.body.append(form);
          await (window as any).__settle(form);
          const el = form.querySelector('[name=f]') as any;
          let submitted = 0;
          const invalid: boolean[] = [];
          form.addEventListener('submit', (e) => { e.preventDefault(); submitted++; });
          form.addEventListener('invalid', (e) => invalid.push(el.contains(e.target as Node)), true);
          const isInvalid = () => el.matches(':invalid') || !!el.querySelector(':invalid');
          const empty = { formValid: form.checkValidity(), controlInvalid: isInvalid() };
          invalid.length = 0;
          form.querySelector<HTMLButtonElement>('#go')!.click();
          const blocked = { submitted, invalidEventOnControl: invalid.length > 0 && invalid.every(Boolean), focusMovedToControl: el.contains(document.activeElement) };
          new Function('el', set)(el);
          await (window as any).__settle(form);
          form.querySelector<HTMLButtonElement>('#go')!.click();
          return { empty, blocked, filled: { formValid: form.checkValidity(), controlInvalid: isInvalid(), submitted } };
        },
        { html: c.html, set: c.set },
      );
      expect(r.empty).toEqual({ formValid: false, controlInvalid: true });
      expect(r.blocked).toEqual({ submitted: 0, invalidEventOnControl: true, focusMovedToControl: true });
      expect(r.filled).toEqual({ formValid: true, controlInvalid: false, submitted: 1 });
      // The browser logs when it cannot focus an invalid control to show its message.
      expect(pageErrors).toEqual([]);
    });
  }
});
