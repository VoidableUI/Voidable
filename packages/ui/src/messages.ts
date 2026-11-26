/**
 * Built-in strings and the locale a component formats with (#29).
 *
 * Every word the library writes itself (an accessible name, a placeholder, an error, the headers of a chart's
 * data table) is a message in this catalogue, in English. `registerMessages(locale, messages)` adds or overrides
 * a locale; a component looks its strings up through the closest `lang` of the element, so a page, a section or
 * one element can be in another language. An attribute the author writes (`aria-label`, `placeholder`, a label
 * part) always wins over a message.
 *
 * Only components that have strings import this module, and the registry is kept on `globalThis` (not in a
 * module variable) so that two copies of the library, or a module-federated one, share one set of locales.
 */

/** What a message may be given: counts, names, formatted values. `undefined` means the message takes none. */
export interface MessageParameters {
  /** The close button of a dialog or drawer. */
  close: undefined;
  /** The close button `toast()` writes. */
  dismiss: undefined;
  /** The remove button of a tag. */
  remove: undefined;
  /** The remove button of one chosen item (a multiselect chip, a tag in a tags input, a file). */
  removeItem: { name: string };
  /** A required control with no value. */
  valueMissing: undefined;
  /** A required checkbox group with nothing checked. */
  'checkboxGroup.required': undefined;
  'breadcrumbs.label': undefined;
  'calendar.label': undefined;
  'calendar.previousMonth': undefined;
  'calendar.nextMonth': undefined;
  'calendar.chooseMonth': undefined;
  'calendar.chooseYear': undefined;
  'calendar.previousYear': undefined;
  'calendar.nextYear': undefined;
  'calendar.previousYears': undefined;
  'calendar.nextYears': undefined;
  'datePicker.placeholder': undefined;
  'datePicker.toggle': undefined;
  'datePicker.dialog': undefined;
  /** A typed date that is not a date: `format` is the field's `format`. */
  'datePicker.invalid': { format: string };
  /** A typed date before `min`; `date` is `min` written in the field's format. */
  'datePicker.tooEarly': { date: string };
  /** A typed date after `max`; `date` is `max` written in the field's format. */
  'datePicker.tooLate': { date: string };
  /** The name of one slide: its place among the others. */
  'carousel.slide': { index: number; count: number };
  /** The name of one dot of the slide indicators. */
  'carousel.goTo': { index: number; count: number };
  'carousel.indicators': undefined;
  'chart.bar': undefined;
  'chart.line': undefined;
  'chart.donut': undefined;
  'chart.gauge': undefined;
  /** Header of the first column of a line or bar chart's data table. */
  'chart.label': undefined;
  'chart.segment': undefined;
  'chart.value': undefined;
  'chart.share': undefined;
  'chart.minimum': undefined;
  'chart.maximum': undefined;
  'colorPicker.label': undefined;
  'composeInput.placeholder': undefined;
  'composeInput.send': undefined;
  'combobox.placeholder': undefined;
  'combobox.empty': undefined;
  'actionInput.action': undefined;
  'editable.placeholder': undefined;
  'errorFallback.heading': undefined;
  'errorFallback.retry': undefined;
  /** The drop zone's text; `browse` is the word `fileUpload.browse`, which the component draws as the link. */
  'fileUpload.prompt': { browse: string };
  'fileUpload.browse': undefined;
  'fileUpload.rejectType': { name: string };
  /** `limit` is the size limit written as a number of bytes in the element's locale. */
  'fileUpload.rejectSize': { name: string; limit: string };
  'fileUpload.rejectCount': { name: string };
  'hamburger.open': undefined;
  'hamburger.close': undefined;
  /** The name of an indicator with no count. */
  'indicator.label': undefined;
  /** The name of an indicator with a count. */
  'indicator.count': { count: number };
  'menu.label': undefined;
  'menu.empty': undefined;
  'multiselect.placeholder': undefined;
  /** The description of a multiselect with chosen options: how many. */
  'multiselect.selected': { count: number };
  'numberInput.label': undefined;
  'numberInput.decrement': undefined;
  'numberInput.increment': undefined;
  'pagination.label': undefined;
  'pagination.previous': undefined;
  'pagination.next': undefined;
  'pinInput.label': undefined;
  /** The name of one cell of a PIN input. */
  'pinInput.digit': { index: number; count: number };
  'sidebar.label': undefined;
  'spinner.label': undefined;
  'statusDot.online': undefined;
  'statusDot.away': undefined;
  'statusDot.offline': undefined;
  'stepper.label': undefined;
  /** The name of the header checkbox of a selectable table: it selects every row. */
  'table.selectAll': undefined;
  /** The name of the header checkbox while a filter hides rows: `count` is how many rows are shown. */
  'table.selectAllShown': { count: number };
  /** The announcement after a filter: `shown` of `total` rows. */
  'table.rowsShown': { shown: number; total: number };
  /** The announcement of the number of rows (no filter, or a manual table). */
  'table.rows': { count: number };
  /** The announcement after a selection changed: how many rows are selected. */
  'table.selected': { count: number };
  'table.noneSelected': undefined;
  /** The announcement after select-all across pages: every one of `count` rows. */
  'table.allSelected': { count: number };
  /** The announcements after sorting; `column` is the column's name. */
  'table.sortedAscending': { column: string };
  'table.sortedDescending': { column: string };
  'table.sortCleared': { column: string };
  'tagsInput.placeholder': undefined;
  'toast.region': undefined;
}

