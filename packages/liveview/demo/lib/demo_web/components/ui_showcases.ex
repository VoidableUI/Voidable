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
        <VoidableUI.Components.button>Default</VoidableUI.Components.button>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Filled Variant</h3>
      <div class="showcase-row">
        <VoidableUI.Components.button variant="filled">Filled</VoidableUI.Components.button>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Colors</h3>
      <div class="showcase-row">
        <VoidableUI.Components.button>Default</VoidableUI.Components.button>
        <VoidableUI.Components.button color="error">Error</VoidableUI.Components.button>
        <VoidableUI.Components.button color="warning">Warning</VoidableUI.Components.button>
        <VoidableUI.Components.button color="success">Success</VoidableUI.Components.button>
        <VoidableUI.Components.button color="info">Info</VoidableUI.Components.button>
        <VoidableUI.Components.button color="notice">Notice</VoidableUI.Components.button>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Colors (Filled)</h3>
      <div class="showcase-row">
        <VoidableUI.Components.button variant="filled">Default</VoidableUI.Components.button>
        <VoidableUI.Components.button variant="filled" color="error">Error</VoidableUI.Components.button>
        <VoidableUI.Components.button variant="filled" color="warning">Warning</VoidableUI.Components.button>
        <VoidableUI.Components.button variant="filled" color="success">Success</VoidableUI.Components.button>
        <VoidableUI.Components.button variant="filled" color="info">Info</VoidableUI.Components.button>
        <VoidableUI.Components.button variant="filled" color="notice">Notice</VoidableUI.Components.button>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <div class="showcase-row">
        <VoidableUI.Components.button size="sm">Small</VoidableUI.Components.button>
        <VoidableUI.Components.button>Medium</VoidableUI.Components.button>
        <VoidableUI.Components.button size="lg">Large</VoidableUI.Components.button>
        <VoidableUI.Components.button size="xl">XL</VoidableUI.Components.button>
        <VoidableUI.Components.button size="xxl">XXL</VoidableUI.Components.button>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Disabled</h3>
      <div class="showcase-row">
        <VoidableUI.Components.button disabled>Disabled Outline</VoidableUI.Components.button>
        <VoidableUI.Components.button variant="filled" disabled>Disabled Filled</VoidableUI.Components.button>
        <VoidableUI.Components.button color="error" disabled>Disabled Error</VoidableUI.Components.button>
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
        <VoidableUI.Components.alert>
          Default -- general-purpose status message.
        </VoidableUI.Components.alert>
        <VoidableUI.Components.alert color="error">
          Error -- something went wrong and needs attention.
        </VoidableUI.Components.alert>
        <VoidableUI.Components.alert color="warning">
          Warning -- proceed with caution.
        </VoidableUI.Components.alert>
        <VoidableUI.Components.alert color="success">
          Success -- the operation completed successfully.
        </VoidableUI.Components.alert>
        <VoidableUI.Components.alert color="info">
          Info -- here is some useful information.
        </VoidableUI.Components.alert>
        <VoidableUI.Components.alert color="notice">
          Notice -- a routine notification for your awareness.
        </VoidableUI.Components.alert>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Filled Variant</h3>
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <VoidableUI.Components.alert variant="filled">
          Default filled alert.
        </VoidableUI.Components.alert>
        <VoidableUI.Components.alert variant="filled" color="error">
          Error filled alert.
        </VoidableUI.Components.alert>
        <VoidableUI.Components.alert variant="filled" color="warning">
          Warning filled alert.
        </VoidableUI.Components.alert>
        <VoidableUI.Components.alert variant="filled" color="success">
          Success filled alert.
        </VoidableUI.Components.alert>
        <VoidableUI.Components.alert variant="filled" color="info">
          Info filled alert.
        </VoidableUI.Components.alert>
        <VoidableUI.Components.alert variant="filled" color="notice">
          Notice filled alert.
        </VoidableUI.Components.alert>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Dismissible</h3>
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <VoidableUI.Components.alert color="info" dismissible>
          This alert can be dismissed. Click the close button.
        </VoidableUI.Components.alert>
        <VoidableUI.Components.alert color="success" dismissible>
          Your changes have been saved successfully.
        </VoidableUI.Components.alert>
        <VoidableUI.Components.alert color="error" dismissible>
          Failed to submit the form. Please try again.
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
        <VoidableUI.Components.tag>Default Tag</VoidableUI.Components.tag>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Colors</h3>
      <div class="showcase-row">
        <VoidableUI.Components.tag>Default</VoidableUI.Components.tag>
        <VoidableUI.Components.tag color="error">Error</VoidableUI.Components.tag>
        <VoidableUI.Components.tag color="warning">Warning</VoidableUI.Components.tag>
        <VoidableUI.Components.tag color="success">Success</VoidableUI.Components.tag>
        <VoidableUI.Components.tag color="info">Info</VoidableUI.Components.tag>
        <VoidableUI.Components.tag color="notice">Notice</VoidableUI.Components.tag>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <div class="showcase-row">
        <VoidableUI.Components.tag size="sm">Small</VoidableUI.Components.tag>
        <VoidableUI.Components.tag>Medium</VoidableUI.Components.tag>
        <VoidableUI.Components.tag size="lg">Large</VoidableUI.Components.tag>
        <VoidableUI.Components.tag size="xl">XL</VoidableUI.Components.tag>
        <VoidableUI.Components.tag size="xxl">XXL</VoidableUI.Components.tag>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Removable</h3>
      <div class="showcase-row">
        <VoidableUI.Components.tag removable>Default</VoidableUI.Components.tag>
        <VoidableUI.Components.tag color="error" removable>Error</VoidableUI.Components.tag>
        <VoidableUI.Components.tag color="warning" removable>Warning</VoidableUI.Components.tag>
        <VoidableUI.Components.tag color="success" removable>Success</VoidableUI.Components.tag>
        <VoidableUI.Components.tag color="info" removable>Info</VoidableUI.Components.tag>
        <VoidableUI.Components.tag color="notice" removable>Notice</VoidableUI.Components.tag>
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
      <VoidableUI.Components.dialog heading="Confirm Action" open>
        <p>Are you sure you want to proceed? This action cannot be undone.</p>
      </VoidableUI.Components.dialog>
    </div>
    <div class="showcase-section">
      <h3>Sizes (code examples)</h3>
      <p>Only one dialog is shown open to avoid overlapping. Available sizes: sm, md, lg, xl.</p>
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

