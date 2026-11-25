require "voidable/hotwire/cdn"

pin "@voidable/ui", to: Voidable::Hotwire::CDN::UI_URL
pin "@voidable/ui-hotwire", to: Voidable::Hotwire::CDN::UI_HOTWIRE_URL
# Development warnings: pinned only in development and never preloaded, so a
# page loads the file only where the layout helper `voidable_dev_tags`
# imports it (an app that does not call the helper never fetches it).
# Not pinned at all from an unreleased checkout (Voidable::Hotwire::CDN::UI_DEV_URL is nil).
if Voidable::Hotwire::CDN::UI_DEV_URL && defined?(Rails) && Rails.env.development?
  pin "@voidable/ui/dev", to: Voidable::Hotwire::CDN::UI_DEV_URL, preload: false
end
