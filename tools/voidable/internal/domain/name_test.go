package domain

import (
	"strings"
	"testing"
)

// nameLibrary is a catalog whose elements carry name rules, as the manifest's
// voidName does; checkName knows no tag of its own.
func nameLibrary(t *testing.T) *Library {
	t.Helper()
	aria := []string{"aria-label", "aria-labelledby", "title"}
	field := []NameAncestor{{Tag: "void-field", Attributes: []string{"label"}}, {Tag: "label"}}
	cat := NewCatalog("1.0.0", []Element{
		{Tag: "void-button", Class: "VoidButton", Name: &NameRule{Attributes: aria, Content: true, Hint: "an icon-only button needs an aria-label"}},
		{Tag: "void-input", Class: "VoidInput", Attributes: []Attribute{attr("placeholder", "string", "")},
			Name: &NameRule{Attributes: aria, Ancestors: field, Hint: "wrap it in a field"}},
		// Named by its title part (explicit parts, #52), not by an attribute.
		{Tag: "void-dialog", Class: "VoidDialog",
			Name: &NameRule{Attributes: aria, Parts: []string{"void-dialog-title"}, Hint: "write its title as <void-dialog-title>"}},
		{Tag: "void-drawer", Class: "VoidDrawer",
			Name: &NameRule{Attributes: aria, Parts: []string{"void-drawer-title"}, Hint: "write its title as <void-drawer-title>"}},
		// Named by a native <caption> it takes as its part.
		{Tag: "void-table", Class: "VoidTable",
			Name: &NameRule{Attributes: aria, Parts: []string{"caption"}, Hint: "write a <caption>"}},
		{Tag: "void-field", Class: "VoidField", Attributes: []Attribute{attr("label", "string", "")}},
		{Tag: "void-badge", Class: "VoidBadge"},
	})
	lib, err := NewLibrary(t.Context(), stubManifest{cat}, stubSupplement{&Supplement{}}, nil)
	if err != nil {
		t.Fatal(err)
	}
	return lib
}

