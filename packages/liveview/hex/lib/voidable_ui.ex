defmodule VoidableUI do
  @moduledoc """
  Voidable UI component library for Phoenix LiveView.

  Provides HEEx function components that render `<void-*>` custom element tags,
  bridging Voidable web components with Phoenix LiveView's server-driven model.

  ## Usage

      use VoidableUI

  This imports all `VoidableUI.Components` function components into your module.
  """

  defmacro __using__(_opts) do
    quote do
      import VoidableUI.Components
    end
  end
end
