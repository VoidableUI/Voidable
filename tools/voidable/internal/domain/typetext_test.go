package domain

import (
	"reflect"
	"testing"
)

func TestParseType(t *testing.T) {
	tests := []struct {
		text     string
		kind     ValueKind
		values   []string
		nullable bool
	}{
		{"string", KindString, nil, false},
		{"boolean", KindBoolean, nil, false},
		{"number", KindNumber, nil, false},
		{"'outline' | 'filled'", KindEnum, []string{"outline", "filled"}, false},
		{"'up' | 'down' | null", KindEnum, []string{"up", "down"}, true},
		{"string | undefined", KindString, nil, true},
		{"number | null", KindNumber, nil, true},
		{"boolean | number", KindOther, nil, false},
		{"string[]", KindOther, nil, false},
		{"TagValue[]", KindOther, nil, false},
	}
	for _, tt := range tests {
		t.Run(tt.text, func(t *testing.T) {
			k, v, n := ParseType(tt.text)
			if k != tt.kind || !reflect.DeepEqual(v, tt.values) || n != tt.nullable {
				t.Errorf("ParseType(%q) = %v %v %v, want %v %v %v", tt.text, k, v, n, tt.kind, tt.values, tt.nullable)
			}
		})
	}
}

func TestParseDetail(t *testing.T) {
	tests := []struct {
		text   string
		detail string
		fields []Field
	}{
		{"CustomEvent", "", nil},
		{"CustomEvent<Record<string, never>>", "{}", nil},
		{"CustomEvent<{ value: string }>", "{ value: string }", []Field{{"value", "string"}}},
		{"CustomEvent<{ value: string; date: Date }>", "{ value: string; date: Date }", []Field{{"value", "string"}, {"date", "Date"}}},
		{"CustomEvent<{ item: VoidDropdownMenuItem }>", "{ item: VoidDropdownMenuItem }", []Field{{"item", "VoidDropdownMenuItem"}}},
	}
	for _, tt := range tests {
		t.Run(tt.text, func(t *testing.T) {
			d, f := ParseDetail(tt.text)
			if d != tt.detail || !reflect.DeepEqual(f, tt.fields) {
				t.Errorf("ParseDetail(%q) = %q %v, want %q %v", tt.text, d, f, tt.detail, tt.fields)
			}
		})
	}
}

func TestSuggest(t *testing.T) {
	tags := []string{"void-button", "void-dropdown-menu", "void-select", "void-tabs", "void-tab-panel"}
	attrs := []string{"collapsed", "width", "collapsedwidth", "position", "showvalue", "submit-mode"}
	tests := []struct {
		name  string
		cands []string
		want  string
	}{
		{"void-buton", tags, "void-button"},
		{"void-tab", tags, "void-tabs"},
		{"void-dropdown", tags, "void-dropdown-menu"},
		{"void-nonsense-widget", tags, ""},
		{"collapsed-width", attrs, "collapsedwidth"},
		{"show-value", attrs, "showvalue"},
		{"submitMode", attrs, "submit-mode"},
		{"positon", attrs, "position"},
		{"label", attrs, ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := Suggest(tt.name, tt.cands); got != tt.want {
				t.Errorf("Suggest(%q) = %q, want %q", tt.name, got, tt.want)
			}
		})
	}
}

func TestLangForPath(t *testing.T) {
	tests := map[string]Lang{
		"a.html": LangHTML, "a.html.erb": LangERB, "_form.html.erb.tt": LangERB, "x.heex": LangHEEx,
		"components.ex": LangHEEx, "a.blade.php": LangBlade, "App.tsx": LangJSX, "index.astro": LangAstro,
		"Btn.stories.ts": LangLit, "guide.mdx": LangMarkdown, "x.vue": LangVue, "unknown.txt": LangHTML,
	}
	for p, want := range tests {
		if got := LangForPath(p); got != want {
			t.Errorf("LangForPath(%q) = %s, want %s", p, got, want)
		}
	}
}
