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
      THEME_CSS_URL = "#{BASE}/@voidable/theme@#{NPM_VERSION}/src/index.css".freeze
    end
  end
end
