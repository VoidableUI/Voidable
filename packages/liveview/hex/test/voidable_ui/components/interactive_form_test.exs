defmodule VoidableUI.Components.InteractiveFormTest do
  use ExUnit.Case, async: true

  import Phoenix.Component
  import Phoenix.LiveViewTest

  # ==========================================================================
  # 1. Input
  # ==========================================================================

  describe "input" do
    test "renders void-input tag" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.input />
        """)

      assert html =~ "<void-input"
      assert html =~ "</void-input>"
    end

    test "renders with named attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.input type="email" placeholder="Enter email" name="user_email" value="a@b.com" size="sm" error="Invalid" />
        """)

      assert html =~ ~s(type="email")
      assert html =~ ~s(placeholder="Enter email")
      assert html =~ ~s(name="user_email")
      assert html =~ ~s(value="a@b.com")
      assert html =~ ~s(size="sm")
      assert html =~ ~s(error="Invalid")
    end

    test "has phx-hook and data-void-events" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.input />
        """)

      assert html =~ ~s(phx-hook="VoidEvent")
      assert html =~ ~s(data-void-events="void-input,void-change")
    end

    test "boolean attrs render when true" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.input disabled={true} readonly={true} required={true} />
        """)

      assert html =~ "disabled"
      assert html =~ "readonly"
      assert html =~ "required"
    end

    test "boolean attrs omitted when false (default)" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.input />
        """)

      refute html =~ "disabled"
      refute html =~ "readonly"
      refute html =~ "required"
    end

    test "nil default attrs are not rendered" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.input />
        """)

      refute html =~ "type="
      refute html =~ "value="
      refute html =~ "placeholder="
      refute html =~ "name="
      refute html =~ "size="
      refute html =~ "error="
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.input id="my-input" class="custom" data-testid="test" />
        """)

      assert html =~ ~s(id="my-input")
      assert html =~ ~s(class="custom")
      assert html =~ ~s(data-testid="test")
    end
  end

  # ==========================================================================
  # 2. Textarea
  # ==========================================================================

  describe "textarea" do
    test "renders void-textarea tag" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.textarea />
        """)

      assert html =~ "<void-textarea"
      assert html =~ "</void-textarea>"
    end

    test "renders with named attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.textarea placeholder="Write..." name="body" rows={5} resize="vertical" size="lg" error="Too short" value="hello" />
        """)

      assert html =~ ~s(placeholder="Write...")
      assert html =~ ~s(name="body")
      assert html =~ ~s(rows="5")
      assert html =~ ~s(resize="vertical")
      assert html =~ ~s(size="lg")
      assert html =~ ~s(error="Too short")
      assert html =~ ~s(value="hello")
    end

    test "has phx-hook and data-void-events" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.textarea />
        """)

      assert html =~ ~s(phx-hook="VoidEvent")
      assert html =~ ~s(data-void-events="void-input,void-change")
    end

    test "boolean attrs render when true" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.textarea disabled={true} readonly={true} required={true} />
        """)

      assert html =~ "disabled"
      assert html =~ "readonly"
      assert html =~ "required"
    end

    test "boolean attrs omitted when false (default)" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.textarea />
        """)

      refute html =~ "disabled"
      refute html =~ "readonly"
      refute html =~ "required"
    end

    test "nil default attrs are not rendered" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.textarea />
        """)

      refute html =~ "value="
      refute html =~ "placeholder="
      refute html =~ "name="
      refute html =~ "rows="
      refute html =~ "resize="
      refute html =~ "size="
      refute html =~ "error="
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.textarea id="ta" class="wide" />
        """)

      assert html =~ ~s(id="ta")
      assert html =~ ~s(class="wide")
    end
  end

  # ==========================================================================
  # 3. Select
  # ==========================================================================

  describe "select" do
    test "renders void-select tag with slot content" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.select>
          <option value="a">A</option>
        </VoidableUI.Components.select>
        """)

      assert html =~ "<void-select"
      assert html =~ "</void-select>"
      assert html =~ ~s(<option value="a">A</option>)
    end

    test "renders with named attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.select name="country" value="us" placeholder="Pick..." size="sm" error="Required">
          <option value="us">US</option>
        </VoidableUI.Components.select>
        """)

      assert html =~ ~s(name="country")
      assert html =~ ~s(value="us")
      assert html =~ ~s(placeholder="Pick...")
      assert html =~ ~s(size="sm")
      assert html =~ ~s(error="Required")
    end

    test "has phx-hook and data-void-events" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.select><option value="x">X</option></VoidableUI.Components.select>
        """)

      assert html =~ ~s(phx-hook="VoidEvent")
      assert html =~ ~s(data-void-events="void-change")
    end

    test "boolean attrs render when true" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.select disabled={true} required={true}>
          <option value="x">X</option>
        </VoidableUI.Components.select>
        """)

      assert html =~ "disabled"
      assert html =~ "required"
    end

    test "boolean attrs omitted when false (default)" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.select><option value="x">X</option></VoidableUI.Components.select>
        """)

      refute html =~ "disabled"
      refute html =~ "required"
    end

    test "nil default attrs are not rendered" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.select><option value="x">X</option></VoidableUI.Components.select>
        """)

      refute html =~ ~r/void-select[^>]*\svalue=/
      refute html =~ ~r/void-select[^>]*\sname=/
      refute html =~ ~r/void-select[^>]*\ssize=/
      refute html =~ ~r/void-select[^>]*\serror=/
      refute html =~ ~r/void-select[^>]*\splaceholder=/
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.select id="sel" class="wide"><option value="x">X</option></VoidableUI.Components.select>
        """)

      assert html =~ ~s(id="sel")
      assert html =~ ~s(class="wide")
    end
  end

  # ==========================================================================
  # 4. Checkbox
  # ==========================================================================

  describe "checkbox" do
    test "renders void-checkbox tag" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.checkbox />
        """)

      assert html =~ "<void-checkbox"
      assert html =~ "</void-checkbox>"
    end

    test "renders with slot content" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.checkbox>Accept terms</VoidableUI.Components.checkbox>
        """)

      assert html =~ "Accept terms"
    end

    test "renders with named attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.checkbox name="agree" value="yes" color="primary" size="sm" />
        """)

      assert html =~ ~s(name="agree")
      assert html =~ ~s(value="yes")
      assert html =~ ~s(color="primary")
      assert html =~ ~s(size="sm")
    end

    test "has phx-hook and data-void-events" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.checkbox />
        """)

      assert html =~ ~s(phx-hook="VoidEvent")
      assert html =~ ~s(data-void-events="void-change")
    end

    test "boolean attrs render when true" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.checkbox checked={true} disabled={true} indeterminate={true} />
        """)

      assert html =~ "checked"
      assert html =~ "disabled"
      assert html =~ "indeterminate"
    end

    test "boolean attrs omitted when false (default)" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.checkbox />
        """)

      refute html =~ "checked"
      refute html =~ "disabled"
      refute html =~ "indeterminate"
    end

    test "nil default attrs are not rendered" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.checkbox />
        """)

      refute html =~ "name="
      refute html =~ "value="
      refute html =~ "color="
      refute html =~ "size="
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.checkbox id="cb1" class="check" />
        """)

      assert html =~ ~s(id="cb1")
      assert html =~ ~s(class="check")
    end
  end

  # ==========================================================================
  # 5. Radio
  # ==========================================================================

  describe "radio" do
    test "renders void-radio tag" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.radio />
        """)

      assert html =~ "<void-radio"
      assert html =~ "</void-radio>"
    end

    test "renders with slot content" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.radio>Option A</VoidableUI.Components.radio>
        """)

      assert html =~ "Option A"
    end

    test "renders with named attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.radio name="color" value="red" color="danger" size="lg" />
        """)

      assert html =~ ~s(name="color")
      assert html =~ ~s(value="red")
      assert html =~ ~s(color="danger")
      assert html =~ ~s(size="lg")
    end

    test "has phx-hook and data-void-events" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.radio />
        """)

      assert html =~ ~s(phx-hook="VoidEvent")
      assert html =~ ~s(data-void-events="void-change")
    end

    test "boolean attrs render when true" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.radio checked={true} disabled={true} />
        """)

      assert html =~ "checked"
      assert html =~ "disabled"
    end

    test "boolean attrs omitted when false (default)" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.radio />
        """)

      refute html =~ "checked"
      refute html =~ "disabled"
    end

    test "nil default attrs are not rendered" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.radio />
        """)

      refute html =~ "name="
      refute html =~ "value="
      refute html =~ "color="
      refute html =~ "size="
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.radio id="r1" class="opt" />
        """)

      assert html =~ ~s(id="r1")
      assert html =~ ~s(class="opt")
    end
  end

  # ==========================================================================
  # 6. RadioGroup
  # ==========================================================================

  describe "radio_group" do
    test "renders void-radio-group tag with slot content" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.radio_group>
          <VoidableUI.Components.radio value="a">A</VoidableUI.Components.radio>
        </VoidableUI.Components.radio_group>
        """)

      assert html =~ "<void-radio-group"
      assert html =~ "</void-radio-group>"
      assert html =~ "<void-radio"
    end

    test "renders with named attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.radio_group label="Pick one" value="b" name="choice" orientation="horizontal">
          <VoidableUI.Components.radio value="b">B</VoidableUI.Components.radio>
        </VoidableUI.Components.radio_group>
        """)

      assert html =~ ~s(label="Pick one")
      assert html =~ ~s(value="b")
      assert html =~ ~s(name="choice")
      assert html =~ ~s(orientation="horizontal")
    end

    test "has phx-hook and data-void-events" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.radio_group>
          <VoidableUI.Components.radio value="x">X</VoidableUI.Components.radio>
        </VoidableUI.Components.radio_group>
        """)

      assert html =~ ~s(phx-hook="VoidEvent")
      assert html =~ ~s(data-void-events="void-change")
    end

    test "nil default attrs are not rendered" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.radio_group>
          <VoidableUI.Components.radio value="x">X</VoidableUI.Components.radio>
        </VoidableUI.Components.radio_group>
        """)

      refute html =~ "label="
      refute html =~ ~r/void-radio-group[^>]*\svalue=/
      refute html =~ ~r/void-radio-group[^>]*\sname=/
      refute html =~ "orientation="
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.radio_group id="rg1" class="group">
          <VoidableUI.Components.radio value="x">X</VoidableUI.Components.radio>
        </VoidableUI.Components.radio_group>
        """)

      assert html =~ ~s(id="rg1")
      assert html =~ ~s(class="group")
    end
  end

  # ==========================================================================
  # 7. CheckboxGroup
  # ==========================================================================

  describe "checkbox_group" do
    test "renders void-checkbox-group tag with slot content" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.checkbox_group>
          <VoidableUI.Components.checkbox value="a">A</VoidableUI.Components.checkbox>
        </VoidableUI.Components.checkbox_group>
        """)

      assert html =~ "<void-checkbox-group"
      assert html =~ "</void-checkbox-group>"
      assert html =~ "<void-checkbox"
    end

    test "renders with named attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.checkbox_group label="Select all" orientation="horizontal">
          <VoidableUI.Components.checkbox value="a">A</VoidableUI.Components.checkbox>
        </VoidableUI.Components.checkbox_group>
        """)

      assert html =~ ~s(label="Select all")
      assert html =~ ~s(orientation="horizontal")
    end

    test "has phx-hook and data-void-events" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.checkbox_group>
          <VoidableUI.Components.checkbox value="a">A</VoidableUI.Components.checkbox>
        </VoidableUI.Components.checkbox_group>
        """)

      assert html =~ ~s(phx-hook="VoidEvent")
      assert html =~ ~s(data-void-events="void-change")
    end

    test "nil default attrs are not rendered" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.checkbox_group>
          <VoidableUI.Components.checkbox value="a">A</VoidableUI.Components.checkbox>
        </VoidableUI.Components.checkbox_group>
        """)

      refute html =~ ~r/void-checkbox-group[^>]*\slabel=/
      refute html =~ ~r/void-checkbox-group[^>]*\sorientation=/
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.checkbox_group id="cg1" class="checks">
          <VoidableUI.Components.checkbox value="a">A</VoidableUI.Components.checkbox>
        </VoidableUI.Components.checkbox_group>
        """)

      assert html =~ ~s(id="cg1")
      assert html =~ ~s(class="checks")
    end
  end

  # ==========================================================================
  # 8. Combobox
  # ==========================================================================

  describe "combobox" do
    test "renders void-combobox tag with slot content" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.combobox>
          <VoidableUI.Components.option value="a">A</VoidableUI.Components.option>
        </VoidableUI.Components.combobox>
        """)

      assert html =~ "<void-combobox"
      assert html =~ "</void-combobox>"
      assert html =~ "<void-option"
    end

    test "renders with named attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.combobox value="b" placeholder="Search..." name="search" size="lg" error="Not found">
          <VoidableUI.Components.option value="b">B</VoidableUI.Components.option>
        </VoidableUI.Components.combobox>
        """)

      assert html =~ ~s(value="b")
      assert html =~ ~s(placeholder="Search...")
      assert html =~ ~s(name="search")
      assert html =~ ~s(size="lg")
      assert html =~ ~s(error="Not found")
    end

    test "has phx-hook and data-void-events" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.combobox>
          <VoidableUI.Components.option value="x">X</VoidableUI.Components.option>
        </VoidableUI.Components.combobox>
        """)

      assert html =~ ~s(phx-hook="VoidEvent")
      assert html =~ ~s(data-void-events="void-change")
    end

    test "boolean attrs render when true" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.combobox disabled={true}>
          <VoidableUI.Components.option value="x">X</VoidableUI.Components.option>
        </VoidableUI.Components.combobox>
        """)

      assert html =~ "disabled"
    end

    test "boolean attrs omitted when false (default)" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.combobox>
          <VoidableUI.Components.option value="x">X</VoidableUI.Components.option>
        </VoidableUI.Components.combobox>
        """)

      refute html =~ "disabled"
    end

    test "nil default attrs are not rendered" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.combobox>
          <VoidableUI.Components.option value="x">X</VoidableUI.Components.option>
        </VoidableUI.Components.combobox>
        """)

      refute html =~ ~r/void-combobox[^>]*\svalue=/
      refute html =~ ~r/void-combobox[^>]*\splaceholder=/
      refute html =~ ~r/void-combobox[^>]*\sname=/
      refute html =~ ~r/void-combobox[^>]*\ssize=/
      refute html =~ ~r/void-combobox[^>]*\serror=/
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.combobox id="cb" class="search">
          <VoidableUI.Components.option value="x">X</VoidableUI.Components.option>
        </VoidableUI.Components.combobox>
        """)

      assert html =~ ~s(id="cb")
      assert html =~ ~s(class="search")
    end
  end

  # ==========================================================================
  # 9. Multiselect
  # ==========================================================================

  describe "multiselect" do
    test "renders void-multiselect tag with slot content" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.multiselect>
          <VoidableUI.Components.option value="a">A</VoidableUI.Components.option>
        </VoidableUI.Components.multiselect>
        """)

      assert html =~ "<void-multiselect"
      assert html =~ "</void-multiselect>"
      assert html =~ "<void-option"
    end

    test "renders with named attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.multiselect placeholder="Pick items" name="items" size="sm" error="Required">
          <VoidableUI.Components.option value="a">A</VoidableUI.Components.option>
        </VoidableUI.Components.multiselect>
        """)

      assert html =~ ~s(placeholder="Pick items")
      assert html =~ ~s(name="items")
      assert html =~ ~s(size="sm")
      assert html =~ ~s(error="Required")
    end

    test "has phx-hook and data-void-events" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.multiselect>
          <VoidableUI.Components.option value="x">X</VoidableUI.Components.option>
        </VoidableUI.Components.multiselect>
        """)

      assert html =~ ~s(phx-hook="VoidEvent")
      assert html =~ ~s(data-void-events="void-change")
    end

    test "boolean attrs render when true" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.multiselect disabled={true}>
          <VoidableUI.Components.option value="x">X</VoidableUI.Components.option>
        </VoidableUI.Components.multiselect>
        """)

      assert html =~ "disabled"
    end

    test "boolean attrs omitted when false (default)" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.multiselect>
          <VoidableUI.Components.option value="x">X</VoidableUI.Components.option>
        </VoidableUI.Components.multiselect>
        """)

      refute html =~ "disabled"
    end

    test "nil default attrs are not rendered" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.multiselect>
          <VoidableUI.Components.option value="x">X</VoidableUI.Components.option>
        </VoidableUI.Components.multiselect>
        """)

      refute html =~ "placeholder="
      refute html =~ ~r/void-multiselect[^>]*\sname=/
      refute html =~ ~r/void-multiselect[^>]*\ssize=/
      refute html =~ ~r/void-multiselect[^>]*\serror=/
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.multiselect id="ms1" class="multi">
          <VoidableUI.Components.option value="x">X</VoidableUI.Components.option>
        </VoidableUI.Components.multiselect>
        """)

      assert html =~ ~s(id="ms1")
      assert html =~ ~s(class="multi")
    end
  end

  # ==========================================================================
  # 10. Slider
  # ==========================================================================

  describe "slider" do
    test "renders void-slider tag" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.slider />
        """)

      assert html =~ "<void-slider"
    end

    test "renders with named attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.slider value={50} min={0} max={100} step={5} name="volume" size="lg" />
        """)

      assert html =~ ~s(value="50")
      assert html =~ ~s(min="0")
      assert html =~ ~s(max="100")
      assert html =~ ~s(step="5")
      assert html =~ ~s(name="volume")
      assert html =~ ~s(size="lg")
    end

    test "has phx-hook and data-void-events" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.slider />
        """)

      assert html =~ ~s(phx-hook="VoidEvent")
      assert html =~ ~s(data-void-events="void-input,void-change")
    end

    test "show_value maps to showValue attribute" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.slider show_value={true} />
        """)

      assert html =~ "showValue"
    end

    test "boolean attrs render when true" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.slider disabled={true} show_value={true} />
        """)

      assert html =~ "disabled"
      assert html =~ "showValue"
    end

    test "boolean attrs omitted when false (default)" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.slider />
        """)

      refute html =~ "disabled"
      refute html =~ "showValue"
    end

    test "nil default attrs are not rendered" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.slider />
        """)

      refute html =~ "value="
      refute html =~ "min="
      refute html =~ "max="
      refute html =~ "step="
      refute html =~ "name="
      refute html =~ "size="
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.slider id="sl1" class="range" />
        """)

      assert html =~ ~s(id="sl1")
      assert html =~ ~s(class="range")
    end
  end

  # ==========================================================================
  # 11. FileUpload
  # ==========================================================================

  describe "file_upload" do
    test "renders void-file-upload tag" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.file_upload />
        """)

      assert html =~ "<void-file-upload"
    end

    test "renders with named attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.file_upload accept=".pdf,.doc" error="Too large" />
        """)

      assert html =~ ~s(accept=".pdf,.doc")
      assert html =~ ~s(error="Too large")
    end

    test "has phx-hook and data-void-events" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.file_upload />
        """)

      assert html =~ ~s(phx-hook="VoidEvent")
      assert html =~ ~s(data-void-events="void-change")
    end

    test "max_size maps to maxSize attribute" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.file_upload max_size={5000} />
        """)

      assert html =~ ~s(maxSize="5000")
    end

    test "boolean attrs render when true" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.file_upload multiple={true} disabled={true} />
        """)

      assert html =~ "multiple"
      assert html =~ "disabled"
    end

    test "boolean attrs omitted when false (default)" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.file_upload />
        """)

      refute html =~ "multiple"
      refute html =~ "disabled"
    end

    test "nil default attrs are not rendered" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.file_upload />
        """)

      refute html =~ "accept="
      refute html =~ "maxSize="
      refute html =~ "error="
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.file_upload id="fu1" class="upload" />
        """)

      assert html =~ ~s(id="fu1")
      assert html =~ ~s(class="upload")
    end
  end

  # ==========================================================================
  # 12. Switch
  # ==========================================================================

  describe "switch" do
    test "renders void-switch tag" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.switch />
        """)

      assert html =~ "<void-switch"
    end

    test "renders with named attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.switch color="primary" size="sm" />
        """)

      assert html =~ ~s(color="primary")
      assert html =~ ~s(size="sm")
    end

    test "has phx-hook and data-void-events" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.switch />
        """)

      assert html =~ ~s(phx-hook="VoidEvent")
      assert html =~ ~s(data-void-events="void-change")
    end

    test "boolean attrs render when true" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.switch checked={true} disabled={true} />
        """)

      assert html =~ "checked"
      assert html =~ "disabled"
    end

    test "boolean attrs omitted when false (default)" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.switch />
        """)

      refute html =~ "checked"
      refute html =~ "disabled"
    end

    test "nil default attrs are not rendered" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.switch />
        """)

      refute html =~ "color="
      refute html =~ "size="
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.switch id="sw1" class="toggle" />
        """)

      assert html =~ ~s(id="sw1")
      assert html =~ ~s(class="toggle")
    end
  end

  # ==========================================================================
  # 13. ComposeInput
  # ==========================================================================

  describe "compose_input" do
    test "renders void-compose-input tag" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.compose_input />
        """)

      assert html =~ "<void-compose-input"
    end

    test "renders with named attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.compose_input value="hello" placeholder="Type a message..." maxlength={500} />
        """)

      assert html =~ ~s(value="hello")
      assert html =~ ~s(placeholder="Type a message...")
      assert html =~ ~s(maxlength="500")
    end

    test "has phx-hook and data-void-events for input and submit" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.compose_input />
        """)

      assert html =~ ~s(phx-hook="VoidEvent")
      assert html =~ ~s(data-void-events="void-input,void-submit")
    end

    test "boolean attrs render when true" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.compose_input disabled={true} />
        """)

      assert html =~ "disabled"
    end

    test "boolean attrs omitted when false (default)" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.compose_input />
        """)

      refute html =~ "disabled"
    end

    test "nil default attrs are not rendered" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.compose_input />
        """)

      refute html =~ "value="
      refute html =~ "placeholder="
      refute html =~ "maxlength="
    end

    test "passes through global attributes" do
      assigns = %{}

      html =
        rendered_to_string(~H"""
        <VoidableUI.Components.compose_input id="ci1" class="chat" />
        """)

      assert html =~ ~s(id="ci1")
      assert html =~ ~s(class="chat")
    end
  end
end