func TestCheckName(t *testing.T) {
	a := func(name, value string, syn Syntax) AttrToken {
		return AttrToken{Name: name, Raw: name, Value: value, HasValue: value != "", Syntax: syn, Line: 1, Col: 1}
	}
	dyn := func(tok AttrToken) AttrToken { tok.Dynamic = true; return tok }
	text := Content{Known: true, Text: true}
	empty := Content{Known: true}
	field := func(attrs ...AttrToken) Ancestor { return Ancestor{Name: "void-field", Attrs: attrs} }
	tests := []struct {
		name string
		tag  Tag
		want bool // reported
	}{
		// Named.
		{"button text", Tag{Name: "void-button", Lang: LangHTML, Content: text}, false},
		{"button aria-label", Tag{Name: "void-button", Lang: LangHTML, Content: empty, Attrs: []AttrToken{a("aria-label", "Close", SyntaxAttr)}}, false},
		{"button aria-labelledby", Tag{Name: "void-button", Lang: LangHTML, Content: empty, Attrs: []AttrToken{a("aria-labelledby", "t", SyntaxAttr)}}, false},
		{"button title", Tag{Name: "void-button", Lang: LangHTML, Content: empty, Attrs: []AttrToken{a("title", "Close", SyntaxAttr)}}, false},
		{"jsx camelCase", Tag{Name: "void-button", Lang: LangJSX, Content: empty, Attrs: []AttrToken{a("ariaLabel", "Close", SyntaxAttr)}}, false},
		{"jsx expression", Tag{Name: "void-button", Lang: LangJSX, Content: empty, Attrs: []AttrToken{dyn(a("aria-label", "t('close')", SyntaxAttr))}}, false},
		{"vue binding", Tag{Name: "void-button", Lang: LangVue, Content: empty, Attrs: []AttrToken{dyn(a("aria-label", "label", SyntaxBound))}}, false},
		{"lit property", Tag{Name: "void-button", Lang: LangLit, Content: empty, Attrs: []AttrToken{a("ariaLabel", "", SyntaxProperty)}}, false},
		{"erb value", Tag{Name: "void-button", Lang: LangERB, Content: empty, Attrs: []AttrToken{dyn(a("aria-label", "<%= t('x') %>", SyntaxAttr))}}, false},
		{"heex spread", Tag{Name: "void-button", Lang: LangHEEx, Content: empty, Attrs: []AttrToken{a("{@rest}", "", SyntaxSpread)}}, false},
		{"blade attributes", Tag{Name: "void-button", Lang: LangBlade, Content: empty, Attrs: []AttrToken{a("{{ $attributes }}", "", SyntaxSpread)}}, false},
		{"svelte spread", Tag{Name: "void-button", Lang: LangSvelte, Content: empty, Attrs: []AttrToken{a("{...rest}", "", SyntaxSpread)}}, false},
		{"alpine bind object", Tag{Name: "void-button", Lang: LangHTML, Content: empty, Attrs: []AttrToken{{Raw: "x-bind", Name: "x-bind", Syntax: SyntaxDirective, Line: 1, Col: 1}}}, false},
		{"alpine bound attribute", Tag{Name: "void-button", Lang: LangHTML, Content: empty, Attrs: []AttrToken{dyn(a("aria-label", "label", SyntaxBound))}}, false},
		{"dynamic content", Tag{Name: "void-button", Lang: LangJSX, Content: Content{Known: true, Dynamic: true}}, false},
		{"unclosed element", Tag{Name: "void-button", Lang: LangHTML}, false},
		{"html slash is not a close", Tag{Name: "void-button", Lang: LangHTML, SelfClosing: true}, false},
		{"input in a labelled field", Tag{Name: "void-input", Lang: LangHTML, Ancestors: []Ancestor{field(a("label", "Email", SyntaxAttr))}}, false},
		{"input in a field with a dynamic label", Tag{Name: "void-input", Lang: LangHTML, Ancestors: []Ancestor{field(dyn(a("label", "@label", SyntaxAttr)))}}, false},
		{"input in a field with spread attributes", Tag{Name: "void-input", Lang: LangHEEx, Ancestors: []Ancestor{field(a("{@rest}", "", SyntaxSpread))}}, false},
		{"input in a label", Tag{Name: "void-input", Lang: LangHTML, Labelled: true, Ancestors: []Ancestor{{Name: "label"}}}, false},
		{"input named by a label for", Tag{Name: "void-input", Lang: LangHTML, Labelled: true}, false},
		{"input inside a framework component", Tag{Name: "void-input", Lang: LangJSX, InComponent: true}, false},
		{"dialog title part", Tag{Name: "void-dialog", Lang: LangHTML, Content: Content{Known: true, Tags: []string{"void-dialog-title", "void-dialog-body"}}}, false},
		{"drawer title part", Tag{Name: "void-drawer", Lang: LangHTML, Content: Content{Known: true, Tags: []string{"void-drawer-title"}}}, false},
		{"dialog with generated content", Tag{Name: "void-dialog", Lang: LangJSX, Content: Content{Known: true, Dynamic: true}}, false},
		{"dialog with unknown content", Tag{Name: "void-dialog", Lang: LangHTML}, false},
		{"icon-only button in a trigger part, named", Tag{Name: "void-button", Lang: LangHTML, Content: empty, Ancestors: []Ancestor{{Name: "void-popover-trigger"}}, Attrs: []AttrToken{a("aria-label", "More", SyntaxAttr)}}, false},
		{"button with text in a trigger part", Tag{Name: "void-button", Lang: LangHTML, Content: text, Ancestors: []Ancestor{{Name: "void-dropdown-menu-trigger"}}}, false},
		{"table caption", Tag{Name: "void-table", Lang: LangHTML, Content: Content{Known: true, Native: []string{"table", "caption"}}}, false},
		{"table aria-label", Tag{Name: "void-table", Lang: LangHTML, Content: Content{Known: true}, Attrs: []AttrToken{a("aria-label", "Invoices", SyntaxAttr)}}, false},
		{"dialog aria-label", Tag{Name: "void-dialog", Lang: LangHTML, Attrs: []AttrToken{a("aria-label", "Edit", SyntaxAttr)}}, false},
		{"a mention in prose", Tag{Name: "void-button", Lang: LangMarkdown, Mention: true, Content: empty}, false},
		{"a tag that needs no name", Tag{Name: "void-badge", Lang: LangHTML, Content: empty}, false},

		// Reported.
		{"icon-only button", Tag{Name: "void-button", Lang: LangHTML, Content: empty}, true},
		{"icon-only jsx button", Tag{Name: "void-button", Lang: LangJSX, SelfClosing: true, Content: empty}, true},
		{"empty aria-label", Tag{Name: "void-button", Lang: LangHTML, Content: empty, Attrs: []AttrToken{a("aria-label", "  ", SyntaxAttr)}}, true},
		{"bare aria-label", Tag{Name: "void-button", Lang: LangHTML, Content: empty, Attrs: []AttrToken{{Raw: "aria-label", Name: "aria-label", Syntax: SyntaxAttr}}}, true},
		{"input on its own", Tag{Name: "void-input", Lang: LangHTML}, true},
		{"input with only a placeholder", Tag{Name: "void-input", Lang: LangHTML, Attrs: []AttrToken{a("placeholder", "Email", SyntaxAttr)}}, true},
		{"input in a field with no label", Tag{Name: "void-input", Lang: LangHTML, Ancestors: []Ancestor{field()}}, true},
		{"input in another element", Tag{Name: "void-input", Lang: LangHTML, Ancestors: []Ancestor{{Name: "void-badge"}}}, true},
		{"table with no caption", Tag{Name: "void-table", Lang: LangHTML, Content: Content{Known: true, Native: []string{"table", "tbody"}}}, true},
		{"dialog with no title part", Tag{Name: "void-dialog", Lang: LangHTML, Content: Content{Known: true}}, true},
		{"dialog with other parts only", Tag{Name: "void-dialog", Lang: LangHTML, Content: Content{Known: true, Tags: []string{"void-dialog-body", "void-dialog-actions"}}}, true},
		{"the old heading attribute names nothing", Tag{Name: "void-dialog", Lang: LangHTML, Content: Content{Known: true}, Attrs: []AttrToken{a("heading", "Edit", SyntaxAttr)}}, true},
		{"drawer with no title part", Tag{Name: "void-drawer", Lang: LangHTML, Content: Content{Known: true, Tags: []string{"void-dialog-title"}}}, true},
		{"another component's title does not name it", Tag{Name: "void-drawer", Lang: LangHTML, Content: Content{Known: true, Tags: []string{"void-card-title"}}}, true},
		{"icon-only button in a trigger part", Tag{Name: "void-button", Lang: LangHTML, Content: empty, Ancestors: []Ancestor{{Name: "void-popover-trigger"}}}, true},
		{"icon-only button in a tooltip trigger", Tag{Name: "void-button", Lang: LangHTML, Content: empty, Ancestors: []Ancestor{{Name: "void-tooltip-trigger"}}}, true},
		{"event handler is not a name", Tag{Name: "void-button", Lang: LangHTML, Content: empty, Attrs: []AttrToken{a("aria-label", "x", SyntaxEvent)}}, true},
	}
	lib := nameLibrary(t)
	c := NewChecker(lib, nil)
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.tag.Line, tt.tag.Col = 3, 5
			var got []Finding
			for _, f := range c.CheckTag("f.html", tt.tag) {
				if f.Rule == RuleMissingName {
					got = append(got, f)
				}
			}
			if (len(got) > 0) != tt.want {
				t.Fatalf("reported=%v want %v: %+v", len(got) > 0, tt.want, got)
			}
			if tt.want {
				f := got[0]
				if f.Line != 3 || f.Col != 5 || f.Tag != tt.tag.Name || f.File != "f.html" {
					t.Errorf("position or tag wrong: %+v", f)
				}
				if !strings.Contains(f.Message, "has no accessible name") {
					t.Errorf("message: %s", f.Message)
				}
			}
		})
	}
}

