class SettingsController < ApplicationController
  def toggle_layout
    current = cookies[:layout] || "topbar"
    cookies[:layout] = current == "sidebar" ? "topbar" : "sidebar"
    redirect_back(fallback_location: root_path)
  end
end
