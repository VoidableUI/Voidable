// The theme builder's token export, loaded only when a download is asked
// for. It runs the package's own exporter (build/tokens.js, the code that
// writes @voidable/theme/dtcg/*.tokens.json at build time) over the theme's
// CSS source with the knob values of the theme in progress.
import primitives from '../../../packages/theme/src/primitives.css?raw';
import knobsCss from '../../../packages/theme/src/knobs.css?raw';
import tokens from '../../../packages/theme/src/tokens.css?raw';
import { environment, knobsToDtcg, readSkin, readSource, resolve, toDtcg } from '../../../packages/theme/build/tokens.js';
import registry from '../../../packages/theme/dist/component-tokens.json';

const skins = import.meta.glob<string>('../../../packages/theme/src/skins/*.css', { eager: true, query: '?raw', import: 'default' });

export function exportDtcg(what: 'knobs' | 'dark' | 'light', values: Record<string, string>, meta: { skin?: string; name?: string; url: string }): string {
  const extension = { name: meta.name || undefined, skin: meta.skin, builder: meta.url };
  if (what === 'knobs') {
    return `${JSON.stringify(knobsToDtcg(values, { description: `${meta.name || 'A'} Voidable theme: the knob values. Everything else is derived from them in CSS.`, extension }), null, 2)}\n`;
  }
  const source = readSource({ primitives, knobs: knobsCss, tokens });
  const skinCss = meta.skin ? Object.entries(skins).find(([path]) => path.endsWith(`/${meta.skin}.css`))?.[1] : undefined;
  const env = environment(source, { scheme: what, knobs: values, skin: skinCss ? readSkin(skinCss) : {} });
  const resolved = resolve(env);
  // Component tokens, grouped by component, as aliases of their defaults (or the skin's assignment).
  const componentTokens = Object.entries(registry.components as Record<string, { name: string; default: string; description: string }[]>).flatMap(([component, list]) => list.map((t) => ({ ...t, component })));
  const doc = toDtcg(resolved, {
    description: `${meta.name || 'A'} Voidable theme, ${what} colour scheme: every token, resolved.`,
    extension: { ...extension, scheme: what },
  }, { componentTokens, env });
  return `${JSON.stringify(doc, null, 2)}\n`;
}
