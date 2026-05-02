defmodule VoidableUI.Components.StaticSimpleTest do
  use ExUnit.Case, async: true

  import Phoenix.Component
  import Phoenix.LiveViewTest

  # ==========================================================================
  # 1. Badge
  # ==========================================================================

  describe "badge" do
    test "renders void-badge tag with slot content" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.badge>Hello</VoidableUI.Components.badge>
        """)

      assert html =~ "<void-badge"
      assert html =~ "Hello"
      assert html =~ "</void-badge>"
    end

    test "renders with color and size attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.badge color="primary" size="sm">Badge</VoidableUI.Components.badge>
        """)

      assert html =~ ~s(color="primary")
      assert html =~ ~s(size="sm")
      assert html =~ "Badge"
    end

    test "omits nil attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.badge>Text</VoidableUI.Components.badge>
        """)

      refute html =~ "color="
      refute html =~ "size="
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.badge id="my-badge" class="extra">Slot</VoidableUI.Components.badge>
        """)

      assert html =~ ~s(id="my-badge")
      assert html =~ ~s(class="extra")
    end
  end

  # ==========================================================================
  # 2. Divider
  # ==========================================================================

  describe "divider" do
    test "renders void-divider tag" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.divider />
        """)

      assert html =~ "<void-divider"
    end

    test "renders with label and orientation" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.divider label="OR" orientation="vertical" />
        """)

      assert html =~ ~s(label="OR")
      assert html =~ ~s(orientation="vertical")
    end

    test "omits nil attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.divider />
        """)

      refute html =~ "label="
      refute html =~ "orientation="
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.divider id="sep-1" class="my-divider" />
        """)

      assert html =~ ~s(id="sep-1")
      assert html =~ ~s(class="my-divider")
    end
  end

  # ==========================================================================
  # 3. Spinner
  # ==========================================================================

  describe "spinner" do
    test "renders void-spinner tag" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.spinner />
        """)

      assert html =~ "<void-spinner"
    end

    test "renders with size and label" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.spinner size="lg" label="Loading..." />
        """)

      assert html =~ ~s(size="lg")
      assert html =~ ~s(label="Loading...")
    end

    test "omits nil attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.spinner />
        """)

      refute html =~ "size="
      refute html =~ "label="
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.spinner id="loader" class="centered" />
        """)

      assert html =~ ~s(id="loader")
      assert html =~ ~s(class="centered")
    end
  end

  # ==========================================================================
  # 4. Skeleton
  # ==========================================================================

  describe "skeleton" do
    test "renders void-skeleton tag" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.skeleton />
        """)

      assert html =~ "<void-skeleton"
    end

    test "renders with variant attribute" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.skeleton variant="circle" />
        """)

      assert html =~ ~s(variant="circle")
    end

    test "omits nil variant" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.skeleton />
        """)

      refute html =~ "variant="
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.skeleton id="skel" class="w-full" />
        """)

      assert html =~ ~s(id="skel")
      assert html =~ ~s(class="w-full")
    end
  end

  # ==========================================================================
  # 5. StatusDot
  # ==========================================================================

  describe "status_dot" do
    test "renders void-status-dot tag" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.status_dot />
        """)

      assert html =~ "<void-status-dot"
    end

    test "renders with status attribute" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.status_dot status="online" />
        """)

      assert html =~ ~s(status="online")
    end

    test "omits nil status" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.status_dot />
        """)

      refute html =~ "status="
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.status_dot id="dot-1" class="inline" />
        """)

      assert html =~ ~s(id="dot-1")
      assert html =~ ~s(class="inline")
    end
  end

  # ==========================================================================
  # 6. Avatar
  # ==========================================================================

  describe "avatar" do
    test "renders void-avatar tag" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.avatar />
        """)

      assert html =~ "<void-avatar"
    end

    test "renders with all attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.avatar src="/img/me.png" alt="Profile" initials="KW" size="lg" />
        """)

      assert html =~ ~s(src="/img/me.png")
      assert html =~ ~s(alt="Profile")
      assert html =~ ~s(initials="KW")
      assert html =~ ~s(size="lg")
    end

    test "omits nil attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.avatar />
        """)

      refute html =~ "src="
      refute html =~ "alt="
      refute html =~ "initials="
      refute html =~ "size="
    end

    test "renders with only initials" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.avatar initials="AB" />
        """)

      assert html =~ ~s(initials="AB")
      refute html =~ "src="
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.avatar id="user-avatar" class="rounded" />
        """)

      assert html =~ ~s(id="user-avatar")
      assert html =~ ~s(class="rounded")
    end
  end

  # ==========================================================================
  # 7. Stepper
  # ==========================================================================

  describe "stepper" do
    test "renders void-stepper tag" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.stepper />
        """)

      assert html =~ "<void-stepper"
    end

    test "renders with value and steps" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.stepper value={2} steps="Step 1,Step 2,Step 3" />
        """)

      assert html =~ ~s(value="2")
      assert html =~ ~s(steps="Step 1,Step 2,Step 3")
    end

    test "omits nil attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.stepper />
        """)

      refute html =~ "value="
      refute html =~ "steps="
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.stepper id="wizard-steps" />
        """)

      assert html =~ ~s(id="wizard-steps")
    end
  end

  # ==========================================================================
  # 8. Progress
  # ==========================================================================

  describe "progress" do
    test "renders void-progress tag" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.progress />
        """)

      assert html =~ "<void-progress"
    end

    test "renders with value, max, color, size" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.progress value={75} max={100} color="success" size="lg" />
        """)

      assert html =~ ~s(value="75")
      assert html =~ ~s(max="100")
      assert html =~ ~s(color="success")
      assert html =~ ~s(size="lg")
    end

    test "omits nil attributes and false indeterminate" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.progress />
        """)

      refute html =~ "value="
      refute html =~ "max="
      refute html =~ "color="
      refute html =~ "size="
      refute html =~ "indeterminate"
    end

    test "renders indeterminate boolean attribute when true" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.progress indeterminate={true} />
        """)

      assert html =~ "indeterminate"
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.progress id="upload-bar" class="mt-4" />
        """)

      assert html =~ ~s(id="upload-bar")
      assert html =~ ~s(class="mt-4")
    end
  end

  # ==========================================================================
  # 9. Tooltip
  # ==========================================================================

  describe "tooltip" do
    test "renders void-tooltip tag with slot content" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.tooltip>Hover me</VoidableUI.Components.tooltip>
        """)

      assert html =~ "<void-tooltip"
      assert html =~ "Hover me"
      assert html =~ "</void-tooltip>"
    end

    test "renders with text, position, and delay" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.tooltip text="Help text" position="top" delay={200}>
          <button>Info</button>
        </VoidableUI.Components.tooltip>
        """)

      assert html =~ ~s(text="Help text")
      assert html =~ ~s(position="top")
      assert html =~ ~s(delay="200")
      assert html =~ "<button>Info</button>"
    end

    test "omits nil attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.tooltip>Content</VoidableUI.Components.tooltip>
        """)

      refute html =~ "text="
      refute html =~ "position="
      refute html =~ "delay="
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.tooltip id="tip-1" class="inline">
          Target
        </VoidableUI.Components.tooltip>
        """)

      assert html =~ ~s(id="tip-1")
      assert html =~ ~s(class="inline")
    end
  end

  # ==========================================================================
  # 10. ErrorFallback
  # ==========================================================================

  describe "error_fallback" do
    test "renders void-error-fallback tag" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.error_fallback />
        """)

      assert html =~ "<void-error-fallback"
    end

    test "renders with heading and message" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.error_fallback heading="Oops" message="Something went wrong" />
        """)

      assert html =~ ~s(heading="Oops")
      assert html =~ ~s(message="Something went wrong")
    end

    test "renders retryable boolean and retry_label mapped to retryLabel" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.error_fallback retryable={true} retry_label="Try again" />
        """)

      assert html =~ "retryable"
      assert html =~ ~s(retryLabel="Try again")
    end

    test "icon defaults to true and renders as boolean attribute" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.error_fallback />
        """)

      # icon defaults to true, so it should be present
      assert html =~ "icon"
    end

    test "icon=false omits the icon attribute" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.error_fallback icon={false} />
        """)

      # With icon=false, the boolean attribute should not render.
      # Match "icon" as an HTML attribute (preceded by space), not as part of tag name.
      refute html =~ ~r/ icon[ =>]/
    end

    test "omits nil heading, message and false retryable" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.error_fallback />
        """)

      refute html =~ "heading="
      refute html =~ "message="
      refute html =~ "retryable"
      refute html =~ "retryLabel"
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.error_fallback id="err-1" class="error-box" />
        """)

      assert html =~ ~s(id="err-1")
      assert html =~ ~s(class="error-box")
    end
  end
end
