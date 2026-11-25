// SPDX-License-Identifier: MIT
// Locations the harness reads and writes. Everything generated lives under
// evals/.cache (gitignored) except the committed baseline and calibration.
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const EVALS = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ROOT = resolve(EVALS, '..');
export const CACHE = join(EVALS, '.cache');
export const ASSETS = join(CACHE, 'assets');
export const RUNS = join(EVALS, 'results', 'runs');
export const BASELINE = join(EVALS, 'results', 'baseline.json');
export const CALIBRATION = join(EVALS, 'results', 'calibration.json');
export const TASKS = join(EVALS, 'tasks');
export const SOLUTIONS = join(EVALS, 'solutions');
export const FIXTURES = join(EVALS, 'fixtures');
export const VOIDABLE_BIN = process.env.VOIDABLE_BIN || join(ROOT, 'tools', 'voidable', 'build', 'voidable');
