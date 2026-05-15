import { Application } from "@hotwired/stimulus"

const application = Application.start()

// Configure Stimulus development experience
application.debug = false
window.Stimulus   = application

import { VoidEventController, VoidTurbo } from "@voidable/ui-hotwire"
application.register("void-event", VoidEventController)
VoidTurbo.start()

export { application }
