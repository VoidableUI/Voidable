defmodule VoidableUI.Components.KebabAttributesTest do
  # Issue #40: multi-word properties are set through their kebab-case
  # attributes (Lit ignores camelCase or lowercased forms).
  use ExUnit.Case, async: true

  import Phoenix.LiveViewTest
  import Phoenix.Component, only: [sigil_H: 2]

  test "editable renders submit-mode" do
    assigns = %{}
    html = rendered_to_string(~H"<VoidableUI.Components.editable submit_mode='enter' />")
    assert html =~ ~s(submit-mode="enter")
    refute html =~ ~r/submitmode=/i
  end

  test "hover_card renders open-delay and close-delay" do
    assigns = %{}

    html =
      rendered_to_string(
        ~H"<VoidableUI.Components.hover_card open_delay={100} close_delay={200}>x</VoidableUI.Components.hover_card>"
      )

    assert html =~ ~s(open-delay="100")
    assert html =~ ~s(close-delay="200")
    refute html =~ ~r/(open|close)delay=/i
  end

  test "tags_input renders allow-duplicates and color_picker renders show-input" do
    assigns = %{}
    tags = rendered_to_string(~H"<VoidableUI.Components.tags_input name='t' allow_duplicates />")
    assert tags =~ "allow-duplicates"
    picker = rendered_to_string(~H"<VoidableUI.Components.color_picker name='c' show_input />")
    assert picker =~ "show-input"
  end

  test "sidebar renders collapsed-width" do
    assigns = %{}

    html =
      rendered_to_string(
        ~H"<VoidableUI.Components.sidebar collapsed_width='52px'>x</VoidableUI.Components.sidebar>"
      )

    assert html =~ ~s(collapsed-width="52px")
  end

  test "no component source renders a camelCase attribute" do
    source = File.read!(Path.expand("../../../lib/voidable_ui/components.ex", __DIR__))
    offenders = Regex.scan(~r/^\s+([a-z]+[A-Z][A-Za-z]*)=\{/m, source) |> Enum.map(&Enum.at(&1, 1))
    assert offenders == []
  end
end
