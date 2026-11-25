require "minitest/autorun"
require "voidable/hotwire/cdn"

class CDNTest < Minitest::Test
  C = Voidable::Hotwire::CDN
  V = Voidable::Hotwire::VERSION

  def test_version_is_semver
    assert_match(/\A\d+\.\d+\.\d+\z/, V)
  end

  def test_pins_follow_the_gem_version
    expected = V == "0.0.0" ? "latest" : V
    assert_equal expected, C::NPM_VERSION
    assert_equal "https://cdn.jsdelivr.net/npm/@voidable/ui@#{expected}/+esm", C::UI_URL
    assert_equal "https://cdn.jsdelivr.net/npm/@voidable/ui-hotwire@#{expected}/dist/index.js", C::UI_HOTWIRE_URL
    assert_equal "https://cdn.jsdelivr.net/npm/@voidable/theme@#{expected}/src/index.css", C::THEME_CSS_URL
  end

  def test_dev_entry_is_a_raw_standalone_file_of_this_release_never_latest
    if V == "0.0.0"
      assert_nil C::UI_DEV_URL
    else
      assert_equal "https://cdn.jsdelivr.net/npm/@voidable/ui@#{V}/dist/dev.js", C::UI_DEV_URL
    end
  end

  def test_autoloader_is_pinned_as_a_raw_file_with_lit_pinned_beside_it
    expected = V == "0.0.0" ? "latest" : V
    assert_equal "https://cdn.jsdelivr.net/npm/@voidable/ui@#{expected}/dist/autoloader.js", C::UI_AUTOLOADER_URL
    assert_equal(
      ["@voidable/ui/autoloader", "lit", "lit/decorators.js", "lit/directives/live.js"],
      C::AUTOLOADER_PINS.keys
    )
    assert C::AUTOLOADER_PINS.values.all? { |url| url.start_with?("https://cdn.jsdelivr.net/npm/") }
    assert C::AUTOLOADER_PINS.frozen?
  end
end
