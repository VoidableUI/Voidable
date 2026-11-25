package cli

import (
	"errors"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"testing"

	checkcmd "github.com/VoidableUI/Voidable/tools/voidable/cmd/check"
)

// TestStyledElements covers the CSS-only elements (the patterns and the
// media surface): they are declared by the supplement, not the manifest,
// and every front-end has to treat them as known elements that have no
// JavaScript behind them.
func TestStyledElements(t *testing.T) {
	t.Run("ref says CSS only and lists attributes", func(t *testing.T) {
		out, err := run(t, "ref", "void-page-head")
		if err != nil {
			t.Fatalf("ref: %v\n%s", err, out)
		}
		for _, w := range []string{"<void-page-head> CSS only", "flush: boolean", "<h1>Ground network</h1>"} {
			if !strings.Contains(out, w) {
				t.Errorf("missing %q in:\n%s", w, out)
			}
		}
		if strings.Contains(out, "not in manifest") {
			t.Errorf("a CSS-only element is not missing anything from the manifest:\n%s", out)
		}
	})

	t.Run("index lists them", func(t *testing.T) {
		out, err := run(t, "ref")
		if err != nil {
			t.Fatalf("ref: %v\n%s", err, out)
		}
		for _, tag := range []string{"void-shell", "void-figure", "void-media", "void-glass", "void-description-list"} {
			if !strings.Contains(out, "\n"+tag+" ") {
				t.Errorf("index does not list %s", tag)
			}
		}
	})

	t.Run("check knows their attributes", func(t *testing.T) {
		dir := t.TempDir()
		good := filepath.Join(dir, "good.html")
		bad := filepath.Join(dir, "bad.html")
		write(t, good, `<void-shell nav="side"><main><void-page width="narrow">
<void-page-head flush><h1>Title</h1><void-actions justify="end"></void-actions></void-page-head>
<void-figures columns="3"><void-figure><span data-void-type="value">1</span></void-figure></void-figures>
<void-media place="start" scrim="flat" stack style="--void-media-focal: 60% 40%"><img src="a.jpg" alt=""><void-media-content><void-glass data-void-surface="glass"></void-glass></void-media-content></void-media>
<void-state color="success" pulse>Running</void-state>
</void-page></main></void-shell>`)
		if out, err := run(t, "check", good); err != nil {
			t.Fatalf("valid pattern markup was rejected: %v\n%s", err, out)
		}
		write(t, bad, `<void-split align="end"></void-split>
<void-state color="green">Up</void-state>
<void-media place="left"></void-media>
<void-page-heading></void-page-heading>
<div><void-media-content></void-media-content></div>
<void-section><void-media-content></void-media-content></void-section>`)
		out, err := run(t, "check", bad)
		if !errors.Is(err, checkcmd.ErrProblems) {
			t.Fatalf("err = %v, out:\n%s", err, out)
		}
		for _, w := range []string{
			`[unknown-attribute] unknown attribute align on <void-split> (did you mean valign?); use valign`,
			`[invalid-value] color="green" is not valid on <void-state>`,
			`[invalid-value] place="left" is not valid on <void-media>; allowed: bottom|top|start|end|center`,
			`[unknown-element] unknown element <void-page-heading> (did you mean <void-page-head>?)`,
			`[invalid-parent] <void-media-content> is not valid inside <void-section>`,
		} {
			if !strings.Contains(out, w) {
				t.Errorf("missing %q in:\n%s", w, out)
			}
		}
	})

	t.Run("snippets are plain tags in every language", func(t *testing.T) {
		for _, lang := range []string{"html", "jsx", "erb", "heex"} {
			out, err := run(t, "gen", "snippet", "void-figures", "--lang", lang)
			if err != nil {
				t.Fatalf("snippet %s: %v\n%s", lang, err, out)
			}
			if !strings.Contains(out, "<void-figures>") || !strings.Contains(out, `<span data-void-type="unit">TB</span>`) {
				t.Errorf("%s snippet is not the plain markup:\n%s", lang, out)
			}
			if strings.Contains(out, "<.figures") || strings.Contains(out, "addEventListener") {
				t.Errorf("%s snippet treats a CSS-only element as a component:\n%s", lang, out)
			}
		}
	})

	t.Run("generators skip them", func(t *testing.T) {
		for _, target := range []string{"heex", "blade"} {
			dir := t.TempDir()
			out, err := run(t, "gen", target, "--out", dir)
			if err != nil {
				t.Fatalf("gen %s: %v\n%s", target, err, out)
			}
			var all strings.Builder
			_ = filepath.WalkDir(dir, func(p string, d os.DirEntry, _ error) error {
				if d != nil && !d.IsDir() {
					b, _ := os.ReadFile(p)
					all.WriteString(p + "\n" + string(b))
				}
				return nil
			})
			if all.Len() == 0 {
				t.Fatalf("gen %s wrote nothing", target)
			}
			for _, bad := range []string{"page_head", "page-head", "void-glass", "media_content"} {
				if strings.Contains(all.String(), bad) {
					t.Errorf("gen %s generated a wrapper for a CSS-only element (%s)", target, bad)
				}
			}
			if !strings.Contains(all.String(), "void-button") {
				t.Errorf("gen %s lost the registered elements", target)
			}
		}
	})
}

