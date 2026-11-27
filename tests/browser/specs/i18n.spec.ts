// SPDX-License-Identifier: MIT
//
// Built-in strings and locale (#29). One page renders the same sixteen components under lang="fr", under
// lang="ar" dir="rtl" and under the page's English, and the specs read what each says through the accessibility
// tree (accessible names, roles) and the visible text: the strings come from the messages the shipped
// languages register, the month and weekday names, the first day of the week and the digits from Intl. A change
// of `lang` redraws them without resetting what the user was doing, also through a server morph.
import { test, expect, load, settle, type Page } from '../helpers/test';

/** What this browser's Intl says, evaluated on the page, so the spec holds whatever the engine's CLDR data. */
const intl = (page: Page, lang: string, what: 'digits' | 'month' | 'weekday' | 'week', arg?: number): Promise<any> =>
  page.evaluate(
    ([lang, what, arg]) => {
      if (what === 'digits') return new Intl.NumberFormat(lang as string, { useGrouping: false }).format(arg as number);
      if (what === 'month') return new Intl.DateTimeFormat(lang as string, { month: 'long', year: 'numeric', calendar: 'gregory' }).format(new Date(2024, 2, 1));
      if (what === 'weekday') return new Intl.DateTimeFormat(lang as string, { weekday: 'long', calendar: 'gregory' }).format(new Date(2024, 0, 7 + (arg as number)));
      const l = new Intl.Locale(lang as string) as Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } };
      const info = typeof l.getWeekInfo === 'function' ? l.getWeekInfo() : l.weekInfo;
      return info ? info.firstDay % 7 : 0;
    },
    [lang, what, arg ?? 0] as const,
  );

const section = (page: Page, id: 'fr' | 'ar' | 'en') => page.locator(`#${id}`);

/**
 * The components, written with no name and no placeholder on purpose: what they say is the default message of the
 * language. They are put in from here, not written in the page, because the markup check asks every one for a name.
 */
const KIT = `
  <void-pagination total="5" value="2"></void-pagination>
  <void-breadcrumbs><void-breadcrumbs-list><void-breadcrumbs-item><a href="/">Home</a></void-breadcrumbs-item><void-breadcrumbs-item aria-current="page">Page</void-breadcrumbs-item></void-breadcrumbs-list></void-breadcrumbs>
  <void-calendar value="2024-03-15"></void-calendar>
  <void-date-picker min="2024-03-10"></void-date-picker>
  <void-number-input value="1234.5" precision="2"></void-number-input>
  <void-combobox><void-combobox-content><void-option value="a">A</void-option></void-combobox-content></void-combobox>
  <void-pin-input length="4"></void-pin-input>
  <void-spinner></void-spinner>
  <void-status-dot status="away"></void-status-dot>
  <void-indicator count="3"><span>Inbox</span></void-indicator>
  <void-tags-input value='["Tag"]'></void-tags-input>
  <void-file-upload></void-file-upload>
  <void-error-fallback retryable></void-error-fallback>
  <void-hamburger></void-hamburger>
  <void-stepper value="1" steps="A,B,C"></void-stepper>
  <void-donut-chart data='{"segments":[{"name":"Search","value":75},{"name":"Direct","value":25}]}' style="width: 160px; height: 160px; --void-anim-scale: 0"></void-donut-chart>
  <void-multiselect><void-multiselect-content><void-option value="a" selected>A</void-option></void-multiselect-content></void-multiselect>
`;

test.beforeEach(async ({ page }) => {
  await load(page, '/i18n');
  await page.evaluate((kit) => {
    for (const id of ['fr', 'ar', 'en']) document.getElementById(id)!.innerHTML = kit;
  }, KIT);
  await settle(page);
});

