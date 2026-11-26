// Analyzer plugins for @custom-elements-manifest/analyzer, used by
// ../custom-elements-manifest.config.js.
//
// Component source is mostly not annotated with @fires/@slot/@cssprop JSDoc and is
// out of scope for the manifest tooling, so these plugins recover what can be
// derived statically from the code and clean up what should not ship:
//
// 1. litPropertyPlugin: Lit's default attribute name for a property without
//    an explicit `attribute` option is the property name lowercased
//    (`fooBar` -> `foobar`), not the property name verbatim, which is what
//    the analyzer emits. Also falls back to the Lit `type` option for fields
//    the analyzer could not type, and restores `@property` defaults it drops
//    for member-access initializers (`Number.NEGATIVE_INFINITY`).
//
// 2. voidEventsPlugin: the analyzer only finds `this.dispatchEvent(new X())`
//    inside method declarations. Most components dispatch from arrow-function
//    class fields or on other elements, which it misses. This plugin walks the
//    whole class body for `new CustomEvent('void-…', init)` and records the
//    event name and, where statically evident, the `detail` shape. Anything it
//    cannot resolve is `unknown` rather than guessed. Events already present
//    (for example from `@fires` JSDoc) are merged, not replaced. `new Event()`
//    and non-literal or non-`void-` event names fail the build.
//
// 3. manifestSupplementPlugin: merges ./supplement.js (attributes with no property
//    that a parent or the theme reads, bubbling ancestor events, detail types
//    inference cannot see).
//
//    The same plugin writes `voidParents`, `voidRequires` and `voidHints` onto
//    declarations (allowed ancestors, required children, advice for guessed
//    attributes); the `voidable` tool and the dev-mode runtime warnings read them.
//    It also writes `voidParts` (the explicit parts of a component, #52: which
//    part elements it takes, which are required, how many, in which order,
//    which are CSS-only and their attributes, the one-line correct markup and
//    the implicit forms they replaced); everything downstream that knows about
//    parts (typings, React wrappers, dev warnings, voidable check, docs) reads
//    it from there.
//
// 3b. hostAttributesPlugin: attributes a component sets on its own host with
//    `setHostAttribute('name', ...)` that are not role, tabindex or aria-*
//    (`dragging`, `visible`). They are not API, but a validator must not report
//    them as unknown. Written as `voidHostAttributes`.
//
// 4. publishedManifestPlugin: makes the manifest describe what ships. Module
//    paths point at dist/ entry modules; internal modules that are bundled
//    into chunks (form-control, projection, chart helpers) are dropped and
//    references to them keep only the symbol name. Private, protected,
//    underscore/#-prefixed, computed-key and DOM/Lit lifecycle-override members
//    are removed.

import {
  accessibleName,
  allowedParents,
  ancestorEvents,
  parentSetAttributes,
  attributeHints,
  extraAttributes,
  eventDetails,
  nativeControls,
  parts,
  renamed,
  requiredChildren,
} from './supplement.js';

/** @typedef {import('typescript')} TS */

const EVENT_PREFIX = 'void-';
const IDENTIFIER = /^[A-Za-z$][\w$]*$/;

// Overrides of DOM / Lit / form-associated element API: not component API.
const HIDDEN_MEMBERS = new Set([
  'formAssociated',
  'formAssociatedCallback',
  'formResetCallback',
  'formDisabledCallback',
  'formStateRestoreCallback',
  'attributeChangedCallback',
  'adoptedCallback',
  'dispatchEvent',
  'requestUpdate',
  'insertBefore',
  'removeChild',
  'replaceChild',
  'replaceChildren',
  'textContent',
]);

function decoratorCall(ts, node, name) {
  const mods = ts.canHaveDecorators?.(node) ? ts.getDecorators(node) : node.modifiers;
  return (mods ?? []).find(
    (m) =>
      ts.isDecorator(m) &&
      ts.isCallExpression(m.expression) &&
      m.expression.expression.getText() === name,
  );
}

/**
 * The manifest declaration for a class node: the class itself, or, for the
 * class returned by a mixin function (`function Mixin(Base) { class X extends
 * Base {} }`), the analyzer's `mixin` declaration named after the function.
 */
