import { Application } from "@hotwired/stimulus"

const application = Application.start()

// Configure Stimulus development experience
application.debug = false
window.Stimulus   = application

// Voidable events work with plain data-action="void-click->x#y"; no
// controller registration is needed. VoidTurbo protects client state on morphs.
import { VoidTurbo } from "@voidable/ui-hotwire"
VoidTurbo.start()

export { application }
