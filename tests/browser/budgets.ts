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

// Re-baselined 2026-11-25 against the current master (a Linux desktop, Playwright Chromium 159).
// The machine was shared with other jobs (load average 20 to 27), so each run's timings were
// divided by that run's own calibration and rescaled to calibrationMs; medians of four runs,
// rounded up. The dialog figure moved from 28 to 330 ms when the dialog became a native <dialog>:
// 1.6 ms per open and close instead of 0.14 (a top-layer showModal, a transition, focus handling). The
// previous baseline, on the suite's old base, was 58, 75, 130, 170 and 28.5 ms and
// 46.7 and 6.9 kB; the root entry grew from 52.4 to 59.5 kB gzipped with the overlay controller and anchor fallback.
export const reference = {
  /** First render of 1,000 mixed components until all have rendered. */
  mixed1000Ms: 65,
  /** First render of a 500-row table with a dropdown-menu, a badge and two buttons per row. */
  table500FirstMs: 72,
  /** One Turbo morph of that table (one cell changed), through VoidTurbo. */
  table500MorphMs: 115,
  /** First render of a void-select with 5,000 options. */
  select5000Ms: 40,
  /** 200 open/close cycles of a dialog. */
  dialog200Ms: 330,
  /** Gzipped size of `import '@voidable/ui'` (everything, Lit included), minified. */
  rootEntryGzipKB: 59.5,
  /** Gzipped size of `import '@voidable/ui/components/button'` (one component, Lit included), minified. */
  singleComponentGzipKB: 11.6,
};

/** Leak limits for the 200 dialog cycles (absolute, not scaled). */
export const leaks = {
  nodeGrowth: 0,
  heapGrowthKB: 512,
};
