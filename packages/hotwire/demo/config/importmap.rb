# Pin npm packages by running ./bin/importmap

pin "application"
pin "@hotwired/turbo-rails", to: "turbo.min.js"
pin "@hotwired/stimulus", to: "stimulus.min.js"
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js"
pin_all_from "app/javascript/controllers", under: "controllers"

# Voidable UI: the voidable-hotwire engine pins @voidable/ui and
# @voidable/ui-hotwire at the gem's own version (Voidable::Hotwire::CDN).
# VOIDABLE_LOCAL=1 serves this repository's built packages from
# public/voidable-local/ (written by tests/browser/server/rails.mjs) instead.
if ENV["VOIDABLE_LOCAL"]
  pin "@voidable/ui", to: "/voidable-local/ui.js"
  pin "@voidable/ui-hotwire", to: "/voidable-local/ui-hotwire.js"
end