function findClassDoc(ts, moduleDoc, classNode) {
  const decls = moduleDoc?.declarations ?? [];
  const own = decls.find((d) => d.kind === 'class' && d.name === classNode.name?.getText());
  if (own) return own;
  for (let p = classNode.parent; p; p = p.parent) {
    let name;
    if (ts.isFunctionDeclaration(p) && p.name) name = p.name.getText();
    else if (ts.isVariableDeclaration(p)) name = p.name.getText();
    if (name) return decls.find((d) => d.kind === 'mixin' && d.name === name);
  }
  return undefined;
}

function location(ts, node) {
  const sf = node.getSourceFile();
  const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart());
  return `${sf.fileName}:${line + 1}:${character + 1}`;
}

// Lit `type` converter option -> TypeScript type.
const LIT_TYPES = { String: 'string', Number: 'number', Boolean: 'boolean', Array: 'unknown[]', Object: 'object' };

export function litPropertyPlugin() {
  return {
    name: 'VOIDABLE - LIT-PROPERTY',
    analyzePhase({ ts, node, moduleDoc }) {
      if (!ts.isClassDeclaration(node)) return;
      const classDoc = findClassDoc(ts, moduleDoc, node);
      if (!classDoc) return;

      for (const member of node.members) {
        const dec = decoratorCall(ts, member, 'property');
        if (!dec || !member.name) continue;
        const options = dec.expression.arguments.find((a) => ts.isObjectLiteralExpression(a));
        const option = (key) =>
          options?.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText() === key);
        const propName = member.name.getText();
        const field = classDoc.members?.find((m) => m.kind === 'field' && m.name === propName);
        const attr = classDoc.attributes?.find((a) => a.fieldName === propName);

        const litType = LIT_TYPES[option('type')?.initializer.getText()];
        if (litType && field && !field.type) {
          field.type = { text: litType };
          if (attr && !attr.type) attr.type = { text: litType };
        }

        if (field && field.default === undefined && ts.isPropertyDeclaration(member) && member.initializer) {
          field.default = member.initializer.getText();
          if (attr && attr.default === undefined) attr.default = field.default;
        }

        if (option('attribute')) continue;
        const attrName = propName.toLowerCase();
        if (attrName === propName) continue;
        if (attr && attr.name === propName) attr.name = attrName;
        if (field && field.attribute === propName) field.attribute = attrName;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Event detail inference
// ---------------------------------------------------------------------------

/** Union of inferred types; any `unknown` makes the whole union `unknown`. */
function union(types) {
  const parts = [...new Set(types.flatMap((t) => t.split(' | ')))];
  if (parts.includes('unknown')) return 'unknown';
  return parts.join(' | ');
}

const without = (type, drop) => union(type.split(' | ').filter((t) => !drop.includes(t)));

const MATH_NUMBER = /^Math\.\w+$/;

/** Infer a TypeScript type text for a `detail` expression; 'unknown' when not evident. */
function inferType(ts, expr, ctx, depth = 0) {
  if (!expr || depth > 6) return 'unknown';
  if (ts.isParenthesizedExpression(expr) || ts.isNonNullExpression(expr)) {
    return inferType(ts, expr.expression, ctx, depth + 1);
  }
  if (ts.isAsExpression(expr) || ts.isSatisfiesExpression?.(expr)) {
    // `x as const` / `x satisfies T`: the expression's own type is what ships.
    if (ts.isSatisfiesExpression?.(expr) || ts.isConstTypeReference(expr.type)) {
      return inferType(ts, expr.expression, ctx, depth + 1);
    }
    return expr.type.getText();
  }
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr) || ts.isTemplateExpression(expr)) {
    return 'string';
  }
  if (ts.isNumericLiteral(expr)) return 'number';
  if (expr.kind === ts.SyntaxKind.TrueKeyword || expr.kind === ts.SyntaxKind.FalseKeyword) return 'boolean';
  if (expr.kind === ts.SyntaxKind.NullKeyword) return 'null';
  if (expr.kind === ts.SyntaxKind.ThisKeyword) return ctx.className;
  if (ts.isPrefixUnaryExpression(expr)) {
    return expr.operator === ts.SyntaxKind.ExclamationToken ? 'boolean' : 'number';
  }
  if (ts.isConditionalExpression(expr)) {
    return union([inferType(ts, expr.whenTrue, ctx, depth + 1), inferType(ts, expr.whenFalse, ctx, depth + 1)]);
  }
  if (ts.isBinaryExpression(expr)) {
    const op = expr.operatorToken.kind;
    if (op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.QuestionQuestionToken) {
      const left = inferType(ts, expr.left, ctx, depth + 1);
      const right = inferType(ts, expr.right, ctx, depth + 1);
      if (left === 'unknown' || right === 'unknown') return 'unknown';
      return union([without(left, ['null', 'undefined']), right]);
    }
    return 'unknown';
  }
  if (ts.isNewExpression(expr) && ts.isIdentifier(expr.expression)) return expr.expression.getText();
  if (ts.isObjectLiteralExpression(expr)) return objectShape(ts, expr, ctx, depth + 1);
  if (ts.isArrayLiteralExpression(expr)) {
    // `[...this._files]` keeps the element type of the spread source.
    if (expr.elements.length === 1 && ts.isSpreadElement(expr.elements[0])) {
      const inner = inferType(ts, expr.elements[0].expression, ctx, depth + 1);
      return inner.endsWith('[]') ? inner : 'unknown[]';
    }
    return 'unknown[]';
  }
  if (ts.isCallExpression(expr)) {
    const callee = expr.expression;
    if (MATH_NUMBER.test(callee.getText())) return 'number';
    if (ts.isPropertyAccessExpression(callee)) {
      const method = callee.name.getText();
      if (callee.expression.kind === ts.SyntaxKind.ThisKeyword) return methodReturnType(ts, method, ctx);
      if (method === 'getAttribute') return 'string | null';
      if (method === 'join' || method === 'toString' || method === 'toFixed') return 'string';
    }
    if (ts.isIdentifier(callee) && callee.text === 'String') return 'string';
    if (ts.isIdentifier(callee) && callee.text === 'Number') return 'number';
    return 'unknown';
  }
  if (ts.isPropertyAccessExpression(expr) && expr.expression.kind === ts.SyntaxKind.ThisKeyword) {
    return memberType(ts, expr.name.getText(), ctx);
  }
  if (ts.isIdentifier(expr)) return identifierType(ts, expr, ctx, depth);
  return 'unknown';
}

function objectShape(ts, obj, ctx, depth) {
  if (obj.properties.length === 0) return 'Record<string, never>';
  const parts = [];
  for (const p of obj.properties) {
    if (ts.isPropertyAssignment(p)) {
      parts.push(`${p.name.getText()}: ${inferType(ts, p.initializer, ctx, depth)}`);
    } else if (ts.isShorthandPropertyAssignment(p)) {
      parts.push(`${p.name.getText()}: ${identifierType(ts, p.name, ctx, depth)}`);
    } else {
      return 'unknown';
    }
  }
  return `{ ${parts.join('; ')} }`;
}

/** Type of `this.<name>`: the class AST's annotation or literal initializer, then the manifest member. */
function memberType(ts, name, ctx) {
  for (const m of ctx.classNode.members) {
    if (!m.name || m.name.getText() !== name) continue;
    if (ts.isGetAccessor(m) && m.type) return m.type.getText();
    if (ts.isPropertyDeclaration(m)) {
      if (m.type) return m.type.getText();
      const init = m.initializer;
      if (init) {
        if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) return 'string';
        if (ts.isNumericLiteral(init)) return 'number';
        if (init.kind === ts.SyntaxKind.TrueKeyword || init.kind === ts.SyntaxKind.FalseKeyword) return 'boolean';
      }
    }
  }
  const field = ctx.classDoc?.members?.find((m) => m.name === name && m.type?.text);
  return field ? field.type.text : 'unknown';
}

