# frozen_string_literal: true

module Voidable
  module Generators
    class DeviseViewsGenerator < Rails::Generators::Base
      source_root File.expand_path("../../../../app/views/devise", __dir__)

      desc "Copy Voidable-styled Devise views into your application"

      def copy_views
        directory ".", "app/views/devise"
      end
    end
  end
end
