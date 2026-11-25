import "@hotwired/turbo-rails";
import { Application } from "@hotwired/stimulus";
import "@voidable/ui";
import "@voidable/ui-hotwire";
import { VoidTurbo } from "@voidable/ui-hotwire";

const app = Application.start();
// Voidable events need no controller: use data-action="void-click->x#y".
VoidTurbo.start();

import "./application.css";
import "./voidable-layout-topbar.css";
import "./voidable-layout-sidebar.css";
import "./voidable-devise.css";
import "@voidable/theme";
import "./voidable-layout.js";
