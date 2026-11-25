// SPDX-License-Identifier: MIT
//
// /app/pagination/<sid>?page=N[&sort=a] renders a link-mode pagination for
// page N, so following a link is a real navigation and the server sees the URL.
// ?mode=param uses the param attribute instead of href-template.
export function render(_state, { layout, sid, query }) {
  const page = Number(query.get('page') || 1);
  const param = query.get('mode') === 'param';
  const attrs = param ? 'param="page"' : `href-template="/app/pagination/${sid}?page={page}&amp;sort=a"`;
  return layout(`<main style="padding: 1rem">
  <h1 id="current">Page ${page}</h1>
  <void-pagination id="pg" total="20" value="${page}" ${attrs}></void-pagination>
</main>`);
}
