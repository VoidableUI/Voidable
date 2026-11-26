defmodule VoidableUI.Components.StaticContainerTest do
  use ExUnit.Case, async: true

  import Phoenix.Component, only: [sigil_H: 2]
  import Phoenix.LiveViewTest

  # ---------------------------------------------------------------------------
  # panel
  # ---------------------------------------------------------------------------

  test "panel renders void-panel with content" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.panel variant="outlined"><void-panel-body>Panel content</void-panel-body></VoidableUI.Components.panel>
      """)

    assert html =~ "<void-panel"
    assert html =~ ~s(variant="outlined")
    assert html =~ "Panel content"
  end

  test "panel omits nil attributes" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.panel>Bare panel</VoidableUI.Components.panel>
      """)

    assert html =~ "<void-panel"
    refute html =~ "variant="
    assert html =~ "Bare panel"
  end

  test "panel passes through global attributes" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.panel id="p1" class="custom">Content</VoidableUI.Components.panel>
      """)

    assert html =~ ~s(id="p1")
    assert html =~ ~s(class="custom")
  end

  # ---------------------------------------------------------------------------
  # accordion
  # ---------------------------------------------------------------------------

  test "accordion renders void-accordion with content" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.accordion>Items here</VoidableUI.Components.accordion>
      """)

    assert html =~ "<void-accordion"
    refute html =~ "multiple"
    assert html =~ "Items here"
  end

  test "accordion renders multiple when true" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.accordion multiple={true}>Items</VoidableUI.Components.accordion>
      """)

    assert html =~ "<void-accordion"
    assert html =~ "multiple"
  end

  test "accordion passes through global attributes" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.accordion id="acc1" class="wide">Items</VoidableUI.Components.accordion>
      """)

    assert html =~ ~s(id="acc1")
    assert html =~ ~s(class="wide")
  end

  # ---------------------------------------------------------------------------
  # breadcrumbs
  # ---------------------------------------------------------------------------

  test "breadcrumbs renders void-breadcrumbs with content" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.breadcrumbs separator="/">Home / About</VoidableUI.Components.breadcrumbs>
      """)

    assert html =~ "<void-breadcrumbs"
    assert html =~ ~s(separator="/")
    assert html =~ "Home / About"
  end

  test "breadcrumbs, menus and carousel are written with their parts as children, and render no attributes of the removed forms" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.breadcrumbs>
        <void-breadcrumbs-list>
          <void-breadcrumbs-item><a href="/">Home</a></void-breadcrumbs-item>
          <void-breadcrumbs-item aria-current="page">Page</void-breadcrumbs-item>
        </void-breadcrumbs-list>
      </VoidableUI.Components.breadcrumbs>
      <VoidableUI.Components.menu open>
        <void-menu-content>
          <VoidableUI.Components.menu_group>
            <void-menu-group-label>File</void-menu-group-label>
            <VoidableUI.Components.menu_item value="new">New<void-menu-item-shortcut>Ctrl+N</void-menu-item-shortcut></VoidableUI.Components.menu_item>
          </VoidableUI.Components.menu_group>
        </void-menu-content>
      </VoidableUI.Components.menu>
      <VoidableUI.Components.carousel id="c">
        <void-carousel-content><void-carousel-item>One</void-carousel-item></void-carousel-content>
        <VoidableUI.Components.carousel_previous aria-label="Previous slide" />
        <VoidableUI.Components.carousel_next aria-label="Next slide" />
        <void-carousel-indicators></void-carousel-indicators>
      </VoidableUI.Components.carousel>
      <VoidableUI.Components.nav_menu_item id="n" current>
        <void-nav-menu-trigger><a href="/docs">Docs</a></void-nav-menu-trigger>
      </VoidableUI.Components.nav_menu_item>
      """)

    assert html =~ "<void-breadcrumbs-item"
    assert html =~ "<void-menu-group-label>File</void-menu-group-label>"
    assert html =~ ~s(value="new")
    refute html =~ "searchable="
    refute html =~ "shortcut="
    refute html =~ "controls="
    refute html =~ "indicators="
    assert html =~ ~s(aria-label="Previous slide")
    assert html =~ ~s(aria-label="Next slide")
    assert html =~ ~s(<a href="/docs">Docs</a>)
  end

  test "breadcrumbs omits nil separator" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.breadcrumbs>Trail</VoidableUI.Components.breadcrumbs>
      """)

    assert html =~ "<void-breadcrumbs"
    refute html =~ "separator="
    assert html =~ "Trail"
  end

  test "breadcrumbs passes through global attributes" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.breadcrumbs id="bc1">Trail</VoidableUI.Components.breadcrumbs>
      """)

    assert html =~ ~s(id="bc1")
  end

  # ---------------------------------------------------------------------------
  # list
  # ---------------------------------------------------------------------------

  test "list renders void-list with content" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.list>List items</VoidableUI.Components.list>
      """)

    assert html =~ "<void-list"
    refute html =~ "dividers"
    assert html =~ "List items"
  end

  test "list renders dividers when true" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.list dividers={true}>Items</VoidableUI.Components.list>
      """)

    assert html =~ "<void-list"
    assert html =~ "dividers"
  end

  test "list passes through global attributes" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.list id="l1" class="nav">Items</VoidableUI.Components.list>
      """)

    assert html =~ ~s(id="l1")
    assert html =~ ~s(class="nav")
  end

  # ---------------------------------------------------------------------------
  # list_item
  # ---------------------------------------------------------------------------

  test "list_item renders void-list-item with content" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.list_item>Item text</VoidableUI.Components.list_item>
      """)

    assert html =~ "<void-list-item"
    refute html =~ "selected"
    refute html =~ "disabled"
    refute html =~ "interactive"
    assert html =~ "Item text"
  end

  test "list_item renders all boolean attributes when true" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.list_item selected={true} disabled={true} interactive={true}>Item</VoidableUI.Components.list_item>
      """)

    assert html =~ "selected"
    assert html =~ "disabled"
    assert html =~ "interactive"
  end

  test "list_item passes through global attributes" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.list_item id="li1">Item</VoidableUI.Components.list_item>
      """)

    assert html =~ ~s(id="li1")
  end

  # ---------------------------------------------------------------------------
  # card
  # ---------------------------------------------------------------------------

  test "card renders void-card with all attributes" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.card variant="elevated" padding="lg">Card body</VoidableUI.Components.card>
      """)

    assert html =~ "<void-card"
    assert html =~ ~s(variant="elevated")
    assert html =~ ~s(padding="lg")
    assert html =~ "Card body"
  end

  test "card omits nil attributes" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.card>Bare card</VoidableUI.Components.card>
      """)

    assert html =~ "<void-card"
    refute html =~ "heading="
    refute html =~ "variant="
    refute html =~ "padding="
    assert html =~ "Bare card"
  end

  test "card passes through global attributes" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.card id="c1" class="shadow">Body</VoidableUI.Components.card>
      """)

    assert html =~ ~s(id="c1")
    assert html =~ ~s(class="shadow")
  end

  # ---------------------------------------------------------------------------
  # table
  # ---------------------------------------------------------------------------

  test "table renders void-table with content" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.table>Table rows</VoidableUI.Components.table>
      """)

    assert html =~ "<void-table"
    refute html =~ "striped"
    refute html =~ "hoverable"
    refute html =~ "compact"
    refute html =~ "bordered"
    assert html =~ "Table rows"
  end

  test "table renders all boolean attributes when true" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.table striped={true} hoverable={true} compact={true} bordered={true}>Rows</VoidableUI.Components.table>
      """)

    assert html =~ "striped"
    assert html =~ "hoverable"
    assert html =~ "compact"
    assert html =~ "bordered"
  end

  test "table renders the responsive and scroll attributes" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.table stack={true} inset={true} scrollable={true} sticky_header={true} sticky_column={true} max_height="20rem" label="Users">Rows</VoidableUI.Components.table>
      """)

    assert html =~ ~r/stack[ >=]/
    refute html =~ ~s(stack="true")
    assert html =~ "inset"
    assert html =~ "scrollable"
    assert html =~ "sticky-header"
    assert html =~ "sticky-column"
    assert html =~ ~s(max-height="20rem")
    assert html =~ ~s(label="Users")
  end

  test "table stack takes a breakpoint or always" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.table stack="48rem">Rows</VoidableUI.Components.table>
      """)

    assert html =~ ~s(stack="48rem")
  end

  test "table omits stack and the scroll attributes by default" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.table>Rows</VoidableUI.Components.table>
      """)

    refute html =~ "stack"
    refute html =~ "scrollable"
    refute html =~ "inset"
    refute html =~ "label"
  end

  test "table passes through global attributes" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.table id="t1">Rows</VoidableUI.Components.table>
      """)

    assert html =~ ~s(id="t1")
  end

  # ---------------------------------------------------------------------------
  # scroll_area
  # ---------------------------------------------------------------------------

  test "scroll_area renders void-scroll-area with attributes" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.scroll_area max_height="300px" orientation="vertical">Scrollable</VoidableUI.Components.scroll_area>
      """)

    assert html =~ "<void-scroll-area"
    assert html =~ ~s(max-height="300px")
    assert html =~ ~s(orientation="vertical")
    assert html =~ "Scrollable"
  end

  test "scroll_area omits nil attributes" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.scroll_area>Content</VoidableUI.Components.scroll_area>
      """)

    assert html =~ "<void-scroll-area"
    refute html =~ "max-height="
    refute html =~ "orientation="
    assert html =~ "Content"
  end

  test "scroll_area passes through global attributes" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.scroll_area id="sa1" class="tall">Content</VoidableUI.Components.scroll_area>
      """)

    assert html =~ ~s(id="sa1")
    assert html =~ ~s(class="tall")
  end

  # ---------------------------------------------------------------------------
  # banner
  # ---------------------------------------------------------------------------

  test "banner renders void-banner with content and attributes" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.banner color="info" variant="filled">Important message</VoidableUI.Components.banner>
      """)

    assert html =~ "<void-banner"
    assert html =~ ~s(color="info")
    assert html =~ ~s(variant="filled")
    refute html =~ "dismissable"
    assert html =~ "Important message"
  end

  test "banner renders the close part the author writes" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.banner>
        <void-banner-description>Notice</void-banner-description>
        <void-banner-close><button type="button" aria-label="Dismiss">x</button></void-banner-close>
      </VoidableUI.Components.banner>
      """)

    assert html =~ "void-banner-close"
    refute html =~ "dismissable"
  end

  test "banner omits nil attributes and false booleans" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.banner>Plain banner</VoidableUI.Components.banner>
      """)

    assert html =~ "<void-banner"
    refute html =~ "color="
    refute html =~ "variant="
    refute html =~ "dismissable"
    assert html =~ "Plain banner"
  end

  # ---------------------------------------------------------------------------
  # nav_bar
  # ---------------------------------------------------------------------------

  test "nav_bar renders void-nav-bar with defaults (no hide-border)" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.nav_bar>Nav content</VoidableUI.Components.nav_bar>
      """)

    assert html =~ "<void-nav-bar"
    refute html =~ "hide-border"
    refute html =~ "sticky"
    refute html =~ "variant="
    assert html =~ "Nav content"
  end

  test "nav_bar renders sticky and hide-border when set" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.nav_bar sticky={true} hide_border variant="transparent">Nav</VoidableUI.Components.nav_bar>
      """)

    assert html =~ "sticky"
    assert html =~ "hide-border"
    assert html =~ ~s(variant="transparent")
  end

  test "nav_bar passes through global attributes" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.nav_bar id="navbar1" class="main-nav">Nav</VoidableUI.Components.nav_bar>
      """)

    assert html =~ ~s(id="navbar1")
    assert html =~ ~s(class="main-nav")
  end

  # ---------------------------------------------------------------------------
  # toast_container
  # ---------------------------------------------------------------------------

  test "toast_container renders void-toast-container with position" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.toast_container placement="top-right" />
      """)

    assert html =~ "<void-toast-container"
    assert html =~ ~s(placement="top-right")
  end

  test "toast_container omits nil position" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.toast_container />
      """)

    assert html =~ "<void-toast-container"
    refute html =~ "placement="
  end

  test "toast_container renders optional slot content" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.toast_container placement="bottom-left">Toast children</VoidableUI.Components.toast_container>
      """)

    assert html =~ "Toast children"
  end

  # ---------------------------------------------------------------------------
  # field
  # ---------------------------------------------------------------------------

  test "field renders void-field with all attributes" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.field label="Name" error="Required" helper="Enter your name" required={true}>
        <input />
      </VoidableUI.Components.field>
      """)

    assert html =~ "<void-field"
    assert html =~ ~s(label="Name")
    assert html =~ ~s(error="Required")
    assert html =~ ~s(helper="Enter your name")
    assert html =~ "required"
  end

  test "field omits nil attributes and false required" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.field>
        <input />
      </VoidableUI.Components.field>
      """)

    assert html =~ "<void-field"
    refute html =~ "label="
    refute html =~ "error="
    refute html =~ "helper="
    refute html =~ "required"
  end

  test "field passes through global attributes" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.field id="f1" class="form-field">
        <input />
      </VoidableUI.Components.field>
      """)

    assert html =~ ~s(id="f1")
    assert html =~ ~s(class="form-field")
  end

  # ---------------------------------------------------------------------------
  # option
  # ---------------------------------------------------------------------------

  test "option renders void-option with required value" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.option value="opt1">Option One</VoidableUI.Components.option>
      """)

    assert html =~ "<void-option"
    assert html =~ ~s(value="opt1")
    refute html =~ "selected"
    assert html =~ "Option One"
  end

  test "option renders selected when true" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.option value="opt2" selected={true}>Option Two</VoidableUI.Components.option>
      """)

    assert html =~ "selected"
    assert html =~ ~s(value="opt2")
  end

  test "option passes through global attributes" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.option value="opt3" id="o3" class="highlighted">Option Three</VoidableUI.Components.option>
      """)

    assert html =~ ~s(id="o3")
    assert html =~ ~s(class="highlighted")
  end

  # ---------------------------------------------------------------------------
  # tabs with explicit parts
  # ---------------------------------------------------------------------------

  test "tabs renders its parts as written" do
    assigns = %{}

    html =
      rendered_to_string(~H"""
      <VoidableUI.Components.tabs value="general">
        <void-tabs-list><void-tabs-trigger value="general">General</void-tabs-trigger></void-tabs-list>
        <void-tabs-content value="general">General settings</void-tabs-content>
      </VoidableUI.Components.tabs>
      """)

    assert html =~ ~s(<void-tabs-trigger value="general">General</void-tabs-trigger>)
    assert html =~ ~s(<void-tabs-content value="general">General settings</void-tabs-content>)
    refute function_exported?(VoidableUI.Components, :tab_panel, 1)
  end
end
