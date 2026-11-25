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
import type { Fact, Nav, Scenario, Step } from './facts';
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
  let mark = 0;
  let moved = false;
  let reached: Fact | null = null;

  const spokenSince = async (m: number) => (await reader.log()).slice(m);
  const begin = async () => {
    mark = (await reader.log()).length;
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
    for (let i = 0; i < MAX_MOVES; i++) {
      const before = (await reader.log()).length;
      await reader.move(by);
      const said = (await reader.log()).slice(before);
      seen.push(...said);
      // The element may be split over several phrases; judge the words of this move together.
      const joined = said.join(' ');
      if (said.length && matchFact(joined, fact).isElement) return check(fact, said);
    }
    throw new Error(`never reached ${describeFact(fact)} in ${MAX_MOVES} moves by "${by}".\n  Heard since the step began:\n${tail(seen, 20)}`);
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
        await reach(step.reach, step.by ?? 'next');
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
        await hear(step.hear);
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
