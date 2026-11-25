package cli

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	checkcmd "github.com/VoidableUI/Voidable/tools/voidable/cmd/check"
)

func TestCheckAllowlist(t *testing.T) {
	dir := t.TempDir()
	write := func(name, body string) string {
		p := filepath.Join(dir, name)
		if err := os.WriteFile(p, []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
		return p
	}
	page := write("a.html", `<void-badge color="primary">x</void-badge><void-badge color="primary">y</void-badge>`)

	// Exactly the allowed count passes.
	ok := write("ok.txt", "invalid-value void-badge color=primary 2\n")
	if out, err := run(t, "check", "--allowlist", ok, page); err != nil {
		t.Fatalf("allowed findings failed: %v\n%s", err, out)
	}
	// One more than the allowed count fails and is reported.
	tight := write("tight.txt", "invalid-value void-badge color=primary 1\n")
	out, err := run(t, "check", "--allowlist", tight, page)
	if !errors.Is(err, checkcmd.ErrProblems) || strings.Count(out, "[invalid-value]") != 1 {
		t.Fatalf("err=%v out=%s", err, out)
	}
	// An entry that matches nothing fails, so resolved decisions get deleted.
	stale := write("stale.txt", "invalid-value void-badge color=primary 2\ninvalid-value void-badge color=gone 1\n")
	if out, err := run(t, "check", "--allowlist", stale, page); !errors.Is(err, checkcmd.ErrProblems) || !strings.Contains(out, "matches nothing") {
		t.Fatalf("stale entry: err=%v out=%s", err, out)
	}
}
