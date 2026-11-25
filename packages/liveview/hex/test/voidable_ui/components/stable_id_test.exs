defmodule VoidableUI.Components.StableIdTest do
  use ExUnit.Case, async: true

  import Phoenix.LiveViewTest
  import Phoenix.Component, only: [sigil_H: 2]

  defp id_of(html) do
    [_, id] = Regex.run(~r/ id="([^"]+)"/, html)
    id
  end

  test "auto-generated id is identical across renders" do
    assigns = %{}

    render = fn ->
      rendered_to_string(~H"""
      <VoidableUI.Components.button phx-click="save">Save</VoidableUI.Components.button>
      """)
    end

    assert id_of(render.()) == id_of(render.())
  end

  test "auto-generated id differs by name" do
    assigns = %{}

    a = rendered_to_string(~H"<VoidableUI.Components.input name='a' />")
    b = rendered_to_string(~H"<VoidableUI.Components.input name='b' />")

    refute id_of(a) == id_of(b)
  end

  test "auto-generated id ignores changing values and classes" do
    assigns = %{}

    a = rendered_to_string(~H"<VoidableUI.Components.input name='q' value='1' class='x' />")
    b = rendered_to_string(~H"<VoidableUI.Components.input name='q' value='2' class='y' />")

    assert id_of(a) == id_of(b)
  end

  test "an explicit id wins" do
    assigns = %{}

    html = rendered_to_string(~H"<VoidableUI.Components.input id='mine' name='q' />")
    assert id_of(html) == "mine"
  end

  test "dialog and drawer render data-void-closable for both values" do
    assigns = %{}

    open = rendered_to_string(~H"<VoidableUI.Components.dialog>x</VoidableUI.Components.dialog>")
    assert open =~ ~s(data-void-closable="true")

    drawer =
      rendered_to_string(
        ~H"<VoidableUI.Components.drawer closable={false}>x</VoidableUI.Components.drawer>"
      )

    assert drawer =~ ~s(data-void-closable="false")
  end

  test "phx-update passes through to the element when opted in" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.select id="s" phx-update="ignore"><option value="a">A</option></VoidableUI.Components.select>
      """)

    assert html =~ ~s(phx-update="ignore")
  end
end
