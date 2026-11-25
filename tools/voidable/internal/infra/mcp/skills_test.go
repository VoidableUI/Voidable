package mcp_test

import (
	"bytes"
	"context"
	"encoding/json"
	"sort"
	"strings"
	"testing"

	"github.com/VoidableUI/Voidable/tools/voidable/internal/domain"
	"github.com/VoidableUI/Voidable/tools/voidable/internal/infra/embedded"
	mcpinfra "github.com/VoidableUI/Voidable/tools/voidable/internal/infra/mcp"
	"github.com/VoidableUI/Voidable/tools/voidable/internal/infra/mcp/mcptest"
	"github.com/VoidableUI/Voidable/tools/voidable/internal/infra/scan"
	"github.com/VoidableUI/Voidable/tools/voidable/internal/infra/skillgen"
)

func skillServer(t *testing.T) (*mcpinfra.Server, *domain.Skill) {
	t.Helper()
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
	return srv, sk
}

type resourceInfo struct {
	URI         string `json:"uri"`
	Name        string `json:"name"`
	Description string `json:"description"`
	MIMEType    string `json:"mimeType"`
}

// TestSkillSession is a scripted legacy-handshake session: it reads the
// skills extension from the initialize result, lists the skill resources,
// reads them and verifies them against the skills/list digests.
func TestSkillSession(t *testing.T) {
	srv, sk := skillServer(t)
	s := mcptest.Start(t, srv)
	defer s.Close()

	var init struct {
		Capabilities struct {
			Resources  map[string]any            `json:"resources"`
			Extensions map[string]map[string]any `json:"extensions"`
		} `json:"capabilities"`
		Instructions string `json:"instructions"`
	}
	s.Must("initialize", map[string]any{"protocolVersion": "2025-06-18", "capabilities": map[string]any{}, "clientInfo": map[string]any{"name": "t", "version": "0"}}, &init)
	s.Notify("notifications/initialized")
	if init.Capabilities.Resources == nil {
		t.Error("the skills extension requires the resources capability")
	}
	if ext, ok := init.Capabilities.Extensions["io.modelcontextprotocol/skills"]; !ok || ext["directoryRead"] != true {
		t.Errorf("extensions = %v, want io.modelcontextprotocol/skills with directoryRead", init.Capabilities.Extensions)
	}
	if !strings.Contains(init.Instructions, "skill://voidable/SKILL.md") {
		t.Errorf("instructions do not point at the skill: %q", init.Instructions)
	}

	// resources/list: every skill file, SKILL.md named and described from its frontmatter.
	var list struct {
		Resources []resourceInfo `json:"resources"`
	}
	s.Must("resources/list", map[string]any{}, &list)
	got := map[string]resourceInfo{}
	for _, r := range list.Resources {
		got[r.URI] = r
	}
	for _, f := range sk.Files {
		r, ok := got[sk.URI(f.Path)]
		if !ok {
			t.Errorf("resources/list lacks %s", sk.URI(f.Path))
			continue
		}
		if r.MIMEType != "text/markdown" {
			t.Errorf("%s mimeType = %q", r.URI, r.MIMEType)
		}
	}
	md := got["skill://voidable/SKILL.md"]
	if md.Name != "voidable" || !strings.Contains(md.Description, "Void UI") {
		t.Errorf("SKILL.md resource = %+v", md)
	}
	for _, uri := range []string{"skill://voidable/references/elements.md", "skill://voidable/references/components/void-button.md", "skill://voidable/references/snippets/heex.md", "skill://voidable/references/wrong-usages.md"} {
		if _, ok := got[uri]; !ok {
			t.Errorf("missing resource %s", uri)
		}
	}

	// skills/list: the entry's digests and sizes describe exactly what resources/read returns.
	var sl struct {
		ResultType string `json:"resultType"`
		Skills     []struct {
			URI         string         `json:"uri"`
			Frontmatter map[string]any `json:"frontmatter"`
			Resources   []struct {
				URI    string `json:"uri"`
				Digest string `json:"digest"`
				Size   int    `json:"size"`
			} `json:"resources"`
		} `json:"skills"`
		TTLMs *int `json:"ttlMs"`
	}
	s.Must("skills/list", map[string]any{}, &sl)
	if sl.ResultType != "complete" || len(sl.Skills) != 1 || sl.Skills[0].URI != "skill://voidable/SKILL.md" {
		t.Fatalf("skills/list = %+v", sl)
	}
	if sl.TTLMs != nil {
		t.Error("a legacy-protocol request got caching attributes")
	}
	fm := sl.Skills[0].Frontmatter
	if fm["name"] != "voidable" || fm["license"] != "MIT" {
		t.Errorf("frontmatter = %v", fm)
	}
	if meta, _ := fm["metadata"].(map[string]any); meta["library"] != "@voidable/ui" {
		t.Errorf("frontmatter metadata = %v", fm["metadata"])
	}
	if len(sl.Skills[0].Resources) != len(sk.Files) {
		t.Errorf("entry lists %d files, skill has %d", len(sl.Skills[0].Resources), len(sk.Files))
	}
	for _, r := range sl.Skills[0].Resources {
		var read struct {
			Contents []struct {
				URI      string `json:"uri"`
				MIMEType string `json:"mimeType"`
				Text     string `json:"text"`
			} `json:"contents"`
		}
		s.Must("resources/read", map[string]any{"uri": r.URI}, &read)
		if len(read.Contents) != 1 || read.Contents[0].URI != r.URI {
			t.Fatalf("resources/read %s = %+v", r.URI, read)
		}
		raw := []byte(read.Contents[0].Text)
		if domain.Digest(raw) != r.Digest || len(raw) != r.Size {
			t.Errorf("%s: served bytes do not match the listing (digest %s, size %d)", r.URI, r.Digest, r.Size)
		}
	}
	// The frontmatter in the listing equals the frontmatter of the SKILL.md that is served.
	var read struct {
		Contents []struct{ Text string } `json:"contents"`
	}
	s.Must("resources/read", map[string]any{"uri": "skill://voidable/SKILL.md"}, &read)
	parsed, err := domain.ParseFrontmatter([]byte(read.Contents[0].Text))
	if err != nil {
		t.Fatal(err)
	}
	a, _ := json.Marshal(parsed)
	b, _ := json.Marshal(fm)
	if !bytes.Equal(a, b) {
		t.Errorf("listing frontmatter %s differs from SKILL.md frontmatter %s", b, a)
	}

	// skills/get: the same entry; an unknown URI is -32602.
	var get struct {
		Skill struct {
			URI string `json:"uri"`
		} `json:"skill"`
	}
	s.Must("skills/get", map[string]any{"uri": "skill://voidable/SKILL.md"}, &get)
	if get.Skill.URI != "skill://voidable/SKILL.md" {
		t.Errorf("skills/get = %+v", get)
	}
	if _, rerr := s.Call("skills/get", map[string]any{"uri": "skill://nope/SKILL.md"}); rerr == nil || rerr.Code != -32602 {
		t.Errorf("skills/get unknown = %+v, want -32602", rerr)
	}

	// resources/directory/read: root, subdirectory, and the error cases.
	var dir struct {
		Resources []resourceInfo `json:"resources"`
	}
	s.Must("resources/directory/read", map[string]any{"uri": "skill://voidable"}, &dir)
	var names []string
	for _, r := range dir.Resources {
		names = append(names, r.Name+":"+r.MIMEType)
	}
	sort.Strings(names)
	if strings.Join(names, " ") != "SKILL.md:text/markdown references:inode/directory" {
		t.Errorf("root children = %v", names)
	}
	s.Must("resources/directory/read", map[string]any{"uri": "skill://voidable/references/snippets"}, &dir)
	if len(dir.Resources) != len(domain.SnippetLangs) {
		t.Errorf("snippets children = %+v", dir.Resources)
	}
	for _, uri := range []string{"skill://voidable/SKILL.md", "skill://voidable/missing", "skill://other"} {
		if _, rerr := s.Call("resources/directory/read", map[string]any{"uri": uri}); rerr == nil || rerr.Code != -32602 {
			t.Errorf("directory read %s = %+v, want -32602", uri, rerr)
		}
	}

	// Tools still work next to the skill.
	var tools struct {
		Tools []struct{ Name string } `json:"tools"`
	}
	s.Must("tools/list", map[string]any{}, &tools)
	if len(tools.Tools) != 3 {
		t.Errorf("tools = %v", tools.Tools)
	}
}

