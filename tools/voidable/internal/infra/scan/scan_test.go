package scan

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"github.com/VoidableUI/Voidable/tools/voidable/internal/domain"
)

// summary renders tags compactly: tag[parent]{name:syntax=value!} where !
// marks a dynamic value.
func summary(tags []domain.Tag) string {
	var parts []string
	for _, t := range tags {
		var as []string
		for _, a := range t.Attrs {
			s := a.Name + ":" + string(a.Syntax)
			if a.HasValue {
				s += "=" + a.Value
			}
			if a.Dynamic {
				s += "!"
			}
			as = append(as, s)
		}
		p := ""
		if t.Parent != "" {
			p = "[" + t.Parent + "]"
		}
		sc := ""
		if t.SelfClosing {
			sc = "/"
		}
		parts = append(parts, fmt.Sprintf("%s%s%s{%s}@%d:%d", t.Name, p, sc, strings.Join(as, " "), t.Line, t.Col))
	}
	return strings.Join(parts, " | ")
}

func TestScan(t *testing.T) {
	tests := []struct {
		name string
		lang domain.Lang
		src  string
		want string
	}{
		{"html", domain.LangHTML, `<p><void-button variant="filled" disabled>Go</void-button></p>`,
			`void-button{variant:attr=filled disabled:attr}@1:4`},
		{"unquoted and single quotes", domain.LangHTML, "<void-badge color=error size='sm'>",
			`void-badge{color:attr=error size:attr=sm}@1:1`},
		{"positions", domain.LangHTML, "x\n  <void-tag\n    removable>",
			`void-tag{removable:attr}@2:3`},
		{"not a tag", domain.LangHTML, "<void-*> and <void-${name}> and <void->", ``},
		{"erb", domain.LangERB, `<void-input name="<%= f.object_name %>[email]" value="<%= @u.email %>" <%= "disabled" if x %> type="email">`,
			`void-input{name:attr=<%= f.object_name %>[email]! value:attr=<%= @u.email %>! <%= "disabled" if x %>:spread type:attr=email}@1:1`},
		{"erb nested (generator template)", domain.LangERB, `<void-switch <%%= "checked" if <%= n %>.x %>></void-switch>`,
			`void-switch{<%%= "checked" if <%= n %>.x %>:spread}@1:1`},
		{"heex", domain.LangHEEx, `<void-button id={@id || "b-#{uid()}"} variant={@variant} color="error" :if={@show} phx-click="go" {@rest}>`,
			`void-button{id:attr=@id || "b-#{uid()}"! variant:attr=@variant! color:attr=error :if:directive=@show! phx-click:directive=go {@rest}:spread}@1:1`},
		{"blade", domain.LangBlade, `<void-select :value="$v" @if($d) disabled @endif x-void-on.void-change="f" wire:model="x" {{ $attributes }}>`,
			`void-select{value:bound=$v! @if($d):directive disabled:attr @endif:directive void-change:event=f wire:model:directive=x {{ $attributes }}:spread}@1:1`},
		{"blade echo in value", domain.LangBlade, `<void-badge color="{{ $c }}">`,
			`void-badge{color:attr={{ $c }}!}@1:1`},
		{"jsx", domain.LangJSX, `<void-sidebar className="s" collapsedWidth={w} onvoid-toggle={(e) => set(e.detail)} position={"right"} {...rest} />`,
			`void-sidebar/{className:attr=s collapsedWidth:attr=w! void-toggle:event=(e) => set(e.detail)! position:attr=right {...rest}:spread}@1:1`},
		{"jsx camel event", domain.LangJSX, `<void-button onClick={f}>`, `void-button{click:event=f!}@1:1`},
		{"qwik", domain.LangJSX, `<void-input onVoid-change$={f}>`, `void-input{void-change:event=f!}@1:1`},
		{"lit", domain.LangLit, "html`<void-slider .value=${40} ?disabled=${d} @void-change=${on} size=\"${s}\" show-value></void-slider>`",
			`void-slider{value:property=${40}! disabled:bool=${d}! void-change:event=${on}! size:attr=${s}! show-value:attr}@1:6`},
		{"vue", domain.LangVue, `<void-tabs :value="v" @void-change="on" v-if="x" v-on:void-close.once="c">`,
			`void-tabs{value:bound=v! void-change:event=on v-if:directive=x void-close:event=c}@1:1`},
		{"svelte and solid", domain.LangSvelte, `<void-switch bind:checked={c} on:void-change={h} prop:checked={c} attr:color="error">`,
			`void-switch{bind:checked:directive=c! void-change:event=h! checked:property=c! color:attr=error}@1:1`},
		{"astro", domain.LangAstro, `<void-card client:load variant="elevated" set:html={x}>`,
			`void-card{client:load:directive variant:attr=elevated set:html:directive=x!}@1:1`},
		{"angular", domain.LangHTML, `<void-select [value]="v" (void-change)="on($event)" [attr.size]="s" *ngIf="x">`,
			`void-select{value:property=v void-change:event=on($event) size:bound=s! *ngIf:directive=x}@1:1`},
		{"nesting", domain.LangHTML, `<void-select><void-option>A</void-option></void-select><void-multiselect><void-option></void-option></void-multiselect>`,
			`void-select{}@1:1 | void-option[void-select]{}@1:14 | void-multiselect{}@1:56 | void-option[void-multiselect]{}@1:74`},
		{"self-closing does not nest", domain.LangJSX, `<void-input /><void-option />`,
			`void-input/{}@1:1 | void-option/{}@1:15`},
		{"comments skipped", domain.LangBlade, `{{-- <void-bad> --}}<!-- <void-bad2> --><void-tag>`,
			`void-tag{}@1:41`},
		{"backtick mention does not nest", domain.LangHEEx, "@doc \"Renders a `<void-field>`.\"\n<void-option>",
			`void-field{}@1:18 | void-option{}@2:1`},
		{"markdown fences", domain.LangMarkdown, "Use `<void-tabs>`.\n\n```tsx\n<void-input collapsedWidth={x} />\n```\n\n```html\n<void-input />\n```\n",
			`void-tabs{}@1:6 | void-input/{collapsedWidth:attr=x!}@4:1 | void-input/{}@8:1`},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tags, err := Scanner{}.Scan(context.Background(), []byte(tt.src), tt.lang)
			if err != nil {
				t.Fatal(err)
			}
			if got := summary(tags); got != tt.want {
				t.Errorf("\n got: %s\nwant: %s", got, tt.want)
			}
		})
	}
}

func TestMarkdownFenceLang(t *testing.T) {
	src := "```tsx\n<void-input />\n```\n```html\n<void-input />\n```\n<void-input />"
	tags, _ := Scanner{}.Scan(context.Background(), []byte(src), domain.LangMarkdown)
	var langs []string
	for _, t := range tags {
		langs = append(langs, string(t.Lang))
	}
	if got := strings.Join(langs, ","); got != "jsx,html,markdown" {
		t.Errorf("langs = %s", got)
	}
}

func TestFragments(t *testing.T) {
	nodes, err := Fragments{}.ParseFragment(context.Background(), `<void-table striped><table><tr><td>A</td></tr></table></void-table><void-input required name="x"></void-input>`)
	if err != nil {
		t.Fatal(err)
	}
	if len(nodes) != 2 || nodes[0].Tag != "void-table" || nodes[0].Children[0].Tag != "table" {
		t.Fatalf("nodes = %+v", nodes)
	}
	in := nodes[1]
	if !in.Attrs[0].Bare || in.Attrs[1].Value != "x" {
		t.Errorf("attrs = %+v", in.Attrs)
	}
}
