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
			`page.html.erb:3:3: [missing-name] <void-input> has no accessible name`,
			`page.html.erb:5:16: [boolean-false] disabled="false"`,
		}, []string{"name", "checked"}},
		{"live.html.heex", []string{
			`live.html.heex:1:38: [unknown-attribute] unknown attribute collapsedwidth on <void-sidebar> (did you mean collapsed-width?)`,
			`live.html.heex:2:16: [unknown-attribute] unknown attribute showvalue on <void-slider> (did you mean show-value?)`,
			`live.html.heex:2:3: [missing-name] <void-slider> has no accessible name`,
			`live.html.heex:3:3: [missing-name] <void-select> has no accessible name`,
			`live.html.heex:4:5: [invalid-parent] <void-option> is not valid inside <void-select>`,
		}, []string{"self-closing", "phx-hook", ":if", "name"}},
		{"form.blade.php", []string{
			`form.blade.php:3:81: [invalid-value] size="huge"`,
			`form.blade.php:7:5: [unknown-element] unknown element <void-buton> (did you mean <void-button>?)`,
		}, []string{"heading", "x-void-on", "open", "closable", "boolean-false"}},
		{"App.tsx", []string{
			`App.tsx:5:22: [invalid-value] variant="primary" is not valid on <void-button>; allowed: outline|filled|ghost`,
			`App.tsx:5:42: [unknown-event] <void-button> does not dispatch void-change; it dispatches void-click`,
			`App.tsx:7:7: [missing-name] <void-input> has no accessible name`,
		}, []string{"collapsedWidth", "collapsed-width", "className", "void-toggle", "self-closing", "placeholder"}},
		{"index.astro", []string{
			`index.astro:5:21: [legacy-markup] <void-tab-panel> no longer exists; write the tabs as <void-tabs-list>`,
			`index.astro:7:13: [invalid-value] color="primary" is not valid on <void-badge>`,
			`index.astro:8:1: [missing-name] <void-input> has no accessible name`,
		}, []string{"client:load", "size", "missing-part"}},
		{"alert-close.html", []string{
			`alert-close.html:1:1: [missing-part] <void-alert> has no <void-alert-description>`,
			`alert-close.html:1:13: [unknown-attribute] unknown attribute dismissible on <void-alert>; add <void-alert-close>`,
		}, nil},
		{"parts.html", []string{
			`parts.html:1:1: [missing-part] <void-popover> has no <void-popover-trigger>`,
			`parts.html:1:1: [missing-part] <void-popover> has no <void-popover-content>`,
			`parts.html:2:3: [unknown-child] <void-button> is not a part of <void-popover>, which takes only <void-popover-trigger>, <void-popover-content>; wrap the button in <void-popover-trigger>`,
			`parts.html:5:14: [unknown-attribute] unknown attribute heading on <void-dialog>; write the title as the first child: <void-dialog-title>`,
			`parts.html:5:1: [part-misuse] the parts of <void-dialog> are out of order; write them as <void-dialog-title>, <void-dialog-actions>, in that order`,
			`parts.html:9:1: [missing-part] <void-tabs> has no <void-tabs-content>`,
			`parts.html:12:15: [unknown-attribute] unknown attribute text on <void-tooltip>`,
			`parts.html:13:1: [missing-part] <void-card> has no <void-card-body>`,
			`parts.html:13:12: [invalid-parent] <void-dialog-title> is not valid inside <void-card>`,
			`parts.html:14:1: [missing-part] <void-collapsible> has no <void-collapsible-trigger>`,
			`parts.html:14:1: [missing-part] <void-collapsible> has no <void-collapsible-content>`,
			`parts.html:14:19: [unknown-attribute] unknown attribute heading on <void-collapsible>; write the heading as <void-collapsible-trigger>`,
			`parts.html:15:1: [missing-part] <void-panel> has no <void-panel-body>`,
			`parts.html:15:13: [unknown-attribute] unknown attribute label on <void-panel>; write <void-panel-header><void-panel-title>`,
			`parts.html:16:1: [missing-part] <void-banner> has no <void-banner-description>`,
			`parts.html:16:14: [unknown-attribute] unknown attribute dismissable on <void-banner>; add <void-banner-close>`,
			`parts.html:17:1: [missing-part] <void-toast> has no <void-toast-description>`,
			`parts.html:17:13: [unknown-attribute] unknown attribute heading on <void-toast>; write the title as <void-toast-title>`,
			`parts.html:17:27: [unknown-attribute] unknown attribute dismissable on <void-toast>; add <void-toast-close>`,
			`parts.html:18:1: [missing-part] <void-carousel> has no <void-carousel-content>`,
			`parts.html:18:16: [unknown-attribute] unknown attribute controls on <void-carousel>; write <void-carousel-previous aria-label="Previous slide"></void-carousel-previous>`,
			`parts.html:18:33: [legacy-markup] <void-carousel-slide> no longer exists; write each slide as <void-carousel-item> inside <void-carousel-content>`,
			`parts.html:19:1: [missing-part] <void-menu> has no <void-menu-content>`,
			`parts.html:19:12: [unknown-attribute] unknown attribute searchable on <void-menu>; write a <void-menu-search> around an <input type="search"> before the content`,
			`parts.html:19:23: [unknown-attribute] unknown attribute placeholder on <void-menu>`,
			`parts.html:19:42: [invalid-parent] <void-menu-item> is not valid inside <void-menu>`,
			`parts.html:19:68: [unknown-attribute] unknown attribute shortcut on <void-menu-item>; write <void-menu-item-shortcut>`,
			`parts.html:20:16: [missing-part] <void-nav-menu-item> has no <void-nav-menu-trigger>`,
			`parts.html:20:36: [unknown-attribute] unknown attribute href on <void-nav-menu-item>; write the link as <void-nav-menu-trigger>`,
			`parts.html:21:1: [missing-part] <void-breadcrumbs> has no <void-breadcrumbs-item>`,
			`parts.html:22:48: [unknown-attribute] unknown attribute label on <void-menu-group>; write the heading as <void-menu-group-label>`,
		}, nil},
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
		{[]string{"ref", "--size"}, []string{"text     index", "161 elements"}},
		{[]string{"gen", "snippet", "void-dialog", "--lang", "jsx"}, []string{`<void-dialog size="sm" onvoid-close=`, `<void-dialog-title>Delete project</void-dialog-title>`, `<void-button color="error" variant="filled">Delete</void-button>`}},
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

// TestVersionCommand: `voidable version` reports the injected build facts and
// whether the library assets are embedded, without any network access.
func TestVersionCommand(t *testing.T) {
	oldV, oldC, oldD := Version, Commit, Date
	t.Cleanup(func() { Version, Commit, Date = oldV, oldC, oldD })
	Version, Commit, Date = "1.2.3", "abc1234", "2026-01-02T03:04:05Z"
	out, err := run(t, "version")
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"voidable 1.2.3\n", "commit:   abc1234\n", "built:    2026-01-02T03:04:05Z\n", "manifest: @voidable/ui ", "assets:   ", "platform: "} {
		if !strings.Contains(out, want) {
			t.Errorf("version output lacks %q:\n%s", want, out)
		}
	}
}