/** Declared return type of `this.<name>()`. */
function methodReturnType(ts, name, ctx) {
  for (const m of ctx.classNode.members) {
    if (!m.name || m.name.getText() !== name) continue;
    if (ts.isMethodDeclaration(m) && m.type) return m.type.getText();
    if (ts.isPropertyDeclaration(m) && m.initializer && ts.isArrowFunction(m.initializer) && m.initializer.type) {
      return m.initializer.type.getText();
    }
  }
  return 'unknown';
}

/** Resolve a local identifier to a parameter or `const`/`let` in an enclosing function. */
function identifierType(ts, id, ctx, depth) {
  const name = id.getText();
  if (name === 'undefined') return 'undefined';
  for (let scope = id.parent; scope && scope !== ctx.classNode; scope = scope.parent) {
    if (ts.isFunctionLike(scope)) {
      const param = scope.parameters.find((p) => p.name.getText() === name);
      if (param) return param.type ? param.type.getText() : 'unknown';
    }
    if (ts.isBlock(scope) || ts.isSourceFile(scope)) {
      for (const stmt of scope.statements) {
        if (!ts.isVariableStatement(stmt)) continue;
        for (const decl of stmt.declarationList.declarations) {
          if (decl.name.getText() !== name) continue;
          if (decl.type) return decl.type.getText();
          return inferType(ts, decl.initializer, ctx, depth + 1);
        }
      }
    }
  }
  return 'unknown';
}

