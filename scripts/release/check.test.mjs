// SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scanText } from './check.mjs';

const flagged = (s) => scanText(s).length > 0;

test('hand-typed Voidable versions are flagged', () => {
  assert.ok(flagged('<link href="https://cdn.jsdelivr.net/npm/@voidable/theme@0.8.0/src/index.css">'));
  assert.ok(flagged('pin "@voidable/ui", to: "https://cdn.jsdelivr.net/npm/@voidable/ui@0.7.0/+esm"'));
  assert.ok(flagged('npm install @voidable/ui-react@0.4'));
  assert.ok(flagged('"@voidable/ui": "^0.5.3"'.replace('": "', '@'))); // @voidable/ui@^0.5.3
  assert.ok(flagged('gem "voidable-hotwire", "~> 0.7.1"'));
  assert.ok(flagged('{:live_voidable, "~> 0.2"}'));
  assert.ok(flagged('composer require voidable/laravel:^0.8'));
  assert.ok(flagged('"voidable/laravel": "^0.8"'));
});

test('version-free and derived references pass', () => {
  assert.ok(!flagged('<link href="https://cdn.jsdelivr.net/npm/@voidable/theme/src/index.css">'));
  assert.ok(!flagged('<script src="https://esm.sh/@voidable/ui"></script>'));
  assert.ok(!flagged('"#{BASE}/@voidable/ui@#{NPM_VERSION}/+esm"'));
  assert.ok(!flagged('https://esm.sh/@voidable/ui${pin}'));
  assert.ok(!flagged('gem "voidable-hotwire", path: "../gem"'));
  assert.ok(!flagged('{:live_voidable, "${hexRequirement}"}'));
  assert.ok(!flagged('{:live_voidable, path: "../hex"}'));
  assert.ok(!flagged('composer require voidable/laravel'));
  assert.ok(!flagged('@voidable/ui@latest'));
  assert.ok(!flagged('the install generator (added in 0.7.0) runs'));
});
