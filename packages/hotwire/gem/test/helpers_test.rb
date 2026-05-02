require "minitest/autorun"
require "voidable/hotwire/helpers"

class HelpersTest < Minitest::Test
  include Voidable::Hotwire::Helpers

  def test_void_attrs_with_single_event
    result = void_attrs("void-click", "form#submit")
    assert_equal "void-event", result[:data][:controller]
    assert_equal "void-click", result[:data][:"void-event-events-value"]
    assert_equal "void-click->form#submit", result[:data][:action]
  end

  def test_void_attrs_with_multiple_events
    result = void_attrs(["void-click", "void-change"])
    assert_equal "void-click,void-change", result[:data][:"void-event-events-value"]
  end

  def test_void_attrs_without_action
    result = void_attrs("void-click")
    assert_nil result[:data][:action]
  end
end
