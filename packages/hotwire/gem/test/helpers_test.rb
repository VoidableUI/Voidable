require "minitest/autorun"
require "voidable/hotwire/helpers"

class HelpersTest < Minitest::Test
  include Voidable::Hotwire::Helpers

  def test_void_attrs_with_single_event
    result = void_attrs("void-click", "form#submit")
    assert_equal "void-click->form#submit", result[:data][:action]
  end

  def test_void_attrs_with_multiple_events
    result = void_attrs(["void-click", "void-change"], "form#update")
    assert_equal "void-click->form#update void-change->form#update", result[:data][:action]
  end

  def test_void_attrs_without_action
    result = void_attrs("void-click")
    assert_nil result[:data][:action]
  end

  def test_void_attrs_no_longer_emits_the_void_event_controller
    result = void_attrs("void-click", "form#submit")
    refute result[:data].key?(:controller)
    refute result[:data].key?(:"void-event-events-value")
  end
end
