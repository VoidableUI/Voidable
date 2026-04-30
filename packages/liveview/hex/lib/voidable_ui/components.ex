defmodule VoidableUI.Components do
  @moduledoc """
  HEEx function components for all Voidable web components.

  Each function component renders the corresponding `<void-*>` custom element tag.
  Interactive components include `phx-hook="VoidEvent"` and `data-void-events`
  attributes to bridge CustomEvents to LiveView's `pushEvent`.
  """

  use Phoenix.Component

  # ---------------------------------------------------------------------------
  # Badge (static)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-badge>` status badge."
  attr :color, :string, default: nil

  attr :size, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def badge(assigns) do
    ~H"""
    <void-badge color={@color} size={@size} {@rest}>
      {render_slot(@inner_block)}
    </void-badge>
    """
  end

  # ---------------------------------------------------------------------------
  # Button (interactive — void-click)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-button>` element."
  attr :variant, :string, default: nil
  attr :color, :string, default: nil
  attr :disabled, :boolean, default: false
  attr :type, :string, default: nil
  attr :size, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def button(assigns) do
    ~H"""
    <void-button
      variant={@variant}
      color={@color}
      disabled={@disabled}
      type={@type}
      size={@size}
      phx-hook="VoidEvent"
      data-void-events="void-click"
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-button>
    """
  end

  # ---------------------------------------------------------------------------
  # Divider (static)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-divider>` separator."
  attr :label, :string, default: nil
  attr :orientation, :string, default: nil
  attr :rest, :global

  def divider(assigns) do
    ~H"""
    <void-divider label={@label} orientation={@orientation} {@rest} />
    """
  end

  # ---------------------------------------------------------------------------
  # Spinner (static)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-spinner>` loading indicator."
  attr :size, :string, default: nil
  attr :label, :string, default: nil
  attr :rest, :global

  def spinner(assigns) do
    ~H"""
    <void-spinner size={@size} label={@label} {@rest} />
    """
  end

  # ---------------------------------------------------------------------------
  # Skeleton (static)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-skeleton>` placeholder."
  attr :variant, :string, default: nil
  attr :rest, :global

  def skeleton(assigns) do
    ~H"""
    <void-skeleton variant={@variant} {@rest} />
    """
  end

  # ---------------------------------------------------------------------------
  # StatusDot (static)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-status-dot>` indicator."
  attr :status, :string, default: nil
  attr :rest, :global

  def status_dot(assigns) do
    ~H"""
    <void-status-dot status={@status} {@rest} />
    """
  end

  # ---------------------------------------------------------------------------
  # Switch (interactive — void-change)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-switch>` toggle."
  attr :checked, :boolean, default: false
  attr :disabled, :boolean, default: false
  attr :color, :string, default: nil
  attr :size, :string, default: nil
  attr :rest, :global

  def switch(assigns) do
    ~H"""
    <void-switch
      checked={@checked}
      disabled={@disabled}
      color={@color}
      size={@size}
      phx-hook="VoidEvent"
      data-void-events="void-change"
      {@rest}
    />
    """
  end

  # ---------------------------------------------------------------------------
  # Avatar (static)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-avatar>` user avatar."
  attr :src, :string, default: nil
  attr :alt, :string, default: nil
  attr :initials, :string, default: nil
  attr :size, :string, default: nil
  attr :rest, :global

  def avatar(assigns) do
    ~H"""
    <void-avatar src={@src} alt={@alt} initials={@initials} size={@size} {@rest} />
    """
  end

  # ---------------------------------------------------------------------------
  # Alert (interactive — void-dismiss when dismissible)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-alert>` message."
  attr :color, :string, default: nil
  attr :dismissible, :boolean, default: false
  attr :variant, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def alert(assigns) do
    ~H"""
    <void-alert
      color={@color}
      dismissible={@dismissible}
      variant={@variant}
      phx-hook="VoidEvent"
      data-void-events="void-dismiss"
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-alert>
    """
  end

  # ---------------------------------------------------------------------------
  # Tag (interactive when removable — void-remove)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-tag>` label."
  attr :color, :string, default: nil
  attr :removable, :boolean, default: false
  attr :size, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def tag(assigns) do
    ~H"""
    <void-tag
      color={@color}
      removable={@removable}
      size={@size}
      phx-hook="VoidEvent"
      data-void-events="void-remove"
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-tag>
    """
  end

  # ---------------------------------------------------------------------------
  # Progress (static)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-progress>` bar."
  attr :value, :integer, default: nil
  attr :max, :integer, default: nil
  attr :color, :string, default: nil
  attr :size, :string, default: nil
  attr :indeterminate, :boolean, default: false
  attr :rest, :global

  def progress(assigns) do
    ~H"""
    <void-progress
      value={@value}
      max={@max}
      color={@color}
      size={@size}
      indeterminate={@indeterminate}
      {@rest}
    />
    """
  end

  # ---------------------------------------------------------------------------
  # Panel (static)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-panel>` container."
  attr :label, :string, default: nil
  attr :variant, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def panel(assigns) do
    ~H"""
    <void-panel label={@label} variant={@variant} {@rest}>
      {render_slot(@inner_block)}
    </void-panel>
    """
  end

  # ---------------------------------------------------------------------------
  # Input (interactive — void-input, void-change)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-input>` text field."
  attr :type, :string, default: nil
  attr :value, :string, default: nil
  attr :placeholder, :string, default: nil
  attr :disabled, :boolean, default: false
  attr :readonly, :boolean, default: false
  attr :required, :boolean, default: false
  attr :name, :string, default: nil
  attr :size, :string, default: nil
  attr :error, :string, default: nil
  attr :rest, :global

  def input(assigns) do
    ~H"""
    <void-input
      type={@type}
      value={@value}
      placeholder={@placeholder}
      disabled={@disabled}
      readonly={@readonly}
      required={@required}
      name={@name}
      size={@size}
      error={@error}
      phx-hook="VoidEvent"
      data-void-events="void-input,void-change"
      {@rest}
    />
    """
  end

  # ---------------------------------------------------------------------------
  # Textarea (interactive — void-input, void-change)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-textarea>` multi-line text field."
  attr :value, :string, default: nil
  attr :placeholder, :string, default: nil
  attr :disabled, :boolean, default: false
  attr :readonly, :boolean, default: false
  attr :required, :boolean, default: false
  attr :name, :string, default: nil
  attr :rows, :integer, default: nil
  attr :resize, :string, default: nil
  attr :size, :string, default: nil
  attr :error, :string, default: nil
  attr :rest, :global

  def textarea(assigns) do
    ~H"""
    <void-textarea
      value={@value}
      placeholder={@placeholder}
      disabled={@disabled}
      readonly={@readonly}
      required={@required}
      name={@name}
      rows={@rows}
      resize={@resize}
      size={@size}
      error={@error}
      phx-hook="VoidEvent"
      data-void-events="void-input,void-change"
      {@rest}
    />
    """
  end

  # ---------------------------------------------------------------------------
  # Select (interactive — void-change)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-select>` dropdown."
  attr :value, :string, default: nil
  attr :disabled, :boolean, default: false
  attr :required, :boolean, default: false
  attr :name, :string, default: nil
  attr :size, :string, default: nil
  attr :error, :string, default: nil
  attr :placeholder, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def select(assigns) do
    ~H"""
    <void-select
      value={@value}
      disabled={@disabled}
      required={@required}
      name={@name}
      size={@size}
      error={@error}
      placeholder={@placeholder}
      phx-hook="VoidEvent"
      data-void-events="void-change"
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-select>
    """
  end

  # ---------------------------------------------------------------------------
  # Checkbox (interactive — void-change)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-checkbox>` toggle."
  attr :checked, :boolean, default: false
  attr :disabled, :boolean, default: false
  attr :indeterminate, :boolean, default: false
  attr :name, :string, default: nil
  attr :value, :string, default: nil
  attr :color, :string, default: nil
  attr :size, :string, default: nil
  attr :rest, :global
  slot :inner_block

  def checkbox(assigns) do
    ~H"""
    <void-checkbox
      checked={@checked}
      disabled={@disabled}
      indeterminate={@indeterminate}
      name={@name}
      value={@value}
      color={@color}
      size={@size}
      phx-hook="VoidEvent"
      data-void-events="void-change"
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-checkbox>
    """
  end

  # ---------------------------------------------------------------------------
  # Radio (interactive — void-change)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-radio>` button."
  attr :checked, :boolean, default: false
  attr :disabled, :boolean, default: false
  attr :name, :string, default: nil
  attr :value, :string, default: nil
  attr :color, :string, default: nil
  attr :size, :string, default: nil
  attr :rest, :global
  slot :inner_block

  def radio(assigns) do
    ~H"""
    <void-radio
      checked={@checked}
      disabled={@disabled}
      name={@name}
      value={@value}
      color={@color}
      size={@size}
      phx-hook="VoidEvent"
      data-void-events="void-change"
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-radio>
    """
  end

  # ---------------------------------------------------------------------------
  # RadioGroup (interactive — void-change)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-radio-group>` container."
  attr :label, :string, default: nil
  attr :value, :string, default: nil
  attr :name, :string, default: nil
  attr :orientation, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def radio_group(assigns) do
    ~H"""
    <void-radio-group
      label={@label}
      value={@value}
      name={@name}
      orientation={@orientation}
      phx-hook="VoidEvent"
      data-void-events="void-change"
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-radio-group>
    """
  end

  # ---------------------------------------------------------------------------
  # Field (wraps interactive children)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-field>` form field wrapper."
  attr :label, :string, default: nil
  attr :error, :string, default: nil
  attr :helper, :string, default: nil
  attr :required, :boolean, default: false
  attr :rest, :global
  slot :inner_block, required: true

  def field(assigns) do
    ~H"""
    <void-field
      label={@label}
      error={@error}
      helper={@helper}
      required={@required}
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-field>
    """
  end

  # ---------------------------------------------------------------------------
  # Option (static — child of multiselect/combobox)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-option>` inside a multiselect or combobox."
  attr :value, :string, required: true
  attr :selected, :boolean, default: false
  attr :rest, :global
  slot :inner_block, required: true

  def option(assigns) do
    ~H"""
    <void-option value={@value} selected={@selected} {@rest}>
      {render_slot(@inner_block)}
    </void-option>
    """
  end

  # ---------------------------------------------------------------------------
  # Multiselect (interactive — void-change)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-multiselect>` multi-value dropdown."
  attr :placeholder, :string, default: nil
  attr :disabled, :boolean, default: false
  attr :size, :string, default: nil
  attr :error, :string, default: nil
  attr :name, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def multiselect(assigns) do
    ~H"""
    <void-multiselect
      placeholder={@placeholder}
      disabled={@disabled}
      size={@size}
      error={@error}
      name={@name}
      phx-hook="VoidEvent"
      data-void-events="void-change"
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-multiselect>
    """
  end

  # ---------------------------------------------------------------------------
  # Dialog (interactive — void-close)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-dialog>` modal."
  attr :open, :boolean, default: false
  attr :heading, :string, default: nil
  attr :size, :string, default: nil
  attr :closable, :boolean, default: true
  attr :rest, :global
  slot :inner_block, required: true

  def dialog(assigns) do
    ~H"""
    <void-dialog
      open={@open}
      heading={@heading}
      size={@size}
      closable={@closable}
      phx-hook="VoidEvent"
      data-void-events="void-close"
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-dialog>
    """
  end

  # ---------------------------------------------------------------------------
  # Tabs (interactive — void-change)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-tabs>` tab container."
  attr :value, :string, default: nil
  attr :size, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def tabs(assigns) do
    ~H"""
    <void-tabs
      value={@value}
      size={@size}
      phx-hook="VoidEvent"
      data-void-events="void-change"
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-tabs>
    """
  end

  # ---------------------------------------------------------------------------
  # TabPanel (static)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-tab-panel>` inside tabs."
  attr :tab, :string, required: true
  attr :label, :string, default: nil
  attr :active, :boolean, default: false
  attr :rest, :global
  slot :inner_block, required: true

  def tab_panel(assigns) do
    ~H"""
    <void-tab-panel tab={@tab} label={@label} active={@active} {@rest}>
      {render_slot(@inner_block)}
    </void-tab-panel>
    """
  end

  # ---------------------------------------------------------------------------
  # Accordion (static — parent container)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-accordion>` container."
  attr :multiple, :boolean, default: false
  attr :rest, :global
  slot :inner_block, required: true

  def accordion(assigns) do
    ~H"""
    <void-accordion multiple={@multiple} {@rest}>
      {render_slot(@inner_block)}
    </void-accordion>
    """
  end

  # ---------------------------------------------------------------------------
  # AccordionItem (interactive — void-toggle)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-accordion-item>` collapsible section."
  attr :heading, :string, default: nil
  attr :open, :boolean, default: false
  attr :rest, :global
  slot :inner_block, required: true

  def accordion_item(assigns) do
    ~H"""
    <void-accordion-item
      heading={@heading}
      open={@open}
      phx-hook="VoidEvent"
      data-void-events="void-toggle"
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-accordion-item>
    """
  end

  # ---------------------------------------------------------------------------
  # Breadcrumbs (static)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-breadcrumbs>` navigation trail."
  attr :separator, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def breadcrumbs(assigns) do
    ~H"""
    <void-breadcrumbs separator={@separator} {@rest}>
      {render_slot(@inner_block)}
    </void-breadcrumbs>
    """
  end

  # ---------------------------------------------------------------------------
  # List (static)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-list>` container."
  attr :dividers, :boolean, default: false
  attr :rest, :global
  slot :inner_block, required: true

  def list(assigns) do
    ~H"""
    <void-list dividers={@dividers} {@rest}>
      {render_slot(@inner_block)}
    </void-list>
    """
  end

  # ---------------------------------------------------------------------------
  # ListItem (static)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-list-item>` element."
  attr :selected, :boolean, default: false
  attr :disabled, :boolean, default: false
  attr :interactive, :boolean, default: false
  attr :rest, :global
  slot :inner_block, required: true

  def list_item(assigns) do
    ~H"""
    <void-list-item
      selected={@selected}
      disabled={@disabled}
      interactive={@interactive}
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-list-item>
    """
  end

  # ---------------------------------------------------------------------------
  # Toast (interactive — void-close)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-toast>` notification."
  attr :color, :string, default: nil
  attr :duration, :integer, default: nil
  attr :dismissable, :boolean, default: true
  attr :heading, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def toast(assigns) do
    ~H"""
    <void-toast
      color={@color}
      duration={@duration}
      dismissable={@dismissable}
      heading={@heading}
      phx-hook="VoidEvent"
      data-void-events="void-close"
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-toast>
    """
  end

  # ---------------------------------------------------------------------------
  # ToastContainer (static — programmatic)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-toast-container>` positioning wrapper."
  attr :position, :string, default: nil

  attr :rest, :global
  slot :inner_block

  def toast_container(assigns) do
    ~H"""
    <void-toast-container position={@position} {@rest}>
      {render_slot(@inner_block)}
    </void-toast-container>
    """
  end

  # ---------------------------------------------------------------------------
  # Stepper (static)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-stepper>` progress indicator."
  attr :value, :integer, default: nil
  attr :steps, :string, default: nil
  attr :rest, :global

  def stepper(assigns) do
    ~H"""
    <void-stepper value={@value} steps={@steps} {@rest} />
    """
  end

  # ---------------------------------------------------------------------------
  # Drawer (interactive — void-close)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-drawer>` slide-out panel."
  attr :open, :boolean, default: false
  attr :side, :string, default: nil
  attr :size, :string, default: nil
  attr :heading, :string, default: nil
  attr :closable, :boolean, default: true
  attr :rest, :global
  slot :inner_block, required: true

  def drawer(assigns) do
    ~H"""
    <void-drawer
      open={@open}
      side={@side}
      size={@size}
      heading={@heading}
      closable={@closable}
      phx-hook="VoidEvent"
      data-void-events="void-close"
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-drawer>
    """
  end

  # ---------------------------------------------------------------------------
  # Card (static)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-card>` container."
  attr :heading, :string, default: nil
  attr :variant, :string, default: nil
  attr :padding, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def card(assigns) do
    ~H"""
    <void-card heading={@heading} variant={@variant} padding={@padding} {@rest}>
      {render_slot(@inner_block)}
    </void-card>
    """
  end

  # ---------------------------------------------------------------------------
  # Popover (interactive — void-close)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-popover>` floating panel."
  attr :open, :boolean, default: false
  attr :position, :string, default: nil
  attr :trigger, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def popover(assigns) do
    ~H"""
    <void-popover
      open={@open}
      position={@position}
      trigger={@trigger}
      phx-hook="VoidEvent"
      data-void-events="void-close"
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-popover>
    """
  end

  # ---------------------------------------------------------------------------
  # Tooltip (static — hover-based, no server events)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-tooltip>` hover tip."
  attr :text, :string, default: nil
  attr :position, :string, default: nil
  attr :delay, :integer, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def tooltip(assigns) do
    ~H"""
    <void-tooltip text={@text} position={@position} delay={@delay} {@rest}>
      {render_slot(@inner_block)}
    </void-tooltip>
    """
  end

  # ---------------------------------------------------------------------------
  # Banner (static)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-banner>` announcement."
  attr :color, :string, default: nil
  attr :dismissable, :boolean, default: false
  attr :variant, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def banner(assigns) do
    ~H"""
    <void-banner
      color={@color}
      dismissable={@dismissable}
      variant={@variant}
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-banner>
    """
  end

  # ---------------------------------------------------------------------------
  # ScrollArea (static)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-scroll-area>` scrollable container."
  attr :max_height, :string, default: nil
  attr :direction, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def scroll_area(assigns) do
    ~H"""
    <void-scroll-area maxHeight={@max_height} direction={@direction} {@rest}>
      {render_slot(@inner_block)}
    </void-scroll-area>
    """
  end

  # ---------------------------------------------------------------------------
  # Table (static)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-table>` wrapper."
  attr :striped, :boolean, default: false
  attr :hoverable, :boolean, default: false
  attr :compact, :boolean, default: false
  attr :bordered, :boolean, default: false
  attr :rest, :global
  slot :inner_block, required: true

  def table(assigns) do
    ~H"""
    <void-table
      striped={@striped}
      hoverable={@hoverable}
      compact={@compact}
      bordered={@bordered}
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-table>
    """
  end

  # ---------------------------------------------------------------------------
  # Pagination (interactive — void-change)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-pagination>` page navigator."
  attr :total, :integer, default: nil
  attr :value, :integer, default: nil
  attr :siblings, :integer, default: nil
  attr :size, :string, default: nil
  attr :rest, :global

  def pagination(assigns) do
    ~H"""
    <void-pagination
      total={@total}
      value={@value}
      siblings={@siblings}
      size={@size}
      phx-hook="VoidEvent"
      data-void-events="void-change"
      {@rest}
    />
    """
  end

  # ---------------------------------------------------------------------------
  # ErrorFallback (static)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-error-fallback>` error display."
  attr :heading, :string, default: nil
  attr :message, :string, default: nil
  attr :retryable, :boolean, default: false
  attr :retry_label, :string, default: nil
  attr :icon, :boolean, default: true
  attr :rest, :global

  def error_fallback(assigns) do
    ~H"""
    <void-error-fallback
      heading={@heading}
      message={@message}
      retryable={@retryable}
      retryLabel={@retry_label}
      icon={@icon}
      {@rest}
    />
    """
  end

  # ---------------------------------------------------------------------------
  # CheckboxGroup (interactive — void-change)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-checkbox-group>` container."
  attr :label, :string, default: nil
  attr :orientation, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def checkbox_group(assigns) do
    ~H"""
    <void-checkbox-group
      label={@label}
      orientation={@orientation}
      phx-hook="VoidEvent"
      data-void-events="void-change"
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-checkbox-group>
    """
  end

  # ---------------------------------------------------------------------------
  # Combobox (interactive — void-change)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-combobox>` searchable dropdown."
  attr :value, :string, default: nil
  attr :placeholder, :string, default: nil
  attr :disabled, :boolean, default: false
  attr :size, :string, default: nil
  attr :error, :string, default: nil
  attr :name, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def combobox(assigns) do
    ~H"""
    <void-combobox
      value={@value}
      placeholder={@placeholder}
      disabled={@disabled}
      size={@size}
      error={@error}
      name={@name}
      phx-hook="VoidEvent"
      data-void-events="void-change"
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-combobox>
    """
  end

  # ---------------------------------------------------------------------------
  # Slider (interactive — void-input, void-change)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-slider>` range input."
  attr :value, :integer, default: nil
  attr :min, :integer, default: nil
  attr :max, :integer, default: nil
  attr :step, :integer, default: nil
  attr :disabled, :boolean, default: false
  attr :name, :string, default: nil
  attr :show_value, :boolean, default: false
  attr :size, :string, default: nil
  attr :rest, :global

  def slider(assigns) do
    ~H"""
    <void-slider
      value={@value}
      min={@min}
      max={@max}
      step={@step}
      disabled={@disabled}
      name={@name}
      showValue={@show_value}
      size={@size}
      phx-hook="VoidEvent"
      data-void-events="void-input,void-change"
      {@rest}
    />
    """
  end

  # ---------------------------------------------------------------------------
  # FileUpload (interactive — void-change)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-file-upload>` drop zone."
  attr :accept, :string, default: nil
  attr :multiple, :boolean, default: false
  attr :disabled, :boolean, default: false
  attr :max_size, :integer, default: nil
  attr :error, :string, default: nil
  attr :rest, :global

  def file_upload(assigns) do
    ~H"""
    <void-file-upload
      accept={@accept}
      multiple={@multiple}
      disabled={@disabled}
      maxSize={@max_size}
      error={@error}
      phx-hook="VoidEvent"
      data-void-events="void-change"
      {@rest}
    />
    """
  end

  # ---------------------------------------------------------------------------
  # NavBar (static)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-nav-bar>` navigation bar."
  attr :sticky, :boolean, default: false
  attr :bordered, :boolean, default: true
  attr :variant, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def nav_bar(assigns) do
    ~H"""
    <void-nav-bar sticky={@sticky} bordered={@bordered} variant={@variant} {@rest}>
      {render_slot(@inner_block)}
    </void-nav-bar>
    """
  end

  # ---------------------------------------------------------------------------
  # Hamburger (interactive — void-toggle)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-hamburger>` menu toggle."
  attr :active, :boolean, default: false
  attr :size, :string, default: nil
  attr :rest, :global

  def hamburger(assigns) do
    ~H"""
    <void-hamburger
      active={@active}
      size={@size}
      phx-hook="VoidEvent"
      data-void-events="void-toggle"
      {@rest}
    />
    """
  end

  # ---------------------------------------------------------------------------
  # ComposeInput (interactive — void-input, void-submit)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-compose-input>` chat-style input."
  attr :value, :string, default: nil
  attr :placeholder, :string, default: nil
  attr :disabled, :boolean, default: false
  attr :maxlength, :integer, default: nil
  attr :rest, :global

  def compose_input(assigns) do
    ~H"""
    <void-compose-input
      value={@value}
      placeholder={@placeholder}
      disabled={@disabled}
      maxlength={@maxlength}
      phx-hook="VoidEvent"
      data-void-events="void-input,void-submit"
      {@rest}
    />
    """
  end
end
