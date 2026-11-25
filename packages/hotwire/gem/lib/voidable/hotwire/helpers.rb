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

      # Loads the development warnings (@voidable/ui/dev) for importmap apps.
      # Put it after `javascript_importmap_tags` in the layout head. It renders
      # nothing unless Voidable::Hotwire.dev_warnings is on, which by default is
      # the development environment only, so a production page never loads or
      # mentions the file. With Vite the generated application.js imports it
      # under `import.meta.env.DEV` instead and this helper is not needed.
      #
      # `Voidable::Hotwire.dev_warnings = :throw` turns warnings into thrown
      # errors, for system tests that fail on console errors.
      def voidable_dev_tags
        return "".html_safe unless Voidable::Hotwire.dev_warnings?

        config = Voidable::Hotwire.dev_warnings == :throw ? %(<script>window.VOIDABLE_DEV = { throw: true };</script>\n).html_safe : "".html_safe
        config + javascript_import_module_tag("@voidable/ui/dev")
      end
    end
  end
end
