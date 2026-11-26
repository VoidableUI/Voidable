// Package render formats domain results for people and agents (text,
// Markdown, JSON) and implements the text/template code generator.
package render

import (
	"encoding/json"
	"fmt"
	"io"
	"strings"

	"github.com/VoidableUI/Voidable/tools/voidable/internal/domain"
)

// Format is an output format.
type Format string

const (
	FormatText     Format = "text"
	FormatJSON     Format = "json"
	FormatMarkdown Format = "markdown"
)

// ParseFormat validates a --format value.
func ParseFormat(s string) (Format, error) {
	switch Format(s) {
	case FormatText, FormatJSON, FormatMarkdown:
		return Format(s), nil
	case "md":
		return FormatMarkdown, nil
	}
	return "", fmt.Errorf("unknown format %q (text, json, markdown)", s)
}

// IndexEntry is one row of the element index.
type IndexEntry struct {
	Tag         string `json:"tag"`
	Description string `json:"description"`
}

// Index writes the one-line-per-element index.
func Index(w io.Writer, version string, cat *domain.Catalog, f Format) error {
	rows := make([]IndexEntry, len(cat.Elements))
	for i, e := range cat.Elements {
		rows[i] = IndexEntry{e.Tag, e.Description}
	}
	p := &printer{w: w}
	switch f {
	case FormatJSON:
		return writeJSON(w, map[string]any{"version": version, "elements": rows})
	case FormatMarkdown:
		p.f("# @voidable/ui %s elements\n\n| Tag | Description |\n|---|---|\n", version)
		for _, r := range rows {
			p.f("| `<%s>` | %s |\n", r.Tag, mdEscape(r.Description))
		}
		return p.err
	}
	p.f("@voidable/ui %s: %d elements. `voidable ref <tag>` for attributes, events, example.\n", version, len(rows))
	for _, r := range rows {
		p.f("%s %s\n", r.Tag, r.Description)
	}
	return p.err
}

// References writes one or more element references.
func References(w io.Writer, refs []*domain.Reference, f Format) error {
	p := &printer{w: w}
	switch f {
	case FormatJSON:
		if len(refs) == 1 {
			return writeJSON(w, refs[0])
		}
		return writeJSON(w, refs)
	case FormatMarkdown:
		for i, r := range refs {
			if i > 0 {
				p.f("%s", "\n")
			}
			refMarkdown(p, r)
		}
		return p.err
	}
	for i, r := range refs {
		if i > 0 {
			p.f("%s", "\n")
		}
		refText(p, r)
	}
	return p.err
}

// attrType renders the compact type: enum values joined by |.
func attrType(a domain.Attribute) string {
	if a.Kind == domain.KindEnum {
		s := strings.Join(a.Values, "|")
		if a.Nullable {
			s += "|null"
		}
		return s
	}
	return a.Type
}

func attrDefault(a domain.Attribute) string {
	switch {
	case a.Kind == domain.KindBoolean && a.Default == "true":
		return " =true (cannot be unset from HTML; set the property to false)"
	case a.Kind == domain.KindBoolean, a.Default == "", a.Default == "''", a.Default == "null", a.Default == "undefined":
		return ""
	}
	return " =" + a.Default
}

