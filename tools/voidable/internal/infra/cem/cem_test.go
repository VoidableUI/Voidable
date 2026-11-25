package cem

import (
	"errors"
	"testing"

	"github.com/VoidableUI/Voidable/tools/voidable/internal/domain"
)

const sample = `{"schemaVersion":"1.0.0","modules":[
 {"path":"dist/components/sidebar.js","declarations":[
  {"kind":"class","name":"VoidSidebar","description":"Side nav.","tagName":"void-sidebar","customElement":true,
   "members":[
    {"kind":"field","name":"collapsedWidth","type":{"text":"string"},"default":"'var(--w)'","attribute":"collapsedwidth","reflects":true},
    {"kind":"field","name":"items","type":{"text":"string[]"}},
    {"kind":"field","name":"_private","privacy":"private","type":{"text":"string"}},
    {"kind":"method","name":"toggle"}],
   "attributes":[{"name":"collapsedwidth","type":{"text":"string"},"default":"'var(--w)'","fieldName":"collapsedWidth"},
                 {"name":"position","type":{"text":"'left' | 'right'"},"default":"'left'","fieldName":"position"}],
   "events":[{"name":"void-toggle","type":{"text":"CustomEvent<{ collapsed: boolean }>"}}]}]},
 {"path":"dist/base.js","declarations":[{"kind":"class","name":"VoidElement"}]}]}`

func TestDecode(t *testing.T) {
	cat, err := Decode([]byte(sample), []byte(`{"package":"@voidable/ui","version":"1.4.0"}`))
	if err != nil {
		t.Fatal(err)
	}
	if cat.Version != "1.4.0" || len(cat.Elements) != 1 {
		t.Fatalf("catalog = %+v", cat)
	}
	e, ok := cat.Element("void-sidebar")
	if !ok {
		t.Fatal("no void-sidebar")
	}
	tests := []struct {
		name string
		got  any
		want any
	}{
		{"attr count", len(e.Attributes), 2},
		{"default unquoted", e.Attributes[0].Default, "var(--w)"},
		{"field", e.Attributes[0].Field, "collapsedWidth"},
		{"enum", e.Attributes[1].Kind, domain.KindEnum},
		{"props (no private/method)", len(e.Properties), 2},
		{"prop-only", len(e.PropertyOnly()), 1},
		{"event detail", e.Events[0].Fields[0].Name, "collapsed"},
	}
	for _, tt := range tests {
		if tt.got != tt.want {
			t.Errorf("%s = %v, want %v", tt.name, tt.got, tt.want)
		}
	}
}

func TestDecodeErrors(t *testing.T) {
	for _, in := range []string{`{`, `{"modules":[]}`} {
		if _, err := Decode([]byte(in), nil); !errors.Is(err, domain.ErrManifest) {
			t.Errorf("Decode(%q) err = %v", in, err)
		}
	}
}
