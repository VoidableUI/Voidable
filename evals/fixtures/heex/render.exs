# SPDX-License-Identifier: MIT
# Render <dir>/index.html.heex with Phoenix LiveView's HEEx engine (the same
# compiler a LiveView's render/1 uses) and print the HTML. <dir>/data.json
# holds the assigns; object keys become atoms so @user.name works.
#
# Dependencies come from packages/liveview/hex/mix.lock, so the versions match
# the ones live_voidable is tested with.
lock = Path.expand("../../../packages/liveview/hex/mix.lock", __DIR__)
Mix.install([{:phoenix_live_view, "~> 1.1"}], lockfile: lock)

[dir] = System.argv()

defmodule EvalData do
  def atomize(%{} = m), do: Map.new(m, fn {k, v} -> {String.to_atom(k), atomize(v)} end)
  def atomize(l) when is_list(l), do: Enum.map(l, &atomize/1)
  def atomize(v), do: v
end

assigns = dir |> Path.join("data.json") |> File.read!() |> JSON.decode!() |> EvalData.atomize()

Code.eval_string(
  """
  defmodule EvalPage do
    use Phoenix.Component
    import Phoenix.LiveView.JS, only: [], warn: false
    alias Phoenix.LiveView.JS, warn: false
    embed_templates "*", root: "#{dir}"
  end
  """,
  [],
  file: "eval_page.ex"
)

assigns = Map.put(assigns, :__changed__, nil)
html = apply(EvalPage, :index, [assigns]) |> Phoenix.HTML.Safe.to_iodata() |> IO.iodata_to_binary()
IO.write(html)
