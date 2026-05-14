class ApplicationController < ActionController::Base

  layout :resolve_layout

  private

  def resolve_layout
    cookies[:layout] || "topbar"
  end
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern
end
