package domain

import (
	"context"
	"strings"
	"testing"
)

type stubManifest struct{ cat *Catalog }

func (s stubManifest) Catalog(context.Context) (*Catalog, error) { return s.cat, nil }

type stubSupplement struct{ sup *Supplement }

func (s stubSupplement) Supplement(context.Context) (*Supplement, error) { return s.sup, nil }

type stubScanner struct{ tags []Tag }

func (s stubScanner) Scan(context.Context, []byte, Lang) ([]Tag, error) { return s.tags, nil }

func attr(name, typ, def string) Attribute {
	k, v, n := ParseType(typ)
	return Attribute{Name: name, Field: name, Type: typ, Kind: k, Values: v, Nullable: n, Default: def}
}

// testCatalog is a small hand-made catalog mirroring real elements.
func testCatalog() *Catalog {
	return NewCatalog("1.2.3", []Element{
		{Tag: "void-button", Class: "VoidButton",
			Attributes: []Attribute{attr("variant", "'outline' | 'filled'", "outline"), attr("color", "'default' | 'error'", "default"), attr("disabled", "boolean", "false"), attr("keys", "KeyOverrides | null", "null")},
			Events:     []Event{{Name: "void-click", Detail: "{}"}},
			Keys:       &Keys{Actions: []KeyAction{{Action: "activate", Keys: []string{"Enter", "Space"}, Labels: []string{"Enter", "Space"}, Description: "Presses the button.", Essential: true}}}},
		{Tag: "void-sidebar", Class: "VoidSidebar",
			Attributes: []Attribute{attr("collapsed", "boolean", "false"), {Name: "collapsed-width", Field: "collapsedWidth", Type: "string", Kind: KindString}},
			Properties: []Property{{Name: "collapsed", Attribute: "collapsed"}, {Name: "collapsedWidth", Attribute: "collapsed-width"}},
			Events:     []Event{{Name: "void-toggle", Detail: "{ collapsed: boolean }"}}},
		{Tag: "void-input", Class: "VoidInput", Attributes: []Attribute{attr("name", "string", ""), attr("value", "string", "")}},
		{Tag: "void-dialog", Class: "VoidDialog", Attributes: []Attribute{attr("closable", "boolean", "true"), attr("keys", "KeyOverrides | null", "null")},
			Keys: &Keys{Actions: []KeyAction{{Action: "close", Keys: []string{"Escape"}, Labels: []string{"Escape"}, Description: "Closes the dialog.", Essential: true}}}},
		{Tag: "void-nav-bar", Class: "VoidNavBar", Attributes: []Attribute{attr("bordered", "boolean", "true")}},
		{Tag: "void-slider", Class: "VoidSlider", Attributes: []Attribute{attr("step", "number", "1")}},
		{Tag: "void-select", Class: "VoidSelect"},
		{Tag: "void-multiselect", Class: "VoidMultiselect", Properties: []Property{{Name: "values", Type: "string[]"}}},
		{Tag: "void-option", Class: "VoidOption"},
		{Tag: "void-popover", Class: "VoidPopover",
			Attributes: []Attribute{attr("side", "'top' | 'right' | 'bottom' | 'left'", "bottom"), attr("align", "'start' | 'center' | 'end'", "start"), attr("variant", "'quiet' | 'filled'", "quiet"), attr("stagger", "number", "")},
			Events:     []Event{{Name: "void-open"}, {Name: "void-close"}},
			Renamed: &Renamed{
				Attributes: map[string]RenamedAttribute{
					"position": {To: "side", Values: map[string]string{"bottom-end": `side="bottom" align="end"`}},
					"closable": {Values: map[string]string{"false": "hide-close"}, Fix: "remove it (it is the default)"},
				},
				Values: map[string]map[string]string{"variant": {"subtle": "quiet"}, "stagger": {"false": "0"}},
				Events: map[string]string{"void-toggle": "listen for void-open and void-close"},
			}},
	})
}

func testLibrary(t *testing.T) *Library {
	t.Helper()
	sup := &Supplement{
		Parents:     map[string][]string{"void-option": {"void-multiselect"}},
		Hints:   map[string]map[string]string{"void-input": {"label": "wrap in <void-field>"}},
	}
	lib, err := NewLibrary(context.Background(), stubManifest{testCatalog()}, stubSupplement{sup}, nil)
	if err != nil {
		t.Fatal(err)
	}
	return lib
}