function readEventInit(ts, init, ctx) {
  const out = { detail: undefined, bubbles: false };
  if (!init) return out;
  if (!ts.isObjectLiteralExpression(init)) {
    throw new Error(`${location(ts, init)}: CustomEvent init must be an object literal to be documented`);
  }
  for (const p of init.properties) {
    if (!p.name) continue;
    const key = p.name.getText();
    if (key === 'detail') {
      out.detail = ts.isShorthandPropertyAssignment(p)
        ? identifierType(ts, p.name, ctx, 0)
        : inferType(ts, p.initializer, ctx);
    } else if (key === 'bubbles') {
      out.bubbles = ts.isPropertyAssignment(p) && p.initializer.kind === ts.SyntaxKind.TrueKeyword;
    }
  }
  return out;
}

const eventType = (detail) => (detail === 'null' ? 'CustomEvent' : `CustomEvent<${detail}>`);

export function voidEventsPlugin() {
  return {
    name: 'VOIDABLE - VOID-EVENTS',
    analyzePhase({ ts, node, moduleDoc, context }) {
      if (!ts.isClassDeclaration(node)) return;
      const classDoc = findClassDoc(ts, moduleDoc, node);
      if (!classDoc) return;
      const className = classDoc.name;
      const ctx = { className, classNode: node, classDoc };

      /** @type {Map<string, {details: string[], onOther: boolean, bubbles: boolean}>} */
      const found = new Map();
      const visit = (n) => {
        if (ts.isNewExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'Event') {
          throw new Error(`${location(ts, n)}: dispatch a CustomEvent named 'void-…' instead of new Event()`);
        }
        if (ts.isNewExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'CustomEvent') {
          const nameArg = n.arguments?.[0];
          if (!nameArg || !ts.isStringLiteralLike(nameArg)) {
            throw new Error(`${location(ts, n)}: CustomEvent name must be a string literal to be documented`);
          }
          if (!nameArg.text.startsWith(EVENT_PREFIX)) {
            throw new Error(`${location(ts, n)}: custom event '${nameArg.text}' must be named '${EVENT_PREFIX}…'`);
          }
          const name = nameArg.text;
          const init = readEventInit(ts, n.arguments[1], ctx);
          const entry = found.get(name) ?? { details: [], onOther: false, bubbles: true };
          entry.details.push(init.detail ?? 'null');
          entry.bubbles &&= init.bubbles;
          // `item.dispatchEvent(new CustomEvent(...))`: fired on another element.
          const call = n.parent;
          if (
            call && ts.isCallExpression(call) &&
            ts.isPropertyAccessExpression(call.expression) &&
            call.expression.name.text === 'dispatchEvent' &&
            call.expression.expression.kind !== ts.SyntaxKind.ThisKeyword
          ) {
            entry.onOther = true;
          }
          found.set(name, entry);
        }
        ts.forEachChild(n, visit);
      };
      node.members.forEach(visit);

      context.voidEventBubbles ??= {};
      classDoc.events ??= [];
      for (const [name, { details, onOther, bubbles }] of found) {
        context.voidEventBubbles[`${className} ${name}`] = bubbles;
        // One union per detail shape: `CustomEvent<{ value: string[] } | { value: string }>`.
        const unique = [...new Set(details)];
        const detail = unique.includes('unknown') ? 'unknown' : unique.join(' | ');
        const inferred = eventType(detail);
        const existing = classDoc.events.find((e) => e.name === name);
        if (existing) {
          // Keep JSDoc (`@fires`) descriptions and explicit types; replace only
          // the analyzer's bare `CustomEvent` guess.
          if (!existing.type?.text || existing.type.text === 'CustomEvent') existing.type = { text: inferred };
          if (!existing.description && onOther) existing.description = ON_OTHER;
        } else {
          classDoc.events.push({
            name,
            type: { text: inferred },
            ...(onOther ? { description: ON_OTHER } : {}),
          });
        }
      }
    },
  };
}

