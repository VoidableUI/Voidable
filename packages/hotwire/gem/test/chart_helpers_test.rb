require "minitest/autorun"
require "json"
require "voidable/hotwire/helpers"

# The chart helpers build the attribute hash; a real Rails app renders it (tests/browser/server/rails).
class ChartHelpersTest < Minitest::Test
  include Voidable::Hotwire::Helpers

  # What Rails' content_tag receives; recorded instead of rendered.
  def content_tag(name, content, options)
    [name, content, options]
  end

  def test_data_is_one_json_attribute_not_data_dash_attributes
    data = { series: [{ name: "2025", values: [4, 8] }], labels: %w[Q1 Q2] }
    name, _content, options = void_bar_chart(data, aria_label: "Revenue")
    assert_equal "void-bar-chart", name
    assert_equal data.to_json, options["data"]
    assert_equal "Revenue", options["aria-label"]
    assert_equal %w[aria-label data], options.keys.sort
  end

  def test_a_json_string_is_taken_as_it_is
    _name, _content, options = void_line_chart('{"series":[]}')
    assert_equal '{"series":[]}', options["data"]
  end

  def test_booleans_are_present_or_absent
    _name, _content, options = void_donut_chart({ segments: [] }, show_total: true, show_value: false, show_table: true, gaps: nil)
    assert_equal "", options["show-total"]
    assert_equal "", options["show-table"]
    refute options.key?("show-value")
    refute options.key?("gaps")
  end

  def test_a_gauge_takes_plain_attributes_and_json_zones
    zones = [{ from: 0, to: 60, color: "green" }]
    name, _content, options = void_gauge(value: 72, unit: "%", unit_inline: true, zones: zones)
    assert_equal "void-gauge", name
    assert_equal 72, options["value"]
    assert_equal "", options["unit-inline"]
    assert_equal zones.to_json, options["zones"]
    refute options.key?("data")
  end
end
