// SPDX-License-Identifier: MIT
//
// A small, screen-reader-neutral surface over Guidepup's VoiceOver and NVDA, so
// the runner and the scenarios do not care which one is driving. Everything that
// differs between the two (which command is "next form control") is here. Only
// types are imported from Guidepup, so this file loads anywhere.
import type { NVDAPlaywright, VoiceOverPlaywright } from '@guidepup/playwright';
import type { Nav } from './facts';

export interface Reader {
  readonly name: 'VoiceOver' | 'NVDA';
  /** Move the screen reader's cursor: the plain next item, or quick navigation. */
  move(by: Nav): Promise<void>;
  /** Put the cursor back at the start of the web content. */
  restart(): Promise<void>;
  /** Activate the item at the cursor: VoiceOver VO+Space, NVDA Enter. */
  act(): Promise<void>;
  /** Press a key (or shortcut) as the keyboard would. */
  press(key: string): Promise<void>;
  /** Type text, one character at a time. */
  type(text: string): Promise<void>;
  /** One step of table cell navigation from where the cursor is. */
  cell(direction: 'right' | 'down'): Promise<void>;
  /** Everything spoken since the screen reader started, in order. Only grows. */
  log(): Promise<string[]>;
  /** The screen reader's own version string, for the results file. */
  version(): string;
  /**
   * Asks the reader what it is looking at with commands that do not depend on its page cursor (the window
   * title, the focused object, the current line), and returns what each said, for a log. Used when the reader
   * has gone silent. Optional: the fake reader of the runner's own tests has none.
   */
  diagnose?(): Promise<string>;
  /** Asks the reader to rebuild its copy of the page (NVDA: refresh the browse document). */
  refresh?(): Promise<void>;
  /**
   * Puts the reader in the mode where its own navigation keys work, with its cursor at the top of the page
   * (NVDA: leave focus mode, Ctrl+Home). A reader that has switched to passing keys to a focused widget
   * (NVDA in focus mode on a radio, a switch or a tab) hears the page's keys and says nothing for its own.
   */
  browseMode?(): Promise<void>;
}

export function voiceOverReader(vo: VoiceOverPlaywright): Reader {
  let inTable = false;
  return {
    name: 'VoiceOver',
    async move(by) {
      switch (by) {
        case 'next':
          return vo.next();
        case 'heading':
          return vo.nextHeading();
        case 'landmark':
          return vo.nextLandmark();
        case 'link':
          return vo.nextLink();
        case 'focusable':
        case 'control':
          return vo.perform(vo.keyboardCommands.findNextControl);
        case 'table':
          inTable = false;
          return vo.perform(vo.keyboardCommands.findNextTable);
      }
    },
    restart: () => vo.navigateToWebContent(),
    act: () => vo.act(),
    press: (key) => vo.press(key),
    type: (text) => vo.type(text),
    async cell(direction) {
      // Table cells are navigated inside the table: interact with it once, then move.
      if (!inTable) {
        await vo.interact();
        inTable = true;
      }
      if (direction === 'right') await vo.next();
      else await vo.perform(vo.keyboardCommands.moveDown);
    },
    log: () => vo.spokenPhraseLog(),
    version: () => {
      try {
        return String(vo.version);
      } catch {
        return 'unknown';
      }
    },
  };
}

export function nvdaReader(nvda: NVDAPlaywright): Reader {
  return {
    name: 'NVDA',
    async move(by) {
      switch (by) {
        case 'next':
          return nvda.next();
        case 'heading':
          return nvda.nextHeading();
        case 'landmark':
          return nvda.nextLandmark();
        case 'link':
          return nvda.nextLink();
        case 'focusable':
          // Tab, not quick navigation: NVDA's form-field key skips sliders ("no next form field"), and Tab
          // usually also puts NVDA in focus mode on the control, where arrow keys change its value.
          return nvda.press('Tab');
        case 'control':
          return nvda.perform(nvda.keyboardCommands.moveToNextFormField);
        case 'table':
          return nvda.perform(nvda.keyboardCommands.moveToNextTable);
      }
    },
    restart: () => nvda.navigateToWebContent(),
    act: () => nvda.act(),
    press: (key) => nvda.press(key),
    type: (text) => nvda.type(text),
    cell: (direction) => nvda.perform(direction === 'right' ? nvda.keyboardCommands.moveToNextColumn : nvda.keyboardCommands.moveToNextRow),
    log: () => nvda.spokenPhraseLog(),
    async diagnose() {
      const out: string[] = [];
      const ask = async (label: string, command: Parameters<typeof nvda.perform>[0]) => {
        try {
          await nvda.perform(command);
          out.push(`${label}: ${JSON.stringify(await nvda.lastSpokenPhrase())}`);
        } catch (e) {
          out.push(`${label}: failed (${(e as Error).message.split('\n')[0]})`);
        }
      };
      await ask('window title', nvda.keyboardCommands.reportTitle);
      await ask('focus', nvda.keyboardCommands.reportCurrentFocus);
      await ask('current line', nvda.keyboardCommands.readLine);
      return out.join('; ');
    },
    refresh: () => nvda.perform(nvda.keyboardCommands.refreshBrowseDocument),
    async browseMode() {
      await nvda.perform(nvda.keyboardCommands.exitFocusMode);
      await nvda.press('Control+Home');
    },
    version: () => {
      try {
        return String(nvda.version);
      } catch {
        return 'unknown';
      }
    },
  };
}
