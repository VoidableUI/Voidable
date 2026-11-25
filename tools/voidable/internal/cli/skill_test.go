package cli

import (
	"context"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/VoidableUI/Voidable/tools/voidable/internal/domain"
	"github.com/VoidableUI/Voidable/tools/voidable/internal/infra/embedded"
	mcpinfra "github.com/VoidableUI/Voidable/tools/voidable/internal/infra/mcp"
	"github.com/VoidableUI/Voidable/tools/voidable/internal/infra/mcp/mcptest"
	"github.com/VoidableUI/Voidable/tools/voidable/internal/infra/scan"
	"github.com/VoidableUI/Voidable/tools/voidable/internal/infra/skillgen"
)

func readTree(t *testing.T, root string) map[string]string {
	t.Helper()
	out := map[string]string{}
	err := filepath.WalkDir(root, func(p string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return err
		}
		b, err := os.ReadFile(p)
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(root, p)
		out[filepath.ToSlash(rel)] = string(b)
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	return out
}

// TestSkillInstallMatchesMCP compares the file tree `voidable skill install`
// writes with the one an MCP client reads: it walks skill://voidable with
// resources/directory/read and fetches every file with resources/read.
func TestSkillInstallMatchesMCP(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "voidable")
	out, err := run(t, "skill", "install", "--dir", dir)
	if err != nil || !strings.Contains(out, "wrote ") {
		t.Fatalf("install: %v\n%s", err, out)
	}
	onDisk := readTree(t, dir)

	src := embedded.Source{}
	lib, err := domain.NewLibrary(context.Background(), src, src, scan.Fragments{})
	if err != nil {
		t.Fatal(err)
	}
	sk, err := skillgen.New(lib).Skill(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	srv, err := mcpinfra.NewServer(mcpinfra.Services{Library: lib, Checker: domain.NewChecker(lib, scan.Scanner{}), Skill: sk}, "test")
	if err != nil {
		t.Fatal(err)
	}
	s := mcptest.Start(t, srv)
	defer s.Close()
	s.Must("initialize", map[string]any{"protocolVersion": "2025-06-18", "capabilities": map[string]any{}, "clientInfo": map[string]any{"name": "t", "version": "0"}}, nil)
	s.Notify("notifications/initialized")

	served := map[string]string{}
	var walk func(uri string)
	walk = func(uri string) {
		var dirRes struct {
			Resources []struct {
				URI      string `json:"uri"`
				MIMEType string `json:"mimeType"`
			} `json:"resources"`
		}
		s.Must("resources/directory/read", map[string]any{"uri": uri}, &dirRes)
		for _, r := range dirRes.Resources {
			if r.MIMEType == "inode/directory" {
				walk(r.URI)
				continue
			}
			var read struct {
				Contents []struct{ Text string } `json:"contents"`
			}
			s.Must("resources/read", map[string]any{"uri": r.URI}, &read)
			served[strings.TrimPrefix(r.URI, "skill://voidable/")] = read.Contents[0].Text
		}
	}
	walk("skill://voidable")

	if len(served) < 80 {
		t.Fatalf("MCP served only %d files", len(served))
	}
	if len(served) != len(onDisk) {
		t.Errorf("MCP serves %d files, install wrote %d", len(served), len(onDisk))
	}
	for p, want := range served {
		got, ok := onDisk[p]
		switch {
		case !ok:
			t.Errorf("install did not write %s", p)
		case got != want:
			t.Errorf("%s differs between install and MCP", p)
		}
	}
	for p := range onDisk {
		if _, ok := served[p]; !ok {
			t.Errorf("install wrote %s, MCP does not serve it", p)
		}
	}

	// A second install is refused; --force replaces it and drops stale files.
	if err := os.WriteFile(filepath.Join(dir, "references", "components", "void-gone.md"), []byte("stale"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := run(t, "skill", "install", "--dir", dir); err == nil {
		t.Error("second install without --force: want error")
	}
	if _, err := run(t, "skill", "install", "--dir", dir, "--force"); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(dir, "references", "components", "void-gone.md")); err == nil {
		t.Error("--force left a stale file behind")
	}
}

// The skill teaches the rules the checker enforces, so its own markup must
// pass the checker (the "wrong usage" examples are mentioned, not written
// as tags).
func TestSkillPassesItsOwnCheck(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "voidable")
	if _, err := run(t, "skill", "install", "--dir", dir); err != nil {
		t.Fatal(err)
	}
	out, err := run(t, "check", dir)
	if err != nil {
		t.Errorf("skill markup has findings: %v\n%s", err, out)
	}
}

func TestSkillInstallDefaultDir(t *testing.T) {
	out, err := run(t, "skill", "install", "--help")
	if err != nil || !strings.Contains(out, `(default ".claude/skills/voidable")`) {
		t.Fatalf("help: %v\n%s", err, out)
	}
}
