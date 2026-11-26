require "minitest/autorun"
require "json"
require "voidable/hotwire/helpers"

# The table helpers build the attribute hash; a real Rails app renders it (tests/browser/server/rails).
class TableHelpersTest < Minitest::Test
  include Voidable::Hotwire::Helpers

  # What Rails' content_tag receives; recorded instead of rendered. With a block the second argument is the options.
  def content_tag(name, content_or_options, options = nil, &block)
    if block
      [name, block.call, content_or_options]
    else
      [name, content_or_options, options]
    end
  end

  def test_value_and_keys_are_one_json_attribute_each
    keys = { selectAll: ["Control+a", "Meta+a"] }
    name, _content, options = void_table(value: %w[o1 o3], keys: keys, aria_label: "Orders") { "<table></table>" }
    assert_equal "void-table", name
    assert_equal %w[o1 o3].to_json, options["value"]
    assert_equal keys.to_json, options["keys"]
    assert_equal "Orders", options["aria-label"]
  end

  def test_a_json_string_is_taken_as_it_is
    _name, _content, options = void_table(value: '["a"]') { "" }
    assert_equal '["a"]', options["value"]
  end

  def test_the_server_attributes_have_dashes_and_booleans_are_present_or_absent
    _name, _content, options = void_table(
      manual: true, selectable: true, sort: "name", sort_direction: "ascending", filter: nil,
      filter_columns: "name email", total_rows: 1250, all_selected: false, striped: true
    ) { "" }
    assert_equal "", options["manual"]
    assert_equal "", options["selectable"]
    assert_equal "ascending", options["sort-direction"]
    assert_equal "name email", options["filter-columns"]
    assert_equal 1250, options["total-rows"]
    assert_equal "", options["striped"]
    refute options.key?("all-selected")
    refute options.key?("filter")
    refute options.key?("value")
  end

  def test_single_selection_keeps_its_word
    _name, _content, options = void_table(selectable: "single") { "" }
    assert_equal "single", options["selectable"]
  end

  def test_data_and_aria_stay_rails_hashes
    _name, _content, options = void_table(data: { controller: "orders", action: "void-sort->orders#sort" }) { "" }
    assert_equal({ controller: "orders", action: "void-sort->orders#sort" }, options[:data])
    refute options.key?("data")
  end

  def test_the_parts_take_a_block_and_the_same_rules
    {
      void_table_filter: "void-table-filter",
      void_table_empty: "void-table-empty",
      void_table_selection: "void-table-selection",
      void_table_select_all: "void-table-select-all"
    }.each do |helper, tag_name|
      name, content, options = public_send(helper, hidden: true) { "inside" }
      assert_equal tag_name, name
      assert_equal "inside", content
      assert_equal "", options["hidden"]
    end
  end

  def test_a_part_without_a_block_is_empty
    name, content, options = void_table_empty(hidden: true)
    assert_equal "void-table-empty", name
    assert_equal "", content
    assert_equal({ "hidden" => "" }, options)
  end
end
