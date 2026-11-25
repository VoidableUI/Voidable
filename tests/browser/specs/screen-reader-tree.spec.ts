// SPDX-License-Identifier: MIT
//
// The accessibility-tree companion of the scripted screen-reader scenarios: the
// same steps and facts (screen-readers/scenarios.ts), asserted through the
// browser's accessibility tree in every engine. The VoiceOver and NVDA runs
// (screen-readers/specs, workflow screen-readers.yml) say the same things with
// a real screen reader; if this passes and those fail, the screen reader is the
// variable. See screen-readers/README.md.
import { scenarios } from '../screen-readers/scenarios';
import { treeSuite } from '../screen-readers/tree';

treeSuite('screen-reader scenarios in the accessibility tree', scenarios);
