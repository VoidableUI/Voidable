class SettingsController < ApplicationController
  def toggle_layout
    current = cookies[:layout] || "navbar"
    cookies[:layout] = current == "sidebar" ? "navbar" : "sidebar"
    redirect_back(fallback_location: root_path)
  end
end
