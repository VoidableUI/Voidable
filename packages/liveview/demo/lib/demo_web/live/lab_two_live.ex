defmodule DemoWeb.LabTwoLive do
  @moduledoc """
  The second page of `DemoWeb.LabLive`'s live navigation test: another LiveView
  with its own components, reached with `<.link navigate>` and left again with
  the browser's back and forward buttons.
  """
  use DemoWeb, :live_view

  alias VoidableUI.Components, as: V

  @impl true
  def mount(_params, _session, socket) do
    {:ok, assign(socket, page_title: "Lab two", note: "", choice: "", count: 0)}
  end

  @impl true
  def handle_event("validate", params, socket) do
    {:noreply, assign(socket, note: params["note"] || socket.assigns.note, choice: params["choice"] || socket.assigns.choice)}
  end

  def handle_event("count", _params, socket), do: {:noreply, assign(socket, :count, socket.assigns.count + 1)}
  def handle_event(_event, _params, socket), do: {:noreply, socket}

  @impl true
  def render(assigns) do
    ~H"""
    <main style="padding: 1.5rem; max-width: 900px; display: grid; gap: 1.5rem">
      <h1>LiveView lab, page two</h1>
      <nav style="display: flex; gap: 1rem">
        <.link navigate={~p"/lab"} id="to-one">Page one</.link>
      </nav>
      <form id="g" phx-change="validate">
        <V.field label="Note">
          <V.input id="two-note" name="note" value={@note} />
        </V.field>
        <V.field label="Choice">
          <V.select id="two-choice" name="choice" value={@choice} placeholder="Choose…">
            <option value="x">Ex</option>
            <option value="y">Why</option>
          </V.select>
        </V.field>
      </form>
      <V.button id="two-count" variant="filled" phx-click="count" events>Count {@count}</V.button>
      <%!-- phx-click and phx-submit on the elements people put them on, without the event bridge. --%>
      <section id="clicks" style="display: flex; gap: 1rem; align-items: flex-start; flex-wrap: wrap">
        <V.button id="click-button" phx-click="count">Plain button</V.button>
        <V.tag id="click-tag" phx-click="count">Tag</V.tag>
        <V.card id="click-card" phx-click="count"><p>Card</p></V.card>
        <V.dropdown_menu id="click-dd">
          <button slot="trigger" id="click-dd-trigger" type="button">Menu</button>
          <V.dropdown_menu_item id="click-dd-item" phx-click="count">Dropdown item</V.dropdown_menu_item>
        </V.dropdown_menu>
        <V.menu id="click-menu" open>
          <V.menu_item id="click-menu-item" phx-click="count">Menu item</V.menu_item>
        </V.menu>
        <V.tabs id="click-tabs">
          <V.tab_panel tab="a" label="First">First panel</V.tab_panel>
          <V.tab_panel tab="b" label="Second" phx-click="count">Second panel</V.tab_panel>
        </V.tabs>
        <form id="click-form" phx-submit="count">
          <V.button id="click-submit" type="submit">Submit</V.button>
        </form>
      </section>
      <p id="two-note-echo">Server has note "{@note}" and choice "{@choice}"</p>
    </main>
    """
  end
end
