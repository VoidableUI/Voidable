// Package embedded serves the data compiled into the binary: the manifest
// copied from @voidable/ui's build, the stand-in supplement, the generator
// templates and (with -tags assets) the library bundle.
package embedded

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"path"
	"strings"

	"github.com/VoidableUI/Voidable/tools/voidable/internal/domain"
	"github.com/VoidableUI/Voidable/tools/voidable/internal/infra/cem"
)

// The manifest files are copied here by `mise run build:manifest`.
//
//go:embed data/manifest/custom-elements.json data/manifest/components.json
var manifestFS embed.FS

//go:embed data/supplement
var supplementFS embed.FS

//go:embed templates
var templateFS embed.FS

// Source implements ManifestSource, SupplementSource and AssetSource from
// embedded files.
type Source struct{}

// Catalog decodes the embedded manifest.
func (Source) Catalog(_ context.Context) (*domain.Catalog, error) {
	m, err := manifestFS.ReadFile("data/manifest/custom-elements.json")
	if err != nil {
		return nil, fmt.Errorf("read embedded manifest: %w", err)
	}
	s, err := manifestFS.ReadFile("data/manifest/components.json")
	if err != nil {
		return nil, fmt.Errorf("read embedded summary: %w", err)
	}
	return cem.Decode(m, s)
}

type rules struct {
	Note    string                       `json:"note"`
	Parents map[string][]string          `json:"parents"`
	Hints   map[string]map[string]string `json:"hints"`

	FalseString map[string][]string `json:"falseString"`

	Styled []styled `json:"styled"`
}

// styled is one CSS-only element as rules.json writes it.
type styled struct {
	Tag         string       `json:"tag"`
	Description string       `json:"description"`
	Attributes  []styledAttr `json:"attributes"`
}

type styledAttr struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	Default     string `json:"default"`
	Description string `json:"description"`
}

func (s styled) element() domain.Element {
	e := domain.Element{Tag: s.Tag, Module: "@voidable/theme", Description: s.Description, CSSOnly: true}
	for _, a := range s.Attributes {
		kind, values, nullable := domain.ParseType(a.Type)
		e.Attributes = append(e.Attributes, domain.Attribute{
			Name: a.Name, Type: a.Type, Kind: kind, Values: values, Nullable: nullable,
			Default: a.Default, Description: a.Description,
		})
	}
	return e
}

// Supplement reads rules.json and snippets/<tag>.html.
func (Source) Supplement(_ context.Context) (*domain.Supplement, error) {
	raw, err := supplementFS.ReadFile("data/supplement/rules.json")
	if err != nil {
		return nil, fmt.Errorf("read supplement: %w", err)
	}
	var r rules
	if err := json.Unmarshal(raw, &r); err != nil {
		return nil, fmt.Errorf("decode supplement: %w", err)
	}
	sup := &domain.Supplement{Note: r.Note, Parents: r.Parents, Hints: r.Hints, FalseString: r.FalseString, Snippets: map[string]string{}}
	for _, s := range r.Styled {
		if !strings.HasPrefix(s.Tag, "void-") {
			return nil, fmt.Errorf("decode supplement: styled element %q is not a void-* tag", s.Tag)
		}
		sup.Styled = append(sup.Styled, s.element())
	}
	entries, err := fs.ReadDir(supplementFS, "data/supplement/snippets")
	if err != nil {
		return nil, fmt.Errorf("read snippets: %w", err)
	}
	for _, e := range entries {
		b, err := supplementFS.ReadFile(path.Join("data/supplement/snippets", e.Name()))
		if err != nil {
			return nil, fmt.Errorf("read snippet %s: %w", e.Name(), err)
		}
		sup.Snippets[strings.TrimSuffix(e.Name(), ".html")] = string(b)
	}
	return sup, nil
}

// Templates returns the generator templates (one file per target).
func Templates() fs.FS {
	sub, err := fs.Sub(templateFS, "templates")
	if err != nil {
		panic(err) // the directory is embedded at compile time
	}
	return sub
}

// Assets returns the embedded library bundle, or ErrNoAssets.
func (Source) Assets(_ context.Context) (fs.FS, error) {
	if !hasAssets {
		return nil, domain.ErrNoAssets
	}
	return fs.Sub(assetFS, "data/assets")
}
