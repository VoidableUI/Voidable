// SPDX-License-Identifier: MIT
//
// Performance budgets for specs/perf.spec.ts. Adjust them here.
//
// `reference` is what the workload measured on the machine the budgets were
// set on (median of several runs), together with `calibrationMs`, a plain-DOM
// workload measured on that same machine. On a slower machine (a CI runner)
// every timing budget is scaled by how much slower its calibration run is, so
// the budget tracks the code, not the hardware. It is never scaled down.
//
// A test fails when the measurement exceeds reference * TOLERANCE (scaled).
// 1.5 catches a regression of about half again without failing on noise.

export const TOLERANCE = 1.5;

/** Plain-DOM calibration workload on the reference machine, in ms. */
export const calibrationMs = 80;

// Set 2026-11-25 on the reference machine (a Linux desktop), Playwright Chromium 159,
// median of three runs of this suite. (The ad hoc final review measured the
// same workloads differently, with the system Chromium: 176, 117, 209, 210
// and 17.5 ms, 48.5 and 7.3 kB.)
export const reference = {
  /** First render of 1,000 mixed components until all have rendered. */
  mixed1000Ms: 58,
  /** First render of a 500-row table with a dropdown-menu, a badge and two buttons per row. */
  table500FirstMs: 75,
  /** One Turbo morph of that table (one cell changed), through VoidTurbo. */
  table500MorphMs: 130,
  /** First render of a void-select with 5,000 options. */
  select5000Ms: 170,
  /** 200 open/close cycles of a dialog. */
  dialog200Ms: 28.5,
  /** Gzipped size of `import '@voidable/ui'` (everything, Lit included), minified. */
  rootEntryGzipKB: 46.7,
  /** Gzipped size of `import '@voidable/ui/button'` (one component, Lit included), minified. */
  singleComponentGzipKB: 6.9,
};

/** Leak limits for the 200 dialog cycles (absolute, not scaled). */
export const leaks = {
  nodeGrowth: 0,
  heapGrowthKB: 512,
};