func refText(p *printer, r *domain.Reference) {
	if r.CSSOnly && r.PartOf != "" {
		p.f("<%s> CSS-only part of <%s> (no JavaScript; the component wires it): %s\n", r.Tag, r.PartOf, r.Description)
	} else if r.CSSOnly {
		p.f("<%s> CSS only (styled by @voidable/theme; no JavaScript, no properties, no events): %s\n", r.Tag, r.Description)
	} else {
		p.f("<%s> %s: %s\n", r.Tag, r.Class, r.Description)
	}
	if len(r.Attributes) > 0 {
		p.f("%s", "attrs:\n")
		for _, a := range r.Attributes {
			line := fmt.Sprintf(" %s: %s%s", a.Name, attrType(a), attrDefault(a))
			if a.Field != "" && a.Field != a.Name {
				line += " (prop " + a.Field + ")"
			}
			if a.Description != "" {
				line += " # " + a.Description
			}
			p.f("%s\n", line)
		}
	}
	if po := (&r.Element).PropertyOnly(); len(po) > 0 {
		p.f("%s", "props only (set in JS, no attribute):\n")
		for _, prop := range po {
			line := fmt.Sprintf(" %s: %s", prop.Name, prop.Type)
			if prop.Description != "" {
				line += " # " + prop.Description
			}
			p.f("%s\n", line)
		}
	}
	if len(r.Events) > 0 {
		p.f("%s", "events:\n")
		for _, e := range r.Events {
			d := e.Detail
			if d == "" {
				d = "(no detail)"
			}
			line := fmt.Sprintf(" %s detail=%s", e.Name, d)
			if e.Description != "" {
				line += " # " + e.Description
			}
			p.f("%s\n", line)
		}
	}
	if len(r.Slots) > 0 {
		p.f("%s", "slots:\n")
		for _, s := range r.Slots {
			name := s.Name
			if name == "" {
				name = "(default)"
			}
			p.f(" %s # %s\n", name, s.Description)
		}
	}
	if len(r.Messages) > 0 {
		p.f("%s", "words it writes (English default; replaced by):\n")
		for _, m := range r.Messages {
			p.f(" %s: %q # %s\n", m.Key, m.Default, m.Override.String())
		}
	}
	if r.Parts != nil {
		partsText(p, r.Parts, " ")
		if r.Parts.Skeleton != "" {
			p.f("markup: %s\n", r.Parts.Skeleton)
		}
	}
	if len(r.Parents) > 0 {
		p.f("parents: %s\n", strings.Join(r.Parents, ", "))
	}
	if len(r.Missing) > 0 {
		p.f("not in manifest: %s\n", strings.Join(r.Missing, ", "))
	}
	if r.Example != nil {
		label := "example"
		if r.Example.Source == domain.SnippetSupplement {
			label += " [stand-in]"
		} else {
			label += " [synthesized, children unknown]"
		}
		p.f("%s:\n%s", label, indent(r.Example.Code, " "))
	}
}

func refMarkdown(p *printer, r *domain.Reference) {
	p.f("## `<%s>`\n\n%s\n\n", r.Tag, r.Description)
	if r.CSSOnly && r.PartOf != "" {
		p.f("CSS-only part of `<%s>`: `@voidable/theme` styles it and nothing registers it; `<%s>` finds it and wires it up. Write it as plain markup in every framework.\n\n", r.PartOf, r.PartOf)
	} else if r.CSSOnly {
		p.f("%s", "CSS only: `@voidable/theme` styles this tag and nothing registers it, so it needs no JavaScript and has no properties or events. Write it as plain markup in every framework.\n\n")
	}
	if r.Parts != nil {
		partsMarkdown(p, r.Parts)
	}
	if len(r.Attributes) > 0 {
		p.f("%s", "| Attribute | Type | Default | Description |\n|---|---|---|---|\n")
		for _, a := range r.Attributes {
			p.f("| `%s` | `%s` | %s | %s |\n", a.Name, mdEscape(attrType(a)), mdCode(a.Default), mdEscape(a.Description))
		}
		p.f("%s", "\n")
	}
	if len(r.Slots) > 0 {
		p.f("%s", "| Slot | Description |\n|---|---|\n")
		for _, s := range r.Slots {
			name := "(default)"
			if s.Name != "" {
				name = "`" + s.Name + "`"
			}
			p.f("| %s | %s |\n", name, mdEscape(s.Description))
		}
		p.f("%s", "\n")
	}
	if len(r.Events) > 0 {
		p.f("%s", "| Event | Detail |\n|---|---|\n")
		for _, e := range r.Events {
			p.f("| `%s` | %s |\n", e.Name, mdCode(e.Detail))
		}
		p.f("%s", "\n")
	}
	if len(r.Messages) > 0 {
		p.f("%s", "Words it writes itself (English; the language follows the closest `lang`):\n\n| Message | Default | Replaced by |\n|---|---|---|\n")
		for _, m := range r.Messages {
			p.f("| `%s` | %s | %s |\n", m.Key, mdEscape(m.Default), mdCode(m.Override.String()))
		}
		p.f("%s", "\n")
	}
	if r.Example != nil {
		p.f("Example (%s):\n\n```html\n%s```\n", r.Example.Source, r.Example.Code)
	}
}

