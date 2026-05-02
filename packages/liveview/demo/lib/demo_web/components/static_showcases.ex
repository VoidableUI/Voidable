defmodule DemoWeb.StaticShowcases do
  @moduledoc """
  Storybook-style showcase functions for static VoidableUI components.

  Each public function is a Phoenix function component that renders examples
  of a component with various props. Used by the demo app's showcase pages.
  """

  use Phoenix.Component

  # ---------------------------------------------------------------------------
  # Badge
  # ---------------------------------------------------------------------------

  def badge(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <p>A simple status badge for labeling and categorization.</p>
      <div class="showcase-row">
        <VoidableUI.Components.badge>42</VoidableUI.Components.badge>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Colors</h3>
      <div class="showcase-row">
        <VoidableUI.Components.badge>Default</VoidableUI.Components.badge>
        <VoidableUI.Components.badge color="error">Error</VoidableUI.Components.badge>
        <VoidableUI.Components.badge color="warning">Warning</VoidableUI.Components.badge>
        <VoidableUI.Components.badge color="success">Success</VoidableUI.Components.badge>
        <VoidableUI.Components.badge color="info">Info</VoidableUI.Components.badge>
        <VoidableUI.Components.badge color="notice">Notice</VoidableUI.Components.badge>
        <VoidableUI.Components.badge color="highlight">Highlight</VoidableUI.Components.badge>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <div class="showcase-row">
        <VoidableUI.Components.badge size="sm">9</VoidableUI.Components.badge>
        <VoidableUI.Components.badge>42</VoidableUI.Components.badge>
        <VoidableUI.Components.badge size="lg">New</VoidableUI.Components.badge>
        <VoidableUI.Components.badge size="xl">XL</VoidableUI.Components.badge>
        <VoidableUI.Components.badge size="xxl">XXL</VoidableUI.Components.badge>
      </div>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Divider
  # ---------------------------------------------------------------------------

  def divider(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <p>A visual separator between content sections.</p>
      <VoidableUI.Components.divider />
    </div>
    <div class="showcase-section">
      <h3>With Label</h3>
      <VoidableUI.Components.divider label="or continue with" />
    </div>
    <div class="showcase-section">
      <h3>Vertical</h3>
      <div class="showcase-row" style="height: 80px;">
        <span>Left content</span>
        <VoidableUI.Components.divider orientation="vertical" />
        <span>Right content</span>
      </div>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Spinner
  # ---------------------------------------------------------------------------

  def spinner(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <p>A loading indicator to show ongoing activity.</p>
      <div class="showcase-row">
        <VoidableUI.Components.spinner />
      </div>
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <div class="showcase-row">
        <VoidableUI.Components.spinner size="sm" label="Loading small" />
        <VoidableUI.Components.spinner label="Loading medium" />
        <VoidableUI.Components.spinner size="lg" label="Loading large" />
        <VoidableUI.Components.spinner size="xl" label="Loading xl" />
        <VoidableUI.Components.spinner size="xxl" label="Loading xxl" />
      </div>
    </div>
    <div class="showcase-section">
      <h3>Custom Label</h3>
      <div class="showcase-row">
        <VoidableUI.Components.spinner label="Please wait" />
      </div>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Skeleton
  # ---------------------------------------------------------------------------

  def skeleton(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Text (default)</h3>
      <p>Placeholder shapes shown while content is loading.</p>
      <div class="showcase-row">
        <VoidableUI.Components.skeleton variant="text" />
      </div>
    </div>
    <div class="showcase-section">
      <h3>Circular</h3>
      <div class="showcase-row">
        <VoidableUI.Components.skeleton variant="circular" />
      </div>
    </div>
    <div class="showcase-section">
      <h3>Rectangular</h3>
      <div class="showcase-row">
        <VoidableUI.Components.skeleton variant="rectangular" />
      </div>
    </div>
    <div class="showcase-section">
      <h3>Content Placeholder</h3>
      <div style="display: flex; flex-direction: column; gap: 0.75rem; max-width: 20rem; padding: 1rem; border: 1px solid var(--void-color-border, #e0e0e0); border-radius: 0.5rem;">
        <VoidableUI.Components.skeleton variant="rectangular" />
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <VoidableUI.Components.skeleton variant="circular" />
          <div style="flex: 1; display: flex; flex-direction: column; gap: 0.5rem;">
            <VoidableUI.Components.skeleton variant="text" />
            <VoidableUI.Components.skeleton variant="text" style="width: 60%;" />
          </div>
        </div>
        <VoidableUI.Components.skeleton variant="text" />
        <VoidableUI.Components.skeleton variant="text" />
        <VoidableUI.Components.skeleton variant="text" style="width: 80%;" />
      </div>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # StatusDot
  # ---------------------------------------------------------------------------

  def status_dot(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Statuses</h3>
      <p>Small colored dots to indicate status at a glance.</p>
      <div class="showcase-row">
        <div style="display: flex; align-items: center; gap: 0.375rem;">
          <VoidableUI.Components.status_dot status="online" />
          <span>Online</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.375rem;">
          <VoidableUI.Components.status_dot status="away" />
          <span>Away</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.375rem;">
          <VoidableUI.Components.status_dot status="offline" />
          <span>Offline</span>
        </div>
      </div>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Avatar
  # ---------------------------------------------------------------------------

  def avatar(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>With Initials</h3>
      <p>User avatars with image, initials, or placeholder.</p>
      <div class="showcase-row">
        <VoidableUI.Components.avatar initials="KW" />
      </div>
    </div>
    <div class="showcase-section">
      <h3>With Image</h3>
      <div class="showcase-row">
        <VoidableUI.Components.avatar src="https://i.pravatar.cc/150?img=3" alt="Avatar" />
      </div>
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <div class="showcase-row">
        <VoidableUI.Components.avatar initials="KW" size="sm" />
        <VoidableUI.Components.avatar initials="KW" />
        <VoidableUI.Components.avatar initials="KW" size="lg" />
        <VoidableUI.Components.avatar initials="KW" size="xl" />
        <VoidableUI.Components.avatar initials="KW" size="xxl" />
      </div>
    </div>
    <div class="showcase-section">
      <h3>Fallback on Error</h3>
      <div class="showcase-row">
        <VoidableUI.Components.avatar src="https://example.com/broken-image.png" alt="Broken image" initials="KW" />
      </div>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Stepper
  # ---------------------------------------------------------------------------

  def stepper(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <p>A step-by-step progress indicator for multi-step flows.</p>
      <VoidableUI.Components.stepper value={1} steps="Details,Payment,Confirm" />
    </div>
    <div class="showcase-section">
      <h3>First Step</h3>
      <VoidableUI.Components.stepper value={0} steps="Account,Billing,Confirm,Done" />
    </div>
    <div class="showcase-section">
      <h3>Last Step</h3>
      <VoidableUI.Components.stepper value={3} steps="Account,Billing,Confirm,Done" />
    </div>
    <div class="showcase-section">
      <h3>Many Steps</h3>
      <VoidableUI.Components.stepper value={2} steps="One,Two,Three,Four,Five,Six" />
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Progress
  # ---------------------------------------------------------------------------

  def progress(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <p>A progress bar to indicate completion or loading state.</p>
      <div class="showcase-row">
        <VoidableUI.Components.progress value={60} />
      </div>
    </div>
    <div class="showcase-section">
      <h3>Colors</h3>
      <div class="showcase-row">
        <VoidableUI.Components.progress value={75} />
        <VoidableUI.Components.progress value={60} color="error" />
        <VoidableUI.Components.progress value={45} color="warning" />
        <VoidableUI.Components.progress value={90} color="success" />
        <VoidableUI.Components.progress value={55} color="info" />
        <VoidableUI.Components.progress value={30} color="notice" />
      </div>
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <div class="showcase-row">
        <VoidableUI.Components.progress value={60} size="sm" />
        <VoidableUI.Components.progress value={60} />
        <VoidableUI.Components.progress value={60} size="lg" />
        <VoidableUI.Components.progress value={60} size="xl" />
        <VoidableUI.Components.progress value={60} size="xxl" />
      </div>
    </div>
    <div class="showcase-section">
      <h3>Indeterminate</h3>
      <div class="showcase-row">
        <VoidableUI.Components.progress indeterminate />
      </div>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Tooltip
  # ---------------------------------------------------------------------------

  def tooltip(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <p>A hover-triggered tooltip for supplemental information.</p>
      <div class="showcase-row">
        <VoidableUI.Components.tooltip text="Hello, tooltip!" position="top">
          <button style="padding: 0.5rem 1rem; cursor: pointer;">Hover me</button>
        </VoidableUI.Components.tooltip>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Positions</h3>
      <div class="showcase-row" style="padding: 3rem; gap: 4rem;">
        <VoidableUI.Components.tooltip text="Top tooltip" position="top">
          <button style="padding: 0.5rem 1rem; cursor: pointer;">Top</button>
        </VoidableUI.Components.tooltip>
        <VoidableUI.Components.tooltip text="Bottom tooltip" position="bottom">
          <button style="padding: 0.5rem 1rem; cursor: pointer;">Bottom</button>
        </VoidableUI.Components.tooltip>
        <VoidableUI.Components.tooltip text="Left tooltip" position="left">
          <button style="padding: 0.5rem 1rem; cursor: pointer;">Left</button>
        </VoidableUI.Components.tooltip>
        <VoidableUI.Components.tooltip text="Right tooltip" position="right">
          <button style="padding: 0.5rem 1rem; cursor: pointer;">Right</button>
        </VoidableUI.Components.tooltip>
      </div>
    </div>
    <div class="showcase-section">
      <h3>On Text</h3>
      <p style="font-size: 1rem;">
        Hover over
        <VoidableUI.Components.tooltip text="This is an explanation">
          <span style="text-decoration: underline dotted; cursor: help;">this term</span>
        </VoidableUI.Components.tooltip>
        for details.
      </p>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # ErrorFallback
  # ---------------------------------------------------------------------------

  def error_fallback(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <p>An error display for when something goes wrong.</p>
      <VoidableUI.Components.error_fallback heading="Something went wrong" />
    </div>
    <div class="showcase-section">
      <h3>With Message</h3>
      <VoidableUI.Components.error_fallback
        heading="Something went wrong"
        message="We couldn't load your data. Please check your connection and try again."
      />
    </div>
    <div class="showcase-section">
      <h3>Retryable</h3>
      <VoidableUI.Components.error_fallback
        heading="Failed to load"
        message="There was a problem fetching the requested resource."
        retryable
      />
    </div>
    <div class="showcase-section">
      <h3>Retryable with Custom Label</h3>
      <VoidableUI.Components.error_fallback
        heading="Connection lost"
        message="Unable to reach the server. Check your network and try again."
        retryable
        retry_label="Reconnect"
      />
    </div>
    <div class="showcase-section">
      <h3>Without Icon</h3>
      <VoidableUI.Components.error_fallback
        heading="Page not available"
        message="This content could not be displayed."
        retryable
        icon={false}
      />
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Panel
  # ---------------------------------------------------------------------------

  def panel(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <p>A container panel for grouping related content.</p>
      <VoidableUI.Components.panel>
        This is a default panel. Use it to group related content or provide a visual container for sections of your UI.
      </VoidableUI.Components.panel>
    </div>
    <div class="showcase-section">
      <h3>With Label</h3>
      <VoidableUI.Components.panel label="Settings">
        Adjust your preferences here. Changes are saved automatically when you leave the field.
      </VoidableUI.Components.panel>
    </div>
    <div class="showcase-section">
      <h3>Bordered Variant</h3>
      <VoidableUI.Components.panel label="Billing" variant="bordered">
        Your current plan is <strong>Pro</strong>. Next billing date is May 1, 2026.
      </VoidableUI.Components.panel>
    </div>
    <div class="showcase-section">
      <h3>Elevated Variant</h3>
      <VoidableUI.Components.panel label="Recent Activity" variant="elevated">
        You signed in from a new device on April 28, 2026 at 09:14 AM.
      </VoidableUI.Components.panel>
    </div>
    <div class="showcase-section">
      <h3>Nested</h3>
      <VoidableUI.Components.panel label="Account">
        Manage your account details and connected services below.
        <VoidableUI.Components.panel label="Profile" variant="bordered" style="margin-top: 1rem;">
          Update your display name, avatar, and contact email.
        </VoidableUI.Components.panel>
      </VoidableUI.Components.panel>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Accordion
  # ---------------------------------------------------------------------------

  def accordion(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <p>Collapsible sections for organizing content. Only one section open at a time by default.</p>
      <VoidableUI.Components.accordion>
        <VoidableUI.Components.accordion_item heading="Section 1" open>
          Content for section 1. This section starts open.
        </VoidableUI.Components.accordion_item>
        <VoidableUI.Components.accordion_item heading="Section 2">
          Content for section 2.
        </VoidableUI.Components.accordion_item>
        <VoidableUI.Components.accordion_item heading="Section 3">
          Content for section 3.
        </VoidableUI.Components.accordion_item>
      </VoidableUI.Components.accordion>
    </div>
    <div class="showcase-section">
      <h3>Multiple</h3>
      <p>With the multiple attribute, more than one section can be open simultaneously.</p>
      <VoidableUI.Components.accordion multiple>
        <VoidableUI.Components.accordion_item heading="Section 1" open>
          Content for section 1. Multiple sections can be open at once.
        </VoidableUI.Components.accordion_item>
        <VoidableUI.Components.accordion_item heading="Section 2" open>
          Content for section 2. This is also open simultaneously.
        </VoidableUI.Components.accordion_item>
        <VoidableUI.Components.accordion_item heading="Section 3">
          Content for section 3.
        </VoidableUI.Components.accordion_item>
      </VoidableUI.Components.accordion>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Breadcrumbs
  # ---------------------------------------------------------------------------

  def breadcrumbs(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <p>A navigation trail showing the current page location within a hierarchy.</p>
      <VoidableUI.Components.breadcrumbs>
        <a href="#">Home</a>
        <a href="#">Products</a>
        <span>Details</span>
      </VoidableUI.Components.breadcrumbs>
    </div>
    <div class="showcase-section">
      <h3>Custom Separator</h3>
      <VoidableUI.Components.breadcrumbs separator="&rsaquo;">
        <a href="#">Home</a>
        <a href="#">Docs</a>
        <span>Getting Started</span>
      </VoidableUI.Components.breadcrumbs>
    </div>
    <div class="showcase-section">
      <h3>Deep Nesting</h3>
      <VoidableUI.Components.breadcrumbs separator="/">
        <a href="#">Home</a>
        <a href="#">Settings</a>
        <a href="#">Account</a>
        <a href="#">Security</a>
        <span>Two-Factor Auth</span>
      </VoidableUI.Components.breadcrumbs>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # List
  # ---------------------------------------------------------------------------

  def list(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <p>A structured list for displaying items in a vertical layout.</p>
      <VoidableUI.Components.list>
        <VoidableUI.Components.list_item>Item one</VoidableUI.Components.list_item>
        <VoidableUI.Components.list_item>Item two</VoidableUI.Components.list_item>
        <VoidableUI.Components.list_item>Item three</VoidableUI.Components.list_item>
      </VoidableUI.Components.list>
    </div>
    <div class="showcase-section">
      <h3>With Dividers</h3>
      <VoidableUI.Components.list dividers>
        <VoidableUI.Components.list_item>Item one</VoidableUI.Components.list_item>
        <VoidableUI.Components.list_item>Item two</VoidableUI.Components.list_item>
        <VoidableUI.Components.list_item>Item three</VoidableUI.Components.list_item>
      </VoidableUI.Components.list>
    </div>
    <div class="showcase-section">
      <h3>Interactive</h3>
      <VoidableUI.Components.list>
        <VoidableUI.Components.list_item interactive>Clickable item one</VoidableUI.Components.list_item>
        <VoidableUI.Components.list_item interactive>Clickable item two</VoidableUI.Components.list_item>
        <VoidableUI.Components.list_item interactive>Clickable item three</VoidableUI.Components.list_item>
      </VoidableUI.Components.list>
    </div>
    <div class="showcase-section">
      <h3>With Dividers and States</h3>
      <VoidableUI.Components.list dividers>
        <VoidableUI.Components.list_item interactive>Normal item</VoidableUI.Components.list_item>
        <VoidableUI.Components.list_item interactive selected>Selected item</VoidableUI.Components.list_item>
        <VoidableUI.Components.list_item interactive disabled>Disabled item</VoidableUI.Components.list_item>
        <VoidableUI.Components.list_item interactive>Another item</VoidableUI.Components.list_item>
      </VoidableUI.Components.list>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Card
  # ---------------------------------------------------------------------------

  def card(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <p>A card container for presenting grouped content.</p>
      <VoidableUI.Components.card>
        This is a default card. Use it to present self-contained pieces of content such as summaries, previews, or calls to action.
      </VoidableUI.Components.card>
    </div>
    <div class="showcase-section">
      <h3>With Heading</h3>
      <VoidableUI.Components.card heading="Project Overview">
        Track milestones, manage contributors, and review progress across all active workstreams.
      </VoidableUI.Components.card>
    </div>
    <div class="showcase-section">
      <h3>Elevated</h3>
      <VoidableUI.Components.card heading="Weekly Summary" variant="elevated">
        You completed 12 tasks this week, a 20% increase from last week.
      </VoidableUI.Components.card>
    </div>
    <div class="showcase-section">
      <h3>Outlined</h3>
      <VoidableUI.Components.card heading="Integration Status" variant="outlined">
        All connected services are operating normally.
      </VoidableUI.Components.card>
    </div>
    <div class="showcase-section">
      <h3>Padding</h3>
      <div class="showcase-row">
        <VoidableUI.Components.card padding="none" heading="No Padding">
          Content sits flush against the card edges.
        </VoidableUI.Components.card>
        <VoidableUI.Components.card padding="sm" heading="Small Padding">
          Compact spacing for dense layouts.
        </VoidableUI.Components.card>
        <VoidableUI.Components.card heading="Medium Padding">
          Balanced spacing suitable for most use cases.
        </VoidableUI.Components.card>
        <VoidableUI.Components.card padding="lg" heading="Large Padding">
          Generous spacing for featured content.
        </VoidableUI.Components.card>
      </div>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Table
  # ---------------------------------------------------------------------------

  def table(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <p>A data table with various display options.</p>
      <VoidableUI.Components.table>
        <thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Joined</th></tr></thead>
        <tbody>
          <tr><td>Alice Morgan</td><td>Engineer</td><td>Active</td><td>Jan 2023</td></tr>
          <tr><td>Ben Okafor</td><td>Designer</td><td>Active</td><td>Mar 2023</td></tr>
          <tr><td>Clara Shen</td><td>Product</td><td>On leave</td><td>Jul 2022</td></tr>
        </tbody>
      </VoidableUI.Components.table>
    </div>
    <div class="showcase-section">
      <h3>Striped and Hoverable</h3>
      <VoidableUI.Components.table striped hoverable>
        <thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Joined</th></tr></thead>
        <tbody>
          <tr><td>Alice Morgan</td><td>Engineer</td><td>Active</td><td>Jan 2023</td></tr>
          <tr><td>Ben Okafor</td><td>Designer</td><td>Active</td><td>Mar 2023</td></tr>
          <tr><td>Clara Shen</td><td>Product</td><td>On leave</td><td>Jul 2022</td></tr>
          <tr><td>David Park</td><td>Engineer</td><td>Active</td><td>Nov 2023</td></tr>
          <tr><td>Eva Lindström</td><td>QA</td><td>Inactive</td><td>Feb 2021</td></tr>
        </tbody>
      </VoidableUI.Components.table>
    </div>
    <div class="showcase-section">
      <h3>Compact and Bordered</h3>
      <VoidableUI.Components.table compact bordered>
        <thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Joined</th></tr></thead>
        <tbody>
          <tr><td>Alice Morgan</td><td>Engineer</td><td>Active</td><td>Jan 2023</td></tr>
          <tr><td>Ben Okafor</td><td>Designer</td><td>Active</td><td>Mar 2023</td></tr>
          <tr><td>Clara Shen</td><td>Product</td><td>On leave</td><td>Jul 2022</td></tr>
        </tbody>
      </VoidableUI.Components.table>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # ScrollArea
  # ---------------------------------------------------------------------------

  def scroll_area(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Vertical</h3>
      <p>A scrollable container with custom scrollbar styling.</p>
      <VoidableUI.Components.scroll_area max_height="150px" direction="vertical">
        <p>Line 1: Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
        <p>Line 2: Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
        <p>Line 3: Ut enim ad minim veniam, quis nostrud exercitation ullamco.</p>
        <p>Line 4: Duis aute irure dolor in reprehenderit in voluptate velit.</p>
        <p>Line 5: Excepteur sint occaecat cupidatat non proident.</p>
        <p>Line 6: Sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
        <p>Line 7: End of content.</p>
      </VoidableUI.Components.scroll_area>
    </div>
    <div class="showcase-section">
      <h3>Horizontal</h3>
      <VoidableUI.Components.scroll_area direction="horizontal" style="max-width: 300px;">
        <div style="display: flex; gap: 1rem; width: max-content;">
          <div style="min-width: 120px; padding: 0.5rem; border: 1px solid var(--void-color-border, #ccc); border-radius: 4px;">Panel A</div>
          <div style="min-width: 120px; padding: 0.5rem; border: 1px solid var(--void-color-border, #ccc); border-radius: 4px;">Panel B</div>
          <div style="min-width: 120px; padding: 0.5rem; border: 1px solid var(--void-color-border, #ccc); border-radius: 4px;">Panel C</div>
          <div style="min-width: 120px; padding: 0.5rem; border: 1px solid var(--void-color-border, #ccc); border-radius: 4px;">Panel D</div>
          <div style="min-width: 120px; padding: 0.5rem; border: 1px solid var(--void-color-border, #ccc); border-radius: 4px;">Panel E</div>
        </div>
      </VoidableUI.Components.scroll_area>
    </div>
    <div class="showcase-section">
      <h3>Both Directions</h3>
      <VoidableUI.Components.scroll_area max_height="150px" direction="both" style="max-width: 300px;">
        <div style="width: 600px;">
          <p>Row 1 -- This content is wider than the container and taller than maxHeight.</p>
          <p>Row 2 -- Scroll both vertically and horizontally to explore all content.</p>
          <p>Row 3 -- Useful for wide tables or code blocks with many lines.</p>
          <p>Row 4 -- The scrollbars appear on both axes as needed.</p>
          <p>Row 5 -- End of content.</p>
        </div>
      </VoidableUI.Components.scroll_area>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Banner
  # ---------------------------------------------------------------------------

  def banner(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Colors</h3>
      <p>Full-width notification banners for important messages.</p>
      <VoidableUI.Components.banner>Default -- general-purpose page message.</VoidableUI.Components.banner>
      <VoidableUI.Components.banner color="error">Error -- something went wrong and needs attention.</VoidableUI.Components.banner>
      <VoidableUI.Components.banner color="warning">Warning -- proceed with caution.</VoidableUI.Components.banner>
      <VoidableUI.Components.banner color="success">Success -- the operation completed successfully.</VoidableUI.Components.banner>
      <VoidableUI.Components.banner color="info">Info -- here is some useful information.</VoidableUI.Components.banner>
      <VoidableUI.Components.banner color="notice">Notice -- a routine notification for your awareness.</VoidableUI.Components.banner>
    </div>
    <div class="showcase-section">
      <h3>Filled</h3>
      <VoidableUI.Components.banner variant="filled">Default filled banner.</VoidableUI.Components.banner>
      <VoidableUI.Components.banner color="error" variant="filled">Error filled banner.</VoidableUI.Components.banner>
      <VoidableUI.Components.banner color="success" variant="filled">Success filled banner.</VoidableUI.Components.banner>
      <VoidableUI.Components.banner color="info" variant="filled">Info filled banner.</VoidableUI.Components.banner>
    </div>
    <div class="showcase-section">
      <h3>Dismissable</h3>
      <VoidableUI.Components.banner color="info" dismissable>This banner can be dismissed. Click the close button.</VoidableUI.Components.banner>
      <VoidableUI.Components.banner color="success" dismissable>Your changes have been saved successfully.</VoidableUI.Components.banner>
      <VoidableUI.Components.banner color="error" dismissable>Failed to submit the form. Please try again.</VoidableUI.Components.banner>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # NavBar
  # ---------------------------------------------------------------------------

  def nav_bar(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <p>A top-level navigation bar for app-wide links.</p>
      <VoidableUI.Components.nav_bar bordered>
        <a href="#">Home</a>
        <a href="#">Docs</a>
        <a href="#">Blog</a>
      </VoidableUI.Components.nav_bar>
    </div>
    <div class="showcase-section">
      <h3>Elevated</h3>
      <VoidableUI.Components.nav_bar variant="elevated">
        <strong style="font-size: var(--void-text-sm); font-weight: var(--void-weight-medium); margin-right: auto;">Voidable</strong>
        <a href="#">Docs</a>
        <a href="#">Support</a>
      </VoidableUI.Components.nav_bar>
    </div>
    <div class="showcase-section">
      <h3>Sticky and Bordered</h3>
      <VoidableUI.Components.nav_bar sticky bordered>
        <strong style="font-size: var(--void-text-sm); font-weight: var(--void-weight-medium);">App</strong>
        <a href="#">Dashboard</a>
        <a href="#">Settings</a>
      </VoidableUI.Components.nav_bar>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # ToastContainer
  # ---------------------------------------------------------------------------

  def toast_container(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Top Right (default)</h3>
      <p>A positioning container for toast notifications. Toasts appear in the specified corner.</p>
      <div style="position: relative; height: 150px; border: 1px dashed var(--void-color-border, #ccc);">
        <VoidableUI.Components.toast_container position="top-right">
          <VoidableUI.Components.toast heading="Notification" color="info" dismissable={false}>
            This is a sample toast.
          </VoidableUI.Components.toast>
        </VoidableUI.Components.toast_container>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Bottom Left</h3>
      <div style="position: relative; height: 150px; border: 1px dashed var(--void-color-border, #ccc);">
        <VoidableUI.Components.toast_container position="bottom-left">
          <VoidableUI.Components.toast heading="Saved" color="success" dismissable={false}>
            Your changes have been saved.
          </VoidableUI.Components.toast>
        </VoidableUI.Components.toast_container>
      </div>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Field
  # ---------------------------------------------------------------------------

  def field(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <p>A form field wrapper that adds label, helper text, and error states to inputs.</p>
      <VoidableUI.Components.field label="Email" helper="We will never share your email." required>
        <VoidableUI.Components.input type="email" placeholder="Enter your email..." />
      </VoidableUI.Components.field>
    </div>
    <div class="showcase-section">
      <h3>With Error</h3>
      <VoidableUI.Components.field label="Username" error="Username is already taken" required>
        <VoidableUI.Components.input placeholder="Choose a username..." />
      </VoidableUI.Components.field>
    </div>
    <div class="showcase-section">
      <h3>With Select</h3>
      <VoidableUI.Components.field label="Country" helper="Select your country of residence">
        <VoidableUI.Components.select>
          <option value="">Choose...</option>
          <option value="us">United States</option>
          <option value="uk">United Kingdom</option>
          <option value="ca">Canada</option>
        </VoidableUI.Components.select>
      </VoidableUI.Components.field>
    </div>
    <div class="showcase-section">
      <h3>With Textarea</h3>
      <VoidableUI.Components.field label="Bio" helper="Tell us about yourself">
        <VoidableUI.Components.textarea placeholder="Write something..." />
      </VoidableUI.Components.field>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Option
  # ---------------------------------------------------------------------------

  def option(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <p>Selectable options for use inside dropdowns and select components.</p>
      <div class="showcase-row">
        <VoidableUI.Components.option value="a">Option A</VoidableUI.Components.option>
        <VoidableUI.Components.option value="b" selected>Option B (selected)</VoidableUI.Components.option>
        <VoidableUI.Components.option value="c">Option C</VoidableUI.Components.option>
      </div>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # TabPanel
  # ---------------------------------------------------------------------------

  def tab_panel(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <p>Tab panels used inside a tabs container for switching between views.</p>
      <VoidableUI.Components.tabs value="tab1">
        <VoidableUI.Components.tab_panel tab="tab1" label="First">
          Content of the first tab panel.
        </VoidableUI.Components.tab_panel>
        <VoidableUI.Components.tab_panel tab="tab2" label="Second">
          Content of the second tab panel.
        </VoidableUI.Components.tab_panel>
        <VoidableUI.Components.tab_panel tab="tab3" label="Third">
          Content of the third tab panel.
        </VoidableUI.Components.tab_panel>
      </VoidableUI.Components.tabs>
    </div>
    """
  end
end
