package domain

import (
	"context"
	"fmt"
	"sort"
	"strconv"
	"strings"
)

// Rule identifies a class of finding.
type Rule string

const (
	RuleUnknownElement   Rule = "unknown-element"
	RuleUnknownAttribute Rule = "unknown-attribute"
	RuleUnknownProperty  Rule = "unknown-property"
	RuleInvalidValue     Rule = "invalid-value"
	RuleBooleanFalse     Rule = "boolean-false"
	RuleInvalidParent    Rule = "invalid-parent"
	RuleUnknownEvent     Rule = "unknown-event"
	RuleSelfClosing      Rule = "self-closing"
)

// Finding is one problem in a source file.
type Finding struct {
	File       string `json:"file"`
	Line       int    `json:"line"`
	Col        int    `json:"col"`
	Rule       Rule   `json:"rule"`
	Tag        string `json:"tag"`
	Attr       string `json:"attr,omitempty"`
	Message    string `json:"message"`
	Suggestion string `json:"suggestion,omitempty"`
}

// Checker validates markup against the catalog.
type Checker struct {
	lib     *Library
	scanner MarkupScanner
	// Tags counts the void-* tags scanned so far (for --stats).
	Tags int
}

// NewChecker wires a checker. It accepts only the scanner port it needs.
func NewChecker(lib *Library, s MarkupScanner) *Checker {
	return &Checker{lib: lib, scanner: s}
}

// Check scans src (named file, in lang) and validates every void-* tag.
func (c *Checker) Check(ctx context.Context, file string, src []byte, lang Lang) ([]Finding, error) {
	tags, err := c.scanner.Scan(ctx, src, lang)
	if err != nil {
		return nil, fmt.Errorf("scan %s: %w", file, err)
	}
	c.Tags += len(tags)
	var out []Finding
	for _, t := range tags {
		out = append(out, c.CheckTag(file, t)...)
	}
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].Line != out[j].Line {
			return out[i].Line < out[j].Line
		}
		return out[i].Col < out[j].Col
	})
	return out, nil
}

// CheckTag validates one scanned tag.
func (c *Checker) CheckTag(file string, t Tag) []Finding {
	cat := c.lib.cat
	f := func(line, col int, rule Rule, attr, sugg, msg string, args ...any) Finding {
		return Finding{File: file, Line: line, Col: col, Rule: rule, Tag: t.Name, Attr: attr, Suggestion: sugg, Message: fmt.Sprintf(msg, args...)}
	}
	el, ok := cat.Element(t.Name)
	if !ok {
		s := Suggest(t.Name, cat.Tags())
		msg := fmt.Sprintf("unknown element <%s>", t.Name)
		if s != "" {
			msg += fmt.Sprintf(" (did you mean <%s>?)", s)
		}
		return []Finding{f(t.Line, t.Col, RuleUnknownElement, "", s, "%s", msg)}
	}
	var out []Finding
	if t.SelfClosing && t.Lang.SelfClosingIgnored() {
		out = append(out, f(t.Line, t.Col, RuleSelfClosing, "", "", "<%s /> is not self-closing in HTML: the parser ignores the slash and following content becomes its children; write <%s></%s>", t.Name, t.Name, t.Name))
	}
	if allowed, ok := c.lib.sup.Parents[el.Tag]; ok && t.Parent != "" && !contains(allowed, t.Parent) {
		out = append(out, f(t.Line, t.Col, RuleInvalidParent, "", "", "<%s> is not valid inside <%s>; it belongs in %s", el.Tag, t.Parent, joinTags(allowed)))
	}
	for _, a := range t.Attrs {
		out = append(out, c.checkAttr(el, t, a, f)...)
	}
	return out
}

type findingFn func(line, col int, rule Rule, attr, sugg, msg string, args ...any) Finding

