defmodule DemoWeb.ShowcaseLive do
  use DemoWeb, :live_view

  @components [
    {"Layout", [
      {"banner", "Banner"},
      {"card", "Card"},
      {"divider", "Divider"},
      {"nav_bar", "Nav Bar"},
      {"panel", "Panel"},
      {"scroll_area", "Scroll Area"},
      {"table", "Table"}
    ]},
    {"Data Display", [
      {"accordion", "Accordion"},
      {"avatar", "Avatar"},
      {"badge", "Badge"},
      {"breadcrumbs", "Breadcrumbs"},
      {"list", "List"},
      {"progress", "Progress"},
      {"skeleton", "Skeleton"},
      {"spinner", "Spinner"},
      {"status_dot", "Status Dot"},
      {"stepper", "Stepper"},
      {"tabs", "Tabs"},
      {"tooltip", "Tooltip"}
    ]},
    {"Forms", [
      {"checkbox", "Checkbox"},
      {"checkbox_group", "Checkbox Group"},
      {"combobox", "Combobox"},
      {"compose_input", "Compose Input"},
      {"field", "Field"},
      {"file_upload", "File Upload"},
      {"input", "Input"},
      {"multiselect", "Multiselect"},
      {"radio", "Radio"},
      {"radio_group", "Radio Group"},
      {"select", "Select"},
      {"slider", "Slider"},
      {"switch", "Switch"},
      {"textarea", "Textarea"}
    ]},
    {"Feedback", [
      {"alert", "Alert"},
      {"dialog", "Dialog"},
      {"drawer", "Drawer"},
      {"error_fallback", "Error Fallback"},
      {"popover", "Popover"},
      {"toast", "Toast"}
    ]},
    {"Actions", [
      {"button", "Button"},
      {"hamburger", "Hamburger"},
      {"pagination", "Pagination"},
      {"tag", "Tag"}
    ]}
  ]

  @impl true
  def mount(_params, _session, socket) do
    {:ok, assign(socket, components: @components, page_title: "Voidable UI — Component Showcase")}
  end

  @impl true
  def handle_params(params, _url, socket) do
    component = params["component"]

    label = find_label(component)

    socket = socket
      |> assign(:component, component)
      |> assign(:page_title, if(label, do: "#{label} — Voidable UI", else: "Voidable UI — Component Showcase"))

    {:noreply, socket}
  end

  defp find_label(nil), do: nil
  defp find_label(slug) do
    Enum.find_value(@components, fn {_cat, items} ->
      Enum.find_value(items, fn {s, label} -> if s == slug, do: label end)
    end)
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="showcase-layout">
      <nav class="showcase-sidebar">
        <div class="showcase-sidebar-header">
          <h1>Voidable UI</h1>
          <p>Component Showcase</p>
        </div>
        <div class="showcase-sidebar-nav">
          <%= for {category, items} <- @components do %>
            <div class="showcase-category">
              <h3 class="showcase-category-title"><%= category %></h3>
              <ul>
                <%= for {slug, label} <- items do %>
                  <li>
                    <.link
                      navigate={~p"/components/#{slug}"}
                      class={"showcase-nav-link #{if @component == slug, do: "active", else: ""}"}
                    >
                      <%= label %>
                    </.link>
                  </li>
                <% end %>
              </ul>
            </div>
          <% end %>
        </div>
      </nav>
      <main class="showcase-main">
        <%= if @component do %>
          <div class="showcase-component">
            <h2 class="showcase-component-title"><%= find_label(@component) %></h2>
            <.render_showcase component={@component} />
          </div>
        <% else %>
          <div class="showcase-welcome">
            <h2>Welcome to Voidable UI</h2>
            <p>Select a component from the sidebar to see it in action.</p>
            <div class="showcase-grid">
              <%= for {category, items} <- @components do %>
                <div class="showcase-grid-category">
                  <h3><%= category %></h3>
                  <ul>
                    <%= for {slug, label} <- items do %>
                      <li>
                        <.link navigate={~p"/components/#{slug}"}><%= label %></.link>
                      </li>
                    <% end %>
                  </ul>
                </div>
              <% end %>
            </div>
          </div>
        <% end %>
      </main>
    </div>
    """
  end

  defp render_showcase(assigns) do
    case assigns.component do
      # Static showcases (DemoWeb.StaticShowcases)
      c when c in ~w(badge divider spinner skeleton status_dot avatar stepper progress tooltip error_fallback panel accordion breadcrumbs list card table scroll_area banner nav_bar toast_container field option tab_panel) ->
        apply(DemoWeb.StaticShowcases, String.to_atom(c), [assigns])

      # Form showcases (DemoWeb.FormShowcases)
      c when c in ~w(input textarea select checkbox radio radio_group checkbox_group combobox multiselect slider file_upload switch compose_input) ->
        apply(DemoWeb.FormShowcases, String.to_atom(c), [assigns])

      # UI showcases (DemoWeb.UIShowcases)
      c when c in ~w(button alert tag dialog drawer popover toast tabs accordion_item pagination hamburger) ->
        apply(DemoWeb.UIShowcases, String.to_atom(c), [assigns])

      _ ->
        ~H"""
        <p>Component not found.</p>
        """
    end
  end
end
