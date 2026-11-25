// SPDX-License-Identifier: MIT
// Output formats: the project setup each agent is told about, the default
// file it writes, and how the scorer renders it (see render.mjs).
//
// The setup text is identical in every condition and says nothing about
// Voidable's API; it describes the project the way a repository would.

const LOADED = 'The app already loads @voidable/ui (which registers every <void-*> element) and the @voidable/theme stylesheet on every page, so you do not need to add them.';

export const FORMATS = {
  html: {
    label: 'HTML',
    file: 'index.html',
    setup: `A static site. Pages are plain HTML documents. ${LOADED} Inline <script type="module"> blocks are fine; there is no build step and no other JavaScript library.`,
  },
  react: {
    label: 'React (TSX)',
    file: 'App.tsx',
    setup: `A React 19 + TypeScript single-page app built with esbuild. Write \`App.tsx\` with a default-exported component; the entry mounts it into #root. ${LOADED} Available packages: react, react-dom, @voidable/ui, @voidable/ui-react. There is no router and no CSS framework.`,
  },
  svelte: {
    label: 'Svelte 5',
    file: 'App.svelte',
    setup: `A Svelte 5 single-page app (runes mode) compiled with the Svelte compiler. Write \`App.svelte\`; the entry mounts it into #app. ${LOADED} There is no SvelteKit, no router and no CSS framework.`,
  },
  erb: {
    label: 'Rails ERB + Turbo',
    file: 'index.html.erb',
    setup: `A Rails 8 app with Hotwire (Turbo). You are writing a view template; the application layout around it already has the <head>. ${LOADED} No Stimulus controllers are registered and there is no JavaScript bundle of your own; inline <script> tags in the view are fine. Rails view helpers (form_with, link_to, tag helpers, turbo_frame_tag) are available.`,
  },
  heex: {
    label: 'Phoenix HEEx',
    file: 'index.html.heex',
    setup: `A Phoenix 1.8 app with LiveView 1.1. You are writing the HEEx template of a LiveView (the body of render/1); the root layout already has the <head>. ${LOADED} Phoenix.Component built-ins (.form, .link, .inputs_for, :for, :if) are available; there is no CoreComponents module and no verified routes (~p), so write paths as plain strings. Client-side behaviour must also work before the LiveView socket connects; inline <script> tags are fine.`,
  },
  blade: {
    label: 'Laravel Blade + Livewire',
    file: 'view.blade.php',
    setup: `A Laravel 13 app with Livewire 4. You are writing the Blade view of a Livewire component; the layout around it already has the <head>, @livewireStyles and @livewireScripts. ${LOADED} Blade directives (@csrf, @foreach, @if, @error) work; client-side behaviour must also work before Livewire boots, and inline <script> tags are fine.`,
  },
};

export const FORMAT_IDS = Object.keys(FORMATS);