export type MessageKey = keyof MessageParameters;

/** What a message function is told besides its parameters. */
export interface MessageContext {
  /** The locale the message was registered for (`ar`, `pt-br`): use it for number formatting. */
  locale: string;
  /** The word form for a count by this locale's plural rules (`Intl.PluralRules`): `plural(n, { one: 'file', other: 'files' })`. `other` is required. */
  plural: (n: number, forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }) => string;
  /** The number written for this locale. */
  number: (n: number) => string;
}

/** A message: a string, or a function of the parameters the key takes. */
export type Message<K extends MessageKey = MessageKey> = MessageParameters[K] extends undefined
  ? string
  : string | ((params: MessageParameters[K], context: MessageContext) => string);

/** A set of messages for one locale, as `registerMessages` takes it: any of the keys. */
export type Messages = { [K in MessageKey]?: Message<K> };

/** The English the library ships with. */
const english: { [K in MessageKey]: Message<K> } = {
  close: 'Close',
  dismiss: 'Dismiss',
  remove: 'Remove',
  removeItem: ({ name }) => `Remove ${name}`,
  valueMissing: 'Please fill out this field.',
  'checkboxGroup.required': 'Please check at least one box.',
  'breadcrumbs.label': 'Breadcrumb',
  'calendar.label': 'Calendar',
  'calendar.previousMonth': 'Previous month',
  'calendar.nextMonth': 'Next month',
  'calendar.chooseMonth': 'Switch to month picker',
  'calendar.chooseYear': 'Switch to year picker',
  'calendar.previousYear': 'Previous year',
  'calendar.nextYear': 'Next year',
  'calendar.previousYears': 'Previous years',
  'calendar.nextYears': 'Next years',
  'datePicker.placeholder': 'Select date',
  'datePicker.toggle': 'Toggle calendar',
  'datePicker.dialog': 'Choose date',
  'datePicker.invalid': ({ format }) => `Enter a date as ${format} or YYYY-MM-DD.`,
  'datePicker.tooEarly': ({ date }) => `Choose ${date} or a later date.`,
  'datePicker.tooLate': ({ date }) => `Choose ${date} or an earlier date.`,
  'carousel.slide': ({ index, count }) => `${index} of ${count}`,
  'carousel.goTo': ({ index }) => `Go to slide ${index}`,
  'carousel.indicators': 'Slide indicators',
  'chart.bar': 'Bar chart',
  'chart.line': 'Line chart',
  'chart.donut': 'Donut chart',
  'chart.gauge': 'Gauge chart',
  'chart.label': 'Label',
  'chart.segment': 'Segment',
  'chart.value': 'Value',
  'chart.share': 'Share',
  'chart.minimum': 'Minimum',
  'chart.maximum': 'Maximum',
  'colorPicker.label': 'Color picker',
  'composeInput.placeholder': 'Type a message...',
  'composeInput.send': 'Send',
  'combobox.placeholder': 'Search...',
  'combobox.empty': 'No options found',
  'actionInput.action': 'Action',
  'editable.placeholder': 'Click to edit',
  'errorFallback.heading': 'Something went wrong',
  'errorFallback.retry': 'Try again',
  'fileUpload.prompt': ({ browse }) => `Drop files here or ${browse}`,
  'fileUpload.browse': 'browse',
  'fileUpload.rejectType': ({ name }) => `${name} is not an accepted file type.`,
  'fileUpload.rejectSize': ({ name, limit }) => `${name} is larger than the limit of ${limit}.`,
  'fileUpload.rejectCount': ({ name }) => `${name} was not added: only one file can be chosen.`,
  'hamburger.open': 'Menu',
  'hamburger.close': 'Close menu',
  'indicator.label': 'notification',
  'indicator.count': ({ count }, c) => `${c.number(count)} ${c.plural(count, { one: 'notification', other: 'notifications' })}`,
  'menu.label': 'Menu',
  'menu.empty': 'No results found',
  'multiselect.placeholder': 'Select...',
  'multiselect.selected': ({ count }, c) => `${c.number(count)} selected`,
  'numberInput.label': 'Number input',
  'numberInput.decrement': 'Decrement',
  'numberInput.increment': 'Increment',
  'pagination.label': 'Pagination',
  'pagination.previous': 'Previous page',
  'pagination.next': 'Next page',
  'pinInput.label': 'PIN input',
  'pinInput.digit': ({ index, count }) => `Digit ${index} of ${count}`,
  'sidebar.label': 'Sidebar navigation',
  'spinner.label': 'Loading',
  'statusDot.online': 'Online',
  'statusDot.away': 'Away',
  'statusDot.offline': 'Offline',
  'stepper.label': 'Progress',
  'table.selectAll': 'Select all rows',
  'table.selectAllShown': ({ count }, c) => `Select all ${c.number(count)} shown ${c.plural(count, { one: 'row', other: 'rows' })}`,
  'table.rowsShown': ({ shown, total }, c) => `${c.number(shown)} of ${c.number(total)} ${c.plural(total, { one: 'row', other: 'rows' })}`,
  'table.rows': ({ count }, c) => `${c.number(count)} ${c.plural(count, { one: 'row', other: 'rows' })}`,
  'table.selected': ({ count }, c) => `${c.number(count)} selected`,
  'table.noneSelected': 'No rows selected',
  'table.allSelected': ({ count }, c) => `All ${c.number(count)} ${c.plural(count, { one: 'row', other: 'rows' })} selected`,
  'table.sortedAscending': ({ column }) => `Sorted by ${column}, ascending`,
  'table.sortedDescending': ({ column }) => `Sorted by ${column}, descending`,
  'table.sortCleared': ({ column }) => `Sorting by ${column} removed`,
  'tagsInput.placeholder': 'Add tag...',
  'toast.region': 'Notifications',
};

