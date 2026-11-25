package scan

import (
	"context"
	"strings"
	"testing"

	"github.com/VoidableUI/Voidable/tools/voidable/internal/domain"
)

// nameContext renders what the name check needs from each tag:
// tag[content]{flags}<ancestors>, content being empty, text, dynamic,
// text+dynamic, open (never closed) or mention.
func nameContext(tags []domain.Tag) string {
	var parts []string
	for _, t := range tags {
		c := "open"
		switch {
		case t.Mention:
			c = "mention"
		case t.Content.Known && t.Content.Text && t.Content.Dynamic:
			c = "text+dynamic"
		case t.Content.Known && t.Content.Text:
			c = "text"
		case t.Content.Known && t.Content.Dynamic:
			c = "dynamic"
		case t.Content.Known:
			c = "empty"
		}
		var flags []string
		if t.Labelled {
			flags = append(flags, "labelled")
		}
		if t.InComponent {
			flags = append(flags, "component")
		}
		var anc []string
		for _, a := range t.Ancestors {
			anc = append(anc, a.Name)
		}
		s := t.Name + "[" + c + "]"
		if len(flags) > 0 {
			s += "{" + strings.Join(flags, ",") + "}"
		}
		if len(anc) > 0 {
			s += "<" + strings.Join(anc, ">") + ">"
		}
		parts = append(parts, s)
	}
	return strings.Join(parts, " | ")
}