test.describe('French', () => {
  test('names, placeholders and visible text', async ({ page }) => {
    const s = section(page, 'fr');
    await expect(s.getByRole('navigation', { name: 'Fil d’Ariane' })).toBeVisible();
    await expect(s.getByRole('button', { name: 'Page précédente' })).toBeVisible();
    await expect(s.getByRole('button', { name: 'Page suivante' })).toBeVisible();
    await expect(s.getByRole('group', { name: 'Calendrier' })).toBeVisible();
    await expect(s.getByRole('button', { name: 'Mois suivant' })).toBeVisible();
    await expect(s.getByRole('combobox', { name: 'Choisir une date' })).toBeVisible();
    await expect(s.getByRole('button', { name: 'Afficher ou masquer le calendrier' })).toBeAttached();
    await expect(s.getByRole('spinbutton')).toHaveValue('1234,50');
    await expect(s.getByRole('button', { name: 'Diminuer' })).toBeVisible();
    await expect(s.getByRole('button', { name: 'Augmenter' })).toBeVisible();
    await expect(s.getByRole('combobox', { name: 'Rechercher…' })).toBeVisible();
    await expect(s.getByRole('group', { name: 'Code PIN' })).toBeVisible();
    await expect(s.getByRole('textbox', { name: 'Chiffre 1 sur 4' })).toBeVisible();
    await expect(s.getByRole('status', { name: 'Chargement' })).toBeVisible();
    await expect(s.getByRole('status', { name: 'Absent' })).toBeVisible();
    await expect(s.getByRole('status', { name: '3 notifications' })).toBeVisible();
    await expect(s.getByRole('button', { name: 'Retirer Tag' })).toBeVisible();
    await expect(s.locator('void-file-upload')).toContainText('Déposez des fichiers ici ou parcourez votre appareil');
    await expect(s.locator('void-error-fallback')).toContainText('Une erreur est survenue');
    await expect(s.getByRole('button', { name: 'Réessayer' })).toBeVisible();
    await expect(s.getByRole('navigation', { name: 'Progression' })).toBeVisible();
    await expect(s.locator('void-multiselect [role=combobox]')).toHaveAttribute('aria-description', '1 sélectionné');
  });

  test('the calendar writes month and weekday names in French and starts on Monday', async ({ page }) => {
    const cal = section(page, 'fr').locator('void-calendar');
    await expect(cal.locator('.void-calendar-title')).toHaveText(await intl(page, 'fr', 'month'));
    const heads = cal.locator('.void-calendar-weekday');
    const first = await intl(page, 'fr', 'week');
    await expect(heads.first()).toHaveAttribute('aria-label', await intl(page, 'fr', 'weekday', first));
    expect(first).toBe(1);
    // A day announces the long date.
    await expect(cal.getByRole('button', { name: /vendredi 15 mars 2024/i })).toBeVisible();
  });

  test('the chart data table is in French', async ({ page }) => {
    const chart = section(page, 'fr').locator('void-donut-chart');
    await expect(chart).toHaveAttribute('role', 'figure');
    await expect(chart.getByRole('table', { name: 'Graphique en anneau' })).toBeAttached();
    await expect(chart.getByRole('columnheader')).toHaveText(['Segment', 'Valeur', 'Part']);
    const percent = await page.evaluate(() => new Intl.NumberFormat('fr', { style: 'percent', maximumFractionDigits: 1 }).format(0.75));
    await expect(chart.getByRole('row').nth(1).getByRole('cell').last()).toHaveText(percent);
  });

  test('a typed date that is refused is explained in French', async ({ page }) => {
    const picker = section(page, 'fr').locator('void-date-picker');
    const field = picker.getByRole('combobox');
    await field.fill('pas une date');
    await field.blur();
    await expect(picker.getByRole('alert')).toHaveText('Veuillez saisir une date au format MM/DD/YYYY ou AAAA-MM-JJ.');
  });
});

