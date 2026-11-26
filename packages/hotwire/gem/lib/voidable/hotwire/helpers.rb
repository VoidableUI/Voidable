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

      # The data table (`void-table`) and its parts, for a table the server drives. `value:` (the selected
      # row values, an array) and `keys:` (key actions, a hash) are written as the one JSON attribute the
      # element reads, which `tag.void_table value: ids` could not (Rails would join an array with spaces and
      # turn a hash into `data-*`). The other attributes are the element's own, with underscores for dashes
      # (`sort_direction:`, `total_rows:`, `all_selected:`, `filter_columns:`); `true` is a boolean attribute
      # (`manual: true`, `selectable: true`; `selectable: "single"` is one row), `false` and `nil` leave it off.
      #
      #   <%= void_table(manual: true, selectable: true, sort: params[:sort], sort_direction: params[:dir],
      #         value: @selected, total_rows: @total, aria_label: "Orders",
      #         data: { controller: "orders", action: "void-sort->orders#sort" }) do %>
      #     <table>…</table>
      #     <%= void_table_selection(hidden: true) do %><span data-count></span> selected<% end %>
      #     <%= void_table_select_all(hidden: true) do %><button type="button">Select all <%= @total %></button><% end %>
      #   <% end %>
      #
      # `data:` and `aria:` stay Rails' own hashes. The parts take a block and the same attribute rules.
      def void_table(**attributes, &block) = void_element("void-table", attributes, TABLE_JSON_ATTRIBUTES, block)

      def void_table_filter(**attributes, &block) = void_element("void-table-filter", attributes, [], block)

      def void_table_empty(**attributes, &block) = void_element("void-table-empty", attributes, [], block)

      def void_table_selection(**attributes, &block) = void_element("void-table-selection", attributes, [], block)

      def void_table_select_all(**attributes, &block) = void_element("void-table-select-all", attributes, [], block)

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
      TABLE_JSON_ATTRIBUTES = %w[value keys].freeze

      def void_chart(tag_name, data, attributes)
        attributes = attributes.merge(data: data) unless data.nil?
        content_tag(tag_name, "", void_attribute_hash(attributes, JSON_ATTRIBUTES))
      end

      # An element with content (the table and its parts): the block is the content.
      def void_element(tag_name, attributes, json, block)
        options = void_attribute_hash(attributes, json)
        block ? content_tag(tag_name, options, &block) : content_tag(tag_name, "", options)
      end

      # Underscores become dashes, `true` is a boolean attribute, `false` and `nil` leave it off, and the
      # names in `json` are written as JSON (a String is taken as it is). Rails' own `data:` and `aria:`
      # hashes are left for `content_tag` to expand.
      def void_attribute_hash(attributes, json)
        options = {}
        attributes.each do |name, value|
          key = name.to_s.tr("_", "-")
          if json.include?(key)
            options[key] = value.is_a?(String) ? value : value.to_json unless value.nil?
          elsif %w[data aria].include?(key) && value.is_a?(Hash)
            options[name.to_sym] = value
          elsif value == true
            options[key] = ""
          elsif value != false && !value.nil?
            options[key] = value
          end
        end
        options
      end

      def voidable_dev_pinned?
        return true unless defined?(Rails) && Rails.application.respond_to?(:importmap)

        Rails.application.importmap.packages.key?("@voidable/ui/dev")
      end
    end
  end
end
