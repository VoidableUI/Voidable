// SPDX-License-Identifier: MIT
//
// Replays a scenario with a real screen reader and checks what was spoken.
//
// Design, for diagnosis from CI logs:
//   - The screen reader's log only grows. Every step notes where the log stood
//     when it began (a "mark") and looks only at what was spoken after it.
//   - Every step is written to a transcript (step, then the phrases it caused).
//     The transcript is attached to the test whether it passes or fails, and any
//     failure message ends with the last phrases heard, so the cause is readable
//     without opening a recording.
//   - Matching is loose (words.ts): name, a role word, state words, never a
//     whole phrase.
//   - Navigation to an element is a search ("move until the phrase is this
//     element"), so extra items a screen reader announces (groups, landmarks,
//     static text) only cost moves, never a failure.
import { expect, type Page } from '@playwright/test';
import { forReader, pick, type Fact, type Nav, type Scenario, type Step } from './facts';
import type { Reader } from './readers';
import { describeFact, heard, identityOf, matchFact, normalise } from './words';

/** How many moves to search for an element before giving up. */
export const MAX_MOVES = 40;
/** How long an announcement may take to arrive after an action. */
export const HEAR_TIMEOUT_MS = 10_000;

export interface TranscriptEntry {
  step: string;
  /** What the screen reader said because of this step. */
  phrases: string[];
  /** Set on the step that failed. */
  error?: string;
}

const show = (step: Step) =>
  JSON.stringify(step, (_k, v) => (v instanceof RegExp ? String(v) : typeof v === 'function' ? '[function]' : v));

const tail = (phrases: string[], n = 12) => phrases.slice(-n).map((p) => `    - ${JSON.stringify(p)}`).join('\n') || '    (nothing was spoken)';

