// Turn the small subset of Markdown that JSDoc descriptions and hand-written
// notes use (code spans, **bold**, [links](url)) into safe HTML.
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function inline(text = '') {
  const spans = [];
  let s = String(text).replace(/`([^`]+)`/g, (_, c) => {
    spans.push(`<code>${esc(c)}</code>`);
    return `\u0000${spans.length - 1}\u0000`;
  });
  s = esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g, '<a href="$2">$1</a>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => spans[Number(i)]);
}

/** One line of plain text, for llms output (code spans kept as Markdown). */
export const plain = (text = '') => String(text).replace(/\s*\n\s*/g, ' ').trim();
