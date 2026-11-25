package cli

import (
	"bytes"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	checkcmd "github.com/VoidableUI/Voidable/tools/voidable/cmd/check"
)

func run(t *testing.T, args ...string) (string, error) {
	t.Helper()
	cmd := NewRootCmd()
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	cmd.SetArgs(args)
	err := cmd.Execute()
	return out.String(), err
}

// TestCheckFixtures runs the real binary wiring over one fixture per
// dialect, each seeded with mistakes agents make.
func TestCheckFixtures(t *testing.T) {
	tests := []struct {
		file string
		want []string
		not  []string
	}{
		{"page.html.erb", []string{
			`page.html.erb:2:16: [invalid-value] color="primary" is not valid on <void-button>; allowed: default|error|warning|caution|success|info|notice`,
			`page.html.erb:3:15: [unknown-attribute] unknown attribute label on <void-input>; wrap the control in <void-field label="...">`,
			`page.html.erb:4:35: [unknown-attribute] unknown attribute cheked on <void-switch> (did you mean checked?)`,
			`page.html.erb:5:16: [boolean-false] disabled="false"`,
		}, []string{"name", "checked"}},
		{"live.html.heex", []string{
			`live.html.heex:1:38: [unknown-attribute] unknown attribute collapsedwidth on <void-sidebar> (did you mean collapsed-width?)`,
			`live.html.heex:2:16: [unknown-attribute] unknown attribute showvalue on <void-slider> (did you mean show-value?)`,
			`live.html.heex:4:5: [invalid-parent] <void-option> is not valid inside <void-select>`,
		}, []string{"self-closing", "phx-hook", ":if", "name"}},
		{"form.blade.php", []string{
			`form.blade.php:3:81: [invalid-value] size="huge"`,
			`form.blade.php:7:5: [unknown-element] unknown element <void-buton> (did you mean <void-button>?)`,
		}, []string{"heading", "x-void-on", "open", "closable", "boolean-false"}},
		{"App.tsx", []string{
			`App.tsx:5:22: [invalid-value] variant="primary" is not valid on <void-button>; allowed: outline|filled|ghost`,
			`App.tsx:5:42: [unknown-event] <void-button> does not dispatch void-change; it dispatches void-click`,
		}, []string{"collapsedWidth", "collapsed-width", "className", "void-toggle", "self-closing", "placeholder"}},
		{"index.astro", []string{
			`index.astro:5:37: [unknown-attribute] unknown attribute value on <void-tab-panel>; valid: tab, label, active`,
			`index.astro:7:13: [invalid-value] color="primary" is not valid on <void-badge>`,
		}, []string{"client:load", "size"}},
	}
	for _, tt := range tests {
		t.Run(tt.file, func(t *testing.T) {
			out, err := run(t, "check", filepath.Join("testdata", "bad", tt.file))
			if !errors.Is(err, checkcmd.ErrProblems) {
				t.Fatalf("err = %v, out:\n%s", err, out)
			}
			for _, w := range tt.want {
				if !strings.Contains(out, w) {
					t.Errorf("missing %q in:\n%s", w, out)
				}
			}
			for _, n := range tt.not {
				for _, line := range strings.Split(out, "\n") {
					if strings.Contains(line, "attribute "+n) || strings.Contains(line, "["+n) || strings.Contains(line, " "+n+"=") {
						t.Errorf("unexpected finding about %q: %s", n, line)
					}
				}
			}
			if got := strings.Count(out, "\n"); got != len(tt.want) {
				t.Errorf("%d findings, want %d:\n%s", got, len(tt.want), out)
			}
		})
	}
}

func TestCheckJSONAndClean(t *testing.T) {
	dir := t.TempDir()
	good := filepath.Join(dir, "ok.html")
	if err := os.WriteFile(good, []byte(`<void-button variant="filled">Go</void-button>`), 0o644); err != nil {
		t.Fatal(err)
	}
	out, err := run(t, "check", "--format", "json", good)
	if err != nil || strings.TrimSpace(out) != "[]" {
		t.Fatalf("clean check: err=%v out=%q", err, out)
	}
	out, _ = run(t, "check", "--format", "json", filepath.Join("testdata", "bad", "index.astro"))
	if !strings.Contains(out, `"rule": "invalid-value"`) || !strings.Contains(out, `"line": 7`) {
		t.Errorf("json: %s", out)
	}
}

func TestRefAndGen(t *testing.T) {
	tests := []struct {
		args []string
		want []string
	}{
		{[]string{"ref"}, []string{"elements.", "void-button Action trigger"}},
		{[]string{"ref", "void-button", "--format", "markdown"}, []string{"## `<void-button>`", "| `variant` | `outline\\|filled\\|ghost` |"}},
		{[]string{"ref", "void-button", "--format", "json"}, []string{`"tag": "void-button"`, `"values": [`}},
		{[]string{"ref", "--size"}, []string{"text     index", "78 elements"}},
		{[]string{"gen", "snippet", "void-dialog", "--lang", "jsx"}, []string{`<void-dialog heading="Delete project" size="sm" onvoid-close=`, `<void-button color="error" variant="filled">Delete</void-button>`}},
		{[]string{"gen", "snippet", "void-dropdown-menu", "--lang", "erb"}, []string{`data-action="void-select->my-controller#handle"`}},
		{[]string{"gen", "heex"}, []string{"defmodule VoidableUI.Components do", "def status_dot(assigns) do"}},
		{[]string{"gen", "blade"}, []string{"==> resources/views/components/button.blade.php <=="}},
	}
	for _, tt := range tests {
		t.Run(strings.Join(tt.args, " "), func(t *testing.T) {
			out, err := run(t, tt.args...)
			if err != nil {
				t.Fatalf("err = %v\n%s", err, out)
			}
			for _, w := range tt.want {
				if !strings.Contains(out, w) {
					t.Errorf("missing %q in:\n%.2000s", w, out)
				}
			}
		})
	}
}

func TestGenCheckDrift(t *testing.T) {
	dir := t.TempDir()
	if _, err := run(t, "gen", "heex", "--out", dir); err != nil {
		t.Fatal(err)
	}
	if out, err := run(t, "gen", "heex", "--out", dir, "--check"); err != nil {
		t.Fatalf("fresh output drifted: %v %s", err, out)
	}
	p := filepath.Join(dir, "lib", "voidable_ui", "components.ex")
	if err := os.WriteFile(p, []byte("edited"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := run(t, "gen", "heex", "--out", dir, "--check"); err == nil {
		t.Error("want drift error")
	}
}