/** The language `lang` gives up for an element with none: the locale of the English messages and of formatting. */
const FALLBACK = 'en';

/** The English messages, for tooling (the catalogue docs, the manifest). */
export const englishMessages: Readonly<{ [K in MessageKey]: Message<K> }> = english;

interface Registry {
  locales: Map<string, Record<string, unknown>>;
  plurals: Map<string, Intl.PluralRules>;
  /** Elements that looked something up: refreshed when a `lang` above them changes or a locale is registered. */
  watched: Set<WeakRef<Element>>;
  seen: WeakMap<Element, WeakRef<Element>>;
  observer: MutationObserver | null;
}

const REGISTRY = Symbol.for('@voidable/ui/messages');

function registry(): Registry {
  const g = globalThis as unknown as Record<symbol, Registry | undefined>;
  return (g[REGISTRY] ??= {
    locales: new Map([[FALLBACK, english as Record<string, unknown>]]),
    plurals: new Map(),
    watched: new Set(),
    seen: new WeakMap(),
    observer: null,
  });
}

const normalise = (tag: string): string => tag.trim().replace(/_/g, '-').toLowerCase();

/**
 * Adds messages for a locale, or overrides some of the ones it has (also English: `registerMessages('en', {
 * 'pagination.next': 'Next' })`). `locale` is a BCP 47 tag; an element in `pt-BR` uses `pt-BR`, then `pt`, then
 * English, key by key, so a locale only needs the messages that differ from its parent. Elements already on the
 * page are redrawn.
 */