const ON_OTHER = 'Dispatched on a child element and bubbles through this element.';

// ---------------------------------------------------------------------------
// Package-level: supplement and published shape
// ---------------------------------------------------------------------------

function allClasses(manifest) {
  return manifest.modules.flatMap((m) => (m.declarations ?? []).filter((d) => d.kind === 'class'));
}

export function manifestSupplementPlugin() {
  return {
    name: 'VOIDABLE - MANIFEST-SUPPLEMENT',
    packageLinkPhase({ customElementsManifest, context }) {
      const byTag = new Map(allClasses(customElementsManifest).filter((d) => d.tagName).map((d) => [d.tagName, d]));
      const get = (tag, field) => {
        const decl = byTag.get(tag);
        if (!decl) throw new Error(`cem/supplement.js ${field ? `(${field}) ` : ''}names unknown tag <${tag}>`);
        return decl;
      };

      for (const [tag, attrs] of Object.entries(extraAttributes)) {
        const decl = get(tag);
        decl.attributes ??= [];
        for (const a of attrs) {
          if (decl.attributes.some((x) => x.name === a.name)) {
            throw new Error(`cem/supplement.js: <${tag}> already has attribute "${a.name}"; remove the entry`);
          }
          decl.attributes.push({ name: a.name, type: { text: a.type }, description: a.description });
        }
      }

      for (const { tag, from, events } of ancestorEvents) {
        const parent = get(tag);
        const child = get(from);
        parent.events ??= [];
        for (const name of events) {
          const source = child.events?.find((e) => e.name === name);
          if (!source) throw new Error(`cem/supplement.js: <${from}> does not dispatch ${name}`);
          if (context.voidEventBubbles?.[`${child.name} ${name}`] === false) {
            throw new Error(`cem/supplement.js: ${name} on <${from}> does not bubble`);
          }
          if (parent.events.some((e) => e.name === name)) {
            throw new Error(`cem/supplement.js: <${tag}> already declares ${name}; remove the entry`);
          }
          parent.events.push({
            name,
            type: { ...source.type },
            description: `Bubbles from a child \`<${from}>\`.`,
          });
        }
      }

      const checkTags = (field, tags) => {
        for (const tag of tags) get(tag, field);
      };
      for (const [tag, names] of Object.entries(parentSetAttributes)) {
        const decl = get(tag, 'parentSetAttributes');
        decl.voidHostAttributes = [...new Set([...(decl.voidHostAttributes ?? []), ...names])].sort();
      }
      // A parent may be a CSS-only part (the list part of a picker), which no class registers.
      const partTags = new Set();
      const collect = (list) => {
        for (const part of list ?? []) {
          partTags.add(part.tag);
          collect(part.parts);
        }
      };
      for (const spec of Object.values(parts)) collect(spec.parts);
      for (const [tag, parents] of Object.entries(allowedParents)) {
        get(tag).voidParents = parents;
        checkTags('allowedParents', parents.filter((t) => !partTags.has(t)));
      }
      for (const [tag, children] of Object.entries(requiredChildren)) {
        get(tag).voidRequires = children;
        checkTags('requiredChildren', children);
      }
      for (const [tag, rule] of Object.entries(accessibleName)) {
        const decl = get(tag, 'accessibleName');
        for (const name of rule.attributes) {
          if (!/^(aria-|title$)/.test(name) && !decl.attributes?.some((a) => a.name === name)) {
            throw new Error(`cem/supplement.js: accessibleName for <${tag}> lists "${name}", which is not an attribute of it`);
          }
        }
        for (const part of rule.parts ?? []) {
          // A part of this component (supplement.js `parts`, at any depth), written before the entry is checked;
          // or a native element it takes as its part (a table's <caption>).
          const has = (list) => list?.some((p) => p.tag === part || has(p.parts));
          const owned = !part.startsWith('void-') || has(parts[tag]?.parts);
          if (!owned) throw new Error(`cem/supplement.js: accessibleName for <${tag}> lists part <${part}>, which is not one of its parts`);
        }
        for (const anc of rule.ancestors ?? []) {
          if (anc.tag !== 'label') get(anc.tag, 'accessibleName');
          const ancDecl = anc.tag === 'label' ? undefined : byTag.get(anc.tag);
          for (const name of anc.attributes ?? []) {
            if (!ancDecl?.attributes?.some((a) => a.name === name)) {
              throw new Error(`cem/supplement.js: accessibleName for <${tag}> lists "${name}" on <${anc.tag}>, which is not its attribute`);
            }
          }
        }
        decl.voidName = rule;
      }
      for (const [tag, hints] of Object.entries(attributeHints)) {
        const decl = get(tag);
        for (const name of Object.keys(hints)) {
          if (decl.attributes?.some((a) => a.name === name)) {
            throw new Error(`cem/supplement.js: <${tag}> has attribute "${name}"; remove the hint`);
          }
        }
        decl.voidHints = hints;
      }

      writeParts(byTag, get);

      for (const [tag, native] of Object.entries(nativeControls)) {
        if (!/^[a-z]+$/.test(native.tag) || !native.fix) throw new Error(`cem/supplement.js nativeControls: <${tag}> needs a native tag and a fix`);
        get(tag, 'nativeControls').voidNative = native;
      }

      for (const [tag, events] of Object.entries(eventDetails)) {
        const decl = get(tag);
        for (const [name, detail] of Object.entries(events)) {
          const event = decl.events?.find((e) => e.name === name);
          if (!event) throw new Error(`cem/supplement.js: <${tag}> does not dispatch ${name}`);
          if (!/\bunknown\b/.test(event.type?.text ?? '')) {
            throw new Error(`cem/supplement.js: ${name} on <${tag}> is already typed (${event.type.text}); remove the entry`);
          }
          event.type = { text: eventType(detail) };
        }
      }

      writeRenamed(get);
    },
  };
}

