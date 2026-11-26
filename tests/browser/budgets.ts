// SPDX-License-Identifier: MIT
//
// Performance budgets for specs/perf.spec.ts. Adjust them here.
//
// `reference` is what the workload measured on the machine the budgets were
// set on (median of several runs), together with `calibrationMs`, a plain-DOM
// workload measured on that same machine. The calibration runs again before
// every workload; on a slower or busier machine (a CI runner) each timing
// budget is scaled by how much slower that calibration is, so
// the budget tracks the code, not the hardware. It is never scaled down.
//
// A test fails when the measurement exceeds reference * TOLERANCE (scaled).
// 1.5 catches a regression of about half again without failing on noise.

export const TOLERANCE = 1.5;

/** Plain-DOM calibration workload on the reference machine, in ms. */
export const calibrationMs = 80;

// Re-baselined 2026-11-26 against master after 194 further commits (the shared build host, 32 cores,
// Playwright Chromium; the calibration there is about 177 ms against 80 here, so every run's timings
// were divided by that run's own calibration and rescaled to calibrationMs: medians of four runs,
// rounded up). Before: 65, 72, 115, 40 and 330 ms; 59.5 and 11.6 kB. The calibration now runs in an
// unstyled iframe: in the page it timed the theme's style cost on native buttons and inputs, which
// tripled as the theme grew, so scaled budgets had stopped tracking the machine.
// Re-measured after #77 (same host, master and the change measured back to back, medians of three to five
// quiet runs, normalised the same way). Old budget -> master measured now -> now: table first render
// 114 -> 116 -> 105 ms; 1,000 mixed 62 -> 78 -> 73 ms; Turbo morph 37 -> 40 -> 40 ms; select 33 -> 42 -> 41 ms
// (raw); dialog 276 -> 314 -> 318 ms; root entry 67.8 -> 69.6 -> 69.9 kB; button 15.1 -> 15.1 -> 10.0 kB.
// The old timing figures were re-measured because the host changed, not the code: they were set on a 32-core
// c5ad.8xlarge, and this session's host is 16 vCPUs (Xeon Platinum 8124M, calibration about 170 ms). Commit
// d7c26f8, where the old figures were set, measured back to back here (medians of five, normalised) gives
// mixed 71, table 117.5, morph 40.6, dialog 333 ms and select 38 ms raw: the same as master (78, 116, 40,
// 314, 42), against the old 62, 114, 37, 276 and 33. A different CPU changes the ratio of the plain-DOM
// calibration to the workloads, so normalising does not make budgets portable between host types; re-measure
// d7c26f8 and master together when the host changes. A GitHub runner (calibration about 97 ms, scale 1.2,
// gh-browser-81 log) read mixed 67, table 131, morph 50 ms and select 30.7 ms raw: the old budgets passed
// all but the morph narrowly (60 of 67 ms) and, normalised at 15 ms, the select failed; the new ones pass
// all with room. Only the differences between master and now are the change: the table 9% and
// the mixed page 7% faster (the scoped reset no longer lists the part tags, a parts controller registers its
// observer once), the button 5.1 kB smaller (projection.ts loads only where used). The table is still well above
// its 72 ms of before the parts: about 40% of it is the browser's style and layout of 2,000 theme-styled cells
// and the rest is the components' own connect and update work.
// Moves, measured on one host with the old and the new commit: the 500-row table's first render
// grew about 50% (most likely the dropdown menu in each row is now a trigger and a content part, the explicit
// parts of #52, and every component base gained the state rule and re-entrant morph hooks, #61 #31);
// the dialog about 20% (likely a shadow-root surface, #52); the Turbo morph and the 5,000-option select
// got about three times faster (likely unchanged components skipped in a morph, #61; a native <select>).
// The single component (button) grew from 11.6 to 15.1 kB: the shared base chunk went from 18.0 to
// 27.3 kB minified (0b32c8d state rule, 91d45a1 re-entrant morph hooks, 439dd84 skip unchanged,
// 2309db4 parts infrastructure), the button from 1.8 to 3.2 kB (real-click activation, link button)
// and the keyboard-activation and form-control chunks are new. The root entry grew from 59.4 to 67.8 kB.
export const reference = {
  /** First render of 1,000 mixed components until all have rendered. */
  mixed1000Ms: 73,
  /** First render of a 500-row table with a dropdown-menu, a badge and two buttons per row. */
  table500FirstMs: 105,
  /** One Turbo morph of that table (one cell changed), through VoidTurbo. */
  table500MorphMs: 40,
  /** First render of a void-select with 5,000 options. Not normalised like the others: about two thirds
   *  of it is the browser laying out 5,000 options inside the settle wait, which measured 31 to 34 ms on
   *  the build host and on hosted runners alike whatever their calibration, so dividing by the
   *  calibration (15 ms) made the test fail on any runner that calibrated fast. */
  select5000Ms: 41,
  /** A 5,000-row table with a native checkbox in each row: sort by text, by number, a filter, the next
   *  keystroke of it, and select-all (one pass, one event). Measured 442, 470, 100, 81 and 184 ms at a
   *  calibration of 101 ms, divided by the 1.27 scale. */
  table5000SortTextMs: 350,
  table5000SortNumberMs: 370,
  table5000FilterFirstMs: 80,
  table5000FilterNextMs: 65,
  table5000SelectAllMs: 145,
  /** 200 open/close cycles of a dialog. */
  dialog200Ms: 318,
  /** Gzipped size of `import '@voidable/ui'` (everything, Lit included), minified. */
  // 69.9 -> 77.3 kB with the messages (issue 29): the English catalogue (about 100 strings and the plural and
  // number helpers), the registry and the wiring in the components that write words. fr and ar are separate
  // modules and are not in it; the shared base chunk and the single-component figure did not grow.
  rootEntryGzipKB: 77.3,
  /** Gzipped size of `import '@voidable/ui/components/button'` (one component, Lit included), minified. */
  singleComponentGzipKB: 10.1,
};

/** Leak limits for the 200 dialog cycles (absolute, not scaled). */
export const leaks = {
  nodeGrowth: 0,
  heapGrowthKB: 512,
};
