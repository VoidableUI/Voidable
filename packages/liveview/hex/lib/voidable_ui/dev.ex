defmodule VoidableUI.Dev do
  @moduledoc """
  Development warnings for Voidable components.

  `@voidable/ui/dev` logs to the browser console what would otherwise fail
  silently: an attribute a component does not have, a value outside its allowed
  set, `disabled="false"`, a child in the wrong parent, a `<void-*>` tag nothing
  defines. It also catches markup the server renders at runtime.

  Render `warnings/1` once in the root layout, after your app script:

      <script defer phx-track-static type="text/javascript" src={~p"/assets/app.js"}></script>
      <VoidableUI.Dev.warnings />

  It renders nothing unless warnings are on, which by default is the `:dev`
  environment only (decided when the dependency is compiled), so a production
  page never loads the file. Change it in `config/config.exs`:

      config :live_voidable, dev_warnings: false   # off everywhere
      config :live_voidable, dev_warnings: true    # on, even outside :dev
      config :live_voidable, dev_warnings: :throw  # thrown errors, for browser tests

  The script comes from a CDN, pinned to this package's version, never
  `latest`. An unreleased checkout (version 0.0.0) has no published file to
  point at, so the component renders nothing there unless you pass `src`. To
  serve it yourself, pass `src` (a copy of `@voidable/ui/dist/dev.js`), or
  `import "@voidable/ui/dev"` from your JavaScript bundle in development and do
  not render this component.
  """
  use Phoenix.Component

  @version Mix.Project.config()[:version]
  @url if @version == "0.0.0", do: nil, else: "https://cdn.jsdelivr.net/npm/@voidable/ui@#{@version}/dist/dev.js"
  @default_on Mix.env() == :dev

  @doc "The CDN URL of the development warnings script of this release, or nil in an unreleased checkout."
  def url, do: @url

  @doc "The configured setting: `false`, `true` or `:throw`."
  def mode, do: Application.get_env(:live_voidable, :dev_warnings, @default_on)

  attr :nonce, :string, default: nil, doc: "CSP nonce for the config script and the module script"
  attr :mode, :any, default: nil, doc: "Overrides the configured setting: false, true or :throw"
  attr :src, :string, default: nil, doc: "Where the script comes from; defaults to the CDN copy of this release"

  def warnings(assigns) do
    setting = if is_nil(assigns.mode), do: mode(), else: assigns.mode
    src = assigns.src || url()
    assigns = assign(assigns, setting: setting && src && setting, src: src)

    ~H"""
    <script :if={@setting == :throw} nonce={@nonce}>window.VOIDABLE_DEV = { throw: true };</script>
    <script :if={@setting} type="module" src={@src} nonce={@nonce}></script>
    """
  end
end
