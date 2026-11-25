module Voidable
  module Hotwire
    # Development warnings: @voidable/ui/dev logs misused attributes, values and
    # children to the browser console (see https://voidable.dev/getting-started/development-warnings/).
    #
    # On in the development environment only; the production page never loads
    # the file. Set it in config/initializers/voidable.rb:
    #
    #   Voidable::Hotwire.dev_warnings = false   # off everywhere
    #   Voidable::Hotwire.dev_warnings = true    # on, even outside development
    #   Voidable::Hotwire.dev_warnings = :throw  # thrown errors, for system tests
    class << self
      attr_writer :dev_warnings

      # false, true or :throw.
      def dev_warnings
        return @dev_warnings unless @dev_warnings.nil?

        defined?(::Rails) && ::Rails.respond_to?(:env) && ::Rails.env.development? ? true : false
      end

      def dev_warnings?
        !!dev_warnings
      end
    end
  end
end