/**
 * `voidRenamed` on every tag of supplement.js's `renamed` (#23). Fails when an
 * old attribute is still declared, a renamed value is still allowed, an old
 * event is still dispatched, or a rule says neither what to write nor what to do.
 */
function writeRenamed(get) {
  for (const [tag, spec] of Object.entries(renamed)) {
    const decl = get(tag, 'renamed');
    const out = {};
    for (const [name, rule] of Object.entries(spec.attributes ?? {})) {
      if (decl.attributes?.some((a) => a.name === name)) {
        throw new Error(`cem/supplement.js renamed: <${tag}> still has attribute "${name}"`);
      }
      if (!rule.to && !rule.fix && !rule.values) throw new Error(`cem/supplement.js renamed: ${tag} ${name} says nothing to write`);
      if (rule.to && !decl.attributes?.some((a) => a.name === rule.to)) {
        throw new Error(`cem/supplement.js renamed: <${tag}> has no attribute "${rule.to}" (the new name of "${name}")`);
      }
    }
    for (const [attr, values] of Object.entries(spec.values ?? {})) {
      const a = decl.attributes?.find((x) => x.name === attr);
      if (!a) throw new Error(`cem/supplement.js renamed: <${tag}> has no attribute "${attr}"`);
      for (const old of Object.keys(values)) {
        if (new RegExp(`'${old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`).test(a.type?.text ?? '')) {
          throw new Error(`cem/supplement.js renamed: ${attr}="${old}" is still allowed on <${tag}>`);
        }
      }
    }
    for (const name of Object.keys(spec.events ?? {})) {
      if (decl.events?.some((e) => e.name === name)) throw new Error(`cem/supplement.js renamed: <${tag}> still dispatches ${name}`);
    }
    if (spec.attributes || decl.voidRenamed?.attributes) out.attributes = { ...(decl.voidRenamed?.attributes ?? {}), ...(spec.attributes ?? {}) };
    if (spec.values) out.values = spec.values;
    if (spec.events) out.events = spec.events;
    for (const [kind, versions] of Object.entries(spec.since ?? {})) {
      const names = kind === 'attributes' ? spec.attributes : kind === 'values' ? spec.values : spec.events;
      for (const [name, version] of Object.entries(versions)) {
        if (!/^\d+\.\d+$/.test(version)) throw new Error(`cem/supplement.js renamed: <${tag}> since ${kind} ${name}: "${version}" is not a release like "0.10"`);
        if (!names || !Object.hasOwn(names, name)) throw new Error(`cem/supplement.js renamed: <${tag}> since lists ${kind} "${name}", which it does not rename`);
      }
    }
    if (spec.since) out.since = spec.since;
    decl.voidRenamed = out;
  }
}

