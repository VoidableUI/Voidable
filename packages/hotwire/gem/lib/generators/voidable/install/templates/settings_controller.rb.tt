class SettingsController < ApplicationController
  def toggle_layout
    current = cookies[:layout] || "topbar"
    cookies[:layout] = current == "sidebar" ? "topbar" : "sidebar"
    redirect_back(fallback_location: respond_to?(:root_path) ? root_path : "/")
  end
end
