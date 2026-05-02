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
      <VoidableUI.Components.input placeholder="Enter text..." />
    </div>
    <div class="showcase-section">
      <h3>Types</h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <VoidableUI.Components.input type="text" placeholder="Text input" />
        <VoidableUI.Components.input type="email" placeholder="Email input" />
        <VoidableUI.Components.input type="password" placeholder="Password input" />
        <VoidableUI.Components.input type="number" placeholder="Number input" />
      </div>
    </div>
    <div class="showcase-section">
      <h3>States</h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <VoidableUI.Components.input placeholder="Disabled" disabled />
        <VoidableUI.Components.input placeholder="Read only" readonly value="Read only value" />
        <VoidableUI.Components.input placeholder="Required" required />
        <VoidableUI.Components.input placeholder="With error" error="This field is required" />
      </div>
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <VoidableUI.Components.input size="sm" placeholder="Small" />
        <VoidableUI.Components.input placeholder="Medium" />
        <VoidableUI.Components.input size="lg" placeholder="Large" />
        <VoidableUI.Components.input size="xl" placeholder="XL" />
        <VoidableUI.Components.input size="xxl" placeholder="XXL" />
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
      <VoidableUI.Components.textarea placeholder="Enter some text..." />
    </div>
    <div class="showcase-section">
      <h3>With Rows</h3>
      <VoidableUI.Components.textarea placeholder="5 rows tall" rows={5} />
    </div>
    <div class="showcase-section">
      <h3>Resize Variants</h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <VoidableUI.Components.textarea placeholder="No resize" resize="none" />
        <VoidableUI.Components.textarea placeholder="Vertical resize" resize="vertical" />
        <VoidableUI.Components.textarea placeholder="Both directions" resize="both" />
      </div>
    </div>
    <div class="showcase-section">
      <h3>States</h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <VoidableUI.Components.textarea placeholder="Disabled" disabled />
        <VoidableUI.Components.textarea placeholder="Read only" readonly value="Read only value" />
        <VoidableUI.Components.textarea placeholder="With error" error="This field is required" />
      </div>
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <VoidableUI.Components.textarea size="sm" placeholder="Small" />
        <VoidableUI.Components.textarea placeholder="Medium" />
        <VoidableUI.Components.textarea size="lg" placeholder="Large" />
        <VoidableUI.Components.textarea size="xl" placeholder="XL" />
        <VoidableUI.Components.textarea size="xxl" placeholder="XXL" />
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
      <VoidableUI.Components.select>
        <option value="">Select an option...</option>
        <option value="a">Option A</option>
        <option value="b">Option B</option>
        <option value="c">Option C</option>
      </VoidableUI.Components.select>
    </div>
    <div class="showcase-section">
      <h3>States</h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <VoidableUI.Components.select disabled>
          <option>Disabled select</option>
        </VoidableUI.Components.select>
        <VoidableUI.Components.select error="Please select an option">
          <option value="">Select an option...</option>
          <option value="a">Option A</option>
          <option value="b">Option B</option>
        </VoidableUI.Components.select>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <VoidableUI.Components.select size="sm">
          <option>Small</option>
        </VoidableUI.Components.select>
        <VoidableUI.Components.select>
          <option>Medium</option>
        </VoidableUI.Components.select>
        <VoidableUI.Components.select size="lg">
          <option>Large</option>
        </VoidableUI.Components.select>
        <VoidableUI.Components.select size="xl">
          <option>XL</option>
        </VoidableUI.Components.select>
        <VoidableUI.Components.select size="xxl">
          <option>XXL</option>
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
      <VoidableUI.Components.checkbox>Accept terms</VoidableUI.Components.checkbox>
    </div>
    <div class="showcase-section">
      <h3>Checked</h3>
      <VoidableUI.Components.checkbox checked>Accept terms</VoidableUI.Components.checkbox>
    </div>
    <div class="showcase-section">
      <h3>Indeterminate</h3>
      <VoidableUI.Components.checkbox indeterminate>Indeterminate</VoidableUI.Components.checkbox>
    </div>
    <div class="showcase-section">
      <h3>Colors</h3>
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <VoidableUI.Components.checkbox checked>Default</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox color="error" checked>Error</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox color="warning" checked>Warning</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox color="success" checked>Success</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox color="info" checked>Info</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox color="notice" checked>Notice</VoidableUI.Components.checkbox>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <div style="display: flex; gap: 1rem; align-items: center;">
        <VoidableUI.Components.checkbox size="sm">Small</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox>Medium</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox size="lg">Large</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox size="xl">Extra Large</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox size="xxl">2X Large</VoidableUI.Components.checkbox>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Disabled</h3>
      <div style="display: flex; gap: 1rem; align-items: center;">
        <VoidableUI.Components.checkbox disabled>Disabled</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox disabled checked>Disabled Checked</VoidableUI.Components.checkbox>
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
        <VoidableUI.Components.radio name="group" value="a" checked>Option A</VoidableUI.Components.radio>
        <VoidableUI.Components.radio name="group" value="b">Option B</VoidableUI.Components.radio>
        <VoidableUI.Components.radio name="group" value="c">Option C</VoidableUI.Components.radio>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Colors</h3>
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <VoidableUI.Components.radio name="colors" value="default" checked>Default</VoidableUI.Components.radio>
        <VoidableUI.Components.radio name="colors-err" value="error" color="error" checked>Error</VoidableUI.Components.radio>
        <VoidableUI.Components.radio name="colors-warn" value="warning" color="warning" checked>Warning</VoidableUI.Components.radio>
        <VoidableUI.Components.radio name="colors-suc" value="success" color="success" checked>Success</VoidableUI.Components.radio>
        <VoidableUI.Components.radio name="colors-inf" value="info" color="info" checked>Info</VoidableUI.Components.radio>
        <VoidableUI.Components.radio name="colors-not" value="notice" color="notice" checked>Notice</VoidableUI.Components.radio>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <div style="display: flex; gap: 1rem; align-items: center;">
        <VoidableUI.Components.radio name="sizes" value="sm" size="sm">Small</VoidableUI.Components.radio>
        <VoidableUI.Components.radio name="sizes" value="md">Medium</VoidableUI.Components.radio>
        <VoidableUI.Components.radio name="sizes" value="lg" size="lg">Large</VoidableUI.Components.radio>
        <VoidableUI.Components.radio name="sizes" value="xl" size="xl">XL</VoidableUI.Components.radio>
        <VoidableUI.Components.radio name="sizes" value="xxl" size="xxl">XXL</VoidableUI.Components.radio>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Disabled</h3>
      <div style="display: flex; gap: 1rem; align-items: center;">
        <VoidableUI.Components.radio name="disabled" value="a" disabled>Disabled</VoidableUI.Components.radio>
        <VoidableUI.Components.radio name="disabled" value="b" disabled checked>Disabled Checked</VoidableUI.Components.radio>
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
      <VoidableUI.Components.radio_group label="Choose an option" name="default" value="a">
        <VoidableUI.Components.radio value="a">Option A</VoidableUI.Components.radio>
        <VoidableUI.Components.radio value="b">Option B</VoidableUI.Components.radio>
        <VoidableUI.Components.radio value="c">Option C</VoidableUI.Components.radio>
      </VoidableUI.Components.radio_group>
    </div>
    <div class="showcase-section">
      <h3>Horizontal Orientation</h3>
      <VoidableUI.Components.radio_group label="Alignment" name="align" value="left" orientation="horizontal">
        <VoidableUI.Components.radio value="left">Left</VoidableUI.Components.radio>
        <VoidableUI.Components.radio value="center">Center</VoidableUI.Components.radio>
        <VoidableUI.Components.radio value="right">Right</VoidableUI.Components.radio>
      </VoidableUI.Components.radio_group>
    </div>
    <div class="showcase-section">
      <h3>With Disabled Option</h3>
      <VoidableUI.Components.radio_group label="Plan" name="plan" value="basic">
        <VoidableUI.Components.radio value="basic">Basic</VoidableUI.Components.radio>
        <VoidableUI.Components.radio value="pro">Pro</VoidableUI.Components.radio>
        <VoidableUI.Components.radio value="enterprise" disabled>Enterprise (contact sales)</VoidableUI.Components.radio>
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
      <VoidableUI.Components.checkbox_group label="Options">
        <VoidableUI.Components.checkbox value="a">Option A</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox value="b">Option B</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox value="c">Option C</VoidableUI.Components.checkbox>
      </VoidableUI.Components.checkbox_group>
    </div>
    <div class="showcase-section">
      <h3>Horizontal Orientation</h3>
      <VoidableUI.Components.checkbox_group label="Flavors" orientation="horizontal">
        <VoidableUI.Components.checkbox value="vanilla">Vanilla</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox value="chocolate">Chocolate</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox value="strawberry">Strawberry</VoidableUI.Components.checkbox>
      </VoidableUI.Components.checkbox_group>
    </div>
    <div class="showcase-section">
      <h3>Pre-Selected</h3>
      <VoidableUI.Components.checkbox_group label="Permissions">
        <VoidableUI.Components.checkbox value="read" checked>Read</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox value="write">Write</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox value="delete" checked>Delete</VoidableUI.Components.checkbox>
      </VoidableUI.Components.checkbox_group>
    </div>
    <div class="showcase-section">
      <h3>With Disabled</h3>
      <VoidableUI.Components.checkbox_group label="Status">
        <VoidableUI.Components.checkbox value="active" checked>Active</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox value="pending" disabled>Pending</VoidableUI.Components.checkbox>
        <VoidableUI.Components.checkbox value="archived">Archived</VoidableUI.Components.checkbox>
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
      <VoidableUI.Components.combobox placeholder="Select a framework...">
        <VoidableUI.Components.option value="react">React</VoidableUI.Components.option>
        <VoidableUI.Components.option value="vue">Vue</VoidableUI.Components.option>
        <VoidableUI.Components.option value="svelte">Svelte</VoidableUI.Components.option>
        <VoidableUI.Components.option value="angular">Angular</VoidableUI.Components.option>
        <VoidableUI.Components.option value="solid">Solid</VoidableUI.Components.option>
        <VoidableUI.Components.option value="lit">Lit</VoidableUI.Components.option>
      </VoidableUI.Components.combobox>
    </div>
    <div class="showcase-section">
      <h3>States</h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <VoidableUI.Components.combobox placeholder="Disabled" disabled>
          <VoidableUI.Components.option value="react">React</VoidableUI.Components.option>
          <VoidableUI.Components.option value="vue">Vue</VoidableUI.Components.option>
        </VoidableUI.Components.combobox>
        <VoidableUI.Components.combobox placeholder="With error" error="Please select an option">
          <VoidableUI.Components.option value="react">React</VoidableUI.Components.option>
          <VoidableUI.Components.option value="vue">Vue</VoidableUI.Components.option>
        </VoidableUI.Components.combobox>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <VoidableUI.Components.combobox size="sm" placeholder="Small">
          <VoidableUI.Components.option value="a">Option A</VoidableUI.Components.option>
          <VoidableUI.Components.option value="b">Option B</VoidableUI.Components.option>
          <VoidableUI.Components.option value="c">Option C</VoidableUI.Components.option>
        </VoidableUI.Components.combobox>
        <VoidableUI.Components.combobox placeholder="Medium">
          <VoidableUI.Components.option value="a">Option A</VoidableUI.Components.option>
          <VoidableUI.Components.option value="b">Option B</VoidableUI.Components.option>
          <VoidableUI.Components.option value="c">Option C</VoidableUI.Components.option>
        </VoidableUI.Components.combobox>
        <VoidableUI.Components.combobox size="lg" placeholder="Large">
          <VoidableUI.Components.option value="a">Option A</VoidableUI.Components.option>
          <VoidableUI.Components.option value="b">Option B</VoidableUI.Components.option>
          <VoidableUI.Components.option value="c">Option C</VoidableUI.Components.option>
        </VoidableUI.Components.combobox>
        <VoidableUI.Components.combobox size="xl" placeholder="XL">
          <VoidableUI.Components.option value="a">Option A</VoidableUI.Components.option>
          <VoidableUI.Components.option value="b">Option B</VoidableUI.Components.option>
          <VoidableUI.Components.option value="c">Option C</VoidableUI.Components.option>
        </VoidableUI.Components.combobox>
        <VoidableUI.Components.combobox size="xxl" placeholder="XXL">
          <VoidableUI.Components.option value="a">Option A</VoidableUI.Components.option>
          <VoidableUI.Components.option value="b">Option B</VoidableUI.Components.option>
          <VoidableUI.Components.option value="c">Option C</VoidableUI.Components.option>
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
      <VoidableUI.Components.multiselect placeholder="Select frameworks...">
        <VoidableUI.Components.option value="react">React</VoidableUI.Components.option>
        <VoidableUI.Components.option value="vue">Vue</VoidableUI.Components.option>
        <VoidableUI.Components.option value="svelte">Svelte</VoidableUI.Components.option>
        <VoidableUI.Components.option value="angular">Angular</VoidableUI.Components.option>
        <VoidableUI.Components.option value="solid">Solid</VoidableUI.Components.option>
        <VoidableUI.Components.option value="lit">Lit</VoidableUI.Components.option>
      </VoidableUI.Components.multiselect>
    </div>
    <div class="showcase-section">
      <h3>Preselected</h3>
      <VoidableUI.Components.multiselect placeholder="Select frameworks...">
        <VoidableUI.Components.option value="react" selected>React</VoidableUI.Components.option>
        <VoidableUI.Components.option value="vue" selected>Vue</VoidableUI.Components.option>
        <VoidableUI.Components.option value="svelte" selected>Svelte</VoidableUI.Components.option>
        <VoidableUI.Components.option value="angular">Angular</VoidableUI.Components.option>
        <VoidableUI.Components.option value="solid">Solid</VoidableUI.Components.option>
        <VoidableUI.Components.option value="lit">Lit</VoidableUI.Components.option>
      </VoidableUI.Components.multiselect>
    </div>
    <div class="showcase-section">
      <h3>States</h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <VoidableUI.Components.multiselect placeholder="Disabled" disabled>
          <VoidableUI.Components.option value="react">React</VoidableUI.Components.option>
          <VoidableUI.Components.option value="vue">Vue</VoidableUI.Components.option>
        </VoidableUI.Components.multiselect>
        <VoidableUI.Components.multiselect placeholder="With error" error="Please select at least one option">
          <VoidableUI.Components.option value="react">React</VoidableUI.Components.option>
          <VoidableUI.Components.option value="vue">Vue</VoidableUI.Components.option>
        </VoidableUI.Components.multiselect>
      </div>
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <VoidableUI.Components.multiselect size="sm" placeholder="Small">
          <VoidableUI.Components.option value="a">Option A</VoidableUI.Components.option>
          <VoidableUI.Components.option value="b">Option B</VoidableUI.Components.option>
        </VoidableUI.Components.multiselect>
        <VoidableUI.Components.multiselect placeholder="Medium">
          <VoidableUI.Components.option value="a">Option A</VoidableUI.Components.option>
          <VoidableUI.Components.option value="b">Option B</VoidableUI.Components.option>
        </VoidableUI.Components.multiselect>
        <VoidableUI.Components.multiselect size="lg" placeholder="Large">
          <VoidableUI.Components.option value="a">Option A</VoidableUI.Components.option>
          <VoidableUI.Components.option value="b">Option B</VoidableUI.Components.option>
        </VoidableUI.Components.multiselect>
        <VoidableUI.Components.multiselect size="xl" placeholder="XL">
          <VoidableUI.Components.option value="a">Option A</VoidableUI.Components.option>
          <VoidableUI.Components.option value="b">Option B</VoidableUI.Components.option>
        </VoidableUI.Components.multiselect>
        <VoidableUI.Components.multiselect size="xxl" placeholder="XXL">
          <VoidableUI.Components.option value="a">Option A</VoidableUI.Components.option>
          <VoidableUI.Components.option value="b">Option B</VoidableUI.Components.option>
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
      <VoidableUI.Components.slider value={50} min={0} max={100} />
    </div>
    <div class="showcase-section">
      <h3>With Value Display</h3>
      <VoidableUI.Components.slider value={65} min={0} max={100} show_value />
    </div>
    <div class="showcase-section">
      <h3>With Step</h3>
      <VoidableUI.Components.slider value={5} min={0} max={10} step={1} show_value />
    </div>
    <div class="showcase-section">
      <h3>Disabled</h3>
      <VoidableUI.Components.slider value={35} min={0} max={100} disabled show_value />
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <VoidableUI.Components.slider size="sm" value={40} min={0} max={100} show_value />
        <VoidableUI.Components.slider value={50} min={0} max={100} show_value />
        <VoidableUI.Components.slider size="lg" value={60} min={0} max={100} show_value />
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
      <VoidableUI.Components.file_upload />
    </div>
    <div class="showcase-section">
      <h3>Multiple Files</h3>
      <VoidableUI.Components.file_upload multiple />
    </div>
    <div class="showcase-section">
      <h3>Accept Images</h3>
      <VoidableUI.Components.file_upload accept="image/*" multiple />
    </div>
    <div class="showcase-section">
      <h3>States</h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <VoidableUI.Components.file_upload disabled />
        <VoidableUI.Components.file_upload error="File upload failed. Please try again." />
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
      <VoidableUI.Components.switch />
    </div>
    <div class="showcase-section">
      <h3>Checked (On)</h3>
      <VoidableUI.Components.switch checked />
    </div>
    <div class="showcase-section">
      <h3>Colors</h3>
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <VoidableUI.Components.switch checked />
        <VoidableUI.Components.switch color="error" checked />
        <VoidableUI.Components.switch color="warning" checked />
        <VoidableUI.Components.switch color="success" checked />
        <VoidableUI.Components.switch color="info" checked />
        <VoidableUI.Components.switch color="notice" checked />
      </div>
    </div>
    <div class="showcase-section">
      <h3>Sizes</h3>
      <div style="display: flex; gap: 1rem; align-items: center;">
        <VoidableUI.Components.switch size="sm" />
        <VoidableUI.Components.switch />
        <VoidableUI.Components.switch size="lg" />
        <VoidableUI.Components.switch size="xl" />
        <VoidableUI.Components.switch size="xxl" />
      </div>
    </div>
    <div class="showcase-section">
      <h3>Disabled</h3>
      <div style="display: flex; gap: 1rem; align-items: center;">
        <VoidableUI.Components.switch disabled />
        <VoidableUI.Components.switch disabled checked />
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
      <VoidableUI.Components.compose_input placeholder="Type a message..." />
    </div>
    <div class="showcase-section">
      <h3>With Max Length</h3>
      <VoidableUI.Components.compose_input placeholder="Max 100 characters..." maxlength={100} />
    </div>
    <div class="showcase-section">
      <h3>Custom Placeholder</h3>
      <VoidableUI.Components.compose_input placeholder="Ask anything..." />
    </div>
    <div class="showcase-section">
      <h3>Disabled</h3>
      <VoidableUI.Components.compose_input placeholder="Cannot send messages" disabled />
    </div>
    """
  end
end