// Snippet writes a snippet.
func Snippet(w io.Writer, s *domain.Snippet, f Format) error {
	if f == FormatJSON {
		return writeJSON(w, s)
	}
	_, err := io.WriteString(w, s.Code)
	return err
}

// Findings writes check results: one `file:line:col: message` per line.
func Findings(w io.Writer, fs []domain.Finding, f Format) error {
	p := &printer{w: w}
	if f == FormatJSON {
		if fs == nil {
			fs = []domain.Finding{}
		}
		return writeJSON(w, fs)
	}
	for _, x := range fs {
		p.f("%s:%d:%d: [%s] %s\n", x.File, x.Line, x.Col, x.Rule, x.Message)
	}
	return p.err
}

// printer writes formatted output and keeps the first error.
type printer struct {
	w   io.Writer
	err error
}

func (p *printer) f(format string, a ...any) {
	if p.err == nil {
		_, p.err = fmt.Fprintf(p.w, format, a...)
	}
}

func writeJSON(w io.Writer, v any) error {
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	enc.SetEscapeHTML(false)
	return enc.Encode(v)
}

func indent(s, p string) string {
	lines := strings.Split(strings.TrimRight(s, "\n"), "\n")
	for i := range lines {
		lines[i] = p + lines[i]
	}
	return strings.Join(lines, "\n") + "\n"
}

func mdEscape(s string) string { return strings.ReplaceAll(s, "|", `\|`) }

func mdCode(s string) string {
	if s == "" {
		return ""
	}
	return "`" + mdEscape(s) + "`"
}

// partsRule says how a component takes its parts, in one line.
func partsRule(ps *domain.Parts) string {
	rule := "parts mixed with other content"
	if ps.Children == "parts" {
		rule = "only these parts as children"
	}
	if ps.Ordered {
		rule += ", in this order"
	}
	if len(ps.Transparent) > 0 {
		rule += " (a " + strings.Join(ps.Transparent, ", ") + " may wrap them)"
	}
	return rule
}

func partFlags(x domain.Part) string {
	var flags []string
	if x.Required {
		flags = append(flags, "required")
	}
	if x.Max == 1 {
		flags = append(flags, "one")
	} else if x.Max > 1 {
		flags = append(flags, fmt.Sprintf("at most %d", x.Max))
	} else {
		flags = append(flags, "any number")
	}
	if x.Control {
		flags = append(flags, "wraps one control")
	}
	if x.CSSOnly {
		flags = append(flags, "CSS-only")
	}
	return strings.Join(flags, ", ")
}

func partsText(p *printer, ps *domain.Parts, pad string) {
	p.f("%sparts: %s\n", strings.TrimPrefix(pad, " "), partsRule(ps))
	for _, x := range ps.Parts {
		p.f("%s <%s> (%s) # %s\n", pad, x.Tag, partFlags(x), x.Description)
		if x.Own != nil {
			partsText(p, x.Own, pad+"  ")
		}
	}
}

func partsMarkdown(p *printer, ps *domain.Parts) {
	p.f("Parts (%s):\n\n| Part | | Description |\n|---|---|---|\n", partsRule(ps))
	var rows func(list []domain.Part, depth int)
	rows = func(list []domain.Part, depth int) {
		for _, x := range list {
			p.f("| %s`<%s>` | %s | %s |\n", strings.Repeat("&emsp;", depth), x.Tag, partFlags(x), mdEscape(x.Description))
			if x.Own != nil {
				rows(x.Own.Parts, depth+1)
			}
		}
	}
	rows(ps.Parts, 0)
	p.f("%s", "\n")
	if ps.Skeleton != "" {
		p.f("Markup: `%s`\n\n", ps.Skeleton)
	}
}
