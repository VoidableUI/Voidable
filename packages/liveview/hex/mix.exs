defmodule VoidableUI.MixProject do
  use Mix.Project

  def project do
    [
      app: :live_voidable,
      version: "0.0.0",
      elixir: "~> 1.17",
      description: "Phoenix LiveView hooks and helpers for Voidable UI web components",
      package: package(),
      source_url: "https://github.com/VoidableUI/Voidable",
      deps: deps()
    ]
  end

  def application do
    [extra_applications: [:logger]]
  end

  defp deps do
    [
      {:phoenix_live_view, "~> 1.1"},
      {:ex_doc, "~> 0.35", only: :dev, runtime: false}
    ]
  end

  defp package do
    [
      name: "live_voidable",
      licenses: ["MIT"],
      links: %{"GitHub" => "https://github.com/VoidableUI/Voidable"},
      files: ~w(lib mix.exs)
    ]
  end
end
