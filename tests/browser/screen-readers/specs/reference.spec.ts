// SPDX-License-Identifier: MIT
//
// The reference-control probes (scenarios-reference.ts): plain HTML and ARIA Authoring Practices controls next to
// the Voidable ones, with what the reader says logged. They never fail the run.
import { referenceScenarios } from '../scenarios-reference';
import { screenReaderSuite } from '../suite';

screenReaderSuite('screen reader references', referenceScenarios);
