package domain

import (
	"strings"
	"testing"
)

func TestAllowlist(t *testing.T) {
	al, err := ParseAllowlist(strings.NewReader(`
# comment
invalid-value void-button variant=ghost 2   # trailing comment
unknown-attribute void-input autocomplete 1
unknown-attribute void-stat description 3
`))
	if err != nil {
		t.Fatal(err)
	}
	ghost := Finding{Rule: RuleInvalidValue, Tag: "void-button", Attr: "variant", Value: "ghost"}
	other := Finding{Rule: RuleInvalidValue, Tag: "void-button", Attr: "variant", Value: "x"}
	auto := Finding{Rule: RuleUnknownAttribute, Tag: "void-input", Attr: "autocomplete"}
	res := al.Apply([]Finding{ghost, ghost, ghost, other, auto})
	if len(res.Remaining) != 2 || res.Remaining[0] != ghost || res.Remaining[1] != other {
		t.Errorf("remaining = %v (want the third ghost, which exceeds max, and the other value)", res.Remaining)
	}
	if len(res.Stale) != 1 || res.Stale[0].Tag != "void-stat" {
		t.Errorf("stale = %v", res.Stale)
	}
	for _, bad := range []string{"invalid-value void-button", "a b c 0", "a b c x"} {
		if _, err := ParseAllowlist(strings.NewReader(bad)); err == nil {
			t.Errorf("%q: want error", bad)
		}
	}
}
