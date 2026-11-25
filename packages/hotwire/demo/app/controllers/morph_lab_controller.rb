# Turbo 8 morphs on Voidable components: a page refresh after a form
# submission (same URL, so Turbo morphs the page) and a Turbo Stream that
# replaces a panel with method: :morph. The browser tests in tests/browser
# drive this page; it also shows the behaviour by hand.
class MorphLabController < ApplicationController
  DEFAULTS = { "version" => 1, "select" => "b", "options" => %w[a b c], "dialog" => false, "notes" => "" }.freeze

  # ?search=1 keeps the layout's header search on the page for this session
  # (the browser tests leave it out except where they test it).
  def show
    session[:morph_lab_search] = params[:search] == "1" if params.key?(:search)
    @search = session.fetch(:morph_lab_search, true)
    @lab = lab
  end

  # Every change goes through here and redirects back, so Turbo refreshes the
  # page with a morph.
  def update
    state = lab
    state["version"] += 1 if params[:bump]
    state["select"] = params[:select] if params[:select].present?
    state["options"] = params[:options].split(",") if params[:options].present?
    state["dialog"] = params[:dialog] == "open" if params[:dialog].present?
    state["notes"] = params[:notes] if params.key?(:notes)
    session[:morph_lab] = state
    redirect_to morph_lab_path
  end

  # Replaces the panel with a stream that morphs instead of swapping.
  def stream
    state = lab
    state["version"] += 1
    session[:morph_lab] = state
    @lab = state
    render turbo_stream: turbo_stream.replace("lab-panel", partial: "morph_lab/panel", locals: { lab: state }, method: :morph)
  end

  private

  def lab
    DEFAULTS.merge(session[:morph_lab] || {}).deep_dup
  end
end