&lt;VoidableUI.Components.dialog heading="Extra Large Dialog" size="xl" open&gt;
  &lt;p&gt;This is an extra large dialog (64rem max-width).&lt;/p&gt;
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
      <VoidableUI.Components.drawer heading="Settings" side="right" open>
        <p>Drawer content goes here. Use drawers for secondary navigation, settings panels, or detail views.</p>
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
        <VoidableUI.Components.popover>
          <VoidableUI.Components.button>Open Popover</VoidableUI.Components.button>
          <div>
            <p style="margin: 0 0 0.5rem;">Popover content</p>
            <p style="margin: 0; opacity: 0.7;">Click outside or press Escape to close.</p>
          </div>
        </VoidableUI.Components.popover>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Positions</h3>
      <div class="showcase-row" style="padding: 6rem; gap: 1.5rem;">
        <VoidableUI.Components.popover position="top">
          <VoidableUI.Components.button>Top</VoidableUI.Components.button>
          <div>Opens above</div>
        </VoidableUI.Components.popover>
        <VoidableUI.Components.popover position="bottom">
          <VoidableUI.Components.button>Bottom</VoidableUI.Components.button>
          <div>Opens below</div>
        </VoidableUI.Components.popover>
        <VoidableUI.Components.popover position="left">
          <VoidableUI.Components.button>Left</VoidableUI.Components.button>
          <div>Opens to the left</div>
        </VoidableUI.Components.popover>
        <VoidableUI.Components.popover position="right">
          <VoidableUI.Components.button>Right</VoidableUI.Components.button>
          <div>Opens to the right</div>
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
        <VoidableUI.Components.toast color="success" heading="Success!" dismissable={false}>
          Your changes have been saved.
        </VoidableUI.Components.toast>
        <VoidableUI.Components.toast color="error" heading="Error" dismissable={false}>
          Something went wrong. Please try again.
        </VoidableUI.Components.toast>
        <VoidableUI.Components.toast color="warning" heading="Warning" dismissable={false}>
          Your session will expire soon.
        </VoidableUI.Components.toast>
        <VoidableUI.Components.toast color="info" dismissable={false}>
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
      <VoidableUI.Components.tabs value="one">
        <VoidableUI.Components.tab_panel tab="one" label="First">
          <p>Content 1</p>
        </VoidableUI.Components.tab_panel>
        <VoidableUI.Components.tab_panel tab="two" label="Second">
          <p>Content 2</p>
        </VoidableUI.Components.tab_panel>
        <VoidableUI.Components.tab_panel tab="three" label="Third">
          <p>Content 3</p>
        </VoidableUI.Components.tab_panel>
      </VoidableUI.Components.tabs>
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <p>Small tabs:</p>
      <VoidableUI.Components.tabs value="a" size="sm">
        <VoidableUI.Components.tab_panel tab="a" label="Alpha">
          <p>Small tab A</p>
        </VoidableUI.Components.tab_panel>
        <VoidableUI.Components.tab_panel tab="b" label="Beta">
          <p>Small tab B</p>
        </VoidableUI.Components.tab_panel>
      </VoidableUI.Components.tabs>
      <p>Medium tabs:</p>
      <VoidableUI.Components.tabs value="a">
        <VoidableUI.Components.tab_panel tab="a" label="Alpha">
          <p>Medium tab A</p>
        </VoidableUI.Components.tab_panel>
        <VoidableUI.Components.tab_panel tab="b" label="Beta">
          <p>Medium tab B</p>
        </VoidableUI.Components.tab_panel>
      </VoidableUI.Components.tabs>
      <p>Large tabs:</p>
      <VoidableUI.Components.tabs value="a" size="lg">
        <VoidableUI.Components.tab_panel tab="a" label="Alpha">
          <p>Large tab A</p>
        </VoidableUI.Components.tab_panel>
        <VoidableUI.Components.tab_panel tab="b" label="Beta">
          <p>Large tab B</p>
        </VoidableUI.Components.tab_panel>
      </VoidableUI.Components.tabs>
    </div>
    <div class="showcase-section">
      <h3>With Rich Content</h3>
      <VoidableUI.Components.tabs value="overview">
        <VoidableUI.Components.tab_panel tab="overview" label="Overview">
          <p>This is the overview panel with some content about the component.</p>
        </VoidableUI.Components.tab_panel>
        <VoidableUI.Components.tab_panel tab="api" label="API">
          <p>API reference documentation goes here.</p>
        </VoidableUI.Components.tab_panel>
        <VoidableUI.Components.tab_panel tab="examples" label="Examples">
          <p>Code examples and usage patterns are shown here.</p>
        </VoidableUI.Components.tab_panel>
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
        <VoidableUI.Components.accordion_item heading="What is Voidable UI?" open>
          <p style="margin: 0;">Voidable UI is a design system built with Lit web components. It uses Light DOM for seamless CSS integration.</p>
        </VoidableUI.Components.accordion_item>
        <VoidableUI.Components.accordion_item heading="How do I install it?">
          <p style="margin: 0 0 8px;">Install via npm:</p>
          <code>npm install @voidable/ui @voidable/theme</code>
        </VoidableUI.Components.accordion_item>
        <VoidableUI.Components.accordion_item heading="Is it accessible?">
          <p style="margin: 0;">Yes. All components use proper ARIA attributes, keyboard navigation, and focus management.</p>
        </VoidableUI.Components.accordion_item>
      </VoidableUI.Components.accordion>
    </div>
    <div class="showcase-section">
      <h3>Multiple Open (with multiple attribute)</h3>
      <VoidableUI.Components.accordion multiple>
        <VoidableUI.Components.accordion_item heading="Section A" open>
          Content for section A. Multiple sections can be open at once.
        </VoidableUI.Components.accordion_item>
        <VoidableUI.Components.accordion_item heading="Section B" open>
          Content for section B. This is also open simultaneously.
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
      <VoidableUI.Components.pagination total={20} value={6} />
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <p>Small:</p>
      <VoidableUI.Components.pagination total={20} value={6} size="sm" />
      <p>Medium:</p>
      <VoidableUI.Components.pagination total={20} value={6} />
      <p>Large:</p>
      <VoidableUI.Components.pagination total={20} value={6} size="lg" />
    </div>
    <div class="showcase-section">
      <h3>Few Pages</h3>
      <VoidableUI.Components.pagination total={5} value={3} />
    </div>
    <div class="showcase-section">
      <h3>Wide Siblings</h3>
      <VoidableUI.Components.pagination total={20} value={10} siblings={3} />
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
        <VoidableUI.Components.hamburger />
      </div>
    </div>
    <div class="showcase-section">
      <h3>Active</h3>
      <div class="showcase-row">
        <VoidableUI.Components.hamburger active />
      </div>
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <div class="showcase-row">
        <VoidableUI.Components.hamburger size="sm" />
        <VoidableUI.Components.hamburger />
        <VoidableUI.Components.hamburger size="lg" />
      </div>
    </div>
    <div class="showcase-section">
      <h3>Sizes (Active)</h3>
      <div class="showcase-row">
        <VoidableUI.Components.hamburger size="sm" active />
        <VoidableUI.Components.hamburger active />
        <VoidableUI.Components.hamburger size="lg" active />
      </div>
    </div>
    """
  end
end