export function registerMessages(locale: string, messages: Messages): void {
  const r = registry();
  const tag = normalise(locale);
  r.locales.set(tag, { ...r.locales.get(tag), ...messages });
  refresh(r, null);
}

/** The `lang` an element is in: its closest non-empty `lang` (the page's included), else English. */
export function langOf(el: Element | null): string {
  if (el === null) return FALLBACK;
  watch(el);
  return el.closest('[lang]:not([lang=""])')?.getAttribute('lang')?.trim() || FALLBACK;
}

/**
 * The locale to format dates and numbers in: the element's own `locale` when it has one, else the closest
 * `lang`, else the page's, else `en-US`.
 */
export function localeOf(el: Element, own?: string | null): string {
  const lang = own || langOf(el);
  return lang === FALLBACK ? 'en-US' : lang;
}

/** `pt-br` gives `pt-br`, `pt`; `zh-hant-tw` gives `zh-hant-tw`, `zh-hant`, `zh`. */
function chain(tag: string): string[] {
  const parts = normalise(tag).split('-');
  const out: string[] = [];
  for (let n = parts.length; n > 0; n--) out.push(parts.slice(0, n).join('-'));
  return out;
}

function context(r: Registry, locale: string): MessageContext {
  let rules = r.plurals.get(locale);
  if (!rules) {
    try {
      rules = new Intl.PluralRules(locale);
    } catch {
      rules = new Intl.PluralRules(FALLBACK);
    }
    r.plurals.set(locale, rules);
  }
  const plural = rules;
  return {
    locale,
    plural: (n, forms) => forms[plural.select(n)] ?? forms.other,
    number: (n) => {
      try {
        return new Intl.NumberFormat(locale).format(n);
      } catch {
        return String(n);
      }
    },
  };
}

/**
 * The message `key` for the language of `el`, with `params` where the key takes them. The search goes from the
 * element's `lang` through its regions to English, per key. The element is redrawn (`requestUpdate`) when
 * that `lang` changes or a locale is registered, so call it from `render()` or `updated()`.
 */
export function msg<K extends MessageKey>(
  el: Element | null,
  key: K,
  ...params: MessageParameters[K] extends undefined ? [] : [MessageParameters[K]]
): string {
  const r = registry();
  const tag = langOf(el);
  for (const candidate of [...chain(tag), FALLBACK]) {
    const found = r.locales.get(candidate)?.[key] as Message | undefined;
    if (found === undefined) continue;
    if (typeof found === 'string') return found;
    return (found as (p: unknown, c: MessageContext) => string)(params[0], context(r, candidate));
  }
  return key;
}

/**
 * Writes `text` as the host's name (`aria-label` unless `attr` says otherwise) when the author wrote none. A
 * name the author wrote, or an element's own `aria-labelledby`, always wins; one this wrote earlier is replaced.
 */
const written = new WeakMap<Element, Map<string, string>>();
export function nameHost(
  el: Element,
  text: string | null,
  set: (name: string, value: string | null) => void,
  attr = 'aria-label',
): void {
  const mine = written.get(el)?.get(attr);
  const current = el.getAttribute(attr);
  if (current !== null && current !== mine) return;
  if (text === null) written.get(el)?.delete(attr);
  else (written.get(el) ?? written.set(el, new Map()).get(el)!).set(attr, text);
  set(attr, text);
}

/** Starts refreshing `el` when its language changes. One observer serves every element. */
function watch(el: Element): void {
  if (typeof document === 'undefined' || !('requestUpdate' in el)) return;
  const r = registry();
  if (r.seen.has(el)) return;
  const ref = new WeakRef(el);
  r.seen.set(el, ref);
  r.watched.add(ref);
  if (!r.observer) {
    r.observer = new MutationObserver((records) => refresh(r, records.map((rec) => rec.target)));
    r.observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'], subtree: true });
  }
}

/** Redraws the watched elements under one of `targets` (all of them when null); forgets the ones that are gone. */
function refresh(r: Registry, targets: Node[] | null): void {
  for (const ref of r.watched) {
    const el = ref.deref();
    if (!el) {
      r.watched.delete(ref);
      continue;
    }
    if (targets === null || targets.some((t) => t.contains(el))) (el as unknown as { requestUpdate(): void }).requestUpdate();
  }
}
