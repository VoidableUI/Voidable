require "voidable/hotwire/cdn"

pin "@voidable/ui", to: Voidable::Hotwire::CDN::UI_URL
pin "@voidable/ui-hotwire", to: Voidable::Hotwire::CDN::UI_HOTWIRE_URL
# Development warnings: pinned (not loaded) only in development; the layout
# helper `voidable_dev_tags` imports it.
pin "@voidable/ui/dev", to: Voidable::Hotwire::CDN::UI_DEV_URL if defined?(Rails) && Rails.env.development?
