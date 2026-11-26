// SPDX-License-Identifier: MIT
//
// The accessibility-tree companion of the select, combobox and multiselect
// screen-reader scenarios, in their own file (screen-readers/scenarios-pickers.ts,
// pages/sr-pickers.html) since their explicit-parts markup (#52) was designed apart.
import { pickerScenarios } from '../screen-readers/scenarios-pickers';
import { treeSuite } from '../screen-readers/tree';

treeSuite('picker screen-reader scenarios in the accessibility tree', pickerScenarios);
