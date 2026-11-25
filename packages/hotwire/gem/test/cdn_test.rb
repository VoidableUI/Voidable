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
end
