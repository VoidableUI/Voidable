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
    end
  end
end
