class ApplicationController < ActionController::Base
  include Pagy::Method

  layout :resolve_layout

  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  # Changes to the importmap will invalidate the etag for HTML responses
  stale_when_importmap_changes

  private

  def resolve_layout
    cookies[:layout] || "navbar"
  end
end
