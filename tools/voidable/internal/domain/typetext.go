package domain

import (
	"regexp"
	"strings"
)

// ParseType interprets TypeScript type text from the manifest. A union made
// only of string literals (optionally with null/undefined) becomes an enum.
func ParseType(text string) (kind ValueKind, values []string, nullable bool) {
	t := strings.TrimSpace(text)
	parts := splitTopLevel(t, '|')
	var lits []string
	var others []string
	for _, p := range parts {
		p = strings.TrimSpace(p)
		switch {
		case p == "null" || p == "undefined":
			nullable = true
		case len(p) >= 2 && (p[0] == '\'' || p[0] == '"') && p[len(p)-1] == p[0]:
			lits = append(lits, p[1:len(p)-1])
		default:
			others = append(others, p)
		}
	}
	switch {
	case len(lits) > 0 && len(others) == 0:
		return KindEnum, lits, nullable
	case len(others) == 1 && len(lits) == 0:
		switch others[0] {
		case "string":
			return KindString, nil, nullable
		case "boolean":
			return KindBoolean, nil, nullable
		case "number":
			return KindNumber, nil, nullable
		}
	}
	return KindOther, nil, nullable
}

// CleanDefault strips the quotes the analyzer keeps around string defaults.
func CleanDefault(d string) string {
	d = strings.TrimSpace(d)
	if len(d) >= 2 && (d[0] == '\'' || d[0] == '"' || d[0] == '`') && d[len(d)-1] == d[0] {
		return d[1 : len(d)-1]
	}
	return d
}

var customEventRe = regexp.MustCompile(`^CustomEvent(?:<(.*)>)?$`)

// ParseDetail extracts the detail type of `CustomEvent<...>` and, when it is
// an object literal, its fields. A bare `CustomEvent` yields "".
func ParseDetail(typeText string) (string, []Field) {
	m := customEventRe.FindStringSubmatch(strings.TrimSpace(typeText))
	if m == nil {
		return typeText, nil
	}
	detail := strings.TrimSpace(m[1])
	if detail == "Record<string, never>" {
		return "{}", nil
	}
	if !strings.HasPrefix(detail, "{") || !strings.HasSuffix(detail, "}") {
		return detail, nil
	}
	body := strings.TrimSpace(detail[1 : len(detail)-1])
	var fields []Field
	for _, part := range splitTopLevel(body, ';') {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		name, typ, ok := strings.Cut(part, ":")
		if !ok {
			continue
		}
		fields = append(fields, Field{Name: strings.TrimSpace(name), Type: strings.TrimSpace(typ)})
	}
	return detail, fields
}

// splitTopLevel splits on sep outside <>, {}, (), [] and quotes.
func splitTopLevel(s string, sep byte) []string {
	var out []string
	depth := 0
	var quote byte
	start := 0
	for i := 0; i < len(s); i++ {
		c := s[i]
		if quote != 0 {
			if c == quote {
				quote = 0
			}
			continue
		}
		switch c {
		case '\'', '"', '`':
			quote = c
		case '<', '{', '(', '[':
			depth++
		case '>', '}', ')', ']':
			depth--
		case sep:
			if depth == 0 {
				out = append(out, s[start:i])
				start = i + 1
			}
		}
	}
	return append(out, s[start:])
}
