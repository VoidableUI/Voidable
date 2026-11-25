package domain

import (
	"context"
	"io/fs"
)

// ManifestSource yields the indexed manifest.
type ManifestSource interface {
	Catalog(ctx context.Context) (*Catalog, error)
}

// SupplementSource yields hand-written knowledge the manifest lacks.
type SupplementSource interface {
	Supplement(ctx context.Context) (*Supplement, error)
}

// MarkupScanner finds `<void-*>` start tags in source of a given dialect.
type MarkupScanner interface {
	Scan(ctx context.Context, src []byte, lang Lang) ([]Tag, error)
}

// FragmentParser parses an HTML fragment into nodes (used for snippets).
type FragmentParser interface {
	ParseFragment(ctx context.Context, html string) ([]*Node, error)
}

// GeneratedFile is one output of a code generator.
type GeneratedFile struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

// Generator turns the catalog into framework code.
type Generator interface {
	Targets() []string
	Generate(ctx context.Context, target string, cat *Catalog) ([]GeneratedFile, error)
}

// AssetSource yields the built library bundle and theme CSS.
type AssetSource interface {
	Assets(ctx context.Context) (fs.FS, error)
}
