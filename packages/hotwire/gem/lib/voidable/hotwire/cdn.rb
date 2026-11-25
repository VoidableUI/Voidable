require_relative "version"

module Voidable
  module Hotwire
    # CDN URLs for the npm packages this gem pins. All Voidable packages are
    # released together at one version, so the pins are derived from the gem's
    # own VERSION and never typed by hand. config/importmap.rb, the install
    # generator and the layout templates all read from here.
    module CDN
      BASE = "https://cdn.jsdelivr.net/npm".freeze

      # An unreleased checkout (VERSION 0.0.0, e.g. a path or git dependency)
      # follows the latest published packages instead of a version that was
      # never published.
      NPM_VERSION = (VERSION == "0.0.0" ? "latest" : VERSION).freeze

      UI_URL = "#{BASE}/@voidable/ui@#{NPM_VERSION}/+esm".freeze
      UI_HOTWIRE_URL = "#{BASE}/@voidable/ui-hotwire@#{NPM_VERSION}/dist/index.js".freeze
      THEME_CSS_URL = "#{BASE}/@voidable/theme@#{NPM_VERSION}/dist/void.min.css".freeze

      # The autoloader (@voidable/ui/autoloader) imports each component from a
      # file next to it, so it is pinned as the raw dist file, not as a +esm
      # bundle (jsDelivr would bundle a private copy of the shared base code
      # into every component). Raw files import `lit` by bare name, so lit's
      # three entry points are pinned too, to the same +esm URLs the +esm
      # bundle of @voidable/ui itself uses.
      # Development warnings (@voidable/ui/dev): one self-contained file with no
      # imports, so the raw dist file works as a pin. Only ever imported in
      # development (see Helpers#voidable_dev_tags).
      UI_DEV_URL = "#{BASE}/@voidable/ui@#{NPM_VERSION}/dist/dev.js".freeze

      UI_AUTOLOADER_URL = "#{BASE}/@voidable/ui@#{NPM_VERSION}/dist/autoloader.js".freeze
      LIT_URL = "#{BASE}/lit@3/+esm".freeze
      LIT_DECORATORS_URL = "#{BASE}/lit@3/decorators.js/+esm".freeze
      LIT_DIRECTIVES_LIVE_URL = "#{BASE}/lit@3/directives/live.js/+esm".freeze

      # Import map entries for the autoloader setup, in pin order.
      AUTOLOADER_PINS = {
        "@voidable/ui/autoloader" => UI_AUTOLOADER_URL,
        "lit" => LIT_URL,
        "lit/decorators.js" => LIT_DECORATORS_URL,
        "lit/directives/live.js" => LIT_DIRECTIVES_LIVE_URL
      }.freeze
    end
  end
end
