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
// test:server activates them). Where mise has not installed a tool, as in CI
// where the prebuilt setup actions provide it, the tool on PATH is used.
// A prepare step that downloads from a registry has `{ retry: true }` as a
// third element (see start.mjs).
//
// Ports (Rails 4520, Phoenix 4530, Laravel 4540) come from VOID_RAILS_PORT, VOID_PHOENIX_PORT and
// VOID_LARAVEL_PORT, so two checkouts, or a server already running, can coexist; the browser
// suite takes VOID_TEST_PORT. A port in use fails the run; it never reuses another server.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export const apps = {
  rails: {
    /** The Rails demo, against the local gem (Gemfile) and built packages (importmap). */
    cwd: join(repo, 'packages/hotwire/demo'),
    /** mise tools whose bin directories go first on PATH (mise.toml pins their versions). */
    tools: ['ruby'],
    port: Number(process.env.VOID_RAILS_PORT || 4520),
    readyPath: '/up',
    env: { VOIDABLE_LOCAL: '1', RAILS_ENV: 'development', RAILS_LOG_LEVEL: 'warn' },
    /** Where the built ESM bundles go, served by the app as /voidable-local/*. */
    assetsDir: 'public/voidable-local',
    assets: {
      'ui.js': { esm: `export * from '@voidable/ui';` },
      'ui-hotwire.js': { esm: `export * from '@voidable/ui-hotwire';` },
      'ui-dev.js': { esm: `import '@voidable/ui/dev';` },
      'theme.css': { css: '@voidable/theme' },
    },
    prepare: [
      ['bundle', ['install', '--quiet'], { retry: true }],
      ['bin/rails', ['db:prepare']],
    ],
    start: (port) => ['bin/rails', ['server', '-b', '127.0.0.1', '-p', String(port)]],
  },

  phoenix: {
    /** The LiveView demo, with the live_voidable Hex package from this repository and the built adapter (config/config.exs). */
    cwd: join(repo, 'packages/liveview/demo'),
    tools: ['erlang', 'elixir'],
    port: Number(process.env.VOID_PHOENIX_PORT || 4530),
    readyPath: '/lab',
    env: { VOIDABLE_LOCAL: '1', MIX_ENV: 'dev', HEX_HTTP_CONCURRENCY: '4' },
    /** The root layout loads these two; app.js and app.css come from `mix assets.build`. */
    assetsDir: 'priv/static/assets',
    assets: {
      'js/voidable-ui.js': { esm: `export * from '@voidable/ui';` },
      'css/voidable/index.css': { css: '@voidable/theme' },
    },
    prepare: [
      ['mix', ['local.hex', '--force', '--if-missing'], { retry: true }],
      ['mix', ['local.rebar', '--force', '--if-missing'], { retry: true }],
      ['mix', ['deps.get'], { retry: true }],
      ['mix', ['assets.setup'], { retry: true }],
      ['mix', ['assets.build']],
    ],
    start: () => ['mix', ['phx.server']],
  },

  laravel: {
    /** The Laravel example (Livewire 4 and the voidable/laravel package from this repository), assets built by its own Vite config from the packages' builds. */
    cwd: join(repo, 'examples/laravel'),
    tools: ['php'],
    port: Number(process.env.VOID_LARAVEL_PORT || 4540),
    readyPath: '/lab',
    env: { PHP_CLI_SERVER_WORKERS: '4' },
    prepare: [
      ['composer', ['install', '--no-interaction', '--prefer-dist', '--no-progress'], { retry: true }],
      {
        write: [
          '.env',
          [
            'APP_NAME=Voidable',
            'APP_ENV=local',
            'APP_KEY=',
            'APP_DEBUG=true',
            `APP_URL=http://127.0.0.1:${process.env.VOID_LARAVEL_PORT || 4540}`,
            'LOG_LEVEL=warning',
            'DB_CONNECTION=sqlite',
            'SESSION_DRIVER=file',
            'CACHE_STORE=file',
            'QUEUE_CONNECTION=sync',
            'BROADCAST_CONNECTION=log',
            '',
          ].join('\n'),
        ],
      },
      ['php', ['artisan', 'key:generate', '--force']],
      ['./node_modules/.bin/vite', ['build']],
    ],
    start: (port) => ['php', ['artisan', 'serve', '--host=127.0.0.1', `--port=${port}`]],
  },
};
