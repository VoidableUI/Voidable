// Gives the elements that take their data as a property their data. The
// reference markup is plain HTML, so a chart carries its data as JSON in
// `data-json-<property>` (for example data-json-data) and this copies it onto
// the element. Storybook and the screenshot capture both call it after the
// markup is in the page.
export function hydrate(root = document) {
  for (const el of root.querySelectorAll('*')) {
    for (const attr of el.getAttributeNames()) {
      if (!attr.startsWith('data-json-')) continue;
      el[attr.slice('data-json-'.length)] = JSON.parse(el.getAttribute(attr));
    }
  }
}
