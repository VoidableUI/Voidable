// SPDX-License-Identifier: MIT
//
// Writes screen-reader-results/<screen reader>-<browser>.json when a run ends: one
// RunResult (results.ts) with the status of every scenario, the versions, the
// machine and the commit. It also prints a table to the job summary when
// GITHUB_STEP_SUMMARY is set. Nothing here decides pass or fail; Playwright does.
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { arch, platform, release, version } from 'node:os';
import { createRequire } from 'node:module';
import { RESULTS_DIR, type RunResult, type ScenarioStatus } from './results';

const require = createRequire(import.meta.url);
const pkgVersion = (name: string) => {
  try {
    return JSON.parse(readFileSync(require.resolve(`${name}/package.json`), 'utf8')).version as string;
  } catch {
    return 'unknown';
  }
};

export default class ScreenReaderReporter implements Reporter {
  private tests = new Map<string, { status: ScenarioStatus; reader?: string; browser: string }>();

  private known = new Map<string, string>();

  onBegin(_config: FullConfig, _suite: Suite): void {}

  onTestEnd(test: TestCase, _result: TestResult): void {
    const outcome = test.outcome();
    const status: ScenarioStatus = outcome === 'skipped' ? 'skipped' : outcome === 'flaky' ? 'flaky' : outcome === 'expected' ? 'passed' : 'failed';
    const reader = test.annotations.find((a) => a.type === 'screen-reader')?.description;
    const project = test.parent.project();
    const issue = test.annotations.find((a) => a.type === 'known issue')?.description;
    if (issue) this.known.set(test.title, issue.split(': ')[0]);
    this.tests.set(test.title, { status, reader: reader ?? this.tests.get(test.title)?.reader, browser: project?.name ?? 'unknown' });
  }

  onEnd(_result: FullResult): void {
    if (!this.tests.size) return;
    const readers = [...this.tests.values()].map((t) => t.reader).filter(Boolean) as string[];
    const first = readers[0] ?? (platform() === 'win32' ? 'NVDA unknown' : 'VoiceOver unknown');
    const [name, ...rest] = first.split(' ');
    const screenReader = (name === 'NVDA' ? 'NVDA' : 'VoiceOver') as RunResult['screenReader'];
    const scenarios = [...this.tests.entries()].map(([id, t]) => ({ id, status: t.status }));
    const counts: RunResult['counts'] = { passed: 0, flaky: 0, failed: 0, skipped: 0 };
    for (const s of scenarios) counts[s.status]++;
    const env = process.env;
    const run: RunResult = {
      screenReader,
      screenReaderVersion: rest.join(' ') || 'unknown',
      browser: [...this.tests.values()][0].browser,
      system: `${platform()} ${release()} (${version()}, ${arch()})`,
      runnerImage: [env.ImageOS, env.ImageVersion].filter(Boolean).join(' ') || 'not a GitHub runner',
      date: new Date().toISOString(),
      commit: env.GITHUB_SHA ?? 'unknown',
      runUrl: env.GITHUB_SERVER_URL && env.GITHUB_REPOSITORY && env.GITHUB_RUN_ID ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}` : '',
      guidepup: { guidepup: pkgVersion('@guidepup/guidepup'), playwright: pkgVersion('@guidepup/playwright') },
      counts,
      scenarios,
    };
    mkdirSync(RESULTS_DIR, { recursive: true });
    const file = join(RESULTS_DIR, `${screenReader}-${run.browser}.json`);
    writeFileSync(file, JSON.stringify(run, null, 2) + '\n');
    if (env.GITHUB_STEP_SUMMARY) {
      const rows = run.scenarios.map((s) => `| ${s.id} | ${s.status}${this.known.has(s.id) ? ` (known issue: ${this.known.get(s.id)})` : ''} |`).join('\n');
      appendFileSync(env.GITHUB_STEP_SUMMARY, `### ${screenReader} ${run.screenReaderVersion} in ${run.browser}\n\n| Scenario | Result |\n|---|---|\n${rows}\n\n`);
    }
  }
}
