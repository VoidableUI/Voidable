require "minitest/autorun"
require "voidable/hotwire/versions"

class VersionsTest < Minitest::Test
  V = Voidable::Hotwire::Versions

  def test_urls_embed_the_pinned_versions
    assert_includes V::UI_URL, "@voidable/ui@#{V::UI}/"
    assert_includes V::UI_HOTWIRE_URL, "@voidable/ui-hotwire@#{V::UI_HOTWIRE}/"
    assert_includes V::THEME_CSS_URL, "@voidable/theme@#{V::THEME}/"
  end

  def test_versions_are_semver
    [V::UI, V::THEME, V::UI_HOTWIRE].each do |v|
      assert_match(/\A\d+\.\d+\.\d+\z/, v)
    end
  end
end
