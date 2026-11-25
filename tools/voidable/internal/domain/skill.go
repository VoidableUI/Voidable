package domain

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"path"
	"sort"
	"strings"
)

// SkillScheme is the URI scheme skills are addressed under when served over
// MCP (SEP-2640: skill://<skill-path>/<file-path>).
const SkillScheme = "skill://"

// SkillFile is one file of an Agent Skill. Path is relative to the skill
// directory and uses "/" as the separator.
type SkillFile struct {
	Path    string
	MIME    string
	Content []byte
}

// Skill is an Agent Skill: a directory with a SKILL.md at its root. Name is
// both the directory name and the frontmatter name, as the Agent Skills
// specification and SEP-2640 require.
type Skill struct {
	Name  string
	Files []SkillFile // sorted by Path, SKILL.md included
}

// SkillSource yields the skill the binary serves and installs.
type SkillSource interface {
	Skill(ctx context.Context) (*Skill, error)
}

// File returns the file at path.
func (s *Skill) File(p string) (*SkillFile, bool) {
	for i := range s.Files {
		if s.Files[i].Path == p {
			return &s.Files[i], true
		}
	}
	return nil, false
}

// URI is the resource URI of a file of the skill: skill://<name>/<path>.
func (s *Skill) URI(p string) string { return SkillScheme + s.Name + "/" + p }

// RootURI is the skill's directory resource, without a trailing slash.
func (s *Skill) RootURI() string { return SkillScheme + s.Name }

// SkillResource is a skill file's address, digest and size as listed in a
// skills/list or skills/get entry.
type SkillResource struct {
	URI    string `json:"uri"`
	Digest string `json:"digest"`
	Size   int    `json:"size"`
}

// SkillEntry is the manifest of one skill (SEP-2640): the URI of its
// SKILL.md, its frontmatter verbatim as an object, and every file with its
// SHA-256 digest and size.
type SkillEntry struct {
	URI         string          `json:"uri"`
	Frontmatter map[string]any  `json:"frontmatter"`
	Resources   []SkillResource `json:"resources"`
}

// Digest formats the SHA-256 of content as sha256:<64 lowercase hex>.
func Digest(content []byte) string {
	sum := sha256.Sum256(content)
	return "sha256:" + hex.EncodeToString(sum[:])
}

// Entry builds the skill's manifest entry.
func (s *Skill) Entry() (*SkillEntry, error) {
	md, ok := s.File("SKILL.md")
	if !ok {
		return nil, fmt.Errorf("skill %s has no SKILL.md", s.Name)
	}
	fm, err := ParseFrontmatter(md.Content)
	if err != nil {
		return nil, fmt.Errorf("skill %s: %w", s.Name, err)
	}
	if fm["name"] != s.Name {
		return nil, fmt.Errorf("skill %s: frontmatter name is %q, it must equal the skill path's last segment", s.Name, fm["name"])
	}
	e := &SkillEntry{URI: s.URI("SKILL.md"), Frontmatter: fm}
	for _, f := range s.Files {
		e.Resources = append(e.Resources, SkillResource{URI: s.URI(f.Path), Digest: Digest(f.Content), Size: len(f.Content)})
	}
	return e, nil
}

// Dir lists the direct children of a directory of the skill ("" is the
// skill root): file paths, and subdirectory paths. Both are relative to the
// skill root. ok is false when dir is not a directory of the skill.
func (s *Skill) Dir(dir string) (files, dirs []string, ok bool) {
	seen := map[string]bool{}
	for _, f := range s.Files {
		rel := f.Path
		if dir != "" {
			if !strings.HasPrefix(rel, dir+"/") {
				continue
			}
			rel = strings.TrimPrefix(rel, dir+"/")
		}
		ok = true
		if first, _, nested := strings.Cut(rel, "/"); nested {
			sub := path.Join(dir, first)
			if !seen[sub] {
				seen[sub] = true
				dirs = append(dirs, sub)
			}
		} else {
			files = append(files, f.Path)
		}
	}
	sort.Strings(files)
	sort.Strings(dirs)
	return files, dirs, ok
}

// ParseFrontmatter reads the YAML frontmatter of a SKILL.md into an object.
// It supports the subset the skills this tool generates use: top-level
// "key: value" scalars (plain, or single or double quoted) and one level of
// nested "key:" mappings indented by two spaces. Anything else is an error,
// so a generated skill can never carry frontmatter the listing misreports.
func ParseFrontmatter(md []byte) (map[string]any, error) {
	rest, ok := bytes.CutPrefix(md, []byte("---\n"))
	if !ok {
		return nil, fmt.Errorf("SKILL.md must begin with YAML frontmatter (---)")
	}
	block, _, ok := bytes.Cut(rest, []byte("\n---\n"))
	if !ok {
		return nil, fmt.Errorf("SKILL.md frontmatter is not closed with ---")
	}
	out := map[string]any{}
	var nested map[string]any
	for n, line := range strings.Split(string(block), "\n") {
		if strings.TrimSpace(line) == "" || strings.HasPrefix(strings.TrimSpace(line), "#") {
			continue
		}
		indented := strings.HasPrefix(line, "  ")
		key, val, found := strings.Cut(strings.TrimSpace(line), ":")
		if !found {
			return nil, fmt.Errorf("frontmatter line %d: want key: value", n+2)
		}
		val = strings.TrimSpace(val)
		switch {
		case indented && nested == nil:
			return nil, fmt.Errorf("frontmatter line %d: unexpected indentation", n+2)
		case indented:
			nested[key] = unquote(val)
		case val == "":
			nested = map[string]any{}
			out[key] = nested
		default:
			nested = nil
			out[key] = unquote(val)
		}
	}
	for _, k := range []string{"name", "description"} {
		if s, _ := out[k].(string); s == "" {
			return nil, fmt.Errorf("frontmatter needs a %s", k)
		}
	}
	return out, nil
}

func unquote(v string) string {
	if len(v) >= 2 && (v[0] == '"' && v[len(v)-1] == '"' || v[0] == '\'' && v[len(v)-1] == '\'') {
		return v[1 : len(v)-1]
	}
	return v
}
