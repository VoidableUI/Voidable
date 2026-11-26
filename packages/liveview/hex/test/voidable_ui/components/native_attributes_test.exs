defmodule VoidableUI.Components.NativeAttributesTest do
  use ExUnit.Case, async: true

  import Phoenix.Component
  import Phoenix.LiveViewTest

  alias VoidableUI.Components, as: C

  describe "native text attributes" do
    test "input renders autocomplete, minlength, maxlength, pattern and the global hints" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <C.input
          name="pw"
          type="password"
          autocomplete="current-password"
          minlength={8}
          maxlength={64}
          pattern="[A-Za-z0-9]+"
          inputmode="text"
          enterkeyhint="go"
          autocapitalize="off"
          spellcheck="false"
        />
        """)

      assert html =~ ~s(type="password")
      assert html =~ ~s(autocomplete="current-password")
      assert html =~ ~s(minlength="8")
      assert html =~ ~s(maxlength="64")
      assert html =~ ~s(pattern="[A-Za-z0-9]+")
      assert html =~ ~s(inputmode="text")
      assert html =~ ~s(enterkeyhint="go")
      assert html =~ ~s(autocapitalize="off")
      assert html =~ ~s(spellcheck="false")
    end

    test "input renders none of them when unset" do
      assigns = %{}
      html = rendered_to_string(~H"<C.input name='q' />")

      for attr <- ~w(autocomplete minlength maxlength pattern inputmode enterkeyhint) do
        refute html =~ attr
      end
    end

    test "textarea and action_input forward them too" do
      assigns = %{}

      textarea =
        rendered_to_string(
          ~H"<C.textarea name='bio' autocomplete='off' minlength={3} maxlength={200} />"
        )

      assert textarea =~ ~s(autocomplete="off")
      assert textarea =~ ~s(minlength="3")
      assert textarea =~ ~s(maxlength="200")

      action =
        rendered_to_string(
          ~H"<C.action_input type='email' autocomplete='email' pattern='.+@.+' maxlength={80} />"
        )

      assert action =~ ~s(type="email")
      assert action =~ ~s(autocomplete="email")
      assert action =~ ~s(pattern=".+@.+")
      assert action =~ ~s(maxlength="80")
    end
  end

  describe "number_input" do
    test "renders step=\"any\" and decimal values" do
      assigns = %{}
      html = rendered_to_string(~H"<C.number_input step='any' value={2.5} min={0.5} />")

      assert html =~ ~s(step="any")
      assert html =~ ~s(value="2.5")
      assert html =~ ~s(min="0.5")
    end
  end

  describe "stat" do
    test "renders description" do
      assigns = %{}
      html = rendered_to_string(~H"<C.stat label='Users' value='12' description='vs. last month' />")
      assert html =~ ~s(description="vs. last month")
    end
  end

  describe "hide-* booleans (no attribute defaults to true, #23)" do
    test "render nothing by default and the bare attribute when set" do
      assigns = %{}

      refute rendered_to_string(~H"<C.nav_bar>x</C.nav_bar>") =~ "hide-border"
      assert rendered_to_string(~H"<C.nav_bar hide_border>x</C.nav_bar>") =~ "hide-border"

      refute rendered_to_string(~H"<C.color_picker id='p' />") =~ "hide-input"
      assert rendered_to_string(~H"<C.color_picker id='p' hide_input />") =~ "hide-input"

      refute rendered_to_string(~H"<C.error_fallback />") =~ "hide-icon"
      assert rendered_to_string(~H"<C.error_fallback hide_icon />") =~ "hide-icon"
    end
  end
end
