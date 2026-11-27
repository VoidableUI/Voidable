# Screen-reader tests

Scripted tests that drive a real screen reader, VoiceOver on macOS and NVDA on Windows, through a browser and assert on what is spoken (#34). The scenarios are data, each replayed twice from one definition:

| What | Where | Runs on | Proves |
|---|---|---|---|
| Accessibility-tree replay | `../specs/screen-reader-tree.spec.ts`, `screen-reader-tree-pickers.spec.ts` (via `tree.ts`) | the normal browser suite: Linux, Chromium, Firefox, WebKit; gates CI's `browser` job | the page exposes the role, name, description and state every step expects |
| Matcher and runner checks | `../specs/screen-reader-words.spec.ts`, `screen-reader-runner.spec.ts` | the normal browser suite | the speech matcher accepts VoiceOver and NVDA wording and rejects the wrong thing; the runner searches, polls and reports as designed |
| Real screen reader | `specs/*.spec.ts` (via `suite.ts`, `runner.ts`, `readers.ts`) | a Mac or a Windows machine; `.github/workflows/screen-readers.yml` | the screen reader says it |

If the tree replay passes and the screen-reader run fails, the page is right and the cause is the screen reader layer: its wording (widen `words.ts`), its navigation (the transcript shows where it went), or the machine.

None of this gates a release: the workflow is its own file, has no `workflow_call` and is referenced by neither `ci.yml` nor `release.yml`.

## Files

| File | Role |
|---|---|
| `facts.ts` | The vocabulary: `Fact` (role, name, states, value, position...), `Step` (`reach`, `act`, `press`, `type`, `hear`, `walk`, `cell`, `focus`, `check`), `Scenario`. No Guidepup imports. |
| `scenarios.ts`, `scenarios-pickers.ts` | The scenarios. Select, combobox and multiselect have their own file (see below). |
| `words.ts` | Turns a `Fact` into loose speech expectations: the vocabulary tables (role words, state words) live only here. |
| `tree.ts` | Replays steps against the accessibility tree. |
| `runner.ts`, `readers.ts`, `suite.ts` | Replays steps with Guidepup: a search for each element, marks into the spoken log, a transcript per step. |
| `reporter.ts`, `results.ts`, `merge-results.mjs` | Writes `screen-reader-results/<screen reader>-<browser>.json`; merges runs into `docs/src/data/screen-reader-results.json` for the accessibility statement. |
| `../pages/sr-*.html` | One small page per area, served like every other test page. |
| `../playwright.screen-readers.config.ts` | The Playwright config for the real-screen-reader run. |

## Tooling and versions (researched 2026-11-25)

- **Guidepup** is a screen-reader automation library (MIT) for VoiceOver, NVDA and Orca, and the only one with a maintained Playwright integration. Chosen packages, pinned exactly in `tests/browser/package.json`:
  - `@guidepup/guidepup` **0.40.0** (released 2026-11-01; repository pushed 2026-11-08, 14 open issues),
  - `@guidepup/playwright` **0.21.0** (2026-10-25; peer dependencies `@guidepup/guidepup >=0.38.0`, `@playwright/test >=1.62.1`; the repository has 1.65.1),
  - `@guidepup/setup` **0.29.3** (2026-10-14), the CLI that configures a machine and downloads the screen-reader assets matching the installed Guidepup. It is run with `npx` at a pinned version (`GUIDEPUP_SETUP` in the workflow and in `.mise/tasks/test/screen-readers/setup`), not installed as a dependency, because its optional `@guidepup/record` needs an install script.
  - `guidepup/setup-action` is archived and says to use the CLI directly, so the workflow calls the CLI.
  - `dbus-native` (a Guidepup dependency, for Orca) needs Node 22.12 or later; the repository uses Node 24.
- **Supported systems** (the READMEs of `guidepup`, `guidepup-playwright` and `setup`): macOS Sonoma, Sequoia and Tahoe, Windows Server 2022 and 2025, plus Ubuntu and Debian for Orca (not used here). Guidepup's own workflows run VoiceOver on `macos-15` and `macos-26` (and `xcode-27`) with Chromium, Firefox and WebKit, and NVDA on `windows-2022` and `windows-2025` with Chromium and Firefox.
- **Runner images chosen**: `macos-15` (Apple silicon) with Playwright **WebKit**, and `windows-2025` with Playwright **Chromium**. Reasons: both are images Guidepup tests itself on; VoiceOver with WebKit is the pairing Safari users have, and NVDA with a Chromium browser is the most common Windows pairing and is the one in Guidepup's NVDA example; they are named explicitly rather than `-latest` so that an image migration is a visible change (GitHub lists `windows-latest` as 2025 and `macos-latest` as macOS 26 today). Add `macos-26`, `windows-2022` or Firefox as matrix entries once the first version is stable.
- **Recommended settings taken from Guidepup's examples**: headed browsers and one worker (`withGuidepup` forces both), a five-minute test timeout, retries (2 in CI here; Guidepup's examples use 2 to 5), a trace and a video, and `capture: true` so that speech nobody asked for (a toast arriving) is logged too.
- **Known issues that touch this suite** (open issues at the time of writing): `guidepup-playwright#51`, `navigateToWebContent` only works with VoiceOver in English, so the config sets `locale: 'en-US'` and the workflow logs the language settings and sets English on Windows; `guidepup-playwright#43`, `navigateToWebContent` sometimes has no effect, which shows as the first `reach` not finding anything; `setup#77`, a macOS 27 asset checksum failure and an install crash on Node 22, avoided by running on `macos-15` with Node 24; `guidepup#129` and `#205`, speech capture is being reworked and what Guidepup logs is not always what a person hears.
- **Alternatives considered.** Guidepup is current and maintained, so no replacement is needed. `@guidepup/virtual-screen-reader` simulates a screen reader in JavaScript and says nothing about real ones. AT driver (W3C `aria-at`) is on Guidepup's roadmap and not available. JAWS and Narrator are not supported (`guidepup#125`, `#123`).

