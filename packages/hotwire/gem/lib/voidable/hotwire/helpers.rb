module Voidable
  module Hotwire
    module Helpers
      # Generates the Stimulus `data-action` attribute that wires Voidable
      # component events to a controller action. Stimulus handles custom events
      # natively, so no bridging controller is required.
      #
      #   void_attrs("void-click", "form#submit")
      #   # => { data: { action: "void-click->form#submit" } }
      #
      #   void_attrs(["void-click", "void-change"], "form#update")
      #   # => { data: { action: "void-click->form#update void-change->form#update" } }
      #
      # Without an action no attributes are generated.
      def void_attrs(events, action = nil)
        return { data: {} } unless action

        { data: { action: Array(events).map { |e| "#{e}->#{action}" }.join(" ") } }
      end
    end
  end
end
