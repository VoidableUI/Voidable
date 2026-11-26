package skillgen

import (
	"context"
	"regexp"
	"strings"
	"testing"

	"github.com/VoidableUI/Voidable/tools/voidable/internal/domain"
	"github.com/VoidableUI/Voidable/tools/voidable/internal/infra/embedded"
	"github.com/VoidableUI/Voidable/tools/voidable/internal/infra/scan"
)

func build(t *testing.T) (*domain.Skill, *domain.Library) {
	t.Helper()
	src := embedded.Source{}
	lib, err := domain.NewLibrary(context.Background(), src, src, scan.Fragments{})
	if err != nil {
		t.Fatal(err)
	}
	sk, err := New(lib).Skill(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	return sk, lib
}

func TestSkillShape(t *testing.T) {
	sk, lib := build(t)
	if sk.Name != "voidable" {
		t.Fatalf("name = %q", sk.Name)
	}
	entry, err := sk.Entry() // checks SKILL.md frontmatter and name == path
	if err != nil {
		t.Fatal(err)
	}
	if entry.Frontmatter["metadata"].(map[string]any)["version"] != lib.Version() {
		t.Errorf("metadata.version = %v, want %s", entry.Frontmatter["metadata"], lib.Version())
	}
	if len(entry.Resources) > 512 {
		t.Errorf("%d resources exceed the SEP-2640 limit of 512", len(entry.Resources))
	}
	total := 0
	for _, r := range entry.Resources {
		total += r.Size
	}
	if total > 16<<20 {
		t.Errorf("%d bytes exceed the SEP-2640 limit of 16 MiB", total)
	}

	// Every element has its own reference file, and every file is plain Markdown.
	for _, e := range lib.Catalog().Elements {
		f, ok := sk.File("references/components/" + e.Tag + ".md")
		if !ok {
			t.Errorf("no reference for %s", e.Tag)
			continue
		}
		if !strings.Contains(string(f.Content), "## `<"+e.Tag+">`") {
			t.Errorf("%s reference lacks its heading", e.Tag)
		}
	}
	// Blade comments ({{-- --}}) legitimately appear in the Blade snippets.
	unrendered := regexp.MustCompile(`\{\{[^-]`)
	for _, f := range sk.Files {
		if f.MIME != "text/markdown" || unrendered.Match(f.Content) {
			t.Errorf("%s: mime %q or unrendered template text", f.Path, f.MIME)
		}
	}

	// Every relative reference in SKILL.md points at a file of the skill.
	md, _ := sk.File("SKILL.md")
	for _, m := range regexp.MustCompile("`(references/[\\w./-]+)`").FindAllStringSubmatch(string(md.Content), -1) {
		p := m[1]
		if strings.Contains(p, "<") {
			continue
		}
		if _, ok := sk.File(p); !ok {
			t.Errorf("SKILL.md refers to %s, which the skill does not contain", p)
		}
	}
	for _, lang := range domain.SnippetLangs {
		if _, ok := sk.File("references/snippets/" + string(lang) + ".md"); !ok {
			t.Errorf("no snippets for %s", lang)
		}
	}
}

func TestSkillContentFromManifest(t *testing.T) {
	sk, _ := build(t)
	read := func(p string) string {
		f, ok := sk.File(p)
		if !ok {
			t.Fatalf("no %s", p)
		}
		return string(f.Content)
	}
	for _, c := range []struct{ file, want string }{
		{"SKILL.md", "`hide-close` on `<void-dialog>`"},
		{"references/components/void-popover.md", "| `<void-popover-trigger>` | required, one, wraps one control, CSS-only |"},
		{"references/components/void-slider.md", "`show-value`"},
		{"references/snippets/heex.md", "<.dropdown_menu align=\"end\">"},
		{"references/snippets/jsx.md", "<void-popover-trigger>"},
		{"references/wrong-usages.md", "| `<void-gauge>` | `hide-value` | `hidevalue` |"},
		{"references/wrong-usages.md", "| `<void-option>` | `<void-combobox-content>`, `<void-multiselect-content>` |"},
		{"references/elements.md", "| `<void-button>` |"},
	} {
		if got := read(c.file); !strings.Contains(got, c.want) {
			t.Errorf("%s lacks %q", c.file, c.want)
		}
	}
}

func TestSkillDeterministic(t *testing.T) {
	a, _ := build(t)
	b, _ := build(t)
	if len(a.Files) != len(b.Files) {
		t.Fatal("file counts differ")
	}
	for i := range a.Files {
		if a.Files[i].Path != b.Files[i].Path || string(a.Files[i].Content) != string(b.Files[i].Content) {
			t.Errorf("%s differs between builds", a.Files[i].Path)
		}
	}
}

// The skill teaches retheming with knobs and the theme builder's link format,
// so an agent can hand a user a link to the theme it proposes. The knob list
// is checked against knobs.css by packages/theme/test/knobs.test.mjs.
func TestSkillTeachesRetheming(t *testing.T) {
	sk, _ := build(t)
	f, _ := sk.File("SKILL.md")
	md := string(f.Content)
	for _, knob := range []string{
		"accent-hue", "accent-chroma", "neutral-hue", "neutral-chroma", "page-tint", "contrast", "chrome",
		"radius", "density", "rhythm", "font-size", "font-sans", "font-mono", "anim-scale",
	} {
		if !strings.Contains(md, "`--void-"+knob+"`") {
			t.Errorf("SKILL.md does not document the knob --void-%s", knob)
		}
		if !strings.Contains(md, "`"+knob+"`") {
			t.Errorf("SKILL.md does not name the builder parameter %s", knob)
		}
	}
	for _, want := range []string{
		"https://voidable.dev/theme/",
		"https://voidable.dev/theme/?accent-hue=162&accent-chroma=0.19&radius=8&rhythm=1.1",
		"`theme`", "`skin`", "`name`", "`screen`, `scheme`, `device`",
		"data-void-theme", "data-void-skin=\"loft\"",
		"@voidable/theme/skins/loft.css", "@voidable/theme/knobs.json",
		// Component tokens and skins: how to restyle one component and build a skin.
		"data-void-skin=\"slab\"", "@voidable/theme/skins/slab.css", "`loft` or `slab`",
		"--void-<component>-<part?>-<property>-<state?>", "@voidable/theme/component-tokens.json",
		"--void-container-surface", "--void-rule-edge", "--void-item-surface-selected",
		"[data-void-skin=\"mine\"]", "@voidable/theme/skin", "**To restyle one component**", "**To build a skin**",
	} {
		if !strings.Contains(md, want) {
			t.Errorf("SKILL.md lacks %q", want)
		}
	}
}
