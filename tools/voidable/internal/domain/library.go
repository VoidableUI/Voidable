package domain

import (
	"context"
	"fmt"
)

// Library is the read side of the tool: element lookup, reference views
// and usage snippets. All front-ends (CLI, MCP) go through it.
type Library struct {
	cat    *Catalog
	sup    *Supplement
	parser FragmentParser
}

// NewLibrary loads the catalog and supplement once.
func NewLibrary(ctx context.Context, ms ManifestSource, ss SupplementSource, p FragmentParser) (*Library, error) {
	cat, err := ms.Catalog(ctx)
	if err != nil {
		return nil, err
	}
	sup := &Supplement{}
	if ss != nil {
		if sup, err = ss.Supplement(ctx); err != nil {
			return nil, err
		}
	}
	// Parents and attribute hints live in the manifest; the supplement fields
	// stay for hand-built test supplements and for anything the manifest lacks.
	if sup.Parents == nil {
		sup.Parents = map[string][]string{}
	}
	if sup.Hints == nil {
		sup.Hints = map[string]map[string]string{}
	}
	for i := range cat.Elements {
		el := &cat.Elements[i]
		if len(el.AllowedParents) > 0 {
			sup.Parents[el.Tag] = el.AllowedParents
		}
		if len(el.AttrHints) > 0 {
			sup.Hints[el.Tag] = el.AttrHints
		}
	}
	for tag, names := range sup.FalseString {
		el, ok := cat.Element(tag)
		if !ok {
			return nil, fmt.Errorf("%w: supplement falseString names unknown element %s", ErrManifest, tag)
		}
		for _, n := range names {
			a, ok := el.Attribute(n)
			if !ok {
				return nil, fmt.Errorf("%w: supplement falseString names unknown attribute %s.%s", ErrManifest, tag, n)
			}
			a.FalseString = true
		}
	}
	return &Library{cat: cat, sup: sup, parser: p}, nil
}

// Catalog exposes the underlying catalog (for generators).
func (l *Library) Catalog() *Catalog { return l.cat }

// Supplement exposes the stand-in supplement.
func (l *Library) Supplement() *Supplement { return l.sup }

// Version is the library version the manifest was built from.
func (l *Library) Version() string { return l.cat.Version }

// Lookup finds an element or returns ErrUnknownElement with a suggestion.
func (l *Library) Lookup(tag string) (*Element, error) {
	if e, ok := l.cat.Element(tag); ok {
		return e, nil
	}
	if s := Suggest(tag, l.cat.Tags()); s != "" {
		return nil, fmt.Errorf("%w %q (did you mean %s?)", ErrUnknownElement, tag, s)
	}
	return nil, fmt.Errorf("%w %q", ErrUnknownElement, tag)
}

// Reference is everything an agent needs about one element.
type Reference struct {
	Element
	Parents []string `json:"parents,omitempty"`
	Example *Snippet `json:"example,omitempty"`
	// Missing lists the kinds of information the manifest lacks.
	Missing []string `json:"missing,omitempty"`
}

// Reference builds the reference view for a tag.
func (l *Library) Reference(ctx context.Context, tag string) (*Reference, error) {
	e, err := l.Lookup(tag)
	if err != nil {
		return nil, err
	}
	sn, err := l.snippet(ctx, e.Tag, LangHTML, false)
	if err != nil {
		return nil, err
	}
	r := &Reference{Element: *e, Parents: l.sup.Parents[e.Tag], Example: sn}
	if len(e.Slots) == 0 {
		r.Missing = append(r.Missing, "slots")
	}
	missingDesc := 0
	for _, a := range e.Attributes {
		if a.Description == "" {
			missingDesc++
		}
	}
	if missingDesc > 0 {
		r.Missing = append(r.Missing, fmt.Sprintf("attribute descriptions (%d/%d)", missingDesc, len(e.Attributes)))
	}
	if sn.Source != SnippetSupplement {
		r.Missing = append(r.Missing, "canonical example")
	}
	return r, nil
}

// References builds the reference for every element.
func (l *Library) References(ctx context.Context) ([]*Reference, error) {
	out := make([]*Reference, 0, len(l.cat.Elements))
	for _, e := range l.cat.Elements {
		r, err := l.Reference(ctx, e.Tag)
		if err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, nil
}
