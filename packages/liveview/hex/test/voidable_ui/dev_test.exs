defmodule VoidableUI.DevTest do
  use ExUnit.Case, async: false

  import Phoenix.Component
  import Phoenix.LiveViewTest

  setup do
    on_exit(fn -> Application.delete_env(:live_voidable, :dev_warnings) end)
  end

  test "renders nothing when off" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Dev.warnings mode={false} />
      """)

    assert String.trim(html) == ""
  end

  test "follows the configuration when no mode is given" do
    assigns = %{}
    Application.put_env(:live_voidable, :dev_warnings, false)

    assert String.trim(
             rendered_to_string(~H"""
             <VoidableUI.Dev.warnings />
             """)
           ) == ""

    Application.put_env(:live_voidable, :dev_warnings, true)

    assert rendered_to_string(~H"""
           <VoidableUI.Dev.warnings />
           """) =~ "/dist/dev.js"
  end

  test "renders the module script when on" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Dev.warnings mode={true} />
      """)

    assert html =~ ~s(<script type="module" src="https://cdn.jsdelivr.net/npm/@voidable/ui@)
    assert html =~ "/dist/dev.js"
    refute html =~ "VOIDABLE_DEV"
  end

  test "throw mode sets the config before the module script" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Dev.warnings mode={:throw} />
      """)

    assert html =~ "window.VOIDABLE_DEV = { throw: true };"
    {config_at, _} = :binary.match(html, "VOIDABLE_DEV")
    {module_at, _} = :binary.match(html, "type=\"module\"")
    assert config_at < module_at
  end

  test "passes a CSP nonce to both scripts" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Dev.warnings mode={:throw} nonce="abc" />
      """)

    assert length(String.split(html, ~s(nonce="abc"))) == 3
  end

  test "the url follows the package version, or latest in an unreleased checkout" do
    assert VoidableUI.Dev.url() =~ ~r{@voidable/ui@(latest|\d+\.\d+\.\d+)/dist/dev\.js\z}
  end
end