/**
 * `voidParts` on every component of supplement.js's `parts`: the normalised
 * part tree, with `cssOnly` set for parts no class registers. Registered parts
 * get `voidParents` (their enclosing component or part); legacy attributes
 * become `voidHints` of the tag they were on. Fails on a third level of parts,
 * a part listed twice, a CSS-only part that declares no description, or advice
 * for an attribute that still exists.
 */
function writeParts(byTag, get) {
  const seen = new Set();
  const addHints = (tag, hints) => {
    const decl = get(tag, 'parts.legacy');
    for (const name of Object.keys(hints)) {
      if (decl.attributes?.some((a) => a.name === name)) {
        throw new Error(`cem/supplement.js parts: <${tag}> still has attribute "${name}"; remove the legacy advice`);
      }
    }
    decl.voidHints = { ...(decl.voidHints ?? {}), ...hints };
    // The parts replaced these attributes: report them as legacy markup with the fix (#23).
    const removed = (decl.voidRenamed ??= {}).attributes ??= {};
    for (const [name, fix] of Object.entries(hints)) removed[name] ??= { fix };
  };
  const normalise = (owner, part, depth) => {
    if (depth > 2) throw new Error(`cem/supplement.js parts: <${part.tag}> is a third level of parts under <${owner}>; split the component`);
    if (!/^void-[a-z0-9-]+$/.test(part.tag)) throw new Error(`cem/supplement.js parts: bad tag ${part.tag}`);
    if (seen.has(part.tag)) throw new Error(`cem/supplement.js parts: <${part.tag}> is listed twice`);
    seen.add(part.tag);
    if (!part.description) throw new Error(`cem/supplement.js parts: <${part.tag}> has no description`);
    const cssOnly = !byTag.has(part.tag);
    if (!cssOnly) {
      const decl = byTag.get(part.tag);
      decl.voidParents = [...new Set([...(decl.voidParents ?? []), owner])];
      if (part.attributes) throw new Error(`cem/supplement.js parts: <${part.tag}> is registered; its attributes come from its class`);
    }
    if (part.legacy?.attributes) {
      if (cssOnly) throw new Error(`cem/supplement.js parts: legacy attributes on CSS-only <${part.tag}>`);
      addHints(part.tag, part.legacy.attributes);
    }
    const out = {
      tag: part.tag,
      description: part.description,
      cssOnly,
      ...(part.required ? { required: true } : {}),
      ...(part.max ? { max: part.max } : {}),
      ...(part.control ? { control: true } : {}),
      ...(part.children ? { children: part.children } : {}),
      ...(part.ordered ? { ordered: true } : {}),
      ...(part.transparent ? { transparent: part.transparent } : {}),
      ...(part.legacy ? { legacy: part.legacy } : {}),
      ...(cssOnly ? { attributes: (part.attributes ?? []).map((a) => ({ name: a.name, type: { text: a.type }, description: a.description })) } : {}),
    };
    if (part.parts) out.parts = part.parts.map((child) => normalise(part.tag, child, depth + 1));
    return out;
  };
  for (const [tag, spec] of Object.entries(parts)) {
    const decl = get(tag, 'parts');
    if (!spec.skeleton?.startsWith(`<${tag}`)) throw new Error(`cem/supplement.js parts: <${tag}> needs a skeleton that starts with <${tag}>`);
    if (spec.legacy?.attributes) addHints(tag, spec.legacy.attributes);
    decl.voidParts = {
      children: spec.children ?? 'any',
      ...(spec.ordered ? { ordered: true } : {}),
      ...(spec.transparent ? { transparent: spec.transparent } : {}),
      skeleton: spec.skeleton,
      ...(spec.legacy ? { legacy: spec.legacy } : {}),
      parts: spec.parts.map((part) => normalise(tag, part, 1)),
    };
    for (const removed of Object.keys(spec.legacy?.tags ?? {})) {
      if (byTag.has(removed)) throw new Error(`cem/supplement.js parts: legacy tag <${removed}> is still registered`);
    }
  }
}

