// Package skillgen builds the "building UIs with Voidable" Agent Skill from
// the embedded manifest: a hand-written SKILL.md of working rules plus
// reference files (element index, one file per component, snippets per
// language, known wrong usages) generated from the catalog, so the skill
// always matches the library version in the binary.
package skillgen

import (
	"bytes"
	"context"
	_ "embed"
	"fmt"
	"sort"
	"strings"
	"text/template"

	"github.com/VoidableUI/Voidable/tools/voidable/internal/domain"
	"github.com/VoidableUI/Voidable/tools/voidable/internal/infra/render"
)

// Name is the skill's name: its directory (default install location
// .claude/skills/voidable) and, by SEP-2640, the last segment of its URI.
const Name = "voidable"

const mimeMarkdown = "text/markdown"

//go:embed templates/SKILL.md.tmpl
var skillTemplate string

// Builder implements domain.SkillSource over a library.
type Builder struct {
	lib *domain.Library
}

// New creates a builder.
func New(lib *domain.Library) *Builder { return &Builder{lib: lib} }

// Skill generates every file of the skill. The result is deterministic.
func (b *Builder) Skill(ctx context.Context) (*domain.Skill, error) {
	cat := b.lib.Catalog()
	var files []domain.SkillFile
	add := func(path, content string) {
		files = append(files, domain.SkillFile{Path: path, MIME: mimeMarkdown, Content: []byte(content)})
	}

	md, err := b.skillMD(cat)
	if err != nil {
		return nil, err
	}
	add("SKILL.md", md)

	var idx bytes.Buffer
	if err := render.Index(&idx, cat.Version, cat, render.FormatMarkdown); err != nil {
		return nil, err
	}
	add("references/elements.md", idx.String()+"\nPer-component references are in `components/<tag>.md`.\n")

	for _, e := range cat.Elements {
		ref, err := b.lib.Reference(ctx, e.Tag)
		if err != nil {
			return nil, err
		}
		var buf bytes.Buffer
		if err := render.References(&buf, []*domain.Reference{ref}, render.FormatMarkdown); err != nil {
			return nil, err
		}
		if len(ref.Parents) > 0 {
			fmt.Fprintf(&buf, "\nMust be a child of: %s.\n", tagList(ref.Parents))
		}
		add("references/components/"+e.Tag+".md", buf.String())
	}

	for _, lang := range domain.SnippetLangs {
		s, err := b.snippets(ctx, cat, lang)
		if err != nil {
			return nil, err
		}
		add("references/snippets/"+string(lang)+".md", s)
	}
	add("references/wrong-usages.md", b.wrongUsages(cat))

	sort.Slice(files, func(i, j int) bool { return files[i].Path < files[j].Path })
	return &domain.Skill{Name: Name, Files: files}, nil
}

func (b *Builder) skillMD(cat *domain.Catalog) (string, error) {
	t, err := template.New("SKILL.md").Parse(skillTemplate)
	if err != nil {
		return "", fmt.Errorf("parse skill template: %w", err)
	}
	var buf bytes.Buffer
	data := struct {
		Version string
		Count   int
	}{cat.Version, len(cat.Elements)}
	if err := t.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("render skill template: %w", err)
	}
	return buf.String(), nil
}

func (b *Builder) snippets(ctx context.Context, cat *domain.Catalog, lang domain.Lang) (string, error) {
	var buf strings.Builder
	fmt.Fprintf(&buf, "# %s snippets for @voidable/ui %s\n\nOne usage example per element. Examples marked synthesized come from the manifest alone and do not know which children an element expects; check `components/<tag>.md` before copying.\n", lang, cat.Version)
	for _, e := range cat.Elements {
		sn, err := b.lib.Snippet(ctx, e.Tag, lang)
		if err != nil {
			return "", err
		}
		fmt.Fprintf(&buf, "\n## `<%s>` (%s)\n\n```%s\n%s```\n", e.Tag, sn.Source, lang, sn.Code)
	}
	return buf.String(), nil
}

