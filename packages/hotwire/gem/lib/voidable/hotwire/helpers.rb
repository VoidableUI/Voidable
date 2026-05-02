module Voidable
  module Hotwire
    module Helpers
      # Generates data attributes for wiring a Voidable component to Stimulus.
      #
      #   void_attrs("void-click", "form#submit")
      #   # => { controller: "void-event", "void-event-events-value": "void-click",
      #   #      action: "void-click->form#submit" }
      #
      def void_attrs(events, action = nil)
        attrs = {
          data: {
            controller: "void-event",
            "void-event-events-value": Array(events).join(",")
          }
        }
        if action
          event_list = Array(events)
          attrs[:data][:action] = event_list.map { |e| "#{e}->#{action}" }.join(" ")
        end
        attrs
      end
    end
  end
end
