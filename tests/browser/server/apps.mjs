// SPDX-License-Identifier: MIT
//
// Real server apps the server-backed suite runs against. Each entry says how
// to put this repository's built packages into the app, how to prepare it,
// how to start it and where it answers once it is ready. To add an app (the
// Phoenix LiveView demo, a Laravel Livewire app; issue #31), add an entry
// here and a spec folder server/<name>/; playwright.server.config.ts turns
// each entry into a web server and a project.
//
// Commands run with the repository's mise toolchains on PATH (the mise task
// test:server activates them).
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export const apps = {
  rails: {
    /** The Rails demo, against the local gem (Gemfile) and built packages (importmap). */
    cwd: join(repo, 'packages/hotwire/demo'),
    /** mise tools whose bin directories go first on PATH (mise.toml pins their versions). */
    tools: ['ruby'],
    port: 4520,
    readyPath: '/up',
    env: { VOIDABLE_LOCAL: '1', RAILS_ENV: 'development', RAILS_LOG_LEVEL: 'warn' },
    /** Where the built ESM bundles go, served by the app as /voidable-local/*. */
    assetsDir: 'public/voidable-local',
    assets: {
      'ui.js': { esm: `export * from '@voidable/ui';` },
      'ui-hotwire.js': { esm: `export * from '@voidable/ui-hotwire';` },
      'theme.css': { css: '@voidable/theme' },
    },
    prepare: [
      ['bundle', ['install', '--quiet']],
      ['bin/rails', ['db:prepare']],
    ],
    start: (port) => ['bin/rails', ['server', '-b', '127.0.0.1', '-p', String(port)]],
  },
};
