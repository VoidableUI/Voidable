package domain

import "testing"

// The select-all hint (#89): a warning for a many-rows `selectable` table with no checkbox in a header cell.
func TestCheckSelectAll(t *testing.T) {
	sel := func(value string, dynamic bool) AttrToken {
		return AttrToken{Name: "selectable", Raw: "selectable", Value: value, HasValue: value != "", Syntax: SyntaxAttr, Dynamic: dynamic, Line: 3, Col: 14}
	}
	table := func(content Content, attrs ...AttrToken) Tag {
		return Tag{Name: "void-table", Lang: LangHTML, Closed: true, Attrs: attrs, Content: content}
	}
	known := Content{Known: true, Native: []string{"table", "th"}}
	tests := []struct {
		name string
		tag  Tag
		want bool
	}{
		{"many rows, no header checkbox", table(known, sel("", false)), true},
		{"many rows with a header checkbox", table(Content{Known: true, HeaderCheckbox: true}, sel("", false)), false},
		{"single needs none", table(known, sel("single", false)), false},
		{"not selectable", table(known), false},
		{"selectable is an expression", table(known, sel("{kind}", true)), false},
		{"content with an expression", table(Content{Known: true, Dynamic: true}, sel("", false)), false},
		{"unclosed", Tag{Name: "void-table", Attrs: []AttrToken{sel("", false)}, Content: known}, false},
		{"prose mention", Tag{Name: "void-table", Closed: true, Mention: true, Attrs: []AttrToken{sel("", false)}, Content: known}, false},
		{"another element", Tag{Name: "void-list", Closed: true, Attrs: []AttrToken{sel("", false)}, Content: known}, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f, got := checkSelectAll(tt.tag)
			if got != tt.want {
				t.Fatalf("hint = %v, want %v", got, tt.want)
			}
			if got && (f.Rule != RuleSelectAll || f.Severity != SeverityWarning || f.Line != 3 || f.Col != 14) {
				t.Errorf("finding = %+v", f)
			}
		})
	}
}
