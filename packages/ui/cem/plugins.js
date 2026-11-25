// Analyzer plugins for @custom-elements-manifest/analyzer, used by
// ../custom-elements-manifest.config.js.
//
// Component source is not annotated with @fires/@slot/@cssprop JSDoc, so the
// stock analyzer misses or misreports some facts. These plugins recover what
// can be derived statically from the code, without editing component source:
//
// 1. litAttributeCasePlugin: Lit's default attribute name for a property
//    without an explicit `attribute` option is the property name lowercased
//    (`maxSize` -> `maxsize`), not the property name verbatim, which is what
//    the analyzer emits. Fix both the attribute entry and the field's
//    `attribute` link. Also falls back to the Lit `type` option for fields
//    the analyzer could not type.
//
// 2. fieldDefaultsPlugin: restores defaults the analyzer drops for
//    member-access initializers (`Number.NEGATIVE_INFINITY`).
//
// 3. voidEventsPlugin: the analyzer only finds `this.dispatchEvent(new X())`
//    inside method declarations. Most components dispatch from arrow-function
//    class fields (`private _onClick = () => {...}`) or on other elements
//    (`item.dispatchEvent(...)`), which it misses. This plugin walks the whole
//    class body for `new CustomEvent('void-…', init)` and records the event
//    name and, where statically evident, the `detail` shape as a TypeScript
//    type text, e.g. `CustomEvent<{ value: string }>`. Anything it cannot
//    resolve is typed `unknown` rather than guessed.

/** @typedef {import('typescript')} TS */

const EVENT_PREFIX = 'void-';

/**
 * @param {TS} ts
 * @param {import('typescript').Node} node
 */
function decoratorCall(ts, node, name) {
  const mods = ts.canHaveDecorators?.(node) ? ts.getDecorators(node) : node.modifiers;
  return (mods ?? []).find(
    (m) =>
      ts.isDecorator(m) &&
      ts.isCallExpression(m.expression) &&
      m.expression.expression.getText() === name,
  );
}

function findClassDoc(moduleDoc, className) {
  return moduleDoc?.declarations?.find((d) => d.kind === 'class' && d.name === className);
}

// Lit `type` converter option -> TypeScript type, used only when the field has
// neither an annotation nor an initializer the analyzer could type
// (e.g. `@property({ type: Number }) max = Infinity`).
const LIT_TYPES = { String: 'string', Number: 'number', Boolean: 'boolean', Array: 'unknown[]', Object: 'object' };

export function litAttributeCasePlugin() {
  return {
    name: 'VOIDABLE - LIT-ATTRIBUTE-CASE',
    analyzePhase({ ts, node, moduleDoc }) {
      if (!ts.isClassDeclaration(node) || !node.name) return;
      const classDoc = findClassDoc(moduleDoc, node.name.getText());
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

        if (option('attribute')) continue;
        const attrName = propName.toLowerCase();
        if (attrName === propName) continue;
        if (attr && attr.name === propName) attr.name = attrName;
        if (field && field.attribute === propName) field.attribute = attrName;
      }
    },
  };
}

/**
 * The analyzer tries to resolve member-access initializers such as
 * `Number.NEGATIVE_INFINITY` as variable references and, failing that, drops
 * the default entirely. Restore the initializer text for any field (and its
 * attribute) that ended up without a default.
 */
export function fieldDefaultsPlugin() {
  return {
    name: 'VOIDABLE - FIELD-DEFAULTS',
    analyzePhase({ ts, node, moduleDoc }) {
      if (!ts.isClassDeclaration(node) || !node.name) return;
      const classDoc = findClassDoc(moduleDoc, node.name.getText());
      if (!classDoc) return;
      for (const member of node.members) {
        if (!ts.isPropertyDeclaration(member) || !member.initializer || !member.name) continue;
        const name = member.name.getText();
        const field = classDoc.members?.find((m) => m.kind === 'field' && m.name === name);
        if (!field || field.default !== undefined) continue;
        field.default = member.initializer.getText();
        const attr = classDoc.attributes?.find((a) => a.fieldName === name);
        if (attr && attr.default === undefined) attr.default = field.default;
      }
    },
  };
}

