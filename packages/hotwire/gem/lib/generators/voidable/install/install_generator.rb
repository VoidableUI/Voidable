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

      def add_theme_stylesheet
        sentinel = "</head>"
        inject_into_file "app/views/layouts/application.html.erb", before: sentinel do
          %(    <link rel="stylesheet" href="https://ga.jspm.io/npm:@voidable/theme@0.0.1/dist/theme.css" />\n)
        end
        say "Added @voidable/theme stylesheet to application layout", :green
      rescue Thor::Error
        say "Could not find application layout — add the theme stylesheet manually", :yellow
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
