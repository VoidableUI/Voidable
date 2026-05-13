module Voidable
  module Hotwire
    class Engine < ::Rails::Engine
      isolate_namespace Voidable::Hotwire

      initializer "voidable-hotwire.importmap", before: "importmap" do |app|
        if app.config.respond_to?(:importmap)
          app.config.importmap.paths << Engine.root.join("config/importmap.rb")
        end
      end

      initializer "voidable-hotwire.helpers" do
        ActiveSupport.on_load(:action_view) do
          include Voidable::Hotwire::Helpers
        end
      end

      initializer "voidable-hotwire.generator_templates" do |app|
        templates_dir = root.join("lib/templates").to_s
        app.config.generators.templates.unshift(templates_dir) if File.directory?(templates_dir)
      end
    end
  end
end
