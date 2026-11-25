module Voidable
  module Hotwire
    # npm package versions the gem pins from the CDN. This is the single place
    # to bump them: config/importmap.rb, the install generator and the layout
    # templates all read from here.
    module Versions
      UI = "0.6.1"
      THEME = "0.7.0"
      UI_HOTWIRE = "0.4.1"

      UI_URL = "https://cdn.jsdelivr.net/npm/@voidable/ui@#{UI}/+esm".freeze
      UI_HOTWIRE_URL = "https://cdn.jsdelivr.net/npm/@voidable/ui-hotwire@#{UI_HOTWIRE}/dist/index.js".freeze
      THEME_CSS_URL = "https://cdn.jsdelivr.net/npm/@voidable/theme@#{THEME}/src/index.css".freeze
    end
  end
end
