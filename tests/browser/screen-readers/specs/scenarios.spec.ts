// SPDX-License-Identifier: MIT
//
// The scripted screen-reader scenarios (scenarios.ts) driven by VoiceOver on macOS
// or NVDA on Windows. Run only by playwright.screen-readers.config.ts.
import { scenarios } from '../scenarios';
import { screenReaderSuite } from '../suite';

screenReaderSuite('screen reader', scenarios);
