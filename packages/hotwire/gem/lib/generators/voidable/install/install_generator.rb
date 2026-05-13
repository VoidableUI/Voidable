module Voidable
  module Generators
    class InstallGenerator < Rails::Generators::Base
      source_root File.expand_path("templates", __dir__)
      desc "Install Voidable UI into your Rails application"

      def create_initializer
        template "initializer.rb.tt", "config/initializers/voidable.rb"
      end

      def pin_packages
        return unless File.exist?("config/importmap.rb")
        append_to_file "config/importmap.rb", <<~RUBY

          # Voidable UI
          pin "@voidable/ui", to: "https://ga.jspm.io/npm:@voidable/ui@0.0.1/dist/ui.js"
          pin "@voidable/ui-hotwire", to: "https://ga.jspm.io/npm:@voidable/ui-hotwire@0.0.1/dist/hotwire.js"
        RUBY
        say "Pinned @voidable/ui and @voidable/ui-hotwire in importmap", :green
      end

      def create_layout
        template "application.html.erb.tt", "app/views/layouts/application.html.erb", force: true
        say "Created Voidable application layout", :green
      end

      def add_js_import
        js_entrypoint = "app/javascript/application.js"
        if File.exist?(js_entrypoint)
          prepend_to_file js_entrypoint, "import \"@voidable/ui\";\nimport \"@voidable/ui-hotwire\";\n\n"
          say "Added Voidable imports to application.js", :green
        end
      end

      def install_devise_views
        return unless defined?(Devise)
        generate "voidable:devise_views"
        say "Installed Voidable-styled Devise views", :green
      end
    end
  end
end
