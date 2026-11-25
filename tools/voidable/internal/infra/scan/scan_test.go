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
		{"angular forms directives", domain.LangHTML, `<void-select formControlName="s" [formControl]="c" [(ngModel)]="m" ngDefaultControl>`,
			`void-select{formControlName:directive=s [formControl]:directive=c [(ngModel)]:directive=m ngDefaultControl:directive}@1:1`},
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

// Template constructs written inside a tag's attribute list: conditionals,
// spreads and expressions that contain `>`, quotes and parentheses must not
// leak out as attribute names or end the tag early.
func TestScanInlineConstructs(t *testing.T) {
	tests := []struct {
		name string
		lang domain.Lang
		src  string
		want string
	}{
		// Blade
		{"blade @if with a space before the parenthesis", domain.LangBlade, `<void-tabs id="tabs" @if ($tab !== '') value="{{ $tab }}" @endif>`,
			`void-tabs{id:attr=tabs @if ($tab !== ''):directive value:attr={{ $tab }}! @endif:directive}@1:1`},
		{"blade @if without a space", domain.LangBlade, `<void-tabs @if($tab !== '') value="x" @endif>`,
			`void-tabs{@if($tab !== ''):directive value:attr=x @endif:directive}@1:1`},
		{"blade @if with a tab before the parenthesis", domain.LangBlade, "<void-tabs @if\t($a) value=\"x\" @endif>",
			"void-tabs{@if\t($a):directive value:attr=x @endif:directive}@1:1"},
		{"blade parentheses inside a string argument", domain.LangBlade, `<void-input @if (str_contains($x, ')')) disabled @endif name="n">`,
			`void-input{@if (str_contains($x, ')')):directive disabled:attr @endif:directive name:attr=n}@1:1`},
		{"blade nested parentheses and a double-quoted string", domain.LangBlade, `<void-input @if (($a && ($b || $c)) || $d === "(") required @endif>`,
			`void-input{@if (($a && ($b || $c)) || $d === "("):directive required:attr @endif:directive}@1:1`},
		{"blade @elseif and @else", domain.LangBlade, `<void-badge @if ($a) color="error" @elseif ($b > 1) color="success" @else color="warning" @endif>`,
			`void-badge{@if ($a):directive color:attr=error @elseif ($b > 1):directive color:attr=success @else:directive color:attr=warning @endif:directive}@1:1`},
		{"blade @class with an array and a closure", domain.LangBlade, `<void-card @class(['a' => $x, 'b' => fn ($y) => ($y > 1)]) variant="outlined">`,
			`void-card{@class(['a' => $x, 'b' => fn ($y) => ($y > 1)]):directive variant:attr=outlined}@1:1`},
		{"blade @disabled with a space", domain.LangBlade, `<void-button @disabled ($busy) @required($r)>`,
			`void-button{@disabled ($busy):directive @required($r):directive}@1:1`},
		{"blade directive spanning lines", domain.LangBlade, "<void-select\n  @if (\n    $a &&\n    $b\n  )\n    disabled\n  @endif\n>",
			"void-select{@if (\n    $a &&\n    $b\n  ):directive disabled:attr @endif:directive}@1:1"},
		{"blade event shorthand followed by a parenthesis is not a directive", domain.LangBlade, `<void-button @click="go()" (x)>`,
			`void-button{click:event=go() x:event}@1:1`},
		{"blade echo and raw echo between attributes", domain.LangBlade, `<void-input {{ $attributes->merge(['a' => 1]) }} {!! $extra !!} name="n">`,
			`void-input{{{ $attributes->merge(['a' => 1]) }}:spread {!! $extra !!}:spread name:attr=n}@1:1`},
		// ERB
		{"erb if inside a tag", domain.LangERB, `<void-input <% if x > 1 %> disabled <% end %> name="a">`,
			`void-input{<% if x > 1 %>:spread disabled:attr <% end %>:spread name:attr=a}@1:1`},
		{"erb with quotes and a closing angle bracket in the code", domain.LangERB, `<void-input <%= "disabled" if a > b && c == '%' %> type="email">`,
			`void-input{<%= "disabled" if a > b && c == '%' %>:spread type:attr=email}@1:1`},
		{"erb tag.attributes helper", domain.LangERB, `<void-button <%= tag.attributes(data: { id: 1 }) %>>`,
			`void-button{<%= tag.attributes(data: { id: 1 }) %>:spread}@1:1`},
		// HEEx
		{"heex rest, :if and :for", domain.LangHEEx, `<void-badge {@rest} :if={@n > 1} :for={x <- @xs} color={if @n > 2, do: "error", else: "}"}>`,
			`void-badge{{@rest}:spread :if:directive=@n > 1! :for:directive=x <- @xs! color:attr=if @n > 2, do: "error", else: "}"!}@1:1`},
		{"heex attribute with a closing brace in a string", domain.LangHEEx, `<void-input value={"}"} name="n">`,
			`void-input{value:attr=} name:attr=n}@1:1`},
		// Svelte
		{"svelte spread and shorthand", domain.LangSvelte, `<void-input {...rest} {value} disabled={a > b} class:big={n > 1}>`,
			`void-input{{...rest}:spread {value}:spread disabled:attr=a > b! class:big:directive=n > 1!}@1:1`},
		{"svelte restProps", domain.LangSvelte, `<void-button {...$$restProps} on:void-click={(e) => n > 1 && go(e)}>`,
			`void-button{{...$$restProps}:spread void-click:event=(e) => n > 1 && go(e)!}@1:1`},
		// JSX
		{"jsx conditional spread", domain.LangJSX, `<void-input {...(cond ? { disabled: true } : {})} {...props} required={a > 1 && b < 2} />`,
			`void-input/{{...(cond ? { disabled: true } : {})}:spread {...props}:spread required:attr=a > 1 && b < 2!}@1:1`},
		{"jsx template literal with an angle bracket", domain.LangJSX, "<void-input title={`a > ${b}`} name=\"x>y\" />",
			"void-input/{title:attr=`a > ${b}`! name:attr=x>y}@1:1"},
		{"jsx arrow function and ternary", domain.LangJSX, `<void-button onvoid-click={() => (n > 1 ? a() : b())} variant={dark ? "filled" : "outlined"}>`,
			`void-button{void-click:event=() => (n > 1 ? a() : b())! variant:attr=dark ? "filled" : "outlined"!}@1:1`},
		// Vue
		{"vue bindings with > and quotes", domain.LangVue, `<void-badge :color="n > 1 ? 'error' : 'success'" :title='"a > b"' @void-click="n = n > 1 ? 0 : 1" v-if="a > 1 && b">`,
			`void-badge{color:bound=n > 1 ? 'error' : 'success'! title:bound="a > b"! void-click:event=n = n > 1 ? 0 : 1 v-if:directive=a > 1 && b}@1:1`},
		{"vue v-bind object and slot shorthand", domain.LangVue, `<void-input v-bind="$attrs" v-model="form.a" #prefix>`,
			`void-input{v-bind:directive=$attrs v-model:directive=form.a #prefix:directive}@1:1`},
		// Alpine
		{"alpine expressions", domain.LangHTML, `<void-dialog x-show="count > 5" @click="open = ! open" x-on:keydown.escape="alert('a > b')" x-data="{ a: '>' }" :class="{ 'a': b > 1 }">`,
			`void-dialog{x-show:directive=count > 5 click:event=open = ! open keydown:event=alert('a > b') x-data:directive={ a: '>' } class:bound={ 'a': b > 1 }!}@1:1`},
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

// Inline code in prose is a mention: it is checked but never becomes the
// parent of what follows.
func TestMarkdownInlineCodeDoesNotNest(t *testing.T) {
	src := "Use `<void-button disabled>` here, and `<void-tab-panel tab=\"a\">` there.\n\n<void-tabs><void-tab-panel tab=\"b\"></void-tab-panel></void-tabs>"
	tags, _ := Scanner{}.Scan(context.Background(), []byte(src), domain.LangMarkdown)
	var got []string
	for _, t := range tags {
		got = append(got, t.Name+"<"+t.Parent+">")
	}
	if want := "void-button<>,void-tab-panel<>,void-tabs<>,void-tab-panel<void-tabs>"; strings.Join(got, ",") != want {
		t.Errorf("tags = %v, want %s", got, want)
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

// A tag records the void-* elements written inside it, so the name check can
// see that a dialog has its title part; the parent links and the closed flag
// the parts check reads are unchanged by it.
func TestContentRecordsPartTags(t *testing.T) {
	src := `<void-dialog><void-dialog-title>T</void-dialog-title><void-dialog-body><void-button>x</void-button></void-dialog-body></void-dialog>`
	tags, err := Scanner{}.Scan(context.Background(), []byte(src), domain.LangHTML)
	if err != nil {
		t.Fatal(err)
	}
	want := []string{"void-dialog-title", "void-dialog-body", "void-button"}
	if got := tags[0].Content.Tags; strings.Join(got, ",") != strings.Join(want, ",") {
		t.Errorf("dialog content tags = %v, want %v", got, want)
	}
	if !tags[0].Closed || tags[1].ParentIndex != 0 || tags[3].ParentIndex != 2 {
		t.Errorf("closed=%v parents=%d,%d", tags[0].Closed, tags[1].ParentIndex, tags[3].ParentIndex)
	}
	if len(tags[3].Content.Tags) != 0 {
		t.Errorf("a leaf records tags: %v", tags[3].Content.Tags)
	}
}