test.describe('Arabic, right to left', () => {
  test('names, placeholders and visible text', async ({ page }) => {
    const s = section(page, 'ar');
    await expect(s.getByRole('navigation', { name: 'مسار التنقل' })).toBeVisible();
    await expect(s.getByRole('button', { name: 'الصفحة السابقة' })).toBeVisible();
    await expect(s.getByRole('button', { name: 'الصفحة التالية' })).toBeVisible();
    await expect(s.getByRole('group', { name: 'التقويم' })).toBeVisible();
    await expect(s.getByRole('button', { name: 'الشهر التالي' })).toBeVisible();
    await expect(s.getByRole('combobox', { name: 'اختر تاريخًا' })).toBeVisible();
    await expect(s.getByRole('button', { name: 'زيادة' })).toBeVisible();
    await expect(s.getByRole('button', { name: 'إنقاص' })).toBeVisible();
    await expect(s.getByRole('combobox', { name: 'بحث...' })).toBeVisible();
    await expect(s.getByRole('group', { name: 'رمز PIN' })).toBeVisible();
    await expect(s.getByRole('textbox', { name: 'الرقم 1 من 4' })).toBeVisible();
    await expect(s.getByRole('status', { name: 'جارٍ التحميل' })).toBeVisible();
    await expect(s.getByRole('status', { name: 'غير متواجد' })).toBeVisible();
    await expect(s.getByRole('button', { name: 'إزالة Tag' })).toBeVisible();
    await expect(s.locator('void-file-upload')).toContainText('أفلت الملفات هنا أو تصفّح');
    await expect(s.locator('void-error-fallback')).toContainText('حدث خطأ ما');
    await expect(s.getByRole('button', { name: 'إعادة المحاولة' })).toBeVisible();
    await expect(s.getByRole('navigation', { name: 'التقدّم' })).toBeVisible();
    await expect(s.getByRole('button', { name: 'القائمة', exact: true })).toBeVisible();
  });

  test('the indicator chooses the plural form and writes the number in Arabic', async ({ page }) => {
    const three = await intl(page, 'ar', 'digits', 3);
    await expect(section(page, 'ar').getByRole('status', { name: `${three} إشعارات` })).toBeVisible();
    const indicator = section(page, 'ar').locator('void-indicator');
    for (const [count, name] of [[1, 'إشعار واحد'], [2, 'إشعاران'], [0, 'لا إشعارات']] as const) {
      await indicator.evaluate((el: any, n) => { el.count = n; }, count);
      await settle(page);
      await expect(indicator).toHaveAttribute('aria-label', name);
    }
    await indicator.evaluate((el: any) => { el.count = 11; });
    await settle(page);
    expect(await indicator.getAttribute('aria-label')).toContain('إشعارًا');
  });

  test('the number input writes the number in the digits and separator of the language', async ({ page }) => {
    const expected = await page.evaluate(() => new Intl.NumberFormat('ar', { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(1234.5));
    await expect(section(page, 'ar').getByRole('spinbutton')).toHaveValue(expected);
  });

  test('the calendar writes Arabic month and weekday names and starts where the locale does', async ({ page }) => {
    const cal = section(page, 'ar').locator('void-calendar');
    await expect(cal.locator('.void-calendar-title')).toHaveText(await intl(page, 'ar', 'month'));
    const first = await intl(page, 'ar', 'week');
    await expect(cal.locator('.void-calendar-weekday').first()).toHaveAttribute('aria-label', await intl(page, 'ar', 'weekday', first));
  });

  test('the chart data table is in Arabic', async ({ page }) => {
    const chart = section(page, 'ar').locator('void-donut-chart');
    await expect(chart.getByRole('table', { name: 'مخطط حلقي' })).toBeAttached();
    await expect(chart.getByRole('columnheader')).toHaveText(['الجزء', 'القيمة', 'النسبة']);
  });
});

test.describe('English and what the author writes', () => {
  test('the same components say English with no lang elsewhere on the page', async ({ page }) => {
    const s = section(page, 'en');
    await expect(s.getByRole('button', { name: 'Next page' })).toBeVisible();
    await expect(s.getByRole('combobox', { name: 'Select date' })).toBeVisible();
    await expect(s.getByRole('spinbutton')).toHaveValue('1234.50');
    await expect(s.getByRole('status', { name: '3 notifications' })).toBeVisible();
    await expect(s.locator('void-calendar .void-calendar-title')).toHaveText('March 2024');
    await expect(s.locator('void-calendar .void-calendar-weekday').first()).toHaveAttribute('aria-label', 'Sunday');
    await expect(s.locator('void-file-upload')).toContainText('Drop files here or browse');
  });

  test('a name and a placeholder the author wrote win in every language', async ({ page }) => {
    await page.evaluate(() => {
      const fr = document.getElementById('fr')!;
      fr.insertAdjacentHTML('beforeend', '<void-breadcrumbs id="own-crumbs" aria-label="Trail"><void-breadcrumbs-list><void-breadcrumbs-item>x</void-breadcrumbs-item></void-breadcrumbs-list></void-breadcrumbs><void-combobox id="own-combo" placeholder="Ville"><void-combobox-content><void-option value="a">A</void-option></void-combobox-content></void-combobox><void-spinner id="own-spin" label="Chargement des commandes"></void-spinner><void-date-picker id="own-date" placeholder="Jour"></void-date-picker>');
    });
    await settle(page);
    const fr = section(page, 'fr');
    await expect(fr.locator('#own-crumbs')).toHaveAttribute('aria-label', 'Trail');
    await expect(fr.getByRole('combobox', { name: 'Ville' })).toBeVisible();
    await expect(fr.getByRole('status', { name: 'Chargement des commandes' })).toBeVisible();
    await expect(fr.getByRole('combobox', { name: 'Jour' })).toBeVisible();
    await page.evaluate(() => { document.getElementById('fr')!.lang = 'ar'; });
    await settle(page);
    await expect(fr.locator('#own-crumbs')).toHaveAttribute('aria-label', 'Trail');
    await expect(fr.getByRole('combobox', { name: 'Ville' })).toBeVisible();
    await expect(fr.getByRole('combobox', { name: 'Jour' })).toBeVisible();
  });
});

test.describe('a change of lang', () => {
  test('on the page redraws every component under it, and only those', async ({ page }) => {
    await page.evaluate(() => { document.documentElement.lang = 'fr'; });
    await settle(page);
    await expect(section(page, 'en').getByRole('button', { name: 'Page suivante' })).toBeVisible();
    await expect(section(page, 'en').locator('void-calendar .void-calendar-title')).toHaveText(await intl(page, 'fr', 'month'));
    await expect(section(page, 'ar').getByRole('button', { name: 'الصفحة التالية' })).toBeVisible();
    await page.evaluate(() => { document.documentElement.lang = 'en'; });
    await settle(page);
    await expect(section(page, 'en').getByRole('button', { name: 'Next page' })).toBeVisible();
  });

  test('keeps what the user was doing', async ({ page }) => {
    const s = section(page, 'fr');
    await s.getByRole('button', { name: 'Mois suivant' }).click();
    const field = s.locator('void-date-picker').getByRole('combobox');
    await field.fill('12/31/2024');
    const number = s.getByRole('spinbutton');
    await number.fill('77,5');
    await page.evaluate(() => { document.getElementById('fr')!.lang = 'ar'; document.getElementById('fr')!.dir = 'rtl'; });
    await settle(page);
    const april = await page.evaluate(() => new Intl.DateTimeFormat('ar', { month: 'long', year: 'numeric', calendar: 'gregory' }).format(new Date(2024, 3, 1)));
    await expect(s.locator('void-calendar .void-calendar-title')).toHaveText(april);
    await expect(s.getByRole('button', { name: 'الشهر التالي' })).toBeVisible();
    await expect(s.locator('void-date-picker').getByRole('combobox')).toHaveValue('12/31/2024');
    await expect(s.locator('void-number-input input')).toHaveValue('77,5');
  });
});

// A server patch that changes `lang` on a wrapper re-renders no component: the strings follow in place, and what the
// user typed or chose stays, through each adapter's morph.
for (const engine of ['turbo', 'morphdom', 'alpine'] as const) {
  test.describe(`${engine} morph`, () => {
    const app = (lang: string) => `
      <div id="app" lang="${lang}">
        <void-calendar id="cal" value="2024-03-15"></void-calendar>
        <void-date-picker id="dp"></void-date-picker>
        <void-number-input id="num" value="3" precision="1"></void-number-input>
        <void-tags-input id="tags" value='["a","b"]'></void-tags-input>
        <void-pagination id="pg" total="5" value="2"></void-pagination>
        <void-spinner id="sp"></void-spinner>
      </div>`;

    test('a patch of lang updates the words and keeps the state', async ({ page }) => {
      await load(page, `/morph-${engine}`);
      const render = (h: string) => page.evaluate((x) => (window as any).__morph.render(x), h);
      const morph = (h: string) => page.evaluate((x) => (window as any).__morph.morph(x), h);
      await render(app('fr'));
      await expect(page.getByRole('button', { name: 'Page suivante' })).toBeVisible();
      await expect(page.getByRole('status', { name: 'Chargement' })).toBeVisible();

      await page.locator('#cal').getByRole('button', { name: 'Mois suivant' }).click();
      await page.locator('#dp').getByRole('combobox').fill('12/31/2024');
      const hosts = await page.evaluate(() => {
        (window as any).__hosts = ['cal', 'dp', 'num', 'tags', 'pg', 'sp'].map((id) => document.getElementById(id));
        return true;
      });
      expect(hosts).toBe(true);

      await morph(app('ar'));
      const april = await page.evaluate(() => new Intl.DateTimeFormat('ar', { month: 'long', year: 'numeric', calendar: 'gregory' }).format(new Date(2024, 3, 1)));
      await expect(page.getByRole('button', { name: 'الصفحة التالية' })).toBeVisible();
      await expect(page.getByRole('status', { name: 'جارٍ التحميل' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'إزالة a' })).toBeVisible();
      await expect(page.locator('#cal .void-calendar-title')).toHaveText(april);
      await expect(page.locator('#dp').getByRole('combobox')).toHaveValue('12/31/2024');
      expect(await page.evaluate(() => (window as any).__hosts.every((h: Element) => h.isConnected && document.getElementById(h.id) === h)), 'the same elements').toBe(true);

      await morph(app('fr'));
      await expect(page.getByRole('button', { name: 'Page suivante' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Retirer a' })).toBeVisible();
      await expect(page.locator('#dp').getByRole('combobox')).toHaveValue('12/31/2024');
    });
  });
}

