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

      # The four charts, drawn from server data with no script: the data is written as the JSON `data`
      # attribute (a gauge's `zones` too), so the first HTML response already contains it. Pass Ruby hashes
      # and arrays (or a JSON string); the other attributes are the elements' own, with underscores for
      # dashes (`show_value: true`, `aria_label: "Revenue"`). A `true` is a boolean attribute; `false` and
      # `nil` leave it off. Each chart carries a visually hidden data table captioned with `aria_label`;
      # `show_table: true` shows it below the chart.
      #
      #   <%= void_bar_chart({ series: [{ name: "2025", values: [4, 8] }], labels: %w[Q1 Q2] }, aria_label: "Revenue") %>
      #   <%= void_line_chart(@visits, interpolation: "step", aria_label: "Visitors") %>
      #   <%= void_donut_chart({ segments: [{ name: "Search", value: 40 }] }, show_total: true, aria_label: "Sources") %>
      #   <%= void_gauge(value: 72, unit: "%", zones: [{ from: 0, to: 60, color: "green" }], aria_label: "Disk") %>
      #
      # Written as `tag.void_bar_chart data: hash`, Rails would turn the hash into `data-*` attributes;
      # these helpers write the one `data` attribute the element reads.
      def void_bar_chart(data = nil, **attributes) = void_chart("void-bar-chart", data, attributes)

      def void_line_chart(data = nil, **attributes) = void_chart("void-line-chart", data, attributes)

      def void_donut_chart(data = nil, **attributes) = void_chart("void-donut-chart", data, attributes)

      # A single reading is plain attributes (`value:`, `min:`, `max:`); segments go in `data`, colour bands in `zones:`.
      def void_gauge(data = nil, **attributes) = void_chart("void-gauge", data, attributes)

      # Loads the development warnings (@voidable/ui/dev) for importmap apps.
      # Put it after `javascript_importmap_tags` in the layout head. It renders
      # nothing unless Voidable::Hotwire.dev_warnings is on, which by default is
      # the development environment only, so a production page never loads or
      # mentions the file. With Vite the generated application.js imports it
      # under `import.meta.env.DEV` instead and this helper is not needed.
      #
      # `Voidable::Hotwire.dev_warnings = :throw` turns warnings into thrown
      # errors, for system tests that fail on console errors.
      #
      # It also renders nothing when the import map has no `@voidable/ui/dev`
      # pin (an unreleased gem checkout pins none), rather than importing a
      # name the browser cannot resolve.
      def voidable_dev_tags
        return "".html_safe unless Voidable::Hotwire.dev_warnings?
        return "".html_safe unless voidable_dev_pinned?

        config = Voidable::Hotwire.dev_warnings == :throw ? %(<script>window.VOIDABLE_DEV = { throw: true };</script>\n).html_safe : "".html_safe
        config + javascript_import_module_tag("@voidable/ui/dev")
      end

      private

      JSON_ATTRIBUTES = %w[data zones].freeze

      def void_chart(tag_name, data, attributes)
        options = {}
        attributes = attributes.merge(data: data) unless data.nil?
        attributes.each do |name, value|
          name = name.to_s.tr("_", "-")
          if JSON_ATTRIBUTES.include?(name)
            options[name] = value.is_a?(String) ? value : value.to_json unless value.nil?
          elsif value == true
            options[name] = ""
          elsif value != false && !value.nil?
            options[name] = value
          end
        end
        content_tag(tag_name, "", options)
      end

      def voidable_dev_pinned?
        return true unless defined?(Rails) && Rails.application.respond_to?(:importmap)

        Rails.application.importmap.packages.key?("@voidable/ui/dev")
      end
    end
  end
end
