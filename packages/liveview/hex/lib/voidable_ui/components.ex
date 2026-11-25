defmodule VoidableUI.Components do
  @moduledoc """
  HEEx function components for all Voidable web components.

  Each function component renders the corresponding `<void-*>` custom element tag.
  Interactive components include `phx-hook="VoidEvent"` and `data-void-events`
  attributes to bridge CustomEvents to LiveView's `pushEvent`.

  ## Ids

  `phx-hook` needs a stable DOM id. When you do not pass `id`, one is derived
  from the component kind, its `name` and its `phx-*` attributes, so it stays
  the same across re-renders. Pass an explicit `id` when you render several
  otherwise identical anonymous components on one page.

  ## `phx-update="ignore"`

  Many Voidable components move their light-DOM children into Lit-rendered
  wrappers, which a LiveView patch can disturb. `phx-update="ignore"` protects
  that structure, but LiveView then also skips every non-`data-*` attribute
  update and all child updates for that element. Because that would block
  legitimate server updates (`open`, `value`, `error`, dynamic options or menu
  items), it is **not** applied automatically. Opt in per element, with a
  stable id, where the server renders the element once and the client owns it
  afterwards, for example a `select` with static options:

      <.select id="country" name="country" phx-update="ignore">
        <option value="de">Germany</option>
      </.select>

  Good candidates: `select`, `multiselect`, `dropdown_menu`, `menu`, `popover`,
  `hover_card`, `tooltip`, `carousel`, `accordion_item` and `collapsible`
  *when their content is static*. Avoid it on `dialog`/`drawer` (the server
  drives `open`), `input`, `checkbox`, `switch` and other value-bound controls.

  ## Booleans that default to true

  Every boolean that defaults to true in the core component (`closable` on
  `dialog` and `drawer`, `dismissable` on `toast`, `bordered` on `nav_bar`,
  `controls` and `indicators` on `carousel`, `show_input` on `color_picker`,
  `icon` on `error_fallback`) renders as `"true"` or `"false"`. The core
  component reads the string `"false"` as false, so the server can turn the
  attribute off and back on with an ordinary attribute patch.
  """

  use Phoenix.Component

  # Stable id for components that need one (`phx-hook` requires an id).
  #
  # The id is derived from the component kind, its `name` and its `phx-*` /
  # `data-testid` attributes, so it is identical on every re-render of the same
  # element (a fresh id would make LiveView replace the node and re-mount its
  # hook). Pass an explicit `id` when rendering several otherwise identical
  # anonymous components on one page.
  defp auto_id(prefix, seed) do
    {name, rest} =
      case seed do
        {name, rest} -> {name, rest}
        rest -> {nil, rest}
      end

    identity =
      rest
      |> Enum.filter(fn {key, _} ->
        key = to_string(key)
        String.starts_with?(key, "phx-") or key == "data-testid"
      end)
      |> Enum.map(fn {key, value} -> {to_string(key), value} end)
      |> Enum.sort()

    "#{prefix}-#{:erlang.phash2({prefix, name, identity})}"
  end

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
  attr :id, :string, default: nil
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
      id={@id || auto_id("void-button", @rest)}
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
  attr :id, :string, default: nil
  attr :checked, :boolean, default: false
  attr :disabled, :boolean, default: false
  attr :color, :string, default: nil
  attr :size, :string, default: nil
  attr :rest, :global

  def switch(assigns) do
    ~H"""
    <void-switch
      id={@id || auto_id("void-switch", @rest)}
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
  attr :id, :string, default: nil
  attr :color, :string, default: nil
  attr :dismissible, :boolean, default: false
  attr :variant, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def alert(assigns) do
    ~H"""
    <void-alert
      id={@id || auto_id("void-alert", @rest)}
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
  attr :id, :string, default: nil
  attr :color, :string, default: nil
  attr :removable, :boolean, default: false
  attr :size, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def tag(assigns) do
    ~H"""
    <void-tag
      id={@id || auto_id("void-tag", @rest)}
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
  attr :id, :string, default: nil
  attr :type, :string, default: nil
  attr :value, :string, default: nil
  attr :placeholder, :string, default: nil
  attr :disabled, :boolean, default: false
  attr :readonly, :boolean, default: false
  attr :required, :boolean, default: false
  attr :name, :string, default: nil
  attr :size, :string, default: nil
  attr :error, :string, default: nil
  attr :autocomplete, :string, default: nil
  attr :minlength, :integer, default: nil
  attr :maxlength, :integer, default: nil
  attr :pattern, :string, default: nil
  attr :rest, :global, include: ~w(inputmode enterkeyhint autocapitalize spellcheck)

  def input(assigns) do
    ~H"""
    <void-input
      id={@id || auto_id("void-input", {@name, @rest})}
      type={@type}
      value={@value}
      placeholder={@placeholder}
      disabled={@disabled}
      readonly={@readonly}
      required={@required}
      name={@name}
      size={@size}
      error={@error}
      autocomplete={@autocomplete}
      minlength={@minlength}
      maxlength={@maxlength}
      pattern={@pattern}
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
  attr :id, :string, default: nil
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
  attr :autocomplete, :string, default: nil
  attr :minlength, :integer, default: nil
  attr :maxlength, :integer, default: nil
  attr :rest, :global, include: ~w(inputmode enterkeyhint autocapitalize spellcheck)

  def textarea(assigns) do
    ~H"""
    <void-textarea
      id={@id || auto_id("void-textarea", {@name, @rest})}
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
      autocomplete={@autocomplete}
      minlength={@minlength}
      maxlength={@maxlength}
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
  attr :id, :string, default: nil
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
      id={@id || auto_id("void-select", {@name, @rest})}
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
  attr :id, :string, default: nil
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
      id={@id || auto_id("void-checkbox", {@name, @rest})}
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
  attr :id, :string, default: nil
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
      id={@id || auto_id("void-radio", {@name, @rest})}
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
  attr :id, :string, default: nil
  attr :label, :string, default: nil
  attr :value, :string, default: nil
  attr :name, :string, default: nil
  attr :orientation, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def radio_group(assigns) do
    ~H"""
    <void-radio-group
      id={@id || auto_id("void-radio-group", {@name, @rest})}
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
  attr :disabled, :boolean, default: false
  attr :rest, :global
  slot :inner_block, required: true

  def option(assigns) do
    ~H"""
    <void-option value={@value} selected={@selected} disabled={@disabled} {@rest}>
      {render_slot(@inner_block)}
    </void-option>
    """
  end

  # ---------------------------------------------------------------------------
  # Multiselect (interactive — void-change)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-multiselect>` multi-value dropdown."
  attr :id, :string, default: nil
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
      id={@id || auto_id("void-multiselect", {@name, @rest})}
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
  attr :id, :string, default: nil
  attr :open, :boolean, default: false
  attr :heading, :string, default: nil
  attr :size, :string, default: nil
  attr :closable, :boolean, default: true
  attr :rest, :global
  slot :inner_block, required: true

  def dialog(assigns) do
    ~H"""
    <void-dialog
      id={@id || auto_id("void-dialog", @rest)}
      open={@open}
      heading={@heading}
      size={@size}
      closable={to_string(@closable)}
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
  attr :id, :string, default: nil
  attr :value, :string, default: nil
  attr :size, :string, default: nil
  attr :activation, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def tabs(assigns) do
    ~H"""
    <void-tabs
      id={@id || auto_id("void-tabs", @rest)}
      value={@value}
      size={@size}
      activation={@activation}
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
  attr :disabled, :boolean, default: false
  attr :rest, :global
  slot :inner_block, required: true

  def tab_panel(assigns) do
    ~H"""
    <void-tab-panel tab={@tab} label={@label} active={@active} disabled={@disabled} {@rest}>
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
  attr :id, :string, default: nil
  attr :heading, :string, default: nil
  attr :open, :boolean, default: false
  attr :rest, :global
  slot :inner_block, required: true

  def accordion_item(assigns) do
    ~H"""
    <void-accordion-item
      id={@id || auto_id("void-accordion-item", @rest)}
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
  attr :id, :string, default: nil
  attr :color, :string, default: nil
  attr :duration, :integer, default: nil
  attr :dismissable, :boolean, default: true
  attr :heading, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def toast(assigns) do
    ~H"""
    <void-toast
      id={@id || auto_id("void-toast", @rest)}
      color={@color}
      duration={@duration}
      dismissable={to_string(@dismissable)}
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
  attr :id, :string, default: nil
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
      id={@id || auto_id("void-drawer", @rest)}
      open={@open}
      side={@side}
      size={@size}
      heading={@heading}
      closable={to_string(@closable)}
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
  attr :id, :string, default: nil
  attr :open, :boolean, default: false
  attr :position, :string, default: nil
  attr :trigger, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def popover(assigns) do
    ~H"""
    <void-popover
      id={@id || auto_id("void-popover", @rest)}
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
    <void-scroll-area max-height={@max_height} direction={@direction} {@rest}>
      {render_slot(@inner_block)}
    </void-scroll-area>
    """
  end

  # ---------------------------------------------------------------------------
  # Table (static)
  # ---------------------------------------------------------------------------

  @doc """
  Renders a `<void-table>` around a native `<table>`.

  `stack` stacks each row into label and value pairs while the table's container is narrow:
  `stack={true}` uses the theme's breakpoint, a CSS length (`stack="48rem"`) sets this table's,
  `stack="always"` stacks at every width. Put `data-stack="title"`, `"select"`, `"actions"` or
  `"hide"` on a header cell to set the role of its column in the stacked block. The label of each
  value is the header text; nothing is repeated on the cells.

  `scrollable` makes the table a horizontal scroll region that is focusable and labelled while it
  overflows (`label`, else the `<caption>`); `max_height` adds vertical scrolling for
  `sticky_header`, and `sticky_column` keeps the first column in view. `inset` is for a table
  inside a card or panel.
  """
  attr :striped, :boolean, default: false
  attr :hoverable, :boolean, default: false
  attr :compact, :boolean, default: false
  attr :bordered, :boolean, default: false
  attr :inset, :boolean, default: false
  attr :stack, :any, default: nil, doc: "`true`, a CSS length or `\"always\"`"
  attr :scrollable, :boolean, default: false
  attr :sticky_header, :boolean, default: false
  attr :sticky_column, :boolean, default: false
  attr :max_height, :string, default: nil
  attr :label, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def table(assigns) do
    ~H"""
    <void-table
      striped={@striped}
      hoverable={@hoverable}
      compact={@compact}
      bordered={@bordered}
      inset={@inset}
      stack={@stack}
      scrollable={@scrollable}
      sticky-header={@sticky_header}
      sticky-column={@sticky_column}
      max-height={@max_height}
      label={@label}
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
  attr :id, :string, default: nil
  attr :total, :integer, default: nil
  attr :value, :integer, default: nil
  attr :siblings, :integer, default: nil
  attr :size, :string, default: nil
  attr :rest, :global

  def pagination(assigns) do
    ~H"""
    <void-pagination
      id={@id || auto_id("void-pagination", @rest)}
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
      retry-label={@retry_label}
      icon={to_string(@icon)}
      {@rest}
    />
    """
  end

  # ---------------------------------------------------------------------------
  # CheckboxGroup (interactive — void-change)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-checkbox-group>` container."
  attr :id, :string, default: nil
  attr :label, :string, default: nil
  attr :orientation, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def checkbox_group(assigns) do
    ~H"""
    <void-checkbox-group
      id={@id || auto_id("void-checkbox-group", @rest)}
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
  attr :id, :string, default: nil
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
      id={@id || auto_id("void-combobox", {@name, @rest})}
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
  attr :id, :string, default: nil
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
      id={@id || auto_id("void-slider", {@name, @rest})}
      value={@value}
      min={@min}
      max={@max}
      step={@step}
      disabled={@disabled}
      name={@name}
      show-value={@show_value}
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
  attr :id, :string, default: nil
  attr :accept, :string, default: nil
  attr :multiple, :boolean, default: false
  attr :disabled, :boolean, default: false
  attr :max_size, :integer, default: nil
  attr :error, :string, default: nil
  attr :rest, :global

  def file_upload(assigns) do
    ~H"""
    <void-file-upload
      id={@id || auto_id("void-file-upload", @rest)}
      accept={@accept}
      multiple={@multiple}
      disabled={@disabled}
      max-size={@max_size}
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
    <void-nav-bar sticky={@sticky} bordered={to_string(@bordered)} variant={@variant} {@rest}>
      {render_slot(@inner_block)}
    </void-nav-bar>
    """
  end

  # ---------------------------------------------------------------------------
  # Hamburger (interactive — void-toggle)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-hamburger>` menu toggle."
  attr :id, :string, default: nil
  attr :active, :boolean, default: false
  attr :size, :string, default: nil
  attr :rest, :global

  def hamburger(assigns) do
    ~H"""
    <void-hamburger
      id={@id || auto_id("void-hamburger", @rest)}
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
  attr :id, :string, default: nil
  attr :value, :string, default: nil
  attr :placeholder, :string, default: nil
  attr :disabled, :boolean, default: false
  attr :maxlength, :integer, default: nil
  attr :rest, :global

  def compose_input(assigns) do
    ~H"""
    <void-compose-input
      id={@id || auto_id("void-compose-input", @rest)}
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

  # ---------------------------------------------------------------------------
  # Sidebar (interactive — void-toggle)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-sidebar>` navigation sidebar."
  attr :id, :string, default: nil
  attr :width, :string, default: nil
  attr :collapsed_width, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def sidebar(assigns) do
    ~H"""
    <void-sidebar
      id={@id || auto_id("void-sidebar", @rest)}
      width={@width}
      collapsed-width={@collapsed_width}
      phx-hook="VoidEvent"
      data-void-events="void-toggle"
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-sidebar>
    """
  end

  # ---------------------------------------------------------------------------
  # DropdownMenu (interactive — void-select)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-dropdown-menu>` dropdown."
  attr :id, :string, default: nil
  attr :open, :boolean, default: false
  attr :position, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def dropdown_menu(assigns) do
    ~H"""
    <void-dropdown-menu
      id={@id || auto_id("void-dropdown-menu", @rest)}
      open={@open}
      position={@position}
      phx-hook="VoidEvent"
      data-void-events="void-select"
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-dropdown-menu>
    """
  end

  # ---------------------------------------------------------------------------
  # DropdownMenuItem (static)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-dropdown-menu-item>` inside a dropdown menu."
  attr :disabled, :boolean, default: false
  attr :destructive, :boolean, default: false
  attr :rest, :global
  slot :inner_block, required: true

  def dropdown_menu_item(assigns) do
    ~H"""
    <void-dropdown-menu-item disabled={@disabled} destructive={@destructive} {@rest}>
      {render_slot(@inner_block)}
    </void-dropdown-menu-item>
    """
  end

  # ---------------------------------------------------------------------------
  # Toggle (interactive — void-change)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-toggle>` button."
  attr :id, :string, default: nil
  attr :pressed, :boolean, default: false
  attr :disabled, :boolean, default: false
  attr :color, :string, default: nil
  attr :size, :string, default: nil
  attr :variant, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def toggle(assigns) do
    ~H"""
    <void-toggle
      id={@id || auto_id("void-toggle", @rest)}
      pressed={@pressed}
      disabled={@disabled}
      color={@color}
      size={@size}
      variant={@variant}
      phx-hook="VoidEvent"
      data-void-events="void-change"
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-toggle>
    """
  end

  # ---------------------------------------------------------------------------
  # ToggleGroup (interactive — void-change)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-toggle-group>` button group."
  attr :id, :string, default: nil
  attr :value, :string, default: nil
  attr :multiple, :boolean, default: false
  attr :disabled, :boolean, default: false
  attr :size, :string, default: nil
  attr :color, :string, default: nil
  attr :orientation, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def toggle_group(assigns) do
    ~H"""
    <void-toggle-group
      id={@id || auto_id("void-toggle-group", @rest)}
      value={@value}
      multiple={@multiple}
      disabled={@disabled}
      size={@size}
      color={@color}
      orientation={@orientation}
      phx-hook="VoidEvent"
      data-void-events="void-change"
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-toggle-group>
    """
  end

  # ---------------------------------------------------------------------------
  # SegmentedControl (interactive — void-change)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-segmented-control>` selector."
  attr :id, :string, default: nil
  attr :value, :string, default: nil
  attr :size, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def segmented_control(assigns) do
    ~H"""
    <void-segmented-control
      id={@id || auto_id("void-segmented-control", @rest)}
      value={@value}
      size={@size}
      phx-hook="VoidEvent"
      data-void-events="void-change"
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-segmented-control>
    """
  end

  # ---------------------------------------------------------------------------
  # SegmentedControlItem (static)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-segmented-control-item>` inside a segmented control."
  attr :value, :string, default: nil
  attr :disabled, :boolean, default: false
  attr :rest, :global
  slot :inner_block, required: true

  def segmented_control_item(assigns) do
    ~H"""
    <void-segmented-control-item value={@value} disabled={@disabled} {@rest}>
      {render_slot(@inner_block)}
    </void-segmented-control-item>
    """
  end

  # ---------------------------------------------------------------------------
  # Stat (static)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-stat>` metric display."
  attr :label, :string, default: nil
  attr :value, :string, default: nil
  attr :delta, :string, default: nil
  attr :description, :string, default: nil
  attr :trend, :string, default: nil
  attr :color, :string, default: nil
  attr :size, :string, default: nil
  attr :rest, :global

  def stat(assigns) do
    ~H"""
    <void-stat
      label={@label}
      value={@value}
      delta={@delta}
      description={@description}
      trend={@trend}
      color={@color}
      size={@size}
      {@rest}
    />
    """
  end

  # ---------------------------------------------------------------------------
  # Indicator (static)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-indicator>` badge/notification dot."
  attr :color, :string, default: nil
  attr :size, :string, default: nil
  attr :count, :integer, default: nil
  attr :ping, :boolean, default: false
  attr :position, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def indicator(assigns) do
    ~H"""
    <void-indicator
      color={@color}
      size={@size}
      count={@count}
      ping={@ping}
      position={@position}
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-indicator>
    """
  end

  # ---------------------------------------------------------------------------
  # Menu (interactive — void-select)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-menu>` command menu."
  attr :id, :string, default: nil
  attr :open, :boolean, default: false
  attr :searchable, :boolean, default: false
  attr :size, :string, default: nil
  attr :placeholder, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def menu(assigns) do
    ~H"""
    <void-menu
      id={@id || auto_id("void-menu", @rest)}
      open={@open}
      searchable={@searchable}
      size={@size}
      placeholder={@placeholder}
      phx-hook="VoidEvent"
      data-void-events="void-select"
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-menu>
    """
  end

  # ---------------------------------------------------------------------------
  # MenuItem (static)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-menu-item>` inside a menu."
  attr :value, :string, default: nil
  attr :disabled, :boolean, default: false
  attr :shortcut, :string, default: nil
  attr :icon, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def menu_item(assigns) do
    ~H"""
    <void-menu-item value={@value} disabled={@disabled} shortcut={@shortcut} icon={@icon} {@rest}>
      {render_slot(@inner_block)}
    </void-menu-item>
    """
  end

  # ---------------------------------------------------------------------------
  # MenuGroup (static)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-menu-group>` label inside a menu."
  attr :label, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def menu_group(assigns) do
    ~H"""
    <void-menu-group label={@label} {@rest}>
      {render_slot(@inner_block)}
    </void-menu-group>
    """
  end

  # ---------------------------------------------------------------------------
  # Carousel (interactive — void-change)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-carousel>` image/content slider."
  attr :id, :string, default: nil
  attr :active, :integer, default: 0
  attr :loop, :boolean, default: false
  attr :autoplay, :boolean, default: false
  attr :interval, :integer, default: nil
  attr :size, :string, default: nil
  attr :controls, :boolean, default: true
  attr :indicators, :boolean, default: true
  attr :orientation, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def carousel(assigns) do
    ~H"""
    <void-carousel
      id={@id || auto_id("void-carousel", @rest)}
      active={@active}
      loop={@loop}
      autoplay={@autoplay}
      interval={@interval}
      size={@size}
      controls={to_string(@controls)}
      indicators={to_string(@indicators)}
      orientation={@orientation}
      phx-hook="VoidEvent"
      data-void-events="void-change"
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-carousel>
    """
  end

  # ---------------------------------------------------------------------------
  # CarouselSlide (static)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-carousel-slide>` inside a carousel."
  attr :rest, :global
  slot :inner_block, required: true

  def carousel_slide(assigns) do
    ~H"""
    <void-carousel-slide {@rest}>
      {render_slot(@inner_block)}
    </void-carousel-slide>
    """
  end

  # ---------------------------------------------------------------------------
  # Calendar (interactive — void-change)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-calendar>` date picker grid."
  attr :id, :string, default: nil
  attr :value, :string, default: nil
  attr :min, :string, default: nil
  attr :max, :string, default: nil
  attr :disabled, :boolean, default: false
  attr :size, :string, default: nil
  attr :locale, :string, default: nil
  attr :first_day, :integer, default: nil
  attr :rest, :global

  def calendar(assigns) do
    ~H"""
    <void-calendar
      id={@id || auto_id("void-calendar", @rest)}
      value={@value}
      min={@min}
      max={@max}
      disabled={@disabled}
      size={@size}
      locale={@locale}
      first-day={@first_day}
      phx-hook="VoidEvent"
      data-void-events="void-change"
      {@rest}
    />
    """
  end

  # ---------------------------------------------------------------------------
  # DatePicker (interactive — void-change)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-date-picker>` input with calendar dropdown."
  attr :id, :string, default: nil
  attr :value, :string, default: nil
  attr :min, :string, default: nil
  attr :max, :string, default: nil
  attr :disabled, :boolean, default: false
  attr :size, :string, default: nil
  attr :locale, :string, default: nil
  attr :first_day, :integer, default: nil
  attr :open, :boolean, default: false
  attr :placeholder, :string, default: nil
  attr :format, :string, default: nil
  attr :color, :string, default: nil
  attr :rest, :global

  def date_picker(assigns) do
    ~H"""
    <void-date-picker
      id={@id || auto_id("void-date-picker", @rest)}
      value={@value}
      min={@min}
      max={@max}
      disabled={@disabled}
      size={@size}
      locale={@locale}
      first-day={@first_day}
      open={@open}
      placeholder={@placeholder}
      format={@format}
      color={@color}
      phx-hook="VoidEvent"
      data-void-events="void-change"
      {@rest}
    />
    """
  end

  # ---------------------------------------------------------------------------
  # NumberInput (interactive — void-change)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-number-input>` numeric stepper."
  attr :id, :string, default: nil
  attr :value, :any, default: nil
  attr :min, :any, default: nil
  attr :max, :any, default: nil
  attr :step, :any, default: nil, doc: "a number, or `\"any\"` for no step constraint (the buttons then step by 1)"
  attr :precision, :integer, default: nil
  attr :disabled, :boolean, default: false
  attr :readonly, :boolean, default: false
  attr :size, :string, default: nil
  attr :color, :string, default: nil
  attr :placeholder, :string, default: nil
  attr :controls, :string, default: nil
  attr :label, :string, default: nil
  attr :rest, :global

  def number_input(assigns) do
    ~H"""
    <void-number-input
      id={@id || auto_id("void-number-input", @rest)}
      value={@value}
      min={@min}
      max={@max}
      step={@step}
      precision={@precision}
      disabled={@disabled}
      readonly={@readonly}
      size={@size}
      color={@color}
      placeholder={@placeholder}
      controls={@controls}
      label={@label}
      phx-hook="VoidEvent"
      data-void-events="void-change"
      {@rest}
    />
    """
  end

  # ---------------------------------------------------------------------------
  # Collapsible (interactive — void-toggle)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-collapsible>` expandable section."
  attr :id, :string, default: nil
  attr :heading, :string, default: nil
  attr :open, :boolean, default: false
  attr :disabled, :boolean, default: false
  attr :rest, :global
  slot :inner_block, required: true

  def collapsible(assigns) do
    ~H"""
    <void-collapsible
      id={@id || auto_id("void-collapsible", @rest)}
      heading={@heading}
      open={@open}
      disabled={@disabled}
      phx-hook="VoidEvent"
      data-void-events="void-toggle"
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-collapsible>
    """
  end

  # ---------------------------------------------------------------------------
  # Editable (interactive — void-change, void-cancel)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-editable>` inline-editable text field."
  attr :id, :string, default: nil
  attr :value, :string, default: nil
  attr :editing, :boolean, default: false
  attr :disabled, :boolean, default: false
  attr :placeholder, :string, default: nil
  attr :submit_mode, :string, default: nil
  attr :size, :string, default: nil
  attr :rest, :global

  def editable(assigns) do
    ~H"""
    <void-editable
      id={@id || auto_id("void-editable", @rest)}
      value={@value}
      editing={@editing}
      disabled={@disabled}
      placeholder={@placeholder}
      submit-mode={@submit_mode}
      size={@size}
      phx-hook="VoidEvent"
      data-void-events="void-change,void-cancel"
      {@rest}
    />
    """
  end

  # ---------------------------------------------------------------------------
  # HoverCard (static — hover-based, no server events)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-hover-card>` hover-triggered card."
  attr :open, :boolean, default: false
  attr :position, :string, default: nil
  attr :open_delay, :integer, default: nil
  attr :close_delay, :integer, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def hover_card(assigns) do
    ~H"""
    <void-hover-card
      open={@open}
      position={@position}
      open-delay={@open_delay}
      close-delay={@close_delay}
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-hover-card>
    """
  end

  # ---------------------------------------------------------------------------
  # PinInput (interactive — void-change, void-complete)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-pin-input>` verification code input."
  attr :id, :string, default: nil
  attr :length, :integer, default: nil
  attr :groups, :string, default: nil
  attr :value, :string, default: nil
  attr :disabled, :boolean, default: false
  attr :mask, :boolean, default: false
  attr :type, :string, default: nil
  attr :size, :string, default: nil
  attr :color, :string, default: nil
  attr :placeholder, :string, default: nil
  attr :rest, :global

  def pin_input(assigns) do
    ~H"""
    <void-pin-input
      id={@id || auto_id("void-pin-input", @rest)}
      length={@length}
      groups={@groups}
      value={@value}
      disabled={@disabled}
      mask={@mask}
      type={@type}
      size={@size}
      color={@color}
      placeholder={@placeholder}
      phx-hook="VoidEvent"
      data-void-events="void-change,void-complete"
      {@rest}
    />
    """
  end

  # ---------------------------------------------------------------------------
  # TagsInput (interactive — void-change)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-tags-input>` tag entry field."
  attr :id, :string, default: nil
  attr :disabled, :boolean, default: false
  attr :readonly, :boolean, default: false
  attr :max, :integer, default: nil
  attr :placeholder, :string, default: nil
  attr :size, :string, default: nil
  attr :color, :string, default: nil
  attr :variant, :string, default: nil
  attr :allow_duplicates, :boolean, default: false
  attr :rest, :global

  def tags_input(assigns) do
    ~H"""
    <void-tags-input
      id={@id || auto_id("void-tags-input", @rest)}
      disabled={@disabled}
      readonly={@readonly}
      max={@max}
      placeholder={@placeholder}
      size={@size}
      color={@color}
      variant={@variant}
      allow-duplicates={@allow_duplicates}
      phx-hook="VoidEvent"
      data-void-events="void-change"
      {@rest}
    />
    """
  end

  # ---------------------------------------------------------------------------
  # NavMenu (static — container)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-nav-menu>` navigation menu container."
  attr :orientation, :string, default: nil
  attr :width, :string, default: nil
  attr :rest, :global
  slot :inner_block, required: true

  def nav_menu(assigns) do
    ~H"""
    <void-nav-menu orientation={@orientation} width={@width} {@rest}>
      {render_slot(@inner_block)}
    </void-nav-menu>
    """
  end

  # ---------------------------------------------------------------------------
  # NavMenuItem (interactive — void-open, void-close)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-nav-menu-item>` navigation menu item."
  attr :id, :string, default: nil
  attr :open, :boolean, default: false
  attr :disabled, :boolean, default: false
  attr :href, :string, default: nil
  attr :active, :boolean, default: false
  attr :rest, :global
  slot :inner_block, required: true

  def nav_menu_item(assigns) do
    ~H"""
    <void-nav-menu-item
      id={@id || auto_id("void-nav-menu-item", @rest)}
      open={@open}
      disabled={@disabled}
      href={@href}
      active={@active}
      phx-hook="VoidEvent"
      data-void-events="void-open,void-close"
      {@rest}
    >
      {render_slot(@inner_block)}
    </void-nav-menu-item>
    """
  end

  # ---------------------------------------------------------------------------
  # ColorPicker (interactive — void-change)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-color-picker>` color selection input."
  attr :id, :string, default: nil
  attr :value, :string, default: nil
  attr :disabled, :boolean, default: false
  attr :size, :string, default: nil
  attr :show_input, :boolean, default: true
  attr :variant, :string, default: nil
  attr :open, :boolean, default: false
  attr :rest, :global

  def color_picker(assigns) do
    ~H"""
    <void-color-picker
      id={@id || auto_id("void-color-picker", @rest)}
      value={@value}
      disabled={@disabled}
      size={@size}
      show-input={to_string(@show_input)}
      variant={@variant}
      open={@open}
      phx-hook="VoidEvent"
      data-void-events="void-change"
      {@rest}
    />
    """
  end

  # ---------------------------------------------------------------------------
  # ActionInput (interactive — void-input, void-change, void-action)
  # ---------------------------------------------------------------------------

  @doc "Renders a `<void-action-input>` input with an attached icon button."
  attr :id, :string, default: nil
  attr :value, :string, default: nil
  attr :placeholder, :string, default: nil
  attr :disabled, :boolean, default: false
  attr :readonly, :boolean, default: false
  attr :size, :string, default: nil
  attr :color, :string, default: nil
  attr :icon, :string, default: nil
  attr :action_label, :string, default: nil
  attr :position, :string, default: nil
  attr :type, :string, default: nil
  attr :autocomplete, :string, default: nil
  attr :minlength, :integer, default: nil
  attr :maxlength, :integer, default: nil
  attr :pattern, :string, default: nil
  attr :rest, :global, include: ~w(inputmode enterkeyhint autocapitalize spellcheck)

  def action_input(assigns) do
    ~H"""
    <void-action-input
      id={@id || auto_id("void-action-input", @rest)}
      value={@value}
      placeholder={@placeholder}
      disabled={@disabled}
      readonly={@readonly}
      size={@size}
      color={@color}
      icon={@icon}
      action-label={@action_label}
      position={@position}
      type={@type}
      autocomplete={@autocomplete}
      minlength={@minlength}
      maxlength={@maxlength}
      pattern={@pattern}
      phx-hook="VoidEvent"
      data-void-events="void-input,void-change,void-action"
      {@rest}
    />
    """
  end
end
