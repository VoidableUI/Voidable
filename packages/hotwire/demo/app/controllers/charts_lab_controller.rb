# The four charts drawn from server data with the gem's chart helpers: the data is the JSON `data`
# attribute of each element, so the first response already draws them. A page refresh after a form
# submission morphs the page: unchanged data leaves the charts alone, a change redraws them. The browser
# tests in tests/browser/server/rails drive this page.
class ChartsLabController < ApplicationController
  DEFAULTS = { "version" => 1, "scale" => 1 }.freeze

  def show
    @lab = lab
  end

  def update
    state = lab
    state["version"] += 1 if params[:bump]
    state["scale"] = params[:scale].to_i if params[:scale].present?
    session[:charts_lab] = state
    redirect_to charts_lab_path
  end

  private

  def lab
    DEFAULTS.merge(session[:charts_lab] || {}).deep_dup
  end
end
