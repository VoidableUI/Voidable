# SPDX-License-Identifier: MIT
# Render <dir>/index.html.erb with ActionView 8 and print the HTML.
# <dir>/data.json holds the controller's instance variables; hashes become
# read-only records (record.name, record[:name]).
#
# This is ActionView itself, not a Rails app: there is no router, so *_path
# and *_url helpers are answered from data.json's "routes" (or derived from
# the helper name), and the Turbo helpers are the small subset below.
require "json"
require "action_view"

dir = ARGV.fetch(0)
data = JSON.parse(File.read(File.join(dir, "data.json")))

class Record
  def initialize(h) = @h = h.transform_keys(&:to_s)
  def [](k) = Record.wrap(@h[k.to_s])
  def to_param = @h["id"].to_s
  def id = @h["id"]
  def to_h = @h
  def respond_to_missing?(m, p = false) = @h.key?(m.to_s.delete_suffix("?")) || super
  def method_missing(m, *a)
    k = m.to_s
    return !!@h[k.delete_suffix("?")] if k.end_with?("?") && @h.key?(k.delete_suffix("?"))
    return Record.wrap(@h[k]) if @h.key?(k)
    super
  end
  def self.wrap(v)
    case v
    when Hash then Record.new(v)
    when Array then v.map { |x| wrap(x) }
    else v
    end
  end
end

ROUTES = data.delete("routes") || {}

module EvalHelpers
  def protect_against_forgery? = false
  def turbo_frame_tag(id, src: nil, target: nil, **attrs, &block)
    id = id.respond_to?(:id) ? "#{id.class.name.downcase}_#{id.id}" : id
    content_tag("turbo-frame", id: id, src: src, target: target, **attrs, &block)
  end
  def turbo_stream_from(*) = "".html_safe
  def turbo_include_tags = "".html_safe
  def csrf_meta_tags = "".html_safe
  def content_security_policy? = false
  def respond_to_missing?(m, p = false) = m.to_s.end_with?("_path", "_url") || super
  def method_missing(m, *args, **kw)
    name = m.to_s
    if name.end_with?("_path", "_url")
      base = name.sub(/_(path|url)\z/, "")
      route = ROUTES[base] || "/" + base.tr("_", "/")
      arg = args.first
      if arg
        param = arg.respond_to?(:to_param) ? arg.to_param : arg.to_s
        route = route.include?(":id") ? route.sub(":id", param) : "#{route}/#{param}"
      end
      route += "?" + kw.map { |k, v| "#{k}=#{v}" }.join("&") unless kw.empty?
      return route
    end
    super
  end
end

# Rails 8 application defaults (a bare ActionView keeps the legacy ones).
ActionView::Helpers::FormHelper.form_with_generates_remote_forms = false
ActionView::Helpers::FormHelper.form_with_generates_ids = true
ActionView::Helpers::FormTagHelper.default_enforce_utf8 = false
ActionView::Base.include(EvalHelpers)
lookup = ActionView::LookupContext.new([dir])
assigns = data.transform_values { |v| Record.wrap(v) }
view = ActionView::Base.with_empty_template_cache.new(lookup, assigns, nil)
print view.render(template: "index")
