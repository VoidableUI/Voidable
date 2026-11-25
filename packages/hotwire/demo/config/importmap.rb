# Pin npm packages by running ./bin/importmap

pin "application"
pin "@hotwired/turbo-rails", to: "turbo.min.js"
pin "@hotwired/stimulus", to: "stimulus.min.js"
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js"
pin_all_from "app/javascript/controllers", under: "controllers"

# Voidable UI
pin "@voidable/ui", to: "https://cdn.jsdelivr.net/npm/@voidable/ui@0.7.0/+esm"
pin "@voidable/ui-hotwire", to: "https://cdn.jsdelivr.net/npm/@voidable/ui-hotwire@0.5.0/dist/index.js"
