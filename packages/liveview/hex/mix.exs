defmodule VoidableUI.MixProject do
  use Mix.Project

  def project do
    [
      app: :voidable_ui,
      version: "0.1.0",
      elixir: "~> 1.17",
      deps: deps()
    ]
  end

  def application do
    [extra_applications: [:logger]]
  end

  defp deps do
    [
      {:phoenix_live_view, "~> 1.1"}
    ]
  end
end
