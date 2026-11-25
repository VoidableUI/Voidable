package cli

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	checkcmd "github.com/VoidableUI/Voidable/tools/voidable/cmd/check"
)

// TestMissingNameInEveryDialect runs the real wiring over a named and an
// unnamed control in each dialect the scanner supports: the named one (a
// literal, an expression, a spread, yielded content, a field) is never
// reported, the unnamed one is, exactly once.
func TestMissingNameInEveryDialect(t *testing.T) {
	tests := []struct {
		file    string
		named   string
		unnamed string
	}{
		{"a.html",
			`<void-button aria-label="Close"><svg></svg></void-button>
<void-button>Save</void-button>
<void-field label="Email"><void-input></void-input></field-end></void-field>
<label for="n">Name</label><void-input id="n"></void-input>
<void-button x-bind="attrs"><svg></svg></void-button>
<void-button :aria-label="label"><svg></svg></void-button>
<void-dialog heading="Edit"></void-dialog>
<void-avatar alt="Ada"></void-avatar>`,
			`<void-button><svg></svg></void-button>`},
		{"a.html.erb",
			`<void-button aria-label="<%= t('close') %>"><svg></svg></void-button>
<void-button><%= icon "x" %></void-button>
<void-input <%= tag.attributes(opts) %>></void-input>`,
			`<void-input placeholder="Email">`},
		{"a.html.heex",
			`<void-button aria-label={gettext("Close")}><svg></svg></void-button>
<void-button>{@label}</void-button>
<void-button><.icon name="x" /></void-button>
<void-input {@rest}></void-input>
<.field label="Email"><void-input></void-input></.field>`,
			`<void-select></void-select>`},
		{"a.blade.php",
			`<void-button aria-label="{{ __('Close') }}"><svg></svg></void-button>
<void-button>{{ $slot }}</void-button>
<void-input {{ $attributes }}></void-input>
<x-field label="Email"><void-input></void-input></x-field>`,
			`<void-slider></void-slider>`},
		{"a.tsx",
			`export const A = (p) => (<>
  <void-button aria-label={p.label}><svg /></void-button>
  <void-button ariaLabel="Close"><svg /></void-button>
  <void-button {...p}><svg /></void-button>
  <void-button>{p.children}</void-button>
  <label htmlFor="e">Email</label><void-input id="e" />
</>);`,
			`export const A = () => <void-button><svg /></void-button>;`},
		{"a.vue",
			`<template>
  <void-button :aria-label="label"><svg /></void-button>
  <void-button v-bind="$attrs"><svg /></void-button>
  <void-button><slot /></void-button>
</template>`,
			`<template><void-input /></template>`},
		{"a.svelte",
			`<void-button aria-label={label}><svg /></void-button>
<void-button {...rest}><svg /></void-button>
<void-button><slot /></void-button>`,
			`<void-textarea></void-textarea>`},
		{"a.astro",
			`---
const { label } = Astro.props;
---
<void-button aria-label={label}><svg /></void-button>
<void-button><slot /></void-button>
<void-button {...Astro.props}><svg /></void-button>`,
			`<void-number-input></void-number-input>`},
	}
	dir := t.TempDir()
	for _, tt := range tests {
		t.Run(tt.file, func(t *testing.T) {
			named := filepath.Join(dir, "named-"+tt.file)
			unnamed := filepath.Join(dir, "unnamed-"+tt.file)
			if err := os.WriteFile(named, []byte(tt.named), 0o644); err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(unnamed, []byte(tt.unnamed), 0o644); err != nil {
				t.Fatal(err)
			}
			out, err := run(t, "check", named)
			if err != nil {
				t.Fatalf("named markup reported:\n%s\n%v", out, err)
			}
			out, err = run(t, "check", unnamed)
			if !errors.Is(err, checkcmd.ErrProblems) {
				t.Fatalf("unnamed markup was not reported: %v\n%s", err, out)
			}
			if n := strings.Count(out, "[missing-name]"); n != 1 || strings.Count(out, "\n") != 1 {
				t.Errorf("want exactly one missing-name finding, got:\n%s", out)
			}
		})
	}
}

func TestMissingNameJSON(t *testing.T) {
	dir := t.TempDir()
	f := filepath.Join(dir, "a.html")
	if err := os.WriteFile(f, []byte(`<void-button><svg></svg></void-button>`), 0o644); err != nil {
		t.Fatal(err)
	}
	out, _ := run(t, "check", "--format", "json", f)
	if !strings.Contains(out, `"rule": "missing-name"`) || !strings.Contains(out, `"suggestion": "aria-label=\"...\""`) {
		t.Errorf("json: %s", out)
	}
}
