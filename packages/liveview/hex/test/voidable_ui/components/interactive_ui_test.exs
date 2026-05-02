defmodule VoidableUI.Components.InteractiveUITest do
  use ExUnit.Case, async: true

  import Phoenix.LiveViewTest
  import Phoenix.Component, only: [sigil_H: 2]

  # ===========================================================================
  # 1. Button (interactive -- void-click, has slot)
  # ===========================================================================

  describe "button" do
    test "renders <void-button> with slot content" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.button>Click me</VoidableUI.Components.button>
        """)

      assert html =~ "<void-button"
      assert html =~ "</void-button>"
      assert html =~ "Click me"
    end

    test "includes VoidEvent hook and data-void-events" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.button>OK</VoidableUI.Components.button>
        """)

      assert html =~ ~s(phx-hook="VoidEvent")
      assert html =~ ~s(data-void-events="void-click")
    end

    test "renders named attributes when provided" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.button variant="primary" color="blue" type="submit" size="lg">Go</VoidableUI.Components.button>
        """)

      assert html =~ ~s(variant="primary")
      assert html =~ ~s(color="blue")
      assert html =~ ~s(type="submit")
      assert html =~ ~s(size="lg")
    end

    test "omits nil-default attributes when not set" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.button>Go</VoidableUI.Components.button>
        """)

      refute html =~ "variant="
      refute html =~ "color="
      refute html =~ "type="
      refute html =~ "size="
    end

    test "renders disabled boolean when true" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.button disabled={true}>No</VoidableUI.Components.button>
        """)

      assert html =~ "disabled"
    end

    test "omits disabled when false (default)" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.button>Go</VoidableUI.Components.button>
        """)

      refute html =~ "disabled"
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.button id="my-btn" class="extra">Go</VoidableUI.Components.button>
        """)

      assert html =~ ~s(id="my-btn")
      assert html =~ ~s(class="extra")
    end
  end

  # ===========================================================================
  # 2. Alert (interactive -- void-dismiss, has slot)
  # ===========================================================================

  describe "alert" do
    test "renders <void-alert> with slot content" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.alert>Warning!</VoidableUI.Components.alert>
        """)

      assert html =~ "<void-alert"
      assert html =~ "</void-alert>"
      assert html =~ "Warning!"
    end

    test "includes VoidEvent hook and data-void-events" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.alert>Msg</VoidableUI.Components.alert>
        """)

      assert html =~ ~s(phx-hook="VoidEvent")
      assert html =~ ~s(data-void-events="void-dismiss")
    end

    test "renders named attributes when provided" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.alert color="red" variant="outlined">Err</VoidableUI.Components.alert>
        """)

      assert html =~ ~s(color="red")
      assert html =~ ~s(variant="outlined")
    end

    test "omits nil-default attributes when not set" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.alert>Msg</VoidableUI.Components.alert>
        """)

      refute html =~ "color="
      refute html =~ "variant="
    end

    test "renders dismissible boolean when true" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.alert dismissible={true}>Msg</VoidableUI.Components.alert>
        """)

      assert html =~ "dismissible"
    end

    test "omits dismissible when false (default)" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.alert>Msg</VoidableUI.Components.alert>
        """)

      refute html =~ "dismissible"
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.alert id="alert-1">Msg</VoidableUI.Components.alert>
        """)

      assert html =~ ~s(id="alert-1")
    end
  end

  # ===========================================================================
  # 3. Tag (interactive -- void-remove, has slot)
  # ===========================================================================

  describe "tag" do
    test "renders <void-tag> with slot content" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.tag>Elixir</VoidableUI.Components.tag>
        """)

      assert html =~ "<void-tag"
      assert html =~ "</void-tag>"
      assert html =~ "Elixir"
    end

    test "includes VoidEvent hook and data-void-events" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.tag>Tag</VoidableUI.Components.tag>
        """)

      assert html =~ ~s(phx-hook="VoidEvent")
      assert html =~ ~s(data-void-events="void-remove")
    end

    test "renders named attributes when provided" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.tag color="green" size="sm">Tag</VoidableUI.Components.tag>
        """)

      assert html =~ ~s(color="green")
      assert html =~ ~s(size="sm")
    end

    test "omits nil-default attributes when not set" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.tag>Tag</VoidableUI.Components.tag>
        """)

      refute html =~ "color="
      refute html =~ "size="
    end

    test "renders removable boolean when true" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.tag removable={true}>Tag</VoidableUI.Components.tag>
        """)

      assert html =~ "removable"
    end

    test "omits removable when false (default)" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.tag>Tag</VoidableUI.Components.tag>
        """)

      refute html =~ "removable"
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.tag id="tag-1" class="highlight">Tag</VoidableUI.Components.tag>
        """)

      assert html =~ ~s(id="tag-1")
      assert html =~ ~s(class="highlight")
    end
  end

  # ===========================================================================
  # 4. Dialog (interactive -- void-close, has slot)
  # ===========================================================================

  describe "dialog" do
    test "renders <void-dialog> with slot content" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.dialog>Dialog body</VoidableUI.Components.dialog>
        """)

      assert html =~ "<void-dialog"
      assert html =~ "</void-dialog>"
      assert html =~ "Dialog body"
    end

    test "includes VoidEvent hook and data-void-events" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.dialog>Body</VoidableUI.Components.dialog>
        """)

      assert html =~ ~s(phx-hook="VoidEvent")
      assert html =~ ~s(data-void-events="void-close")
    end

    test "renders named attributes when provided" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.dialog heading="Title" size="lg">Body</VoidableUI.Components.dialog>
        """)

      assert html =~ ~s(heading="Title")
      assert html =~ ~s(size="lg")
    end

    test "omits nil-default attributes when not set" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.dialog>Body</VoidableUI.Components.dialog>
        """)

      refute html =~ "heading="
      refute html =~ "size="
    end

    test "renders open boolean when true" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.dialog open={true}>Body</VoidableUI.Components.dialog>
        """)

      assert html =~ "open"
    end

    test "omits open when false (default)" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.dialog>Body</VoidableUI.Components.dialog>
        """)

      refute html =~ ~r/\sopen[\s>]/
    end

    test "renders closable by default (true)" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.dialog>Body</VoidableUI.Components.dialog>
        """)

      assert html =~ "closable"
    end

    test "omits closable when explicitly false" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.dialog closable={false}>Body</VoidableUI.Components.dialog>
        """)

      refute html =~ "closable"
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.dialog id="dlg-1">Body</VoidableUI.Components.dialog>
        """)

      assert html =~ ~s(id="dlg-1")
    end
  end

  # ===========================================================================
  # 5. Drawer (interactive -- void-close, has slot)
  # ===========================================================================

  describe "drawer" do
    test "renders <void-drawer> with slot content" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.drawer>Drawer body</VoidableUI.Components.drawer>
        """)

      assert html =~ "<void-drawer"
      assert html =~ "</void-drawer>"
      assert html =~ "Drawer body"
    end

    test "includes VoidEvent hook and data-void-events" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.drawer>Body</VoidableUI.Components.drawer>
        """)

      assert html =~ ~s(phx-hook="VoidEvent")
      assert html =~ ~s(data-void-events="void-close")
    end

    test "renders named attributes when provided" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.drawer side="right" size="md" heading="Settings">Body</VoidableUI.Components.drawer>
        """)

      assert html =~ ~s(side="right")
      assert html =~ ~s(size="md")
      assert html =~ ~s(heading="Settings")
    end

    test "omits nil-default attributes when not set" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.drawer>Body</VoidableUI.Components.drawer>
        """)

      refute html =~ "side="
      refute html =~ "size="
      refute html =~ "heading="
    end

    test "renders open boolean when true" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.drawer open={true}>Body</VoidableUI.Components.drawer>
        """)

      assert html =~ "open"
    end

    test "omits open when false (default)" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.drawer>Body</VoidableUI.Components.drawer>
        """)

      refute html =~ ~r/\sopen[\s>]/
    end

    test "renders closable by default (true)" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.drawer>Body</VoidableUI.Components.drawer>
        """)

      assert html =~ "closable"
    end

    test "omits closable when explicitly false" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.drawer closable={false}>Body</VoidableUI.Components.drawer>
        """)

      refute html =~ "closable"
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.drawer id="drawer-1" class="wide">Body</VoidableUI.Components.drawer>
        """)

      assert html =~ ~s(id="drawer-1")
      assert html =~ ~s(class="wide")
    end
  end

  # ===========================================================================
  # 6. Popover (interactive -- void-close, has slot)
  # ===========================================================================

  describe "popover" do
    test "renders <void-popover> with slot content" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.popover>Popover content</VoidableUI.Components.popover>
        """)

      assert html =~ "<void-popover"
      assert html =~ "</void-popover>"
      assert html =~ "Popover content"
    end

    test "includes VoidEvent hook and data-void-events" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.popover>Content</VoidableUI.Components.popover>
        """)

      assert html =~ ~s(phx-hook="VoidEvent")
      assert html =~ ~s(data-void-events="void-close")
    end

    test "renders named attributes when provided" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.popover position="top" trigger="click">Content</VoidableUI.Components.popover>
        """)

      assert html =~ ~s(position="top")
      assert html =~ ~s(trigger="click")
    end

    test "omits nil-default attributes when not set" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.popover>Content</VoidableUI.Components.popover>
        """)

      refute html =~ "position="
      refute html =~ "trigger="
    end

    test "renders open boolean when true" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.popover open={true}>Content</VoidableUI.Components.popover>
        """)

      assert html =~ "open"
    end

    test "omits open when false (default)" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.popover>Content</VoidableUI.Components.popover>
        """)

      refute html =~ ~r/\sopen[\s>]/
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.popover id="pop-1">Content</VoidableUI.Components.popover>
        """)

      assert html =~ ~s(id="pop-1")
    end
  end

  # ===========================================================================
  # 7. Toast (interactive -- void-close, has slot)
  # ===========================================================================

  describe "toast" do
    test "renders <void-toast> with slot content" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.toast>Saved!</VoidableUI.Components.toast>
        """)

      assert html =~ "<void-toast"
      assert html =~ "</void-toast>"
      assert html =~ "Saved!"
    end

    test "includes VoidEvent hook and data-void-events" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.toast>Msg</VoidableUI.Components.toast>
        """)

      assert html =~ ~s(phx-hook="VoidEvent")
      assert html =~ ~s(data-void-events="void-close")
    end

    test "renders named attributes when provided" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.toast color="success" heading="Done" duration={5000}>Msg</VoidableUI.Components.toast>
        """)

      assert html =~ ~s(color="success")
      assert html =~ ~s(heading="Done")
      assert html =~ ~s(duration="5000")
    end

    test "omits nil-default attributes when not set" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.toast>Msg</VoidableUI.Components.toast>
        """)

      refute html =~ "color="
      refute html =~ "heading="
      refute html =~ "duration="
    end

    test "renders dismissable by default (true)" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.toast>Msg</VoidableUI.Components.toast>
        """)

      assert html =~ "dismissable"
    end

    test "omits dismissable when explicitly false" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.toast dismissable={false}>Msg</VoidableUI.Components.toast>
        """)

      refute html =~ "dismissable"
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.toast id="toast-1">Msg</VoidableUI.Components.toast>
        """)

      assert html =~ ~s(id="toast-1")
    end
  end

  # ===========================================================================
  # 8. Tabs (interactive -- void-change, has slot)
  # ===========================================================================

  describe "tabs" do
    test "renders <void-tabs> with slot content" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.tabs>Tab panels here</VoidableUI.Components.tabs>
        """)

      assert html =~ "<void-tabs"
      assert html =~ "</void-tabs>"
      assert html =~ "Tab panels here"
    end

    test "includes VoidEvent hook and data-void-events" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.tabs>Tabs</VoidableUI.Components.tabs>
        """)

      assert html =~ ~s(phx-hook="VoidEvent")
      assert html =~ ~s(data-void-events="void-change")
    end

    test "renders named attributes when provided" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.tabs value="tab-1" size="sm">Tabs</VoidableUI.Components.tabs>
        """)

      assert html =~ ~s(value="tab-1")
      assert html =~ ~s(size="sm")
    end

    test "omits nil-default attributes when not set" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.tabs>Tabs</VoidableUI.Components.tabs>
        """)

      refute html =~ "value="
      refute html =~ "size="
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.tabs id="tabs-1" class="full-width">Tabs</VoidableUI.Components.tabs>
        """)

      assert html =~ ~s(id="tabs-1")
      assert html =~ ~s(class="full-width")
    end
  end

  # ===========================================================================
  # 9. AccordionItem (interactive -- void-toggle, has slot)
  # ===========================================================================

  describe "accordion_item" do
    test "renders <void-accordion-item> with slot content" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.accordion_item>Details here</VoidableUI.Components.accordion_item>
        """)

      assert html =~ "<void-accordion-item"
      assert html =~ "</void-accordion-item>"
      assert html =~ "Details here"
    end

    test "includes VoidEvent hook and data-void-events" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.accordion_item>Content</VoidableUI.Components.accordion_item>
        """)

      assert html =~ ~s(phx-hook="VoidEvent")
      assert html =~ ~s(data-void-events="void-toggle")
    end

    test "renders named attributes when provided" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.accordion_item heading="Section 1">Content</VoidableUI.Components.accordion_item>
        """)

      assert html =~ ~s(heading="Section 1")
    end

    test "omits nil-default attributes when not set" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.accordion_item>Content</VoidableUI.Components.accordion_item>
        """)

      refute html =~ "heading="
    end

    test "renders open boolean when true" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.accordion_item open={true}>Content</VoidableUI.Components.accordion_item>
        """)

      assert html =~ "open"
    end

    test "omits open when false (default)" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.accordion_item>Content</VoidableUI.Components.accordion_item>
        """)

      refute html =~ ~r/\sopen[\s>]/
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.accordion_item id="acc-item-1">Content</VoidableUI.Components.accordion_item>
        """)

      assert html =~ ~s(id="acc-item-1")
    end
  end

  # ===========================================================================
  # 10. Pagination (interactive -- void-change, no slot)
  # ===========================================================================

  describe "pagination" do
    test "renders <void-pagination> self-closing tag" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.pagination />
        """)

      assert html =~ "<void-pagination"
    end

    test "includes VoidEvent hook and data-void-events" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.pagination />
        """)

      assert html =~ ~s(phx-hook="VoidEvent")
      assert html =~ ~s(data-void-events="void-change")
    end

    test "renders named attributes when provided" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.pagination total={10} value={3} siblings={1} size="sm" />
        """)

      assert html =~ ~s(total="10")
      assert html =~ ~s(value="3")
      assert html =~ ~s(siblings="1")
      assert html =~ ~s(size="sm")
    end

    test "omits nil-default attributes when not set" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.pagination />
        """)

      refute html =~ "total="
      refute html =~ "value="
      refute html =~ "siblings="
      refute html =~ "size="
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.pagination id="pager" />
        """)

      assert html =~ ~s(id="pager")
    end
  end

  # ===========================================================================
  # 11. Hamburger (interactive -- void-toggle, no slot)
  # ===========================================================================

  describe "hamburger" do
    test "renders <void-hamburger> self-closing tag" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.hamburger />
        """)

      assert html =~ "<void-hamburger"
    end

    test "includes VoidEvent hook and data-void-events" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.hamburger />
        """)

      assert html =~ ~s(phx-hook="VoidEvent")
      assert html =~ ~s(data-void-events="void-toggle")
    end

    test "renders named attributes when provided" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.hamburger size="lg" />
        """)

      assert html =~ ~s(size="lg")
    end

    test "omits nil-default attributes when not set" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.hamburger />
        """)

      refute html =~ "size="
    end

    test "renders active boolean when true" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.hamburger active={true} />
        """)

      assert html =~ "active"
    end

    test "omits active when false (default)" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.hamburger />
        """)

      refute html =~ "active"
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.hamburger id="burger" class="nav-toggle" />
        """)

      assert html =~ ~s(id="burger")
      assert html =~ ~s(class="nav-toggle")
    end
  end
end