// TestStyledMatchesTheme keeps rules.json "styled" in step with the theme:
// every declared element is styled by packages/theme/src/patterns or
// media, and every void-* tag those files style is either declared or
// registered by @voidable/ui. Skips when the theme is not next to the tool.
func TestStyledMatchesTheme(t *testing.T) {
	root := filepath.Join("..", "..", "..", "..", "packages", "theme", "src")
	var css strings.Builder
	for _, dir := range []string{"patterns", "media"} {
		files, _ := filepath.Glob(filepath.Join(root, dir, "*.css"))
		for _, f := range files {
			b, err := os.ReadFile(f)
			if err != nil {
				t.Fatal(err)
			}
			css.WriteString(string(b))
		}
	}
	if css.Len() == 0 {
		t.Skip("packages/theme sources not found")
	}
	src := regexp.MustCompile(`(?s)/\*.*?\*/`).ReplaceAllString(css.String(), "")
	// Tags in selector position only: drop declarations (custom property
	// names and values) and keyframe names, then take void-* words that are
	// not part of a class, an attribute or a custom property.
	src = regexp.MustCompile(`--[\w-]+\s*:[^;{}]*;`).ReplaceAllString(src, ";")
	src = regexp.MustCompile(`[\w-]+\s*:\s[^;{}]*;`).ReplaceAllString(src, ";")
	src = regexp.MustCompile(`@keyframes\s+[\w-]+`).ReplaceAllString(src, "")
	inTheme := map[string]bool{}
	for _, m := range regexp.MustCompile(`(?:^|[^.\w-])(void-[a-z][a-z-]*[a-z])`).FindAllStringSubmatch(src, -1) {
		inTheme[m[1]] = true
	}
	out, err := run(t, "ref", "--format", "json")
	if err != nil {
		t.Fatalf("ref: %v", err)
	}
	styled := map[string]bool{}
	registered := map[string]bool{}
	for _, m := range regexp.MustCompile(`"tag": "(void-[a-z-]+)",\s*"description"`).FindAllStringSubmatch(out, -1) {
		registered[m[1]] = true
	}
	refs, err := run(t, "ref", "--all")
	if err != nil {
		t.Fatalf("ref --all: %v\n%s", err, refs)
	}
	for _, m := range regexp.MustCompile(`(?m)^<(void-[a-z-]+)> CSS only`).FindAllStringSubmatch(refs, -1) {
		styled[m[1]] = true
	}
	if len(styled) == 0 {
		t.Fatal("no CSS-only elements in the reference")
	}
	var problems []string
	for tag := range styled {
		if !inTheme[tag] {
			problems = append(problems, tag+" is declared in rules.json but no selector in packages/theme/src/{patterns,media} styles it")
		}
	}
	for tag := range inTheme {
		if !styled[tag] && !registered[tag] {
			problems = append(problems, tag+" is styled by the theme but neither registered by @voidable/ui nor declared in rules.json \"styled\"")
		}
	}
	sort.Strings(problems)
	for _, p := range problems {
		t.Error(p)
	}
}

func write(t *testing.T, path, content string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
}