/**
 * Infer a TypeScript type text for an expression used as a `detail` value.
 * Returns 'unknown' when it is not statically evident.
 */
function inferType(ts, expr, ctx, depth = 0) {
  if (!expr || depth > 4) return 'unknown';
  if (ts.isParenthesizedExpression(expr) || ts.isAsExpression(expr) || ts.isNonNullExpression(expr)) {
    if (ts.isAsExpression(expr)) return expr.type.getText();
    return inferType(ts, expr.expression, ctx, depth + 1);
  }
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr) || ts.isTemplateExpression(expr)) {
    return 'string';
  }
  if (ts.isNumericLiteral(expr)) return 'number';
  if (expr.kind === ts.SyntaxKind.TrueKeyword || expr.kind === ts.SyntaxKind.FalseKeyword) return 'boolean';
  if (expr.kind === ts.SyntaxKind.NullKeyword) return 'null';
  if (expr.kind === ts.SyntaxKind.ThisKeyword) return ctx.className;
  if (ts.isPrefixUnaryExpression(expr) && expr.operator === ts.SyntaxKind.ExclamationToken) return 'boolean';
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

/** Type of `this.<name>`: prefer the class AST's annotation, then the manifest member. */
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

/** Resolve a local identifier to a parameter or `const`/`let` in an enclosing function. */
function identifierType(ts, id, ctx, depth) {
  const name = id.getText();
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
  const out = { detail: undefined, bubbles: false, composed: false, cancelable: false };
  if (!init || !ts.isObjectLiteralExpression(init)) return out;
  for (const p of init.properties) {
    if (!p.name) continue;
    const key = p.name.getText();
    if (key === 'detail') {
      out.detail = ts.isShorthandPropertyAssignment(p)
        ? identifierType(ts, p.name, ctx, 0)
        : inferType(ts, p.initializer, ctx);
    } else if (key === 'bubbles' || key === 'composed' || key === 'cancelable') {
      out[key] = ts.isPropertyAssignment(p) && p.initializer.kind === ts.SyntaxKind.TrueKeyword;
    }
  }
  return out;
}

export function voidEventsPlugin() {
  return {
    name: 'VOIDABLE - VOID-EVENTS',
    analyzePhase({ ts, node, moduleDoc }) {
      if (!ts.isClassDeclaration(node) || !node.name) return;
      const className = node.name.getText();
      const classDoc = findClassDoc(moduleDoc, className);
      if (!classDoc) return;
      const ctx = { className, classNode: node, classDoc };

      /** @type {Map<string, {details: Set<string>, onOther: boolean}>} */
      const found = new Map();
      const visit = (n) => {
        if (
          ts.isNewExpression(n) &&
          ts.isIdentifier(n.expression) &&
          n.expression.text === 'CustomEvent' &&
          n.arguments?.[0] &&
          ts.isStringLiteralLike(n.arguments[0]) &&
          n.arguments[0].text.startsWith(EVENT_PREFIX)
        ) {
          const name = n.arguments[0].text;
          const init = readEventInit(ts, n.arguments[1], ctx);
          const entry = found.get(name) ?? { details: new Set(), onOther: false };
          entry.details.add(init.detail ?? 'null');
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

      // Replace the analyzer's own (partial) event list with the full one.
      classDoc.events = [...found.entries()].map(([name, { details, onOther }]) => {
        const detailTypes = [...details];
        const detail = detailTypes.length === 1 ? detailTypes[0] : detailTypes.join(' | ');
        const event = { name, type: { text: detail === 'null' ? 'CustomEvent' : `CustomEvent<${detail}>` } };
        if (onOther) {
          event.description = 'Dispatched on a child element and bubbles through this element.';
        }
        return event;
      });
    },
  };
}
