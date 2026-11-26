defmodule DemoWeb.ChartsLive do
  @moduledoc """
  The four charts rendered from the server: the page behind the chart tests in
  `tests/browser/server/phoenix/charts.spec.ts`. The `Grow` button changes every
  chart's data, which reaches the elements through the `VoidProps` hook.
  """
  use DemoWeb, :live_view

  alias VoidableUI.Components, as: V

  @impl true
  def mount(_params, _session, socket) do
    {:ok, assign(socket, page_title: "Charts", step: 1)}
  end

  @impl true
  def handle_event("grow", _params, socket), do: {:noreply, assign(socket, :step, socket.assigns.step + 1)}

  @impl true
  def render(assigns) do
    assigns =
      assign(assigns,
        bars: %{
          labels: ["Q1", "Q2", "Q3"],
          series: [%{name: "Revenue", values: Enum.map([4, 8, 6], &(&1 * assigns.step))}]
        },
        line: %{
          labels: ["Mon", "Tue", "Wed", "Thu"],
          series: [%{name: "Visitors", values: Enum.map([3, 5, 4, 7], &(&1 * assigns.step))}]
        },
        donut: %{
          segments:
            [{"Search", 40}, {"Direct", 25}, {"Social", 15}] |> Enum.map(fn {name, v} -> %{name: name, value: v * assigns.step} end)
        },
        segments: %{segments: [%{name: "Used", value: 30 * assigns.step}, %{name: "Cached", value: 20}]}
      )

    ~H"""
    <main style="padding: 1.5rem; max-width: 900px; display: grid; gap: 1.5rem">
      <h1>LiveView charts</h1>
      <V.button id="grow" phx-click="grow">Grow {@step}</V.button>
      <V.bar_chart id="bars" data={@bars} aria_label="Revenue by quarter" />
      <V.line_chart id="line" data={@line} aria_label="Visitors per day" />
      <V.donut_chart id="donut" data={@donut} aria_label="Traffic by source" show_total />
      <V.gauge id="gauge" value={20 * @step} unit="%" aria_label="Disk usage" />
      <V.gauge id="gauge-segments" data={@segments} zones={[%{from: 0, to: 100, color: "success"}]} aria_label="Storage" />
    </main>
    """
  end
end
