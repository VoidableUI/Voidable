import "@voidable/ui";
import { VoidTurbo } from "@voidable/ui-hotwire";

// Keep client state (open dialogs, checked boxes) through Turbo page-refresh morphs.
VoidTurbo.start();

// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import "@hotwired/turbo-rails"
import "controllers"