/** Runs the steps; returns the transcript. Throws on the first failing step, with the transcript so far in `error.transcript`. */
export async function runScenario(reader: Reader, page: Page, scenario: Scenario): Promise<TranscriptEntry[]> {
  const transcript: TranscriptEntry[] = [];
  let mark = { n: 0, last: undefined as string | undefined };
  let moved = false;
  let reached: Fact | null = null;

  /**
   * What was spoken after a point in the log. A screen reader may keep appending to its latest phrase (NVDA joins
   * speech that follows closely: after Enter on a button the log's last entry grew from "button" to "button.
   * Profile settings, dialog, ..."), so the last entry before the point also counts, for the part added since.
   */
  const since = (log: string[], at: { n: number; last: string | undefined }): string[] => {
    const out = log.slice(at.n);
    const cur = at.n > 0 ? log[at.n - 1] : undefined;
    if (at.last !== undefined && cur !== undefined && cur !== at.last && cur.startsWith(at.last)) {
      const added = cur.slice(at.last.length).replace(/^[\s.,]+/, '');
      if (added) out.unshift(added);
    }
    return out;
  };
  const snapshot = async () => {
    const log = await reader.log();
    return { n: log.length, last: log[log.length - 1] };
  };
  const spokenSince = async (at: typeof mark) => since(await reader.log(), at);
  const begin = async () => {
    mark = await snapshot();
  };

  /** Move until a phrase is the element. The very first reach also considers where the cursor already is. */
  async function reach(fact: Fact, by: Nav): Promise<void> {
    await begin();
    if (!moved) {
      const so_far = await reader.log();
      const now = so_far[so_far.length - 1];
      if (now !== undefined && matchFact(now, fact).isElement) {
        moved = true;
        return check(fact, [now]);
      }
    }
    moved = true;
    const seen: string[] = [];
    let restarted = false;
    let stuck = 0;
    let previous: string | undefined;
    for (let i = 0; i < MAX_MOVES; i++) {
      const before = await snapshot();
      await reader.move(by);
      const said = since(await reader.log(), before);
      seen.push(...said);
      // The element may be split over several phrases; judge the words of this move together.
      const joined = said.join(' ');
      if (said.length && matchFact(joined, fact).isElement) return check(fact, said);
      // Quick navigation does not wrap: past the last control the same phrase repeats. Start again from the top
      // of the page once (the cursor can begin below the element when the previous scenario left it there).
      const phrase = said.filter(Boolean).join(' ');
      stuck = phrase && phrase === previous ? stuck + 1 : 0;
      previous = phrase || previous;
      if (stuck >= 2 && !restarted) {
        restarted = true;
        stuck = 0;
        await reader.restart();
      }
    }
    throw new Error(`never reached ${describeFact(fact)} in ${MAX_MOVES} moves by "${by}".\n  Heard since the step began:\n${tail(seen, 20)}\n${await where()}`);
  }

  /** Where the screen reader and the page are, for a step that never found its element: is the reader on the page at all? */
  async function where(): Promise<string> {
    const raw = (await reader.log()).slice(-20).map((p) => `    - ${JSON.stringify(p)}`).join('\n') || '    (nothing)';
    const page_ = await Promise.resolve()
      .then(() => page.evaluate(() => {
        const a = document.activeElement as HTMLElement | null;
        return { title: document.title, active: a ? `<${a.localName}${a.id ? ` id="${a.id}"` : ''}${a.getAttribute('role') ? ` role="${a.getAttribute('role')}"` : ''}>` : 'none', hasFocus: document.hasFocus() };
      }))
      .catch((e: Error) => ({ title: `(page unreachable: ${e.message})`, active: '?', hasFocus: false }));
    return `  Last 20 raw phrases:\n${raw}\n  Page: title ${JSON.stringify(page_.title)}, active element ${page_.active}, document focused: ${page_.hasFocus}`;
  }

  function check(fact: Fact, said: string[]): void {
    const v = matchFact(said.join(' '), fact);
    if (v.missing.length) {
      throw new Error(`reached ${describeFact(fact)}, but the speech lacked: ${v.missing.join('; ')}.\n  Heard:\n${tail(said)}`);
    }
  }

  async function hear(fact: Fact): Promise<void> {
    let last: string[] = [];
    try {
      await expect
        .poll(
          async () => {
            last = await spokenSince(mark);
            return heard(last, fact);
          },
          { timeout: HEAR_TIMEOUT_MS, intervals: [250, 500, 1000], message: `nothing spoken matched ${describeFact(fact)}` },
        )
        .toBe(true);
    } catch (err) {
      throw new Error(`${(err as Error).message}\n  Heard since the last action:\n${tail(last, 20)}`);
    }
  }

  for (const [i, step] of scenario.steps.entries()) {
    const entry: TranscriptEntry = { step: `${i + 1}. ${show(step)}`, phrases: [] };
    transcript.push(entry);
    const phrasesFrom = (await reader.log()).length;
    try {
      if ('reach' in step) {
        await reach(forReader(step.reach, reader.name), pick(step.by, reader.name) ?? 'next');
        reached = step.reach;
      } else if ('act' in step) {
        if (!reached) throw new Error('act needs an element reached first');
        await begin();
        await reader.act();
      } else if ('press' in step) {
        await begin();
        await reader.press(step.press);
      } else if ('type' in step) {
        await begin();
        await reader.type(step.type);
      } else if ('hear' in step) {
        await hear(forReader(step.hear, reader.name));
      } else if ('once' in step) {
        // Give a second, doubled announcement time to arrive, then count the phrases with these words.
        await page.waitForTimeout(1500);
        const said = await spokenSince(mark);
        const hits = said.filter((p) => step.once.test(normalise(p)));
        if (hits.length !== 1) throw new Error(`expected ${step.once} to be spoken once, heard ${hits.length} time(s).\n  Heard since the last action:\n${tail(said, 20)}`);
      } else if ('walk' in step) {
        await begin();
        for (let n = 0; n < step.walk; n++) await reader.move('next');
        const said = await spokenSince(mark);
        const id = identityOf(step.unreachable);
        const leaked = said.filter((p) => id.test(normalise(p)));
        if (leaked.length) throw new Error(`${describeFact(step.unreachable)} was spoken, but it must be unreachable (behind a modal).\n  Heard:\n${tail(leaked)}`);
      } else if ('cell' in step) {
        await begin();
        await reader.cell(step.cell);
      } else if ('focus' in step) {
        await expect
          .poll(() => page.evaluate((sel) => !!document.activeElement?.closest(sel), step.focus), { message: `keyboard focus inside ${step.focus}` })
          .toBe(true);
      } else if ('check' in step) {
        await step.check(page);
      }
    } catch (err) {
      entry.error = (err as Error).message;
      entry.phrases = (await reader.log()).slice(phrasesFrom);
      const failure = new Error(`${scenario.id}, step ${entry.step}\n${entry.error}`);
      (failure as Error & { transcript?: TranscriptEntry[] }).transcript = transcript;
      throw failure;
    }
    entry.phrases = (await reader.log()).slice(phrasesFrom);
  }
  return transcript;
}
