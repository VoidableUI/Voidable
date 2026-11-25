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

# ActiveSupport supplies html_safe in a Rails app; the tests run without Rails.
String.class_eval { def html_safe = self } unless "".respond_to?(:html_safe)
require "voidable/hotwire/dev"

class DevTagsTest < Minitest::Test
  include Voidable::Hotwire::Helpers

  # Stands in for importmap-rails' helper.
  def javascript_import_module_tag(*names)
    %(<script type="module">import "#{names.first}"</script>).html_safe
  end

  def setup
    @saved = Voidable::Hotwire.instance_variable_get(:@dev_warnings)
  end

  def teardown
    Voidable::Hotwire.dev_warnings = @saved
  end

  def test_renders_nothing_when_off
    Voidable::Hotwire.dev_warnings = false
    assert_equal "", voidable_dev_tags
  end

  def test_imports_the_dev_entry_when_on
    Voidable::Hotwire.dev_warnings = true
    assert_equal %(<script type="module">import "@voidable/ui/dev"</script>), voidable_dev_tags
  end

  def test_throw_mode_sets_the_config_before_the_import
    Voidable::Hotwire.dev_warnings = :throw
    html = voidable_dev_tags
    assert_includes html, "window.VOIDABLE_DEV = { throw: true };"
    assert html.index("VOIDABLE_DEV") < html.index("import")
  end

  def test_default_is_off_outside_a_rails_development_environment
    Voidable::Hotwire.dev_warnings = nil
    refute Voidable::Hotwire.dev_warnings?
  end
end
