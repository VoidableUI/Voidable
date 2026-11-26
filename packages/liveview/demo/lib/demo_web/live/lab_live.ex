defmodule DemoWeb.LabLive do
  @moduledoc """
  A page for the browser tests in `tests/browser/server/phoenix/`, and for
  trying LiveView patches against Voidable components by hand.

  It holds a form with every common control, server updates that arrive while
  the user is using the page (buttons, and a timer that changes text inside
  components every 100 ms), a dialog the server opens and closes, overlays the
  client owns, an event log fed by the `VoidEvent` hook, and links for live
  navigation to a second page.
  """
  use DemoWeb, :live_view

  alias VoidableUI.Components, as: V

  @defaults %{
    "name" => "",
    "email" => "",
    "bio" => "",
    "country" => "",
    "remember_me" => nil,
    "plan" => "free",
    "volume" => "50",
    "seats" => "2",
    "start" => "",
    "tags" => "",
    "framework" => "",
    "skills" => nil,
    "newsletter" => nil
  }

  @tick_ms 100

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     socket
     |> assign(
       page_title: "Lab",
       v: 1,
       ticks: 0,
       timer: false,
       f: @defaults,
       changes: 0,
       saved: nil,
       dialog_open: false,
       tab: nil,
       events: []
     )}
  end

  @impl true
  def handle_params(params, _uri, socket) do
    {:noreply, assign(socket, :patched, params["patched"])}
  end

  # The form: every change is echoed back as the new server state, as in a typical LiveView app.
  @impl true
  def handle_event("validate", %{"user" => user}, socket) do
    {:noreply, assign(socket, f: user, changes: socket.assigns.changes + 1)}
  end

  def handle_event("save", %{"user" => user}, socket) do
    {:noreply, assign(socket, f: user, saved: user)}
  end

  def handle_event("bump", _params, socket) do
    {:noreply, assign(socket, :v, socket.assigns.v + 1)}
  end

  # The server changes what it rendered for these controls: it must win over what the user did.
  def handle_event("server_sets", _params, socket) do
    f =
      Map.merge(socket.assigns.f, %{
        "name" => "Set by the server",
        "country" => "fj",
        "plan" => "team",
        "remember_me" => "1",
        "newsletter" => "yes",
        "volume" => "80"
      })

    {:noreply, assign(socket, f: f, v: socket.assigns.v + 1)}
  end

  def handle_event("timer", %{"on" => on}, socket) do
    on? = on == "1"
    if on? and not socket.assigns.timer, do: Process.send_after(self(), :tick, @tick_ms)
    {:noreply, assign(socket, :timer, on?)}
  end

  def handle_event("open_dialog", _params, socket), do: {:noreply, assign(socket, :dialog_open, true)}
  def handle_event("close_dialog", _params, socket), do: {:noreply, assign(socket, :dialog_open, false)}

  def handle_event("close_dialog_later", _params, socket) do
    Process.send_after(self(), :close_dialog, 400)
    {:noreply, socket}
  end

  def handle_event("open_dialog_later", _params, socket) do
    Process.send_after(self(), :open_dialog, 400)
    {:noreply, socket}
  end

  def handle_event("server_tab", %{"tab" => tab}, socket), do: {:noreply, assign(socket, :tab, tab)}

  # Voidable events pushed by the `VoidEvent` hook, on the elements that pass `events`. The dialog's close also tells the server.
  def handle_event("void-close", %{"id" => "dlg"} = params, socket) do
    {:noreply, socket |> log_event("void-close", params) |> assign(:dialog_open, false)}
  end

  def handle_event("void-" <> _ = event, params, socket) do
    {:noreply, log_event(socket, event, params)}
  end

  def handle_event(_event, _params, socket), do: {:noreply, socket}

  @impl true
  def handle_info(:tick, socket) do
    if socket.assigns.timer, do: Process.send_after(self(), :tick, @tick_ms)
    {:noreply, assign(socket, :ticks, socket.assigns.ticks + 1)}
  end

  def handle_info(:close_dialog, socket), do: {:noreply, assign(socket, :dialog_open, false)}
  def handle_info(:open_dialog, socket), do: {:noreply, assign(socket, :dialog_open, true)}

  defp log_event(socket, event, params) do
    entry = %{
      event: event,
      id: params["id"],
      name: params["name"],
      detail: params["detail"]
    }

    assign(socket, :events, Enum.take([entry | socket.assigns.events], 20))
  end

  defp checked?(f, key), do: not is_nil(f[key])
  defp skills(f), do: List.wrap(f["skills"])

  @impl true
  def render(assigns) do
    ~H"""
    <main style="padding: 1.5rem; max-width: 900px; display: grid; gap: 1.5rem">
      <h1>LiveView lab</h1>
      <nav style="display: flex; gap: 1rem">
        <.link navigate={~p"/lab/two"} id="to-two">Page two</.link>
        <.link patch={~p"/lab?patched=yes"} id="patch-self">Patch this page</.link>
        <span id="patched">{@patched || "no"}</span>
      </nav>

      <section style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap">
        <span id="version">Server version {@v}</span>
        <span id="ticks">Ticks {@ticks}</span>
        <span id="changes">Changes {@changes}</span>
        <button id="bump" type="button" phx-click="bump">Bump</button>
        <button id="server-sets" type="button" phx-click="server_sets">Server sets values</button>
        <button id="timer-on" type="button" phx-click="timer" phx-value-on="1">Start timer</button>
        <button id="timer-off" type="button" phx-click="timer" phx-value-on="0">Stop timer</button>
      </section>

      <form id="f" phx-change="validate" phx-submit="save" style="display: grid; gap: 1rem">
        <V.field label="Full name">
          <V.input id="i-name" name="user[name]" value={@f["name"]} />
        </V.field>
        <V.field label="Email">
          <V.input id="i-email" type="email" name="user[email]" value={@f["email"]} />
        </V.field>
        <V.field label="Bio">
          <V.textarea id="i-bio" name="user[bio]" value={@f["bio"]} />
        </V.field>
        <V.field label="Country">
          <V.select id="i-country" value={@f["country"]}>
            <select name="user[country]">
              <option value="" disabled selected hidden>Choose…</option>
              <option value="nz">New Zealand ({@ticks})</option>
              <option value="au">Australia</option>
              <option value="fj">Fiji</option>
            </select>
          </V.select>
        </V.field>
        <V.checkbox id="i-remember" name="user[remember_me]" value="1" checked={checked?(@f, "remember_me")}>
          Remember me
        </V.checkbox>
        <V.radio_group id="i-plan" name="user[plan]" label="Plan" value={@f["plan"]}>
          <V.radio value="free">Free</V.radio>
          <V.radio value="pro">Pro</V.radio>
          <V.radio value="team">Team</V.radio>
        </V.radio_group>
        <V.field label="Volume">
          <V.slider id="i-vol" name="user[volume]" min={0} max={100} step={5} value={@f["volume"]} />
        </V.field>
        <V.switch id="i-news" name="user[newsletter]" value="yes" aria-label="Newsletter" checked={checked?(@f, "newsletter")} />
        <V.field label="Seats">
          <V.number_input id="i-seats" name="user[seats]" min={1} max={10} value={@f["seats"]} />
        </V.field>
        <V.field label="Start date">
          <V.date_picker id="i-date" name="user[start]" value={@f["start"]} />
        </V.field>
        <V.field label="Tags">
          <V.tags_input id="i-tags" name="user[tags][]" />
        </V.field>
        <V.field label="Framework">
          <V.combobox id="i-fw" name="user[framework]" placeholder="Pick" value={@f["framework"]}>
            <void-combobox-content>
              <V.option value="react">React</V.option>
              <V.option value="vue">Vue</V.option>
              <V.option value="lit">Lit</V.option>
            </void-combobox-content>
          </V.combobox>
        </V.field>
        <V.field label="Skills">
          <V.multiselect id="i-skills" name="user[skills][]" placeholder="Pick many">
            <void-multiselect-content>
              <V.option value="css" selected={"css" in skills(@f)}>CSS</V.option>
              <V.option value="js" selected={"js" in skills(@f)}>JS</V.option>
              <V.option value="html" selected={"html" in skills(@f)}>HTML</V.option>
            </void-multiselect-content>
          </V.multiselect>
        </V.field>
        <div style="display: flex; gap: 1rem">
          <button id="save" type="submit">Save</button>
        </div>
      </form>
      <pre id="saved">{Jason.encode!(@saved)}</pre>
      <pre id="current">{Jason.encode!(@f)}</pre>

      <section style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap">
        <button id="open-dlg" type="button" phx-click="open_dialog">Open dialog</button>
        <button id="open-dlg-later" type="button" phx-click="open_dialog_later">Open dialog in 400 ms</button>
        <button id="close-dlg-later" type="button" phx-click="close_dialog_later">Close dialog in 400 ms</button>
        <span id="dialog-state">Server thinks the dialog is {if @dialog_open, do: "open", else: "closed"}</span>
      </section>
      <V.dialog id="dlg" open={@dialog_open} events={["void-close"]}>
        <void-dialog-title>Server dialog</void-dialog-title>
        <void-dialog-body>
          <p id="dlg-body">Dialog body, ticks {@ticks}</p>
        </void-dialog-body>
        <void-dialog-actions>
          <button id="dlg-bump" type="button" phx-click="bump">Bump from inside</button>
        </void-dialog-actions>
      </V.dialog>

      <section style="display: flex; gap: 2rem; align-items: flex-start; flex-wrap: wrap">
        <V.dropdown_menu id="dd">
          <void-dropdown-menu-trigger><button id="dd-trigger" type="button">Actions {@ticks}</button></void-dropdown-menu-trigger>
          <void-dropdown-menu-content>
            <V.dropdown_menu_item>Rename</V.dropdown_menu_item>
            <V.dropdown_menu_item>Archive</V.dropdown_menu_item>
          </void-dropdown-menu-content>
        </V.dropdown_menu>
        <V.tabs id="tabs" value={@tab}>
          <void-tabs-list>
            <void-tabs-trigger value="one">One</void-tabs-trigger>
            <void-tabs-trigger value="two">Two</void-tabs-trigger>
          </void-tabs-list>
          <void-tabs-content value="one">Panel one, version {@v}</void-tabs-content>
          <void-tabs-content value="two">Panel two, ticks {@ticks}</void-tabs-content>
        </V.tabs>
        <button id="server-tab" type="button" phx-click="server_tab" phx-value-tab="two">Server selects tab two</button>
      </section>

      <section style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap">
        <V.button id="bridge-btn" variant="filled" name="bridge" events>Bridge button</V.button>
        <V.select id="bridge-select" aria-label="Bridge select" events>
          <select name="bridge_select">
            <option value="" disabled selected hidden>Bridge select</option>
            <option value="a">A</option>
            <option value="b">B</option>
          </select>
        </V.select>
        <V.checkbox id="bridge-check" name="bridge_check" value="1" events>Bridge check</V.checkbox>
        <V.switch id="bridge-switch" name="bridge_switch" events>Bridge switch</V.switch>
        <V.input id="bridge-input" name="bridge_input" placeholder="Bridge input" events />
      </section>
      <pre id="events">{Jason.encode!(Enum.reverse(@events))}</pre>
    </main>
    """
  end
end
