package domain

import (
	"fmt"
	"slices"
	"strings"
)

// checkName reports an element that must have an accessible name and shows
// nothing that could give it one. What needs a name, and what supplies one,
// is data in the manifest (Element.Name); this function knows no tag.
//
// It reports only when it is sure: anything it cannot evaluate (an
// expression, a spread, a slot, yielded content, a framework component around
// or inside the element) counts as possibly providing the name.
func checkName(el *Element, t Tag) []Finding {
	rule := el.Name
	if rule == nil || t.Mention {
		return nil
	}
	// `<void-x />` in HTML is not self-closing: what follows is its content.
	if t.SelfClosing && t.Lang.SelfClosingIgnored() {
		return nil
	}
	if t.Labelled && rule.hasAncestor("label") {
		return nil
	}
	if t.InComponent && len(rule.Ancestors) > 0 {
		return nil
	}
	for _, a := range t.Attrs {
		if namesByAttr(a, t.Name, rule.Attributes) {
			return nil
		}
	}
	if rule.Content && (!t.Content.Known && !t.SelfClosing || t.Content.Text || t.Content.Dynamic) {
		return nil
	}
	if len(rule.Parts) > 0 && (!t.Content.Known && !t.SelfClosing || t.Content.Dynamic) {
		return nil
	}
	for _, part := range rule.Parts {
		// A void-* part, or a native element the component takes as its part (a table's <caption>).
		if slices.Contains(t.Content.Tags, part) || slices.Contains(t.Content.Native, part) {
			return nil
		}
	}
	for _, want := range rule.Ancestors {
		for _, have := range t.Ancestors {
			if have.Name != want.Tag {
				continue
			}
			if len(want.Attributes) == 0 {
				return nil
			}
			for _, a := range have.Attrs {
				if namesByAttr(a, have.Name, want.Attributes) {
					return nil
				}
			}
		}
	}
	return []Finding{{
		File: "", Line: t.Line, Col: t.Col, Rule: RuleMissingName, Tag: t.Name,
		Message:    nameMessage(el, rule),
		Suggestion: rule.suggestion(),
	}}
}

func (r *NameRule) hasAncestor(tag string) bool {
	for _, a := range r.Ancestors {
		if a.Tag == tag {
			return true
		}
	}
	return false
}

// own returns the attributes specific to the component (not aria-* or title).
func (r *NameRule) own() []string {
	var out []string
	for _, a := range r.Attributes {
		if !strings.HasPrefix(a, "aria-") && a != "title" {
			out = append(out, a)
		}
	}
	return out
}

func (r *NameRule) suggestion() string {
	if own := r.own(); len(own) > 0 {
		return own[0] + `="..."`
	}
	return `aria-label="..."`
}

// nameKey makes attribute spellings comparable: `aria-label`, `ariaLabel` and
// `aria_label` are one name.
func nameKey(s string) string {
	return strings.ToLower(strings.NewReplacer("-", "", "_", "").Replace(s))
}

// namesByAttr reports whether the attribute token could give the element a
// name: it is one of the listed attributes with a non-empty or dynamic value,
// or it is a spread or binding that may carry any attribute.
func namesByAttr(a AttrToken, tag string, names []string) bool {
	switch a.Syntax {
	case SyntaxSpread:
		return true
	case SyntaxDirective:
		return isAttrBinding(a.Raw)
	case SyntaxEvent:
		return false
	}
	key := nameKey(a.Name)
	for _, n := range names {
		if key != nameKey(n) {
			continue
		}
		if a.Dynamic || a.Syntax == SyntaxBound || a.Syntax == SyntaxProperty {
			return true
		}
		// A bare attribute, or an empty value, is an empty name.
		return a.HasValue && strings.TrimSpace(a.Value) != ""
	}
	return false
}

// isAttrBinding reports whether a directive passes a whole attribute set
// through (`v-bind="$attrs"`, `x-bind="..."`).
func isAttrBinding(raw string) bool {
	return raw == "v-bind" || raw == "x-bind" || strings.HasPrefix(raw, "v-bind=") || strings.HasPrefix(raw, "x-bind=")
}

func nameMessage(el *Element, r *NameRule) string {
	var ways []string
	if own := r.own(); len(own) > 0 {
		ways = append(ways, "a "+strings.Join(own, " or ")+" attribute")
	}
	ways = append(ways, "aria-label")
	if r.Content {
		ways = append(ways, "text inside it")
	}
	for _, p := range r.Parts {
		ways = append(ways, "a <"+p+"> part")
	}
	for _, a := range r.Ancestors {
		switch {
		case a.Tag == "label":
			ways = append(ways, "an enclosing <label>")
		case len(a.Attributes) > 0:
			ways = append(ways, fmt.Sprintf("an enclosing <%s %s=\"...\">", a.Tag, a.Attributes[0]))
		default:
			ways = append(ways, fmt.Sprintf("an enclosing <%s>", a.Tag))
		}
	}
	msg := fmt.Sprintf("<%s> has no accessible name, so a screen reader announces it as nothing; name it with %s", el.Tag, strings.Join(ways, ", "))
	if r.Hint != "" {
		msg += ": " + r.Hint
	}
	return msg
}
