package render

import (
	"bytes"
	"context"
	"fmt"
	"io/fs"
	"sort"
	"strings"
	"text/template"

	"github.com/VoidableUI/Voidable/tools/voidable/internal/domain"
)

// target describes one generator output. The template file is
// <name>.tmpl in the template FS; per-element targets render the template
// once per element.
type target struct {
	perElement bool
	path       string // fmt pattern; %s is the element name for per-element targets
}

var targets = map[string]target{
	"heex":  {path: "lib/voidable_ui/components.ex"},
	"blade": {perElement: true, path: "resources/views/components/%s.blade.php"},
}

// Generator implements domain.Generator with text/template.
type Generator struct {
	templates fs.FS
}

// NewGenerator uses templates from the given FS.
func NewGenerator(templates fs.FS) *Generator { return &Generator{templates: templates} }

// Targets lists available targets.
func (g *Generator) Targets() []string {
	out := make([]string, 0, len(targets))
	for k := range targets {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

// Generate renders a target. Output is deterministic: elements are in tag
// order and nothing time- or host-dependent is written.
func (g *Generator) Generate(_ context.Context, name string, cat *domain.Catalog) ([]domain.GeneratedFile, error) {
	t, ok := targets[name]
	if !ok {
		return nil, fmt.Errorf("%w %q (have %s)", domain.ErrUnknownTarget, name, strings.Join(g.Targets(), ", "))
	}
	// Generated wrappers are for registered elements; a CSS-only element
	// is plain markup in every framework.
	cat = cat.Registered()
	tpl, err := template.New(name+".tmpl").Funcs(funcs).ParseFS(g.templates, name+".tmpl")
	if err != nil {
		return nil, fmt.Errorf("parse template %s: %w", name, err)
	}
	if !t.perElement {
		var b bytes.Buffer
		if err := tpl.Execute(&b, cat); err != nil {
			return nil, fmt.Errorf("render %s: %w", name, err)
		}
		return []domain.GeneratedFile{{Path: t.path, Content: b.String()}}, nil
	}
	var out []domain.GeneratedFile
	for i := range cat.Elements {
		var b bytes.Buffer
		data := struct {
			Version string
			*domain.Element
		}{cat.Version, &cat.Elements[i]}
		if err := tpl.Execute(&b, data); err != nil {
			return nil, fmt.Errorf("render %s for %s: %w", name, cat.Elements[i].Tag, err)
		}
		out = append(out, domain.GeneratedFile{
			Path:    fmt.Sprintf(t.path, strings.TrimPrefix(cat.Elements[i].Tag, "void-")),
			Content: b.String(),
		})
	}
	return out, nil
}

var funcs = template.FuncMap{
	"fn":       domain.FunctionName,
	"trimVoid": func(tag string) string { return strings.TrimPrefix(tag, "void-") },
	"assign":   domain.AssignName,
	"camel":    camel,
	"join":     strings.Join,
	"events": func(e domain.Element) string {
		names := make([]string, len(e.Events))
		for i, ev := range e.Events {
			names[i] = ev.Name
		}
		return strings.Join(names, ",")
	},
	"heexType": func(a domain.Attribute) string {
		switch a.Kind {
		case domain.KindBoolean:
			return ":boolean"
		case domain.KindString, domain.KindEnum:
			return ":string"
		}
		return ":any"
	},
	// heexDefault keeps attributes unset (nil) unless Phoenix requires a
	// default from :values, in which case the manifest default is used.
	// A boolean the component reads as "true"/"false" (spellcheck, closable)
	// stays unset unless the caller sets it, so the element keeps its own
	// default rather than one the template picked.
	"heexDefault": func(a domain.Attribute) string {
		switch {
		case a.FalseString:
			return "nil"
		case a.Kind == domain.KindBoolean:
			if a.Default == "true" {
				return "true"
			}
			return "false"
		case heexValues(a):
			return fmt.Sprintf("%q", a.Default)
		}
		return "nil"
	},
	"heexValues": heexValues,
	"quoteList": func(vs []string) string {
		q := make([]string, len(vs))
		for i, v := range vs {
			q[i] = fmt.Sprintf("%q", v)
		}
		return strings.Join(q, ", ")
	},
	"elixirDoc": func(s string) string { return strings.ReplaceAll(s, `"`, `\"`) },
	"phpDefault": func(a domain.Attribute) string {
		if a.FalseString {
			return "null"
		}
		if a.Kind == domain.KindBoolean {
			if a.Default == "true" {
				return "true"
			}
			return "false"
		}
		return "null"
	},
	"phpComment": func(a domain.Attribute) string {
		if a.Kind == domain.KindEnum {
			return strings.Join(a.Values, "|")
		}
		return a.Type
	},
	"isBool": func(a domain.Attribute) bool { return a.Kind == domain.KindBoolean },
}

// heexValues is true when the attribute can carry Phoenix `values:`.
func heexValues(a domain.Attribute) bool {
	if a.Kind != domain.KindEnum || a.Nullable {
		return false
	}
	for _, v := range a.Values {
		if v == a.Default {
			return true
		}
	}
	return false
}

// camel converts kebab-case to lowerCamel (show-values -> showValues).
func camel(s string) string {
	parts := strings.Split(s, "-")
	for i := 1; i < len(parts); i++ {
		if parts[i] != "" {
			parts[i] = strings.ToUpper(parts[i][:1]) + parts[i][1:]
		}
	}
	return strings.Join(parts, "")
}
