module Voidable
  module Generators
    class InstallGenerator < Rails::Generators::Base
      source_root File.expand_path("templates", __dir__)
      desc "Install Voidable UI into your Rails application"

      class_option :layout, type: :string, default: "topbar", enum: ["topbar", "sidebar", "switching"],
        desc: "Application layout style (topbar, sidebar, or switching)"

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
        copy_file "_settings_menu.html.erb", "app/views/layouts/_settings_menu.html.erb"

        case options[:layout]
        when "sidebar"
          template "application_sidebar.html.erb.tt", "app/views/layouts/application.html.erb", force: true
        when "switching"
          template "application_topbar.html.erb.tt", "app/views/layouts/application.html.erb", force: true
          template "topbar.html.erb.tt", "app/views/layouts/topbar.html.erb"
          template "sidebar.html.erb.tt", "app/views/layouts/sidebar.html.erb"
        else
          template "application_topbar.html.erb.tt", "app/views/layouts/application.html.erb", force: true
        end
        say "Created Voidable application layout (#{options[:layout]})", :green
      end

      def create_layout_stylesheet
        case options[:layout]
        when "sidebar"
          copy_file "voidable-layout-sidebar.css", "app/assets/stylesheets/voidable-layout.css", force: true
        when "switching"
          copy_file "voidable-layout-topbar.css", "app/assets/stylesheets/voidable-layout-topbar.css"
          copy_file "voidable-layout-sidebar.css", "app/assets/stylesheets/voidable-layout-sidebar.css"
        else
          copy_file "voidable-layout-topbar.css", "app/assets/stylesheets/voidable-layout.css", force: true
        end
        say "Created Voidable layout stylesheet", :green
      end

      def setup_layout_switching
        return unless options[:layout] == "switching"

        template "settings_controller.rb.tt", "app/controllers/settings_controller.rb"

        route 'post "toggle_layout", to: "settings#toggle_layout"'

        inject_into_class "app/controllers/application_controller.rb", "ApplicationController", <<-RUBY

  layout :resolve_layout

  private

  def resolve_layout
    cookies[:layout] || "topbar"
  end
        RUBY

        say "Configured layout switching (topbar/sidebar toggle)", :green
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
