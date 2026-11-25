defmodule DemoWeb.FormShowcases do
  @moduledoc """
  Storybook-style showcase functions for form-related VoidableUI components.

  Each public function is a Phoenix function component that renders examples
  of a component with various props.
  """

  use Phoenix.Component

  # ---------------------------------------------------------------------------
  # Input
  # ---------------------------------------------------------------------------

  def input(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <VoidableUI.Components.input events placeholder="Enter text..." />
    </div>
    <div class="showcase-section">
      <h3>Types</h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <VoidableUI.Components.input events type="text" placeholder="Text input" />
        <VoidableUI.Components.input events type="email" placeholder="Email input" />
        <VoidableUI.Components.input events type="password" placeholder="Password input" />
        <VoidableUI.Components.input events type="number" placeholder="Number input" />
      </div>
    </div>
    <div class="showcase-section">
      <h3>States</h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <VoidableUI.Components.input events placeholder="Disabled" disabled />
        <VoidableUI.Components.input events placeholder="Read only" readonly value="Read only value" />
        <VoidableUI.Components.input events placeholder="Required" required />
        <VoidableUI.Components.input events placeholder="With error" error="This field is required" />
      </div>
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <VoidableUI.Components.input events size="sm" placeholder="Small" />
        <VoidableUI.Components.input events placeholder="Medium" />
        <VoidableUI.Components.input events size="lg" placeholder="Large" />
      </div>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Textarea
  # ---------------------------------------------------------------------------

  def textarea(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <VoidableUI.Components.textarea events placeholder="Enter some text..." />
    </div>
    <div class="showcase-section">
      <h3>With Rows</h3>
      <VoidableUI.Components.textarea events placeholder="5 rows tall" rows={5} />
    </div>
    <div class="showcase-section">
      <h3>Resize Variants</h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <VoidableUI.Components.textarea events placeholder="No resize" resize="none" />
        <VoidableUI.Components.textarea events placeholder="Vertical resize" resize="vertical" />
        <VoidableUI.Components.textarea events placeholder="Both directions" resize="both" />
      </div>
    </div>
    <div class="showcase-section">
      <h3>States</h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <VoidableUI.Components.textarea events placeholder="Disabled" disabled />
        <VoidableUI.Components.textarea events placeholder="Read only" readonly value="Read only value" />
        <VoidableUI.Components.textarea events placeholder="With error" error="This field is required" />
      </div>
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <VoidableUI.Components.textarea events size="sm" placeholder="Small" />
        <VoidableUI.Components.textarea events placeholder="Medium" />
        <VoidableUI.Components.textarea events size="lg" placeholder="Large" />
      </div>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Select
  # ---------------------------------------------------------------------------

  def select(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <VoidableUI.Components.select events>
        <select>
          <option value="">Select an option...</option>
          <option value="a">Option A</option>
          <option value="b">Option B</option>
          <option value="c">Option C</option>
        </select>
      </VoidableUI.Components.select>
    </div>
    <div class="showcase-section">
      <h3>States</h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <VoidableUI.Components.select events>
          <select disabled>
            <option>Disabled select</option>
          </select>
        </VoidableUI.Components.select>
        <VoidableUI.Components.select events error="Please select an option">
          <select>
            <option value="">Select an option...</option>
            <option value="a">Option A</option>
            <option value="b">Option B</option>
          </select>
        </VoidableUI.Components.select>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <VoidableUI.Components.select events size="sm">
          <select>
            <option>Small</option>
          </select>
        </VoidableUI.Components.select>
        <VoidableUI.Components.select events>
          <select>
            <option>Medium</option>
          </select>
        </VoidableUI.Components.select>
        <VoidableUI.Components.select events size="lg">
          <select>
            <option>Large</option>
          </select>
        </VoidableUI.Components.select>
      </div>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Checkbox
  # ---------------------------------------------------------------------------

  def checkbox(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <VoidableUI.Components.checkbox events>Accept terms</VoidableUI.Components.checkbox>
    </div>
    <div class="showcase-section">
      <h3>Checked</h3>
      <VoidableUI.Components.checkbox events checked>Accept terms</VoidableUI.Components.checkbox>
    </div>
    <div class="showcase-section">
      <h3>Indeterminate</h3>
      <VoidableUI.Components.checkbox events indeterminate>Indeterminate</VoidableUI.Components.checkbox>
    </div>
    <div class="showcase-section">
      <h3>Colors</h3>
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <VoidableUI.Components.checkbox events checked>Default</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox events color="error" checked>Error</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox events color="warning" checked>Warning</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox events color="success" checked>Success</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox events color="info" checked>Info</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox events color="notice" checked>Notice</VoidableUI.Components.checkbox>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <div style="display: flex; gap: 1rem; align-items: center;">
        <VoidableUI.Components.checkbox events size="sm">Small</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox events>Medium</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox events size="lg">Large</VoidableUI.Components.checkbox>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Disabled</h3>
      <div style="display: flex; gap: 1rem; align-items: center;">
        <VoidableUI.Components.checkbox events disabled>Disabled</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox events disabled checked>Disabled Checked</VoidableUI.Components.checkbox>
      </div>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Radio
  # ---------------------------------------------------------------------------

  def radio(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Group</h3>
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        <VoidableUI.Components.radio events name="group" value="a" checked>Option A</VoidableUI.Components.radio>
        <VoidableUI.Components.radio events name="group" value="b">Option B</VoidableUI.Components.radio>
        <VoidableUI.Components.radio events name="group" value="c">Option C</VoidableUI.Components.radio>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Colors</h3>
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <VoidableUI.Components.radio events name="colors" value="default" checked>Default</VoidableUI.Components.radio>
        <VoidableUI.Components.radio events name="colors-err" value="error" color="error" checked>Error</VoidableUI.Components.radio>
        <VoidableUI.Components.radio events name="colors-warn" value="warning" color="warning" checked>Warning</VoidableUI.Components.radio>
        <VoidableUI.Components.radio events name="colors-suc" value="success" color="success" checked>Success</VoidableUI.Components.radio>
        <VoidableUI.Components.radio events name="colors-inf" value="info" color="info" checked>Info</VoidableUI.Components.radio>
        <VoidableUI.Components.radio events name="colors-not" value="notice" color="notice" checked>Notice</VoidableUI.Components.radio>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <div style="display: flex; gap: 1rem; align-items: center;">
        <VoidableUI.Components.radio events name="sizes" value="sm" size="sm">Small</VoidableUI.Components.radio>
        <VoidableUI.Components.radio events name="sizes" value="md">Medium</VoidableUI.Components.radio>
        <VoidableUI.Components.radio events name="sizes" value="lg" size="lg">Large</VoidableUI.Components.radio>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Disabled</h3>
      <div style="display: flex; gap: 1rem; align-items: center;">
        <VoidableUI.Components.radio events name="disabled" value="a" disabled>Disabled</VoidableUI.Components.radio>
        <VoidableUI.Components.radio events name="disabled" value="b" disabled checked>Disabled Checked</VoidableUI.Components.radio>
      </div>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # RadioGroup
  # ---------------------------------------------------------------------------

  def radio_group(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default (Vertical)</h3>
      <VoidableUI.Components.radio_group events label="Choose an option" name="default" value="a">
        <VoidableUI.Components.radio events value="a">Option A</VoidableUI.Components.radio>
        <VoidableUI.Components.radio events value="b">Option B</VoidableUI.Components.radio>
        <VoidableUI.Components.radio events value="c">Option C</VoidableUI.Components.radio>
      </VoidableUI.Components.radio_group>
    </div>
    <div class="showcase-section">
      <h3>Horizontal Orientation</h3>
      <VoidableUI.Components.radio_group events label="Alignment" name="align" value="left" orientation="horizontal">
        <VoidableUI.Components.radio events value="left">Left</VoidableUI.Components.radio>
        <VoidableUI.Components.radio events value="center">Center</VoidableUI.Components.radio>
        <VoidableUI.Components.radio events value="right">Right</VoidableUI.Components.radio>
      </VoidableUI.Components.radio_group>
    </div>
    <div class="showcase-section">
      <h3>With Disabled Option</h3>
      <VoidableUI.Components.radio_group events label="Plan" name="plan" value="basic">
        <VoidableUI.Components.radio events value="basic">Basic</VoidableUI.Components.radio>
        <VoidableUI.Components.radio events value="pro">Pro</VoidableUI.Components.radio>
        <VoidableUI.Components.radio events value="enterprise" disabled>Enterprise (contact sales)</VoidableUI.Components.radio>
      </VoidableUI.Components.radio_group>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # CheckboxGroup
  # ---------------------------------------------------------------------------

  def checkbox_group(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default (Vertical)</h3>
      <VoidableUI.Components.checkbox_group events label="Options">
        <VoidableUI.Components.checkbox events value="a">Option A</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox events value="b">Option B</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox events value="c">Option C</VoidableUI.Components.checkbox>
      </VoidableUI.Components.checkbox_group>
    </div>
    <div class="showcase-section">
      <h3>Horizontal Orientation</h3>
      <VoidableUI.Components.checkbox_group events label="Flavors" orientation="horizontal">
        <VoidableUI.Components.checkbox events value="vanilla">Vanilla</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox events value="chocolate">Chocolate</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox events value="strawberry">Strawberry</VoidableUI.Components.checkbox>
      </VoidableUI.Components.checkbox_group>
    </div>
    <div class="showcase-section">
      <h3>Pre-Selected</h3>
      <VoidableUI.Components.checkbox_group events label="Permissions">
        <VoidableUI.Components.checkbox events value="read" checked>Read</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox events value="write">Write</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox events value="delete" checked>Delete</VoidableUI.Components.checkbox>
      </VoidableUI.Components.checkbox_group>
    </div>
    <div class="showcase-section">
      <h3>With Disabled</h3>
      <VoidableUI.Components.checkbox_group events label="Status">
        <VoidableUI.Components.checkbox events value="active" checked>Active</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox events value="pending" disabled>Pending</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox events value="archived">Archived</VoidableUI.Components.checkbox>
      </VoidableUI.Components.checkbox_group>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Combobox
  # ---------------------------------------------------------------------------

  def combobox(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <VoidableUI.Components.combobox events placeholder="Select a framework...">
        <void-combobox-content>
          <VoidableUI.Components.option value="react">React</VoidableUI.Components.option>
          <VoidableUI.Components.option value="vue">Vue</VoidableUI.Components.option>
          <VoidableUI.Components.option value="svelte">Svelte</VoidableUI.Components.option>
          <VoidableUI.Components.option value="angular">Angular</VoidableUI.Components.option>
          <VoidableUI.Components.option value="solid">Solid</VoidableUI.Components.option>
          <VoidableUI.Components.option value="lit">Lit</VoidableUI.Components.option>
        </void-combobox-content>
      </VoidableUI.Components.combobox>
    </div>
    <div class="showcase-section">
      <h3>States</h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <VoidableUI.Components.combobox events placeholder="Disabled" disabled>
          <void-combobox-content>
            <VoidableUI.Components.option value="react">React</VoidableUI.Components.option>
            <VoidableUI.Components.option value="vue">Vue</VoidableUI.Components.option>
          </void-combobox-content>
        </VoidableUI.Components.combobox>
        <VoidableUI.Components.combobox events placeholder="With error" error="Please select an option">
          <void-combobox-content>
            <VoidableUI.Components.option value="react">React</VoidableUI.Components.option>
            <VoidableUI.Components.option value="vue">Vue</VoidableUI.Components.option>
          </void-combobox-content>
        </VoidableUI.Components.combobox>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <VoidableUI.Components.combobox events size="sm" placeholder="Small">
          <void-combobox-content>
            <VoidableUI.Components.option value="a">Option A</VoidableUI.Components.option>
            <VoidableUI.Components.option value="b">Option B</VoidableUI.Components.option>
            <VoidableUI.Components.option value="c">Option C</VoidableUI.Components.option>
          </void-combobox-content>
        </VoidableUI.Components.combobox>
        <VoidableUI.Components.combobox events placeholder="Medium">
          <void-combobox-content>
            <VoidableUI.Components.option value="a">Option A</VoidableUI.Components.option>
            <VoidableUI.Components.option value="b">Option B</VoidableUI.Components.option>
            <VoidableUI.Components.option value="c">Option C</VoidableUI.Components.option>
          </void-combobox-content>
        </VoidableUI.Components.combobox>
        <VoidableUI.Components.combobox events size="lg" placeholder="Large">
          <void-combobox-content>
            <VoidableUI.Components.option value="a">Option A</VoidableUI.Components.option>
            <VoidableUI.Components.option value="b">Option B</VoidableUI.Components.option>
            <VoidableUI.Components.option value="c">Option C</VoidableUI.Components.option>
          </void-combobox-content>
        </VoidableUI.Components.combobox>
      </div>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Multiselect
  # ---------------------------------------------------------------------------

  def multiselect(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <VoidableUI.Components.multiselect events placeholder="Select frameworks...">
        <void-multiselect-content>
          <VoidableUI.Components.option value="react">React</VoidableUI.Components.option>
          <VoidableUI.Components.option value="vue">Vue</VoidableUI.Components.option>
          <VoidableUI.Components.option value="svelte">Svelte</VoidableUI.Components.option>
          <VoidableUI.Components.option value="angular">Angular</VoidableUI.Components.option>
          <VoidableUI.Components.option value="solid">Solid</VoidableUI.Components.option>
          <VoidableUI.Components.option value="lit">Lit</VoidableUI.Components.option>
        </void-multiselect-content>
      </VoidableUI.Components.multiselect>
    </div>
    <div class="showcase-section">
      <h3>Preselected</h3>
      <VoidableUI.Components.multiselect events placeholder="Select frameworks...">
        <void-multiselect-content>
          <VoidableUI.Components.option value="react" selected>React</VoidableUI.Components.option>
          <VoidableUI.Components.option value="vue" selected>Vue</VoidableUI.Components.option>
          <VoidableUI.Components.option value="svelte" selected>Svelte</VoidableUI.Components.option>
          <VoidableUI.Components.option value="angular">Angular</VoidableUI.Components.option>
          <VoidableUI.Components.option value="solid">Solid</VoidableUI.Components.option>
          <VoidableUI.Components.option value="lit">Lit</VoidableUI.Components.option>
        </void-multiselect-content>
      </VoidableUI.Components.multiselect>
    </div>
    <div class="showcase-section">
      <h3>States</h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <VoidableUI.Components.multiselect events placeholder="Disabled" disabled>
          <void-multiselect-content>
            <VoidableUI.Components.option value="react">React</VoidableUI.Components.option>
            <VoidableUI.Components.option value="vue">Vue</VoidableUI.Components.option>
          </void-multiselect-content>
        </VoidableUI.Components.multiselect>
        <VoidableUI.Components.multiselect events placeholder="With error" error="Please select at least one option">
          <void-multiselect-content>
            <VoidableUI.Components.option value="react">React</VoidableUI.Components.option>
            <VoidableUI.Components.option value="vue">Vue</VoidableUI.Components.option>
          </void-multiselect-content>
        </VoidableUI.Components.multiselect>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <VoidableUI.Components.multiselect events size="sm" placeholder="Small">
          <void-multiselect-content>
            <VoidableUI.Components.option value="a">Option A</VoidableUI.Components.option>
            <VoidableUI.Components.option value="b">Option B</VoidableUI.Components.option>
          </void-multiselect-content>
        </VoidableUI.Components.multiselect>
        <VoidableUI.Components.multiselect events placeholder="Medium">
          <void-multiselect-content>
            <VoidableUI.Components.option value="a">Option A</VoidableUI.Components.option>
            <VoidableUI.Components.option value="b">Option B</VoidableUI.Components.option>
          </void-multiselect-content>
        </VoidableUI.Components.multiselect>
        <VoidableUI.Components.multiselect events size="lg" placeholder="Large">
          <void-multiselect-content>
            <VoidableUI.Components.option value="a">Option A</VoidableUI.Components.option>
            <VoidableUI.Components.option value="b">Option B</VoidableUI.Components.option>
          </void-multiselect-content>
        </VoidableUI.Components.multiselect>
      </div>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Slider
  # ---------------------------------------------------------------------------

  def slider(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <VoidableUI.Components.slider events value={50} min={0} max={100} />
    </div>
    <div class="showcase-section">
      <h3>With Value Display</h3>
      <VoidableUI.Components.slider events value={65} min={0} max={100} show_value />
    </div>
    <div class="showcase-section">
      <h3>With Step</h3>
      <VoidableUI.Components.slider events value={5} min={0} max={10} step={1} show_value />
    </div>
    <div class="showcase-section">
      <h3>Disabled</h3>
      <VoidableUI.Components.slider events value={35} min={0} max={100} disabled show_value />
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <VoidableUI.Components.slider events size="sm" value={40} min={0} max={100} show_value />
        <VoidableUI.Components.slider events value={50} min={0} max={100} show_value />
        <VoidableUI.Components.slider events size="lg" value={60} min={0} max={100} show_value />
      </div>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # FileUpload
  # ---------------------------------------------------------------------------

  def file_upload(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <VoidableUI.Components.file_upload events />
    </div>
    <div class="showcase-section">
      <h3>Multiple Files</h3>
      <VoidableUI.Components.file_upload events multiple />
    </div>
    <div class="showcase-section">
      <h3>Accept Images</h3>
      <VoidableUI.Components.file_upload events accept="image/*" multiple />
    </div>
    <div class="showcase-section">
      <h3>States</h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <VoidableUI.Components.file_upload events disabled />
        <VoidableUI.Components.file_upload events error="File upload failed. Please try again." />
      </div>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # Switch
  # ---------------------------------------------------------------------------

  def switch(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default (Off)</h3>
      <VoidableUI.Components.switch events />
    </div>
    <div class="showcase-section">
      <h3>Checked (On)</h3>
      <VoidableUI.Components.switch events checked />
    </div>
    <div class="showcase-section">
      <h3>Colors</h3>
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <VoidableUI.Components.switch events checked />
        <VoidableUI.Components.switch events color="error" checked />
        <VoidableUI.Components.switch events color="warning" checked />
        <VoidableUI.Components.switch events color="success" checked />
        <VoidableUI.Components.switch events color="info" checked />
        <VoidableUI.Components.switch events color="notice" checked />
      </div>
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <div style="display: flex; gap: 1rem; align-items: center;">
        <VoidableUI.Components.switch events size="sm" />
        <VoidableUI.Components.switch events />
        <VoidableUI.Components.switch events size="lg" />
      </div>
    </div>
    <div class="showcase-section">
      <h3>Disabled</h3>
      <div style="display: flex; gap: 1rem; align-items: center;">
        <VoidableUI.Components.switch events disabled />
        <VoidableUI.Components.switch events disabled checked />
      </div>
    </div>
    """
  end

  # ---------------------------------------------------------------------------
  # ComposeInput
  # ---------------------------------------------------------------------------

  def compose_input(assigns) do
    ~H"""
    <div class="showcase-section">
      <h3>Default</h3>
      <VoidableUI.Components.compose_input events placeholder="Type a message..." />
    </div>
    <div class="showcase-section">
      <h3>With Max Length</h3>
      <VoidableUI.Components.compose_input events placeholder="Max 100 characters..." maxlength={100} />
    </div>
    <div class="showcase-section">
      <h3>Custom Placeholder</h3>
      <VoidableUI.Components.compose_input events placeholder="Ask anything..." />
    </div>
    <div class="showcase-section">
      <h3>Disabled</h3>
      <VoidableUI.Components.compose_input events placeholder="Cannot send messages" disabled />
    </div>
    """
  end
end