func TestScanNameContext(t *testing.T) {
	icon := `<svg viewBox="0 0 1 1"><path d="M0 0"/></svg>`
	tests := []struct {
		name string
		lang domain.Lang
		src  string
		want string
	}{
		// Content, in every dialect.
		{"html text", domain.LangHTML, `<void-button>Save</void-button>`, `void-button[text]`},
		{"html icon only", domain.LangHTML, `<void-button>` + icon + `</void-button>`, `void-button[empty]`},
		{"html whitespace only", domain.LangHTML, "<void-button>\n   \n</void-button>", `void-button[empty]`},
		{"html svg title is text", domain.LangHTML, `<void-button><svg><title>Close</title></svg></void-button>`, `void-button[text]`},
		{"html svg aria-label", domain.LangHTML, `<void-button><svg aria-label="Close"></svg></void-button>`, `void-button[text]`},
		{"html img alt", domain.LangHTML, `<void-button><img src="x.png" alt="Close"></void-button>`, `void-button[text]`},
		{"html img empty alt", domain.LangHTML, `<void-button><img src="x.png" alt=""></void-button>`, `void-button[empty]`},
		{"html entity is text", domain.LangHTML, `<void-button>&times;</void-button>`, `void-button[text]`},
		{"html comment is not text", domain.LangHTML, `<void-button><!-- Close -->` + icon + `</void-button>`, `void-button[empty]`},
		{"html unclosed", domain.LangHTML, `<div><void-button>` + icon + `</div>`, `void-button[open]`},
		{"html self-closing slash", domain.LangHTML, `<void-input />`, `void-input[empty]`},
		{"jsx expression", domain.LangJSX, `<void-button>{label}</void-button>`, `void-button[dynamic]`},
		{"jsx self closing", domain.LangJSX, `<void-button />`, `void-button[empty]`},
		{"jsx component child", domain.LangJSX, `<void-button><CloseIcon /></void-button>`, `void-button[dynamic]`},
		{"jsx text and expression", domain.LangJSX, `<void-button>Delete {name}</void-button>`, `void-button[text+dynamic]`},
		{"jsx arrow in attribute", domain.LangJSX, `<void-button onClick={() => go()}>` + icon + `</void-button>`, `void-button[empty]`},
		{"erb output", domain.LangERB, `<void-button><%= t("close") %></void-button>`, `void-button[dynamic]`},
		{"erb icon helper", domain.LangERB, `<void-button><%= icon "x" %></void-button>`, `void-button[dynamic]`},
		{"heex expression", domain.LangHEEx, `<void-button>{@label}</void-button>`, `void-button[dynamic]`},
		{"heex inner block", domain.LangHEEx, `<void-button><%= render_slot(@inner_block) %></void-button>`, `void-button[dynamic]`},
		{"heex function component", domain.LangHEEx, `<void-button><.icon name="x" /></void-button>`, `void-button[dynamic]`},
		{"blade echo", domain.LangBlade, `<void-button>{{ $label }}</void-button>`, `void-button[dynamic]`},
		{"blade slot", domain.LangBlade, `<void-button>{{ $slot }}</void-button>`, `void-button[dynamic]`},
		{"blade directive", domain.LangBlade, `<void-button>@lang('close')</void-button>`, `void-button[dynamic]`},
		{"blade component", domain.LangBlade, `<void-button><x-icon name="x" /></void-button>`, `void-button[dynamic]`},
		{"vue interpolation", domain.LangVue, `<void-button>{{ label }}</void-button>`, `void-button[dynamic]`},
		{"vue slot", domain.LangVue, `<void-button><slot /></void-button>`, `void-button[dynamic]`},
		{"vue component", domain.LangVue, `<void-button><CloseIcon /></void-button>`, `void-button[dynamic]`},
		{"svelte expression", domain.LangSvelte, `<void-button>{label}</void-button>`, `void-button[dynamic]`},
		{"svelte slot", domain.LangSvelte, `<void-button><slot /></void-button>`, `void-button[dynamic]`},
		{"alpine static markup", domain.LangHTML, `<void-button x-text="label"></void-button>`, `void-button[empty]`},
		{"lit interpolation", domain.LangLit, "html`<void-button>${label}</void-button>`", `void-button[dynamic]`},
		{"astro expression", domain.LangAstro, `<void-button>{Astro.props.label}</void-button>`, `void-button[dynamic]`},

		// Ancestors and labels.
		{"field ancestor", domain.LangHTML, `<void-field label="Email"><void-input></void-input></void-field>`, `void-field[empty] | void-input[empty]<void-field>`},
		{"label wraps", domain.LangHTML, `<label>Email <void-input></void-input></label>`, `void-input[empty]{labelled}<label>`},
		{"label for", domain.LangHTML, `<label for="e">Email</label><void-input id="e"></void-input>`, `void-input[empty]{labelled}`},
		{"label for after the control", domain.LangHTML, `<void-input id="e"></void-input><label for="e">Email</label>`, `void-input[empty]{labelled}`},
		{"label for jsx", domain.LangJSX, `<><label htmlFor="e">Email</label><void-input id="e" /></>`, `void-input[empty]{labelled}`},
		{"label for another id", domain.LangHTML, `<label for="x">Email</label><void-input id="e"></void-input>`, `void-input[empty]`},
		{"label closed before the control", domain.LangHTML, `<label>Email</label><void-input></void-input>`, `void-input[empty]`},
		{"jsx component wrapper", domain.LangJSX, `<Field label="Email"><void-input /></Field>`, `void-input[empty]{component}`},
		{"jsx component self-closed", domain.LangJSX, `<Field label="Email" /><void-input />`, `void-input[empty]`},
		{"jsx component closed before", domain.LangJSX, `<Field>x</Field><void-input />`, `void-input[empty]`},
		{"heex component wrapper", domain.LangHEEx, `<.field label="Email"><void-input></void-input></.field>`, `void-input[empty]{component}`},
		{"blade component wrapper", domain.LangBlade, `<x-field label="Email"><void-input></void-input></x-field>`, `void-input[empty]{component}`},
		{"html has no components", domain.LangHTML, `<Field><void-input></void-input></Field>`, `void-input[empty]`},
		{"lit has no components", domain.LangLit, "html`<Foo><void-input></void-input></Foo>`", `void-input[empty]`},
		{"mention in backticks", domain.LangMarkdown, "Use `<void-button>` for actions.", `void-button[mention]`},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tags, err := Scanner{}.Scan(context.Background(), []byte(tt.src), tt.lang)
			if err != nil {
				t.Fatal(err)
			}
			if got := nameContext(tags); got != tt.want {
				t.Errorf("\n got: %s\nwant: %s", got, tt.want)
			}
		})
	}
}

// A nested field names the control in it, whatever sits between them.
func TestScanAncestorsOutermostFirst(t *testing.T) {
	src := `<void-card><void-field label="A"><div><void-input></void-input></div></void-field></void-card>`
	tags, err := Scanner{}.Scan(context.Background(), []byte(src), domain.LangHTML)
	if err != nil {
		t.Fatal(err)
	}
	in := tags[len(tags)-1]
	if in.Name != "void-input" || len(in.Ancestors) != 2 || in.Ancestors[0].Name != "void-card" || in.Ancestors[1].Name != "void-field" {
		t.Fatalf("ancestors = %+v", in.Ancestors)
	}
	if a := in.Ancestors[1].Attrs; len(a) != 1 || a[0].Name != "label" || a[0].Value != "A" {
		t.Errorf("field attrs = %+v", a)
	}
}
