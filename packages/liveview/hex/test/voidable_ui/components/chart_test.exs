defmodule VoidableUI.Components.ChartTest do
  use ExUnit.Case, async: true

  import Phoenix.Component
  import Phoenix.LiveViewTest

  alias VoidableUI.Components, as: V

  # The data-void-props attribute, decoded.
  defp props(html) do
    [_, raw] = Regex.run(~r/data-void-props="([^"]*)"/, html)

    raw
    |> String.replace("&quot;", "\"")
    |> String.replace("&amp;", "&")
    |> Phoenix.json_library().decode!()
  end

  describe "bar_chart" do
    test "renders the tag, its attributes and the data as JSON for the hook" do
      assigns = %{data: %{series: [%{name: "2025", values: [4, 8]}], labels: ["Q1", "Q2"]}}

      html =
        rendered_to_string(~H"""
        <V.bar_chart id="rev" data={@data} height={300} show_value variant="outline" stagger={0} aria_label="Revenue" />
        """)

      assert html =~ "<void-bar-chart"
      assert html =~ ~s(id="rev")
      assert html =~ ~s(height="300")
      assert html =~ "show-value"
      assert html =~ ~s(variant="outline")
      assert html =~ ~s(stagger="0")
      assert html =~ ~s(aria-label="Revenue")
      assert html =~ ~s(phx-hook="VoidProps")
      assert props(html) == %{"data" => %{"series" => [%{"name" => "2025", "values" => [4, 8]}], "labels" => ["Q1", "Q2"]}}
    end

    test "without data there is no hook and no nil attributes" do
      assigns = %{}
      html = rendered_to_string(~H|<V.bar_chart id="b" />|)
      refute html =~ "phx-hook"
      refute html =~ "data-void-props"
      refute html =~ "height="
      refute html =~ "show-value"
    end
  end

  describe "line_chart" do
    test "renders the tag, interpolation and data" do
      assigns = %{data: %{series: [%{name: "Visitors", values: [3, 5, 4]}], labels: ["Mon", "Tue", "Wed"]}}

      html =
        rendered_to_string(~H"""
        <V.line_chart id="visits" data={@data} interpolation="step" aria_label="Visitors" />
        """)

      assert html =~ "<void-line-chart"
      assert html =~ ~s(interpolation="step")
      assert html =~ ~s(phx-hook="VoidProps")
      assert props(html)["data"]["series"] == [%{"name" => "Visitors", "values" => [3, 5, 4]}]
    end
  end

  describe "donut_chart" do
    test "renders the tag, booleans, gaps and data" do
      assigns = %{data: %{segments: [%{name: "Search", value: 40}, %{name: "Direct", value: 25}]}}

      html =
        rendered_to_string(~H"""
        <V.donut_chart id="src" data={@data} size={180} inner={0.5} gaps={3} show_total show_value />
        """)

      assert html =~ "<void-donut-chart"
      assert html =~ ~s(size="180")
      assert html =~ ~s(inner="0.5")
      assert html =~ ~s(gaps="3")
      assert html =~ "show-total"
      assert html =~ "show-value"
      assert length(props(html)["data"]["segments"]) == 2
    end

    test "gaps={true} is a boolean attribute" do
      assigns = %{}
      html = rendered_to_string(~H|<V.donut_chart id="d" gaps />|)
      assert html =~ ~r/ gaps[ \/>]/
    end
  end

  describe "gauge" do
    test "a single reading is plain attributes and needs no hook" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <V.gauge id="disk" value={42} min={0} max={100} unit="%" circular="semi" hide_tick_min unit_inline aria_label="Disk usage" />
        """)

      assert html =~ "<void-gauge"
      assert html =~ ~s(value="42")
      assert html =~ ~s(unit="%")
      assert html =~ ~s(circular="semi")
      assert html =~ "hide-tick-min"
      assert html =~ "unit-inline"
      assert html =~ ~s(aria-label="Disk usage")
      refute html =~ "phx-hook"
    end

    test "segments and zones go through the hook" do
      assigns = %{
        data: %{segments: [%{name: "Used", value: 40}]},
        zones: [%{from: 0, to: 60, color: "success"}]
      }

      html =
        rendered_to_string(~H"""
        <V.gauge id="g" data={@data} zones={@zones} segments_sort="manual" tick_major={25} />
        """)

      assert html =~ ~s(phx-hook="VoidProps")
      assert html =~ ~s(segments-sort="manual")
      assert html =~ ~s(tick-major="25")

      assert props(html) == %{
               "data" => %{"segments" => [%{"name" => "Used", "value" => 40}]},
               "zones" => [%{"from" => 0, "to" => 60, "color" => "success"}]
             }
    end
  end

  test "an id is derived when none is given" do
    assigns = %{}
    html = rendered_to_string(~H"<V.bar_chart data={%{series: []}} />")
    assert html =~ ~r/id="void-bar-chart-\d+"/
  end
end
