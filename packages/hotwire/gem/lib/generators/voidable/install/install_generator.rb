module Voidable
  module Generators
    class InstallGenerator < Rails::Generators::Base
      source_root File.expand_path("templates", __dir__)
      desc "Install Voidable UI into your Rails application"

      class_option :layout, type: :string, default: "navbar", enum: ["navbar", "sidebar"],
        desc: "Application layout style (navbar or sidebar)"

      def create_initializer
        template "initializer.rb.tt", "config/initializers/voidable.rb"
      end

      def pin_packages
        importmap = "config/importmap.rb"
        return unless File.exist?(importmap)
        return if File.read(importmap).include?("@voidable/ui")
        append_to_file importmap, <<~RUBY

          # Voidable UI
          pin "@voidable/ui", to: "https://ga.jspm.io/npm:@voidable/ui@0.0.1/dist/ui.js"
          pin "@voidable/ui-hotwire", to: "https://ga.jspm.io/npm:@voidable/ui-hotwire@0.0.1/dist/hotwire.js"
        RUBY
        say "Pinned @voidable/ui and @voidable/ui-hotwire in importmap", :green
      end

      def create_layout
        layout_template = options[:layout] == "sidebar" ? "application_sidebar.html.erb.tt" : "application.html.erb.tt"
        template layout_template, "app/views/layouts/application.html.erb", force: true
        say "Created Voidable application layout (#{options[:layout]})", :green
      end

      def create_layout_stylesheet
        css_source = options[:layout] == "sidebar" ? "voidable-layout-sidebar.css" : "voidable-layout-navbar.css"
        copy_file css_source, "app/assets/stylesheets/voidable-layout.css", force: true
        say "Created Voidable layout stylesheet", :green
      end

      def add_js_import
        js_entrypoint = "app/javascript/application.js"
        return unless File.exist?(js_entrypoint)
        return if File.read(js_entrypoint).include?("@voidable/ui")
        prepend_to_file js_entrypoint, "import \"@voidable/ui\";\nimport \"@voidable/ui-hotwire\";\n\n"
        say "Added Voidable imports to application.js", :green
      end

      private

      def app_name
        Rails.application.class.module_parent_name.underscore
      end

      public

      def install_devise_views
        return unless defined?(Devise)
        generate "voidable:devise_views"
        say "Installed Voidable-styled Devise views", :green
      end
    end
  end
end
