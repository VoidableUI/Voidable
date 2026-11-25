// SPDX-License-Identifier: MIT
//
// Where a screen-reader run writes its results, and their shape. The workflow
// uploads this folder as an artifact; a maintainer merges the run files into
// docs/src/data/screen-reader-results.json with `mise run test:screen-readers:record`
// (merge-results.mjs), and the accessibility statement renders that file.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RESULTS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'screen-reader-results');

export type ScenarioStatus = 'passed' | 'flaky' | 'failed' | 'skipped';

/** One run of the scenarios with one screen reader on one machine. */
export interface RunResult {
  screenReader: 'VoiceOver' | 'NVDA';
  /** The screen reader's own version, as Guidepup reports it. */
  screenReaderVersion: string;
  /** Browser engine Playwright drove. */
  browser: string;
  /** For example "macOS 15.6" or "Windows Server 2025", as the runner reports. */
  system: string;
  /** The GitHub runner image, for example "macos15" and its image version. */
  runnerImage: string;
  /** ISO date of the run. */
  date: string;
  commit: string;
  /** The workflow run that produced it, for people who want the recordings. */
  runUrl: string;
  guidepup: { guidepup: string; playwright: string };
  counts: Record<ScenarioStatus, number>;
  scenarios: { id: string; status: ScenarioStatus }[];
}