Sources: <https://github.com/guidepup/guidepup>, <https://github.com/guidepup/guidepup-playwright>, <https://github.com/guidepup/setup>, <https://github.com/guidepup/guidepup/blob/main/.github/workflows/playwright-voiceover.yml>, <https://github.com/guidepup/guidepup-playwright/blob/main/.github/workflows/test-nvda.yml>, <https://www.guidepup.dev/docs/api/class-voiceover>, <https://www.guidepup.dev/docs/api/class-nvda>, <https://github.com/actions/runner-images>.

## Running on a Mac or a Windows machine

```bash
mise run test:screen-readers:setup       # once: configure the OS, download the screen-reader assets and the browser
mise run test:screen-readers             # build, then every scenario with the screen reader
mise run test:screen-readers -- --grep dialog
VOID_SR_BROWSER=chromium mise run test:screen-readers   # another browser (macOS: Chrome for Testing)
```

`setup` changes system settings. On macOS the first run may need manual steps (Guidepup's [manual VoiceOver setup](https://www.guidepup.dev/docs/guides/manual-voiceover-setup)): it can take over the keyboard while a test runs, so do not type during a run; on a developer Mac, running it in a spare user account or a virtual machine is kinder. On Windows run it in a session you can lose. Set the system language to English first. `mise run test:screen-readers` refuses to run on Linux; there, run the tree replay: `mise run test:browser -- specs/screen-reader-tree.spec.ts`.

## Reading a failure

1. **Which step.** The failure message starts with `<scenario>, step <n>. {step}` and ends with the last phrases heard: `never reached ...` (the search for the element used up its moves: look at what was heard instead), `the speech lacked: ...` (the element was reached but a state word was missing: compare with `words.ts`), `nothing spoken matched ...` (an announcement after an action never came), `... must be unreachable` (a modal leaked).
2. **The transcript.** Every test attaches `spoken-phrases.json` (each step with the phrases it caused) and `spoken-phrase-log.txt` (everything the screen reader said, numbered), passing or failing. In CI they are in the artifact `*-results`, next to `screen-reader-results/transcripts/`.
3. **The page.** `test-results-screen-readers/<test>/` has the trace (`npx playwright show-trace`) and a video of the page; `playwright-report-screen-readers/` is the HTML report. On macOS `recordings/` has a screen recording of the setup.
4. **Is it the page?** Run the tree replay for the same scenario: `mise run test:browser -- specs/screen-reader-tree.spec.ts -g "<id>"`. If that fails the page changed; if it passes, the screen reader said it differently: widen the word tables in `words.ts` (an alternative word for a role or state, never a whole phrase) and add the new phrase to `specs/screen-reader-words.spec.ts`.
5. **Flaky?** A scenario that passes only on a retry is reported `flaky` in the results file and the summary. Screen readers on hosted runners are racy; a scenario that is flaky often (check the weekly runs) wants a more specific wait, not more retries.

## Adding a scenario

1. Put the markup on a page: `tests/browser/pages/sr-<area>.html` (a fragment, with the markup `mise run lint:markup` accepts; reuse a page if the scenario fits). Keep it small: the screen reader reads everything on it.
2. Add a `Scenario` to `scenarios.ts` (or `scenarios-pickers.ts` for select, combobox and multiselect): an `id`, a `page`, and `steps` in the order the page reads. Move with `reach` (`by: 'control' | 'focusable' | 'heading' | 'landmark' | 'link' | 'table'`, plain `next` otherwise; `focusable` is Tab on NVDA, whose form-field key skips sliders), then `act`, `press`, `type`, `hear`, `focus`, `check`. Describe each element as a `Fact`: role, exact name, and only the states that matter. Use `container: true` for roles a screen reader announces only on entering (a tab panel, a region), and `spoken` when it says something shorter than name, role and state (a slider says "60").
3. Run the tree replay: `mise run test:browser -- specs/screen-reader-tree.spec.ts`. It must pass in Chromium and Firefox before the scenario goes near a screen reader. A real defect found here is not worked around: set `knownIssue` on the scenario (key in `helpers/known-issues.ts`), and the tree test becomes an expected failure while the screen-reader run skips it.
4. When the two readers word something differently, say so per reader instead of widening one expectation: `spoken: { VoiceOver: [/pop up/] }` and `by: { NVDA: 'focusable' }` apply to that reader only (the tree replay ignores both). When one reader does not say what a user needs and the page is right, set `readerIssues: { VoiceOver: { key, detail } }`: the scenario still runs with that reader as an expected failure, the job summary lists it as a known issue, the spoken phrases are printed as `[known issue <key>] ...`, and a fix turns it red.
5. Check the speech expectations read sensibly in `words.ts` terms; add a role or state word if the vocabulary lacks one, with a case in `specs/screen-reader-words.spec.ts`.
6. Run it with a screen reader on a Mac or Windows machine, or let the workflow do it (`workflow_dispatch`).

## Diagnosing a reader that says the wrong thing, or nothing

- **The step-by-step record.** Every move, key and activation is printed as `[sr <reader> <id>] move 3 (control) -> ["..."] | page focus: true, active: <...>`: what was sent, what the reader said because of it, and where the page's own focus is. A reader that hears nothing for four moves in a row is asked what it sees (`diagnosis:` lines: window title, focus, current line) and given remedies (window to the front, a click in the page, a refresh of its copy of the page), each logged. A page whose document is not focused after `navigateToWebContent` is brought forward and navigated again, and the log says so.
- **The page's own order of events.** `trace.ts` records focus changes and `aria-*`, `role` and `tabindex` writes in the order they happened, `[trace ...]`, and the browser's accessibility tree, `[ax ...]` (Chromium only), for a scenario with `trace: true`, a known issue, a failure or a probe. `specs/screen-reader-order.spec.ts` asserts the same orders without a screen reader.
- **Reference controls.** `scenarios-reference.ts` holds probes (`probe: true`: they log and never fail) over `pages/sr-ref-*.html`: native or ARIA Authoring Practices controls with the semantics of a Voidable one that a reader gets wrong. If the reference is also silent or wrong, the reader or the harness is the cause; if it is right and the Voidable control is not, compare the `[ax ...]` and `[trace ...]` output of the two.

## Select, combobox and multiselect

They use their explicit-parts markup (#52; the "Pickers" section of `docs/src/content/docs/guides/composition.mdx`): a native `<select>` inside `<void-select>`, and the options in `<void-combobox-content>` and `<void-multiselect-content>`. A combobox's highlighted option is its `aria-activedescendant` and is not selected; `aria-selected` marks the chosen one. Their scenarios, tree spec and page stay in their own files (`scenarios-pickers.ts`, `specs/screen-reader-tree-pickers.spec.ts`, `specs/pickers.spec.ts`, `pages/sr-pickers.html`).

## Results and the accessibility statement

A run writes `screen-reader-results/<screen reader>-<browser>.json` (shape in `results.ts`) and appends a table to the job summary. After a workflow run, download the `*-results` artifacts and run `mise run test:screen-readers:record -- <folder>`; it validates the files and merges them into `docs/src/data/screen-reader-results.json`, which the "Last verified" table of the [accessibility statement](../../../docs/src/content/docs/guides/accessibility-statement.mdx) renders. Commit that file in a pull request. Nothing in CI writes to the repository, and until a run is recorded the statement says "Not yet run".