func (c *Checker) checkAttr(el *Element, t Tag, a AttrToken, f findingFn) []Finding {
	switch a.Syntax {
	case SyntaxDirective, SyntaxSpread:
		return nil
	case SyntaxEvent:
		if !strings.HasPrefix(a.Name, "void-") {
			return nil
		}
		if _, ok := el.Event(a.Name); ok {
			return nil
		}
		var names []string
		for _, e := range el.Events {
			names = append(names, e.Name)
		}
		msg := fmt.Sprintf("<%s> does not dispatch %s", el.Tag, a.Name)
		if len(names) > 0 {
			msg += "; it dispatches " + strings.Join(names, ", ")
		} else {
			msg += "; it dispatches no void-* events"
		}
		if d := c.lib.cat.Dispatchers(a.Name); len(d) > 0 && len(d) <= 6 {
			msg += fmt.Sprintf(" (%s comes from %s)", a.Name, joinTags(d))
		}
		return []Finding{f(a.Line, a.Col, RuleUnknownEvent, a.Name, "", "%s", msg)}
	case SyntaxProperty:
		if _, ok := el.Property(a.Name); ok || isGlobalProperty(a.Name) {
			return nil
		}
		var props []string
		for _, p := range el.Properties {
			props = append(props, p.Name)
		}
		s := Suggest(a.Name, props)
		return []Finding{f(a.Line, a.Col, RuleUnknownProperty, a.Name, s, "unknown property .%s on <%s>%s", a.Name, el.Tag, didYouMean(s, "."))}
	}

	name := a.Name
	if !t.Lang.CaseSensitive() {
		name = strings.ToLower(name)
	}
	if isGlobalAttr(name) {
		return nil
	}
	attr, ok := el.Attribute(name)
	if !ok && t.Lang.CaseSensitive() {
		// JSX: React 19 assigns a property when the name is one.
		if p, ok := el.Property(name); ok {
			if p.Attribute == "" {
				return nil
			}
			attr, _ = el.Attribute(p.Attribute)
		} else if a2, ok2 := el.Attribute(strings.ToLower(name)); ok2 {
			attr = a2
		}
	}
	if attr == nil {
		return []Finding{c.unknownAttr(el, a, f)}
	}
	if !a.HasValue || a.Dynamic || a.Syntax != SyntaxAttr {
		return nil
	}
	v := a.Value
	switch attr.Kind {
	case KindEnum:
		if !contains(attr.Values, v) && !(attr.Nullable && v == "") {
			s := Suggest(v, attr.Values)
			return []Finding{f(a.Line, a.Col, RuleInvalidValue, a.Name, s, "%s=%q is not valid on <%s>; allowed: %s", a.Name, v, el.Tag, strings.Join(attr.Values, "|"))}
		}
	case KindBoolean:
		if strings.EqualFold(v, "false") {
			return []Finding{f(a.Line, a.Col, RuleBooleanFalse, a.Name, "", "%s=\"false\" on <%s> is true: a boolean attribute is on whenever present; remove it to make it false", a.Name, el.Tag)}
		}
	case KindNumber:
		if _, err := strconv.ParseFloat(strings.TrimSpace(v), 64); err != nil && v != "" {
			return []Finding{f(a.Line, a.Col, RuleInvalidValue, a.Name, "", "%s=%q on <%s> is not a number", a.Name, v, el.Tag)}
		}
	}
	return nil
}

func (c *Checker) unknownAttr(el *Element, a AttrToken, f findingFn) Finding {
	var cands []string
	for _, at := range el.Attributes {
		cands = append(cands, at.Name)
	}
	s := Suggest(a.Name, cands)
	msg := fmt.Sprintf("unknown attribute %s on <%s>", a.Name, el.Tag)
	if s != "" {
		msg += fmt.Sprintf(" (did you mean %s?)", s)
	}
	if h, ok := c.lib.sup.Hints[el.Tag][strings.ToLower(a.Name)]; ok {
		msg += "; " + h
	} else if s == "" {
		msg += "; valid: " + strings.Join(cands, ", ")
	}
	return f(a.Line, a.Col, RuleUnknownAttribute, a.Name, s, "%s", msg)
}

func didYouMean(s, prefix string) string {
	if s == "" {
		return ""
	}
	return fmt.Sprintf(" (did you mean %s%s?)", prefix, s)
}

func contains(list []string, s string) bool {
	for _, x := range list {
		if x == s {
			return true
		}
	}
	return false
}

func joinTags(tags []string) string {
	out := make([]string, len(tags))
	for i, t := range tags {
		out[i] = "<" + t + ">"
	}
	return strings.Join(out, ", ")
}

var globalAttrs = map[string]bool{
	"id": true, "class": true, "style": true, "slot": true, "hidden": true, "title": true,
	"lang": true, "dir": true, "tabindex": true, "role": true, "part": true, "exportparts": true,
	"is": true, "inert": true, "autofocus": true, "accesskey": true, "contenteditable": true,
	"draggable": true, "spellcheck": true, "translate": true, "nonce": true, "popover": true,
	"enterkeyhint": true, "inputmode": true, "autocapitalize": true, "itemscope": true,
	"itemprop": true, "itemtype": true, "itemid": true, "itemref": true, "form": true,
	// JSX spellings and React-only props.
	"className": true, "htmlFor": true, "tabIndex": true, "key": true, "ref": true,
	"children": true, "dangerouslySetInnerHTML": true, "suppressHydrationWarning": true,
	"contentEditable": true, "accessKey": true, "autoFocus": true,
}

func isGlobalAttr(name string) bool {
	if globalAttrs[name] {
		return true
	}
	l := strings.ToLower(name)
	return strings.HasPrefix(l, "aria-") || strings.HasPrefix(l, "data-") ||
		strings.HasPrefix(name, "aria") && len(name) > 4 && name[4] >= 'A' && name[4] <= 'Z'
}

func isGlobalProperty(name string) bool {
	switch name {
	case "id", "className", "hidden", "title", "textContent", "innerHTML", "style", "tabIndex", "slot":
		return true
	}
	return false
}