// wrongUsages lists what the checker knows, from the catalog and supplement.
func (b *Builder) wrongUsages(cat *domain.Catalog) string {
	sup := b.lib.Supplement()
	var buf strings.Builder
	fmt.Fprintf(&buf, "# Plausible but wrong usages (@voidable/ui %s)\n\nEverything here is reported by `voidable check`. Run it on your markup.\n", cat.Version)

	buf.WriteString("\n## Checks\n\n| Rule | Meaning |\n|---|---|\n")
	for _, r := range []struct{ rule, meaning string }{
		{string(domain.RuleUnknownElement), "a `void-*` tag that is not in the manifest (often a typo or an invented element)"},
		{string(domain.RuleUnknownAttribute), "an attribute the element does not declare; the message suggests the closest declared name"},
		{string(domain.RuleUnknownProperty), "a Lit `.property` binding the element does not have"},
		{string(domain.RuleInvalidValue), "a value outside the declared set, or not a number for a number attribute"},
		{string(domain.RuleBooleanFalse), "`attr=\"false\"` on a boolean attribute: present means on"},
		{string(domain.RuleInvalidParent), "an element placed in a parent it does not work in"},
		{string(domain.RuleUnknownEvent), "a `void-*` listener for an event the element never dispatches"},
		{string(domain.RuleSelfClosing), "`<void-input />` in an HTML-like template: the slash is ignored"},
	} {
		fmt.Fprintf(&buf, "| `%s` | %s |\n", r.rule, r.meaning)
	}

	buf.WriteString("\n## Kebab-case attributes\n\nWrite the hyphenated name. HTML lowercases attribute names, so the camelCase or run-together spelling matches nothing.\n\n| Element | Write | Not |\n|---|---|---|\n")
	for _, e := range cat.Elements {
		for _, a := range e.Attributes {
			if strings.Contains(a.Name, "-") {
				fmt.Fprintf(&buf, "| `<%s>` | `%s` | `%s` |\n", e.Tag, a.Name, strings.ReplaceAll(a.Name, "-", ""))
			}
		}
	}

	buf.WriteString("\n## Booleans\n\nA boolean attribute is on whenever it is present, so `attr=\"false\"` is still on. Leave it out to turn it off.\n\n")
	var defTrue, falseOK []string
	for _, e := range cat.Elements {
		for _, a := range e.Attributes {
			if a.Kind != domain.KindBoolean || a.Default != "true" {
				continue
			}
			item := fmt.Sprintf("`%s` on `<%s>`", a.Name, e.Tag)
			if a.FalseString {
				falseOK = append(falseOK, item)
			} else {
				defTrue = append(defTrue, item)
			}
		}
	}
	if len(falseOK) > 0 {
		fmt.Fprintf(&buf, "These default to true and accept `\"false\"` in markup: %s.\n\n", strings.Join(falseOK, ", "))
	}
	if len(defTrue) > 0 {
		fmt.Fprintf(&buf, "These default to true and cannot be turned off from markup; set the property from script instead: %s.\n", strings.Join(defTrue, ", "))
	}

	if len(sup.Parents) > 0 {
		buf.WriteString("\n## Parents\n\n| Element | Only inside |\n|---|---|\n")
		for _, tag := range sortedKeys(sup.Parents) {
			fmt.Fprintf(&buf, "| `<%s>` | %s |\n", tag, tagList(sup.Parents[tag]))
		}
	}

	if len(sup.Hints) > 0 {
		buf.WriteString("\n## Attributes that do not exist\n\n| Element | Attribute | Instead |\n|---|---|---|\n")
		for _, tag := range sortedKeys(sup.Hints) {
			attrs := sup.Hints[tag]
			names := make([]string, 0, len(attrs))
			for n := range attrs {
				names = append(names, n)
			}
			sort.Strings(names)
			for _, n := range names {
				fmt.Fprintf(&buf, "| `<%s>` | `%s` | %s |\n", tag, n, strings.ReplaceAll(strings.ReplaceAll(attrs[n], "|", `\|`), "<", "&lt;"))
			}
		}
	}

	buf.WriteString("\n## Events\n\nA listener for a `void-*` event is only reported when the element does not dispatch it. Events by element:\n\n| Element | Events |\n|---|---|\n")
	for _, e := range cat.Elements {
		if len(e.Events) == 0 {
			continue
		}
		names := make([]string, len(e.Events))
		for i, ev := range e.Events {
			names[i] = "`" + ev.Name + "`"
		}
		fmt.Fprintf(&buf, "| `<%s>` | %s |\n", e.Tag, strings.Join(names, ", "))
	}
	return buf.String()
}

func tagList(tags []string) string {
	out := make([]string, len(tags))
	for i, t := range tags {
		out[i] = "`<" + t + ">`"
	}
	return strings.Join(out, ", ")
}

func sortedKeys[V any](m map[string]V) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}