func TestCheckTag(t *testing.T) {
	a := func(name, value string, syn Syntax) AttrToken {
		return AttrToken{Name: name, Raw: name, Value: value, HasValue: value != "", Syntax: syn, Line: 1, Col: 1}
	}
	dyn := func(tok AttrToken) AttrToken { tok.Dynamic = true; return tok }
	tests := []struct {
		name string
		tag  Tag
		want []Rule // in order; empty means clean
		msg  string // substring of the first message
	}{
		{"clean", Tag{Name: "void-button", Lang: LangHTML, Attrs: []AttrToken{a("variant", "filled", SyntaxAttr), a("disabled", "", SyntaxAttr)}}, nil, ""},
		{"unknown element", Tag{Name: "void-buton", Lang: LangHTML}, []Rule{RuleUnknownElement}, "did you mean <void-button>"},
		{"color primary", Tag{Name: "void-button", Lang: LangHTML, Attrs: []AttrToken{a("color", "primary", SyntaxAttr)}}, []Rule{RuleInvalidValue}, "allowed: default|error"},
		{"dynamic value skipped", Tag{Name: "void-button", Lang: LangERB, Attrs: []AttrToken{dyn(a("color", "<%= c %>", SyntaxAttr))}}, nil, ""},
		{"bool false", Tag{Name: "void-button", Lang: LangHTML, Attrs: []AttrToken{a("disabled", "false", SyntaxAttr)}}, []Rule{RuleBooleanFalse}, "remove it"},
		{"bool default true, plain boolean", Tag{Name: "void-nav-bar", Lang: LangHTML, Attrs: []AttrToken{a("bordered", "false", SyntaxAttr)}}, []Rule{RuleBooleanFalse}, "property"},
		{"kebab-case attribute", Tag{Name: "void-sidebar", Lang: LangHTML, Attrs: []AttrToken{a("collapsed-width", "4rem", SyntaxAttr)}}, nil, ""},
		{"removed lowercase attribute", Tag{Name: "void-sidebar", Lang: LangHTML, Attrs: []AttrToken{a("collapsedwidth", "4rem", SyntaxAttr)}}, []Rule{RuleUnknownAttribute}, "did you mean collapsed-width"},
		{"html case folding", Tag{Name: "void-sidebar", Lang: LangHEEx, Attrs: []AttrToken{a("collapsedWidth", "4rem", SyntaxAttr)}}, []Rule{RuleUnknownAttribute}, "did you mean collapsed-width"},
		{"jsx camel property", Tag{Name: "void-sidebar", Lang: LangJSX, Attrs: []AttrToken{a("collapsedWidth", "4rem", SyntaxAttr), a("className", "x", SyntaxAttr)}}, nil, ""},
		{"jsx unknown camel", Tag{Name: "void-sidebar", Lang: LangJSX, Attrs: []AttrToken{a("collapseWidth", "4rem", SyntaxAttr)}}, []Rule{RuleUnknownAttribute}, "collapsed-width"},
		{"label hint", Tag{Name: "void-input", Lang: LangHTML, Attrs: []AttrToken{a("label", "Email", SyntaxAttr)}}, []Rule{RuleUnknownAttribute}, "void-field"},
		{"globals", Tag{Name: "void-input", Lang: LangHTML, Attrs: []AttrToken{a("id", "x", SyntaxAttr), a("aria-label", "x", SyntaxAttr), a("data-x", "1", SyntaxAttr), a("slot", "a", SyntaxAttr)}}, nil, ""},
		{"directives and spreads skipped", Tag{Name: "void-input", Lang: LangHEEx, Attrs: []AttrToken{a("phx-change", "x", SyntaxDirective), a("{@rest}", "", SyntaxSpread)}}, nil, ""},
		{"not a number", Tag{Name: "void-slider", Lang: LangHTML, Attrs: []AttrToken{a("step", "any", SyntaxAttr)}}, []Rule{RuleInvalidValue}, "not a number"},
		{"event ok", Tag{Name: "void-sidebar", Lang: LangJSX, Attrs: []AttrToken{a("void-toggle", "", SyntaxEvent), a("click", "", SyntaxEvent)}}, nil, ""},
		{"event wrong", Tag{Name: "void-button", Lang: LangVue, Attrs: []AttrToken{a("void-change", "", SyntaxEvent)}}, []Rule{RuleUnknownEvent}, "dispatches void-click"},
		{"lit property", Tag{Name: "void-multiselect", Lang: LangLit, Attrs: []AttrToken{a("values", "${v}", SyntaxProperty)}}, nil, ""},
		{"lit unknown property", Tag{Name: "void-multiselect", Lang: LangLit, Attrs: []AttrToken{a("valuez", "${v}", SyntaxProperty)}}, []Rule{RuleUnknownProperty}, ".values"},
		{"bound unknown", Tag{Name: "void-input", Lang: LangVue, Attrs: []AttrToken{dyn(a("labl", "x", SyntaxBound))}}, []Rule{RuleUnknownAttribute}, ""},
		{"option in select", Tag{Name: "void-option", Lang: LangHTML, Parent: "void-select"}, []Rule{RuleInvalidParent}, "belongs in <void-multiselect>"},
		{"option in multiselect", Tag{Name: "void-option", Lang: LangHTML, Parent: "void-multiselect"}, nil, ""},
		{"self-closing html", Tag{Name: "void-input", Lang: LangHTML, SelfClosing: true}, []Rule{RuleSelfClosing}, "not self-closing"},
		{"self-closing jsx", Tag{Name: "void-input", Lang: LangJSX, SelfClosing: true}, nil, ""},
		// Renamed in 0.8 (#23): each old form is legacy-markup with the replacement.
		{"renamed attribute keeps its value", Tag{Name: "void-popover", Lang: LangHTML, Attrs: []AttrToken{a("position", "top", SyntaxAttr)}}, []Rule{RuleLegacyMarkup}, `position="top" on <void-popover> was renamed in 0.8; write side="top"`},
		{"renamed attribute, combined value", Tag{Name: "void-popover", Lang: LangHTML, Attrs: []AttrToken{a("position", "bottom-end", SyntaxAttr)}}, []Rule{RuleLegacyMarkup}, `write side="bottom" align="end"`},
		{"renamed attribute, dynamic value", Tag{Name: "void-popover", Lang: LangHEEx, Attrs: []AttrToken{dyn(a("position", "{@p}", SyntaxAttr))}}, []Rule{RuleLegacyMarkup}, "write side (same value)"},
		{"renamed attribute in jsx", Tag{Name: "void-popover", Lang: LangJSX, Attrs: []AttrToken{a("position", "left", SyntaxAttr)}}, []Rule{RuleLegacyMarkup}, `write side="left"`},
		{"inverted boolean, false", Tag{Name: "void-popover", Lang: LangHTML, Attrs: []AttrToken{a("closable", "false", SyntaxAttr)}}, []Rule{RuleLegacyMarkup}, "write hide-close"},
		{"inverted boolean, present", Tag{Name: "void-popover", Lang: LangHTML, Attrs: []AttrToken{a("closable", "", SyntaxAttr)}}, []Rule{RuleLegacyMarkup}, "closable on <void-popover> was removed in 0.8; remove it"},
		{"renamed value", Tag{Name: "void-popover", Lang: LangHTML, Attrs: []AttrToken{a("variant", "subtle", SyntaxAttr)}}, []Rule{RuleLegacyMarkup}, `write variant="quiet"`},
		{"renamed value on a number", Tag{Name: "void-popover", Lang: LangHTML, Attrs: []AttrToken{a("stagger", "false", SyntaxAttr)}}, []Rule{RuleLegacyMarkup}, `write stagger="0"`},
		{"current value", Tag{Name: "void-popover", Lang: LangHTML, Attrs: []AttrToken{a("variant", "quiet", SyntaxAttr), a("side", "top", SyntaxAttr), a("stagger", "0", SyntaxAttr)}}, nil, ""},
		// Key actions (#90): a warning each, and nothing for a valid rebinding.
		{"keys rebinding", Tag{Name: "void-button", Lang: LangHTML, Attrs: []AttrToken{a("keys", `{"activate":["Enter","x"]}`, SyntaxAttr)}}, nil, ""},
		{"keys not json", Tag{Name: "void-button", Lang: LangHTML, Attrs: []AttrToken{a("keys", `activate:Enter`, SyntaxAttr)}}, []Rule{RuleKeys}, "not a JSON object"},
		{"keys not an object", Tag{Name: "void-button", Lang: LangHTML, Attrs: []AttrToken{a("keys", `["Enter"]`, SyntaxAttr)}}, []Rule{RuleKeys}, "not a JSON object"},
		{"keys unknown action", Tag{Name: "void-button", Lang: LangHTML, Attrs: []AttrToken{a("keys", `{"activte":["Enter"]}`, SyntaxAttr)}}, []Rule{RuleKeys}, `no key action "activte" (did you mean activate?)`},
		{"keys essential unbound", Tag{Name: "void-dialog", Lang: LangHTML, Attrs: []AttrToken{a("keys", `{"close":[]}`, SyntaxAttr)}}, []Rule{RuleKeys}, `leaves "close" with no key`},
		{"keys essential null", Tag{Name: "void-button", Lang: LangHTML, Attrs: []AttrToken{a("keys", `{"activate":null}`, SyntaxAttr)}}, []Rule{RuleKeys}, "essential"},
		{"keys essential moved", Tag{Name: "void-dialog", Lang: LangHTML, Attrs: []AttrToken{a("keys", `{"close":"q"}`, SyntaxAttr)}}, nil, ""},
		{"keys entities", Tag{Name: "void-dialog", Lang: LangHTML, Attrs: []AttrToken{a("keys", `{&quot;close&quot;:[]}`, SyntaxAttr)}}, []Rule{RuleKeys}, "essential"},
		{"keys dynamic", Tag{Name: "void-dialog", Lang: LangHEEx, Attrs: []AttrToken{dyn(a("keys", "{@keys}", SyntaxAttr))}}, nil, ""},
		{"removed event", Tag{Name: "void-popover", Lang: LangERB, Attrs: []AttrToken{a("void-toggle", "", SyntaxEvent)}}, []Rule{RuleLegacyMarkup}, "no longer dispatches void-toggle (removed in 0.8); listen for void-open and void-close"},
	}
	c := NewChecker(testLibrary(t), stubScanner{})
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := c.CheckTag("f.html", tt.tag)
			var rules []Rule
			for _, f := range got {
				rules = append(rules, f.Rule)
			}
			if len(rules) != len(tt.want) {
				t.Fatalf("rules = %v, want %v (%v)", rules, tt.want, got)
			}
			for i := range rules {
				if rules[i] != tt.want[i] {
					t.Fatalf("rules = %v, want %v", rules, tt.want)
				}
			}
			if tt.msg != "" && !strings.Contains(got[0].Message, tt.msg) {
				t.Errorf("message %q does not contain %q", got[0].Message, tt.msg)
			}
		})
	}
}

