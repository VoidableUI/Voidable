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
	switch f {
	case FormatJSON:
		return writeJSON(w, map[string]any{"version": version, "elements": rows})
	case FormatMarkdown:
		fmt.Fprintf(w, "# @voidable/ui %s elements\n\n| Tag | Description |\n|---|---|\n", version)
		for _, r := range rows {
			fmt.Fprintf(w, "| `<%s>` | %s |\n", r.Tag, mdEscape(r.Description))
		}
		return nil
	}
	fmt.Fprintf(w, "@voidable/ui %s: %d elements. `voidable ref <tag>` for attributes, events, example.\n", version, len(rows))
	for _, r := range rows {
		fmt.Fprintf(w, "%s %s\n", r.Tag, r.Description)
	}
	return nil
}

// References writes one or more element references.
func References(w io.Writer, refs []*domain.Reference, f Format) error {
	switch f {
	case FormatJSON:
		if len(refs) == 1 {
			return writeJSON(w, refs[0])
		}
		return writeJSON(w, refs)
	case FormatMarkdown:
		for i, r := range refs {
			if i > 0 {
				io.WriteString(w, "\n")
			}
			refMarkdown(w, r)
		}
		return nil
	}
	for i, r := range refs {
		if i > 0 {
			io.WriteString(w, "\n")
		}
		refText(w, r)
	}
	return nil
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

func refText(w io.Writer, r *domain.Reference) {
	fmt.Fprintf(w, "<%s> %s: %s\n", r.Tag, r.Class, r.Description)
	if len(r.Attributes) > 0 {
		io.WriteString(w, "attrs:\n")
		for _, a := range r.Attributes {
			line := fmt.Sprintf(" %s: %s%s", a.Name, attrType(a), attrDefault(a))
			if a.Field != "" && a.Field != a.Name {
				line += " (prop " + a.Field + ")"
			}
			if a.Description != "" {
				line += " # " + a.Description
			}
			fmt.Fprintln(w, line)
		}
	}
	if po := (&r.Element).PropertyOnly(); len(po) > 0 {
		io.WriteString(w, "props only (set in JS, no attribute):\n")
		for _, p := range po {
			fmt.Fprintf(w, " %s: %s\n", p.Name, p.Type)
		}
	}
	if len(r.Events) > 0 {
		io.WriteString(w, "events:\n")
		for _, e := range r.Events {
			d := e.Detail
			if d == "" {
				d = "(no detail)"
			}
			line := fmt.Sprintf(" %s detail=%s", e.Name, d)
			if e.Description != "" {
				line += " # " + e.Description
			}
			fmt.Fprintln(w, line)
		}
	}
	if len(r.Parents) > 0 {
		fmt.Fprintf(w, "parents: %s [stand-in]\n", strings.Join(r.Parents, ", "))
	}
	if len(r.Missing) > 0 {
		fmt.Fprintf(w, "not in manifest: %s\n", strings.Join(r.Missing, ", "))
	}
	if r.Example != nil {
		label := "example"
		if r.Example.Source == domain.SnippetSupplement {
			label += " [stand-in]"
		} else {
			label += " [synthesized, children unknown]"
		}
		fmt.Fprintf(w, "%s:\n%s", label, indent(r.Example.Code, " "))
	}
}

func refMarkdown(w io.Writer, r *domain.Reference) {
	fmt.Fprintf(w, "## `<%s>`\n\n%s\n\n", r.Tag, r.Description)
	if len(r.Attributes) > 0 {
		io.WriteString(w, "| Attribute | Type | Default | Description |\n|---|---|---|---|\n")
		for _, a := range r.Attributes {
			fmt.Fprintf(w, "| `%s` | `%s` | %s | %s |\n", a.Name, mdEscape(attrType(a)), mdCode(a.Default), mdEscape(a.Description))
		}
		io.WriteString(w, "\n")
	}
	if len(r.Events) > 0 {
		io.WriteString(w, "| Event | Detail |\n|---|---|\n")
		for _, e := range r.Events {
			fmt.Fprintf(w, "| `%s` | %s |\n", e.Name, mdCode(e.Detail))
		}
		io.WriteString(w, "\n")
	}
	if r.Example != nil {
		fmt.Fprintf(w, "Example (%s):\n\n```html\n%s```\n", r.Example.Source, r.Example.Code)
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
	if f == FormatJSON {
		if fs == nil {
			fs = []domain.Finding{}
		}
		return writeJSON(w, fs)
	}
	for _, x := range fs {
		fmt.Fprintf(w, "%s:%d:%d: [%s] %s\n", x.File, x.Line, x.Col, x.Rule, x.Message)
	}
	return nil
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