func TestNameMessageSaysHowToFixIt(t *testing.T) {
	lib := nameLibrary(t)
	c := NewChecker(lib, nil)
	find := func(tag string) Finding {
		t.Helper()
		for _, f := range c.CheckTag("f.html", Tag{Name: tag, Lang: LangHTML, Line: 1, Col: 1, Content: Content{Known: true}}) {
			if f.Rule == RuleMissingName {
				return f
			}
		}
		t.Fatalf("no finding for %s", tag)
		return Finding{}
	}
	for tag, want := range map[string][]string{
		"void-button": {"aria-label", "text inside it", "an icon-only button needs an aria-label"},
		"void-input":  {`an enclosing <void-field label="...">`, "an enclosing <label>", "wrap it in a field"},
		"void-dialog": {"a <void-dialog-title> part", "aria-label", "write its title as <void-dialog-title>"},
		"void-drawer": {"a <void-drawer-title> part", "write its title as <void-drawer-title>"},
	} {
		f := find(tag)
		for _, w := range want {
			if !strings.Contains(f.Message, w) {
				t.Errorf("%s: %q not in %q", tag, w, f.Message)
			}
		}
	}
	if s := find("void-dialog").Suggestion; s != `aria-label="..."` {
		t.Errorf("dialog suggestion = %q", s)
	}
	if s := find("void-button").Suggestion; s != `aria-label="..."` {
		t.Errorf("button suggestion = %q", s)
	}
}
