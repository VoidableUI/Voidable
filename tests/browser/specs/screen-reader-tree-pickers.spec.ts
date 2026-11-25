// SPDX-License-Identifier: MIT
//
// The accessibility-tree companion of the select, combobox and multiselect
// screen-reader scenarios. Separate from screen-reader-tree.spec.ts because the
// markup of these three components is being redesigned: update
// screen-readers/scenarios-pickers.ts and pages/sr-pickers.html when it lands.
import { pickerScenarios } from '../screen-readers/scenarios-pickers';
import { treeSuite } from '../screen-readers/tree';

treeSuite('picker screen-reader scenarios in the accessibility tree', pickerScenarios);
