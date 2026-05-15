module Voidable
  module Generators
    class InstallGenerator < Rails::Generators::Base
      source_root File.expand_path("templates", __dir__)
      desc "Install Voidable UI into your Rails application"

      class_option :layout, type: :string, default: "topbar", enum: ["topbar", "sidebar", "switching"],
        desc: "Application layout style (topbar, sidebar, or switching)"
      class_option :asset_pipeline, type: :string, default: "importmap", enum: ["importmap", "vite"],
        desc: "Asset pipeline (importmap or vite)"

      def create_initializer
        template "initializer.rb.tt", "config/initializers/voidable.rb"
      end

      def pin_packages
        return if vite?
        importmap = "config/importmap.rb"
        return unless File.exist?(importmap)
        return if File.read(importmap).include?("@voidable/ui")
        append_to_file importmap, <<~RUBY

          # Voidable UI
          pin "@voidable/ui", to: "https://cdn.jsdelivr.net/npm/@voidable/ui@0.5.2/+esm"
          pin "@voidable/ui-hotwire", to: "https://cdn.jsdelivr.net/npm/@voidable/ui-hotwire@0.3.0/dist/index.js"
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

      def create_layout_assets
        if vite?
          copy_file "voidable-layout.js", "app/javascript/voidable-layout.js"
          copy_file "voidable-devise.css", "app/javascript/voidable-devise.css"

          case options[:layout]
          when "sidebar"
            copy_file "voidable-layout-sidebar.css", "app/javascript/voidable-layout.css", force: true
          when "switching"
            copy_file "voidable-layout-topbar.css", "app/javascript/voidable-layout-topbar.css"
            copy_file "voidable-layout-sidebar.css", "app/javascript/voidable-layout-sidebar.css"
          else
            copy_file "voidable-layout-topbar.css", "app/javascript/voidable-layout.css", force: true
          end
        else
          copy_file "voidable-layout.js", "app/assets/javascripts/voidable-layout.js"
          copy_file "voidable-devise.css", "app/assets/stylesheets/voidable-devise.css"

          assets_init = "config/initializers/assets.rb"
          if File.exist?(assets_init) && !File.read(assets_init).include?("javascripts")
            append_to_file assets_init, <<~RUBY

              # Voidable layout scripts
              Rails.application.config.assets.paths << Rails.root.join("app/assets/javascripts")
            RUBY
          end

          case options[:layout]
          when "sidebar"
            copy_file "voidable-layout-sidebar.css", "app/assets/stylesheets/voidable-layout.css", force: true
          when "switching"
            copy_file "voidable-layout-topbar.css", "app/assets/stylesheets/voidable-layout-topbar.css"
            copy_file "voidable-layout-sidebar.css", "app/assets/stylesheets/voidable-layout-sidebar.css"
          else
            copy_file "voidable-layout-topbar.css", "app/assets/stylesheets/voidable-layout.css", force: true
          end
        end
        say "Created Voidable layout assets", :green
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
        contents = File.read(js_entrypoint)
        unless contents.include?("@voidable/ui")
          header = if vite?
            <<~JS
              // For smaller bundles, replace the bulk import below with
              // per-component imports for only the elements you use, e.g.:
              //   import "@voidable/ui/button";
              //   import "@voidable/ui/input";
              // See the available components under @voidable/ui's exports.
              import "@voidable/ui";
              import "@voidable/ui-hotwire";

            JS
          else
            <<~JS
              import "@voidable/ui";
              import "@voidable/ui-hotwire";

            JS
          end
          prepend_to_file js_entrypoint, header
        end
        if vite? && !contents.include?("voidable-layout.js")
          css_imports = %w[./application.css]
          case options[:layout]
          when "switching"
            css_imports << "./voidable-layout-topbar.css"
            css_imports << "./voidable-layout-sidebar.css"
          else
            css_imports << "./voidable-layout.css"
          end
          css_imports << "./voidable-devise.css"

          imports = css_imports.map { |f| "import \"#{f}\";" }.join("\n")
          imports += "\nimport \"@voidable/theme\";"
          imports += "\nimport \"./voidable-layout.js\";"
          append_to_file js_entrypoint, "\n#{imports}\n"
        end
        say "Added Voidable imports to application.js", :green
      end

      def create_vite_helper
        return unless vite?
        template "vite_helper.rb.tt", "app/helpers/vite_helper.rb"
        say "Created ViteHelper for asset path resolution", :green
      end

      private

      def app_name
        Rails.application.class.module_parent_name.underscore
      end

      def vite?
        options[:asset_pipeline] == "vite"
      end

      public

      def install_devise_views
        return unless defined?(Devise)
        generate "voidable:devise_views"
        say "Installed Voidable-styled Devise views", :green
      end

      def configure_pagy
        if defined?(Pagy)
          create_file "config/initializers/pagy.rb", "require \"pagy\"\nrequire \"pagy/toolbox/paginators/method\"\n" unless File.exist?("config/initializers/pagy.rb")
          inject_into_class "app/controllers/application_controller.rb", "ApplicationController", "  include Pagy::Method\n" unless File.read("app/controllers/application_controller.rb").include?("Pagy::Method")
          say "Configured Pagy::Method on ApplicationController for scaffold pagination", :green
        else
          say "", :yellow
          say "Voidable scaffolds use Pagy for pagination. To enable:", :yellow
          say "  bundle add pagy", :yellow
          say "  rails generate voidable:install   # re-run to wire it up", :yellow
          say "", :yellow
        end
      end
    end
  end
end
