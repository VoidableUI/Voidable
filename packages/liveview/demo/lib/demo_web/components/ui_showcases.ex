defmodule DemoWeb.UIShowcases do
  @moduledoc """
  Storybook-style showcase functions for interactive VoidableUI components.

  Each public function is a Phoenix function component that renders examples
  of a component with various prop combinations. These are intended to be
  embedded in demo pages to visualize all available variants at a glance.
  """

  use Phoenix.Component

  # ---------------------------------------------------------------------------
  # Button
  # ---------------------------------------------------------------------------

  def button(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <div class="showcase-row">
        <VoidableUI.Components.button events>Default</VoidableUI.Components.button>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Filled Variant</h3>
      <div class="showcase-row">
        <VoidableUI.Components.button events variant="filled">Filled</VoidableUI.Components.button>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Colors</h3>
      <div class="showcase-row">
        <VoidableUI.Components.button events>Default</VoidableUI.Components.button>
        <VoidableUI.Components.button events color="error">Error</VoidableUI.Components.button>
        <VoidableUI.Components.button events color="warning">Warning</VoidableUI.Components.button>
        <VoidableUI.Components.button events color="success">Success</VoidableUI.Components.button>
        <VoidableUI.Components.button events color="info">Info</VoidableUI.Components.button>
        <VoidableUI.Components.button events color="notice">Notice</VoidableUI.Components.button>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Colors (Filled)</h3>
      <div class="showcase-row">
        <VoidableUI.Components.button events variant="filled">Default</VoidableUI.Components.button>
        <VoidableUI.Components.button events variant="filled" color="error">Error</VoidableUI.Components.button>
        <VoidableUI.Components.button events variant="filled" color="warning">Warning</VoidableUI.Components.button>
        <VoidableUI.Components.button events variant="filled" color="success">Success</VoidableUI.Components.button>
        <VoidableUI.Components.button events variant="filled" color="info">Info</VoidableUI.Components.button>
        <VoidableUI.Components.button events variant="filled" color="notice">Notice</VoidableUI.Components.button>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <div class="showcase-row">
        <VoidableUI.Components.button events size="sm">Small</VoidableUI.Components.button>
        <VoidableUI.Components.button events>Medium</VoidableUI.Components.button>
        <VoidableUI.Components.button events size="lg">Large</VoidableUI.Components.button>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Disabled</h3>
      <div class="showcase-row">
        <VoidableUI.Components.button events disabled>Disabled Outline</VoidableUI.Components.button>
        <VoidableUI.Components.button events variant="filled" disabled>Disabled Filled</VoidableUI.Components.button>
        <VoidableUI.Components.button events color="error" disabled>Disabled Error</VoidableUI.Components.button>
      </div>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Alert
  # ---------------------------------------------------------------------------

  def alert(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Colors</h3>
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <VoidableUI.Components.alert events>
          <void-alert-description>Default -- general-purpose status message.</void-alert-description>
        </VoidableUI.Components.alert>
        <VoidableUI.Components.alert events color="error">
          <void-alert-description>Error -- something went wrong and needs attention.</void-alert-description>
        </VoidableUI.Components.alert>
        <VoidableUI.Components.alert events color="warning">
          <void-alert-description>Warning -- proceed with caution.</void-alert-description>
        </VoidableUI.Components.alert>
        <VoidableUI.Components.alert events color="success">
          <void-alert-description>Success -- the operation completed successfully.</void-alert-description>
        </VoidableUI.Components.alert>
        <VoidableUI.Components.alert events color="info">
          <void-alert-description>Info -- here is some useful information.</void-alert-description>
        </VoidableUI.Components.alert>
        <VoidableUI.Components.alert events color="notice">
          <void-alert-description>Notice -- a routine notification for your awareness.</void-alert-description>
        </VoidableUI.Components.alert>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Filled Variant</h3>
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <VoidableUI.Components.alert events variant="filled">
          <void-alert-description>Default filled alert.</void-alert-description>
        </VoidableUI.Components.alert>
        <VoidableUI.Components.alert events variant="filled" color="error">
          <void-alert-description>Error filled alert.</void-alert-description>
        </VoidableUI.Components.alert>
        <VoidableUI.Components.alert events variant="filled" color="warning">
          <void-alert-description>Warning filled alert.</void-alert-description>
        </VoidableUI.Components.alert>
        <VoidableUI.Components.alert events variant="filled" color="success">
          <void-alert-description>Success filled alert.</void-alert-description>
        </VoidableUI.Components.alert>
        <VoidableUI.Components.alert events variant="filled" color="info">
          <void-alert-description>Info filled alert.</void-alert-description>
        </VoidableUI.Components.alert>
        <VoidableUI.Components.alert events variant="filled" color="notice">
          <void-alert-description>Notice filled alert.</void-alert-description>
        </VoidableUI.Components.alert>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Dismissible</h3>
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <VoidableUI.Components.alert events color="info" dismissible>
          <void-alert-description>This alert can be dismissed. Click the close button.</void-alert-description>
        </VoidableUI.Components.alert>
        <VoidableUI.Components.alert events color="success" dismissible>
          <void-alert-description>Your changes have been saved successfully.</void-alert-description>
        </VoidableUI.Components.alert>
        <VoidableUI.Components.alert events color="error" dismissible>
          <void-alert-description>Failed to submit the form. Please try again.</void-alert-description>
        </VoidableUI.Components.alert>
      </div>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Tag
  # ---------------------------------------------------------------------------

  def tag(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <div class="showcase-row">
        <VoidableUI.Components.tag events>Default Tag</VoidableUI.Components.tag>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Colors</h3>
      <div class="showcase-row">
        <VoidableUI.Components.tag events>Default</VoidableUI.Components.tag>
        <VoidableUI.Components.tag events color="error">Error</VoidableUI.Components.tag>
        <VoidableUI.Components.tag events color="warning">Warning</VoidableUI.Components.tag>
        <VoidableUI.Components.tag events color="success">Success</VoidableUI.Components.tag>
        <VoidableUI.Components.tag events color="info">Info</VoidableUI.Components.tag>
        <VoidableUI.Components.tag events color="notice">Notice</VoidableUI.Components.tag>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <div class="showcase-row">
        <VoidableUI.Components.tag events size="sm">Small</VoidableUI.Components.tag>
        <VoidableUI.Components.tag events>Medium</VoidableUI.Components.tag>
        <VoidableUI.Components.tag events size="lg">Large</VoidableUI.Components.tag>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Removable</h3>
      <div class="showcase-row">
        <VoidableUI.Components.tag events removable>Default</VoidableUI.Components.tag>
        <VoidableUI.Components.tag events color="error" removable>Error</VoidableUI.Components.tag>
        <VoidableUI.Components.tag events color="warning" removable>Warning</VoidableUI.Components.tag>
        <VoidableUI.Components.tag events color="success" removable>Success</VoidableUI.Components.tag>
        <VoidableUI.Components.tag events color="info" removable>Info</VoidableUI.Components.tag>
        <VoidableUI.Components.tag events color="notice" removable>Notice</VoidableUI.Components.tag>
      </div>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Dialog
  # ---------------------------------------------------------------------------

  def dialog(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <p>Dialogs are shown inline for demo purposes. In practice, they overlay the page.</p>
      <VoidableUI.Components.dialog events open>
        <void-dialog-title>Confirm Action</void-dialog-title>
        <void-dialog-body>
          <p>Are you sure you want to proceed? This action cannot be undone.</p>
        </void-dialog-body>
      </VoidableUI.Components.dialog>
    </div>
    <div class="showcase-section">
      <h3>Sizes (code examples)</h3>
      <p>Only one dialog is shown open to avoid overlapping. Available sizes: sm, md, lg.</p>
      <div class="showcase-code">
        <pre><code>&lt;VoidableUI.Components.dialog heading="Small Dialog" size="sm" open&gt;
  &lt;p&gt;This is a small dialog (24rem max-width).&lt;/p&gt;
&lt;/VoidableUI.Components.dialog&gt;

&lt;VoidableUI.Components.dialog heading="Medium Dialog" size="md" open&gt;
  &lt;p&gt;This is a medium dialog (32rem max-width).&lt;/p&gt;
&lt;/VoidableUI.Components.dialog&gt;

&lt;VoidableUI.Components.dialog heading="Large Dialog" size="lg" open&gt;
  &lt;p&gt;This is a large dialog (48rem max-width).&lt;/p&gt;
&lt;/VoidableUI.Components.dialog&gt;

&lt;VoidableUI.Components.dialog heading="Required Action" closable={false} open&gt;
  &lt;p&gt;This dialog cannot be dismissed.&lt;/p&gt;
&lt;/VoidableUI.Components.dialog&gt;</code></pre>
      </div>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Drawer
  # ---------------------------------------------------------------------------

  def drawer(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default (Right Side)</h3>
      <p>Only one drawer is shown open to avoid layout issues. Drawers slide in from the specified side.</p>
      <VoidableUI.Components.drawer events side="right" open>
        <void-drawer-title>Settings</void-drawer-title>
        <void-drawer-body>
          <p>Drawer content goes here. Use drawers for secondary navigation, settings panels, or detail views.</p>
        </void-drawer-body>
      </VoidableUI.Components.drawer>
    </div>
    <div class="showcase-section">
      <h3>Other Variants (code examples)</h3>
      <p>Available sides: left, right, top, bottom. Available sizes: sm, md, lg.</p>
      <div class="showcase-code">
        <pre><code>&lt;VoidableUI.Components.drawer heading="Navigation" side="left" open&gt;
  &lt;p&gt;Left-side navigation drawer.&lt;/p&gt;
&lt;/VoidableUI.Components.drawer&gt;

&lt;VoidableUI.Components.drawer heading="Search" side="top" open&gt;
  &lt;p&gt;Top drawer for search.&lt;/p&gt;
&lt;/VoidableUI.Components.drawer&gt;

&lt;VoidableUI.Components.drawer heading="Actions" side="bottom" size="sm" open&gt;
  &lt;p&gt;Bottom drawer with sm size.&lt;/p&gt;
&lt;/VoidableUI.Components.drawer&gt;

&lt;VoidableUI.Components.drawer heading="Required Step" side="right" closable={false} open&gt;
  &lt;p&gt;This drawer cannot be dismissed.&lt;/p&gt;
&lt;/VoidableUI.Components.drawer&gt;</code></pre>
      </div>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Popover
  # ---------------------------------------------------------------------------

  def popover(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <p>Click the button to toggle the popover.</p>
      <div class="showcase-row" style="padding: 4rem;">
        <VoidableUI.Components.popover events>
          <void-popover-trigger><VoidableUI.Components.button events>Open Popover</VoidableUI.Components.button></void-popover-trigger>
          <void-popover-content>
            <div>
              <p style="margin: 0 0 0.5rem;">Popover content</p>
              <p style="margin: 0; opacity: 0.7;">Click outside or press Escape to close.</p>
            </div>
          </void-popover-content>
        </VoidableUI.Components.popover>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Positions</h3>
      <div class="showcase-row" style="padding: 6rem; gap: 1.5rem;">
        <VoidableUI.Components.popover events position="top">
          <void-popover-trigger><VoidableUI.Components.button events>Top</VoidableUI.Components.button></void-popover-trigger>
          <void-popover-content>
            <div>Opens above</div>
          </void-popover-content>
        </VoidableUI.Components.popover>
        <VoidableUI.Components.popover events position="bottom">
          <void-popover-trigger><VoidableUI.Components.button events>Bottom</VoidableUI.Components.button></void-popover-trigger>
          <void-popover-content>
            <div>Opens below</div>
          </void-popover-content>
        </VoidableUI.Components.popover>
        <VoidableUI.Components.popover events position="left">
          <void-popover-trigger><VoidableUI.Components.button events>Left</VoidableUI.Components.button></void-popover-trigger>
          <void-popover-content>
            <div>Opens to the left</div>
          </void-popover-content>
        </VoidableUI.Components.popover>
        <VoidableUI.Components.popover events position="right">
          <void-popover-trigger><VoidableUI.Components.button events>Right</VoidableUI.Components.button></void-popover-trigger>
          <void-popover-content>
            <div>Opens to the right</div>
          </void-popover-content>
        </VoidableUI.Components.popover>
      </div>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Toast
  # ---------------------------------------------------------------------------

  def toast(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Colors</h3>
      <p>Toast notifications with different color tones.</p>
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <VoidableUI.Components.toast events color="success" heading="Success!" dismissable={false}>
          Your changes have been saved.
        </VoidableUI.Components.toast>
        <VoidableUI.Components.toast events color="error" heading="Error" dismissable={false}>
          Something went wrong. Please try again.
        </VoidableUI.Components.toast>
        <VoidableUI.Components.toast events color="warning" heading="Warning" dismissable={false}>
          Your session will expire soon.
        </VoidableUI.Components.toast>
        <VoidableUI.Components.toast events color="info" dismissable={false}>
          A simple informational notification.
        </VoidableUI.Components.toast>
      </div>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Tabs
  # ---------------------------------------------------------------------------

  def tabs(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <VoidableUI.Components.tabs events value="one">
        <void-tabs-list>
          <void-tabs-trigger value="one">First</void-tabs-trigger>
          <void-tabs-trigger value="two">Second</void-tabs-trigger>
          <void-tabs-trigger value="three">Third</void-tabs-trigger>
        </void-tabs-list>
        <void-tabs-content value="one">
          <p>Content 1</p>
        </void-tabs-content>
        <void-tabs-content value="two">
          <p>Content 2</p>
        </void-tabs-content>
        <void-tabs-content value="three">
          <p>Content 3</p>
        </void-tabs-content>
      </VoidableUI.Components.tabs>
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <p>Small tabs:</p>
      <VoidableUI.Components.tabs events value="a" size="sm">
        <void-tabs-list>
          <void-tabs-trigger value="a">Alpha</void-tabs-trigger>
          <void-tabs-trigger value="b">Beta</void-tabs-trigger>
        </void-tabs-list>
        <void-tabs-content value="a">
          <p>Small tab A</p>
        </void-tabs-content>
        <void-tabs-content value="b">
          <p>Small tab B</p>
        </void-tabs-content>
      </VoidableUI.Components.tabs>
      <p>Medium tabs:</p>
      <VoidableUI.Components.tabs events value="a">
        <void-tabs-list>
          <void-tabs-trigger value="a">Alpha</void-tabs-trigger>
          <void-tabs-trigger value="b">Beta</void-tabs-trigger>
        </void-tabs-list>
        <void-tabs-content value="a">
          <p>Medium tab A</p>
        </void-tabs-content>
        <void-tabs-content value="b">
          <p>Medium tab B</p>
        </void-tabs-content>
      </VoidableUI.Components.tabs>
      <p>Large tabs:</p>
      <VoidableUI.Components.tabs events value="a" size="lg">
        <void-tabs-list>
          <void-tabs-trigger value="a">Alpha</void-tabs-trigger>
          <void-tabs-trigger value="b">Beta</void-tabs-trigger>
        </void-tabs-list>
        <void-tabs-content value="a">
          <p>Large tab A</p>
        </void-tabs-content>
        <void-tabs-content value="b">
          <p>Large tab B</p>
        </void-tabs-content>
      </VoidableUI.Components.tabs>
    </div>
    <div class="showcase-section">
      <h3>With Rich Content</h3>
      <VoidableUI.Components.tabs events value="overview">
        <void-tabs-list>
          <void-tabs-trigger value="overview">Overview</void-tabs-trigger>
          <void-tabs-trigger value="api">API</void-tabs-trigger>
          <void-tabs-trigger value="examples">Examples</void-tabs-trigger>
        </void-tabs-list>
        <void-tabs-content value="overview">
          <p>This is the overview panel with some content about the component.</p>
        </void-tabs-content>
        <void-tabs-content value="api">
          <p>API reference documentation goes here.</p>
        </void-tabs-content>
        <void-tabs-content value="examples">
          <p>Code examples and usage patterns are shown here.</p>
        </void-tabs-content>
      </VoidableUI.Components.tabs>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Accordion Item
  # ---------------------------------------------------------------------------

  def accordion_item(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <VoidableUI.Components.accordion>
        <VoidableUI.Components.accordion_item events open>
          <void-accordion-trigger>What is Voidable UI?</void-accordion-trigger>
          <void-accordion-content>
            <p style="margin: 0;">Voidable UI is a design system built with Lit web components. It uses Light DOM for seamless CSS integration.</p>
          </void-accordion-content>
        </VoidableUI.Components.accordion_item>
        <VoidableUI.Components.accordion_item events>
          <void-accordion-trigger>How do I install it?</void-accordion-trigger>
          <void-accordion-content>
            <p style="margin: 0 0 8px;">Install via npm:</p>
            <code>npm install @voidable/ui @voidable/theme</code>
          </void-accordion-content>
        </VoidableUI.Components.accordion_item>
        <VoidableUI.Components.accordion_item events>
          <void-accordion-trigger>Is it accessible?</void-accordion-trigger>
          <void-accordion-content>
            <p style="margin: 0;">Yes. All components use proper ARIA attributes, keyboard navigation, and focus management.</p>
          </void-accordion-content>
        </VoidableUI.Components.accordion_item>
      </VoidableUI.Components.accordion>
    </div>
    <div class="showcase-section">
      <h3>Multiple Open (with multiple attribute)</h3>
      <VoidableUI.Components.accordion multiple>
        <VoidableUI.Components.accordion_item events open>
          <void-accordion-trigger>Section A</void-accordion-trigger>
          <void-accordion-content>
            Content for section A. Multiple sections can be open at once.
          </void-accordion-content>
        </VoidableUI.Components.accordion_item>
        <VoidableUI.Components.accordion_item events open>
          <void-accordion-trigger>Section B</void-accordion-trigger>
          <void-accordion-content>
            Content for section B. This is also open simultaneously.
          </void-accordion-content>
        </VoidableUI.Components.accordion_item>
      </VoidableUI.Components.accordion>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Pagination
  # ---------------------------------------------------------------------------

  def pagination(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <VoidableUI.Components.pagination events total={20} value={6} />
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <p>Small:</p>
      <VoidableUI.Components.pagination events total={20} value={6} size="sm" />
      <p>Medium:</p>
      <VoidableUI.Components.pagination events total={20} value={6} />
      <p>Large:</p>
      <VoidableUI.Components.pagination events total={20} value={6} size="lg" />
    </div>
    <div class="showcase-section">
      <h3>Few Pages</h3>
      <VoidableUI.Components.pagination events total={5} value={3} />
    </div>
    <div class="showcase-section">
      <h3>Wide Siblings</h3>
      <VoidableUI.Components.pagination events total={20} value={10} siblings={3} />
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Hamburger
  # ---------------------------------------------------------------------------

  def hamburger(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default (Inactive)</h3>
      <div class="showcase-row">
        <VoidableUI.Components.hamburger events />
      </div>
    </div>
    <div class="showcase-section">
      <h3>Active</h3>
      <div class="showcase-row">
        <VoidableUI.Components.hamburger events active />
      </div>
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <div class="showcase-row">
        <VoidableUI.Components.hamburger events size="sm" />
        <VoidableUI.Components.hamburger events />
        <VoidableUI.Components.hamburger events size="lg" />
      </div>
    </div>
    <div class="showcase-section">
      <h3>Sizes (Active)</h3>
      <div class="showcase-row">
        <VoidableUI.Components.hamburger events size="sm" active />
        <VoidableUI.Components.hamburger events active />
        <VoidableUI.Components.hamburger events size="lg" active />
      </div>
    </div>
    """
  end
end
