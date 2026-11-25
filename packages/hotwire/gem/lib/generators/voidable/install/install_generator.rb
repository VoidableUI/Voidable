require "voidable/hotwire/cdn"

module Voidable
  module Generators
    class InstallGenerator < Rails::Generators::Base
      source_root File.expand_path("templates", __dir__)
      desc "Install Voidable UI into your Rails application"

      class_option :layout, type: :string, default: "topbar", enum: ["topbar", "sidebar", "switching"],
        desc: "Application layout style (topbar, sidebar, or switching)"
      class_option :components, type: :string, default: "all", enum: ["all", "autoloader"],
        desc: "How components load: all (one bundle, every component registered up front) or autoloader (each component loads when its tag first appears)"
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
        if autoloader?
          pins = Voidable::Hotwire::CDN::AUTOLOADER_PINS.map { |name, url| %(pin "#{name}", to: "#{url}") }
          pins << %(pin "@voidable/ui-hotwire", to: "#{Voidable::Hotwire::CDN::UI_HOTWIRE_URL}")
          pins << dev_pin
          append_to_file importmap, "\n# Voidable UI (autoloader: components load when their tag first appears)\n#{pins.join("\n")}\n"
          say "Pinned @voidable/ui/autoloader, lit and @voidable/ui-hotwire in importmap", :green
        else
          append_to_file importmap, <<~RUBY

            # Voidable UI
            pin "@voidable/ui", to: "#{Voidable::Hotwire::CDN::UI_URL}"
            pin "@voidable/ui-hotwire", to: "#{Voidable::Hotwire::CDN::UI_HOTWIRE_URL}"
            #{dev_pin}
          RUBY
          say "Pinned @voidable/ui and @voidable/ui-hotwire in importmap (and @voidable/ui/dev in development)", :green
        end
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
          header = if autoloader?
            <<~JS
              // Components load when their tag first appears on the page.
              // Switch to `import "@voidable/ui";` to register every component
              // up front (see https://voidable.dev/getting-started/installation/).
              import "@voidable/ui/autoloader";
              import "@voidable/ui-hotwire";

            JS
          elsif vite?
            <<~JS
              // For smaller bundles, replace the bulk import below with
              // per-component imports for only the elements you use, e.g.:
              //   import "@voidable/ui/components/button";
              //   import "@voidable/ui/components/input";
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
          if vite?
            header += <<~JS
              // Console warnings for misused <void-*> markup (a wrong attribute, a value
              // outside the allowed set, a child in the wrong parent). Development only:
              // the production build drops this import.
              if (import.meta.env.DEV) import("@voidable/ui/dev");

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
        if vite? && !contents.include?("VoidTurbo")
          # Voidable events need no Stimulus controller: use
          # data-action="void-click->controller#method" directly.
          append_to_file js_entrypoint, <<~JS

            import { VoidTurbo } from "@voidable/ui-hotwire";
            VoidTurbo.start();
          JS
        end
        say "Added Voidable imports to application.js", :green
      end

      def wire_stimulus_controllers
        return if vite?
        controllers_js = "app/javascript/controllers/application.js"
        return unless File.exist?(controllers_js)
        return if File.read(controllers_js).include?("VoidTurbo")
        inject_into_file controllers_js, after: /window\.Stimulus\s*=\s*application\n/ do
          <<~JS

            import { VoidTurbo } from "@voidable/ui-hotwire"
            VoidTurbo.start()
          JS
        end
        say "Started VoidTurbo in controllers/application.js", :green
      end

      def create_vite_helper
        return unless vite?
        template "vite_helper.rb.tt", "app/helpers/vite_helper.rb"
        say "Created ViteHelper for asset path resolution", :green
      end

      private

      # The development warnings: pinned in development only; the layout's
      # `voidable_dev_tags` imports it (Vite apps import it from application.js).
      def dev_pin
        %(pin "@voidable/ui/dev", to: "#{Voidable::Hotwire::CDN::UI_DEV_URL}" if Rails.env.development?  # console warnings for misused <void-*> markup)
      end

      def app_name
        Rails.application.class.module_parent_name.underscore
      end

      def vite?
        options[:asset_pipeline] == "vite"
      end

      def autoloader?
        options[:components] == "autoloader"
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

      def install_active_storage
        return if File.exist?("db/migrate") && Dir.glob("db/migrate/*active_storage*").any?
        rails_command "active_storage:install"
        say "Installed Active Storage migrations (run `bin/rails db:migrate` to apply)", :green
      end
    end
  end
end
