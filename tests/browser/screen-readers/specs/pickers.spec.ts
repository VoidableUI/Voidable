// SPDX-License-Identifier: MIT
//
// Select, combobox and multiselect with a screen reader, in a file of their own
// because their markup is being redesigned: update scenarios-pickers.ts and
// pages/sr-pickers.html when it lands.
import { pickerScenarios } from '../scenarios-pickers';
import { screenReaderSuite } from '../suite';

screenReaderSuite('screen reader pickers', pickerScenarios);