func TestCheckSortsAndCounts(t *testing.T) {
	sc := stubScanner{tags: []Tag{
		{Name: "void-nope", Line: 3, Col: 1, Lang: LangHTML},
		{Name: "void-buton", Line: 1, Col: 5, Lang: LangHTML},
	}}
	c := NewChecker(testLibrary(t), sc)
	fs, err := c.Check(context.Background(), "x.html", nil, LangHTML)
	if err != nil {
		t.Fatal(err)
	}
	if len(fs) != 2 || fs[0].Line != 1 || c.Tags != 2 {
		t.Fatalf("got %v tags=%d", fs, c.Tags)
	}
}

func TestSnippetSynthesized(t *testing.T) {
	lib := testLibrary(t)
	tests := []struct {
		lang Lang
		want []string
	}{
		{LangHTML, []string{`<void-button variant="filled"></void-button>`, "addEventListener('void-click'"}},
		{LangJSX, []string{`<void-button variant="filled" onvoid-click={(e) => console.log(e.detail)} />`}},
		{LangHEEx, []string{`<.button variant="filled" />`, `handle_event("void-click"`}},
		{LangERB, []string{`data-controller="void-event"`, `data-action="void-click->my-controller#handle"`}},
	}
	for _, tt := range tests {
		t.Run(string(tt.lang), func(t *testing.T) {
			sn, err := lib.Snippet(context.Background(), "void-button", tt.lang)
			if err != nil {
				t.Fatal(err)
			}
			if sn.Source != SnippetSynthesized {
				t.Errorf("source = %s", sn.Source)
			}
			for _, w := range tt.want {
				if !strings.Contains(sn.Code, w) {
					t.Errorf("snippet %q missing %q", sn.Code, w)
				}
			}
		})
	}
	if _, err := lib.Snippet(context.Background(), "void-button", LangVue); err == nil {
		t.Error("vue snippet: want error")
	}
}

func TestReferenceUnknown(t *testing.T) {
	_, err := testLibrary(t).Reference(context.Background(), "void-buttn")
	if err == nil || !strings.Contains(err.Error(), "did you mean void-button") {
		t.Fatalf("err = %v", err)
	}
}