// TestSkillSessionStateless drives the 2026-07-28 revision: no initialize,
// each request carries its protocol version in _meta, server/discover
// reports the extension, and skills/list results carry caching attributes.
func TestSkillSessionStateless(t *testing.T) {
	srv, _ := skillServer(t)
	s := mcptest.Start(t, srv)
	defer s.Close()
	meta := map[string]any{"_meta": map[string]any{
		"io.modelcontextprotocol/protocolVersion":    "2026-07-28",
		"io.modelcontextprotocol/clientInfo":         map[string]any{"name": "t", "version": "0"},
		"io.modelcontextprotocol/clientCapabilities": map[string]any{},
	}}

	var disc struct {
		SupportedVersions []string `json:"supportedVersions"`
		Capabilities      struct {
			Extensions map[string]map[string]any `json:"extensions"`
		} `json:"capabilities"`
	}
	s.Must("server/discover", meta, &disc)
	if _, ok := disc.Capabilities.Extensions["io.modelcontextprotocol/skills"]; !ok {
		t.Errorf("server/discover capabilities = %+v", disc.Capabilities)
	}
	if len(disc.SupportedVersions) == 0 || disc.SupportedVersions[0] != "2026-07-28" {
		t.Errorf("supportedVersions = %v", disc.SupportedVersions)
	}

	var sl struct {
		ResultType string `json:"resultType"`
		Skills     []any  `json:"skills"`
		TTLMs      int    `json:"ttlMs"`
		CacheScope string `json:"cacheScope"`
	}
	s.Must("skills/list", meta, &sl)
	if sl.ResultType != "complete" || len(sl.Skills) != 1 || sl.TTLMs <= 0 || sl.CacheScope != "public" {
		t.Errorf("skills/list = %+v", sl)
	}

	read := map[string]any{"uri": "skill://voidable/SKILL.md", "_meta": meta["_meta"]}
	var rr struct {
		Contents []struct{ Text string } `json:"contents"`
	}
	s.Must("resources/read", read, &rr)
	if len(rr.Contents) != 1 || !strings.HasPrefix(rr.Contents[0].Text, "---\nname: voidable\n") {
		t.Errorf("resources/read under the stateless protocol = %+v", rr)
	}
}