const HOST_ATTR_SKIP = /^(role|tabindex|aria-.*)$/;

export function hostAttributesPlugin() {
  return {
    name: 'VOIDABLE - HOST-ATTRIBUTES',
    analyzePhase({ ts, node, moduleDoc }) {
      if (!ts.isClassDeclaration(node)) return;
      const classDoc = findClassDoc(ts, moduleDoc, node);
      if (!classDoc) return;
      const names = new Set();
      const visit = (n) => {
        if (
          ts.isCallExpression(n) &&
          ts.isPropertyAccessExpression(n.expression) &&
          n.expression.name.text === 'setHostAttribute' &&
          n.expression.expression.kind === ts.SyntaxKind.ThisKeyword &&
          n.arguments[0] &&
          ts.isStringLiteralLike(n.arguments[0]) &&
          !HOST_ATTR_SKIP.test(n.arguments[0].text)
        ) {
          names.add(n.arguments[0].text);
        }
        ts.forEachChild(n, visit);
      };
      node.members.forEach(visit);
      if (names.size) classDoc.voidHostAttributes = [...names].sort();
    },
  };
}

/** src module path -> shipped dist path, or null for modules bundled into chunks. */
function distPath(path) {
  const src = path.replace(/^\//, '').replace(/\.js$/, '.ts');
  if (src === 'src/index.ts' || src === 'src/base.ts' || /^src\/components\/[^/]+\.ts$/.test(src)) {
    return src.replace(/^src\//, 'dist/').replace(/\.ts$/, '.js');
  }
  return null;
}

function rewriteReferences(value) {
  if (Array.isArray(value)) {
    value.forEach(rewriteReferences);
  } else if (value && typeof value === 'object') {
    if (typeof value.module === 'string') {
      const mapped = distPath(value.module);
      if (mapped) value.module = mapped;
      else delete value.module; // internal module: keep the symbol name only
    }
    for (const v of Object.values(value)) rewriteReferences(v);
  }
}

const isPublicMember = (m) =>
  m.privacy !== 'private' &&
  m.privacy !== 'protected' &&
  IDENTIFIER.test(m.name) &&
  !m.name.startsWith('_') &&
  !HIDDEN_MEMBERS.has(m.name);

export function publishedManifestPlugin() {
  return {
    name: 'VOIDABLE - PUBLISHED-MANIFEST',
    packageLinkPhase({ customElementsManifest }) {
      for (const decl of customElementsManifest.modules.flatMap((m) => m.declarations ?? [])) {
        if (decl.members) decl.members = decl.members.filter(isPublicMember);
        // An attribute is public HTML API even when its backing property is
        // not (`@property({ attribute: 'form' }) protected formAttr`): keep
        // the attribute, drop the link to the stripped field.
        for (const a of decl.attributes ?? []) {
          if (a.fieldName && !decl.members?.some((m) => m.name === a.fieldName)) delete a.fieldName;
        }
      }
      customElementsManifest.modules = customElementsManifest.modules.filter((m) => distPath(m.path));
      for (const mod of customElementsManifest.modules) mod.path = distPath(mod.path);
      rewriteReferences(customElementsManifest.modules);
    },
  };
}
