// Package domain holds the Voidable library model (elements, attributes,
// events), the services built on it (reference, check, snippet) and the
// ports that infrastructure adapters implement. Stdlib only.
package domain

import (
	"fmt"
	"sort"
	"strings"
)

// ValueKind classifies an attribute's type text.
type ValueKind string

const (
	KindString  ValueKind = "string"
	KindBoolean ValueKind = "boolean"
	KindNumber  ValueKind = "number"
	KindEnum    ValueKind = "enum"
	KindOther   ValueKind = "other"
)

// Attribute is an HTML attribute an element observes.
type Attribute struct {
	Name        string    `json:"name"`
	Field       string    `json:"field,omitempty"`
	Type        string    `json:"type"`
	Kind        ValueKind `json:"kind"`
	Values      []string  `json:"values,omitempty"`
	Nullable    bool      `json:"nullable,omitempty"`
	Default     string    `json:"default,omitempty"`
	Description string    `json:"description,omitempty"`
}

// Slot is a named slot an element projects children into. The default
// slot has an empty Name.
type Slot struct {
	Name        string `json:"name,omitempty"`
	Description string `json:"description,omitempty"`
}

// Property is a public JavaScript property. Attribute is empty for
// property-only members (arrays, objects).
type Property struct {
	Name        string `json:"name"`
	Attribute   string `json:"attribute,omitempty"`
	Type        string `json:"type"`
	Default     string `json:"default,omitempty"`
	Reflects    bool   `json:"reflects,omitempty"`
	Description string `json:"description,omitempty"`
}

// Field is one member of an event detail object.
type Field struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

// Event is a CustomEvent an element dispatches (or that bubbles to it from
// a child of the same family).
type Event struct {
	Name        string  `json:"name"`
	Detail      string  `json:"detail,omitempty"`
	Fields      []Field `json:"fields,omitempty"`
	Description string  `json:"description,omitempty"`
}

// Element is one registered custom element.
type Element struct {
	Tag         string      `json:"tag"`
	Class       string      `json:"class"`
	Module      string      `json:"module"`
	Description string      `json:"description,omitempty"`
	Attributes  []Attribute `json:"attributes"`
	Properties  []Property  `json:"properties"`
	Events      []Event     `json:"events"`
	Slots       []Slot      `json:"slots,omitempty"`

	// AllowedParents, RequiredChildren and AttrHints come from the manifest
	// (voidParents, voidRequires, voidHints; the build writes them from
	// packages/ui/cem/supplement.js). The library merges them into the
	// Supplement so the checker, reference and skill read one place.
	AllowedParents   []string          `json:"-"`
	RequiredChildren []string          `json:"-"`
	AttrHints        map[string]string `json:"-"`
	// Name says what gives the element an accessible name (voidName in the
	// manifest, source accessibleName in packages/ui/cem/supplement.js); nil
	// when the element needs none.
	Name *NameRule `json:"name,omitempty"`

	// CSSOnly marks a styled element: a void-* tag that @voidable/theme
	// styles and @voidable/ui never registers. It has no JavaScript, no
	// properties and no events. The page patterns are declared in the
	// supplement; the CSS-only parts of components come from the manifest's
	// voidParts.
	CSSOnly bool `json:"cssOnly,omitempty"`

	// Parts is the element's explicit parts (#52), from the manifest's
	// voidParts: on a component, and on a part that has parts of its own.
	Parts *Parts `json:"parts,omitempty"`
	// PartOf is the component (or part) this element is a part of.
	PartOf string `json:"partOf,omitempty"`
	// Removed is advice for tags this component's parts replaced (from
	// voidParts.legacy.tags), keyed by the removed tag.
	Removed map[string]string `json:"-"`
	// Native is the native control the author writes inside the component
	// (voidNative in the manifest: `<select>` in `<void-select>`), or nil.
	Native *NativeControl `json:"native,omitempty"`
	// Renamed is what was renamed or removed on this element in 0.8 (#23),
	// from the manifest's voidRenamed (source: `renamed` in
	// packages/ui/cem/supplement.js).
	Renamed *Renamed `json:"-"`
}

// NativeControl is a native element a component enhances in place: Tag must
// be inside it, and Fix is the correct markup when it is missing.
type NativeControl struct {
	Tag string `json:"tag"`
	Fix string `json:"fix"`
}

// RenamedAttribute is one attribute renamed or removed in 0.8 (#23).
type RenamedAttribute struct {
	// To is the new attribute, written with the same value.
	To string `json:"to,omitempty"`
	// Values is the replacement markup for one old value ("" is the
	// attribute written with no value).
	Values map[string]string `json:"values,omitempty"`
	// Fix is what to do when neither applies.
	Fix string `json:"fix,omitempty"`
}

// Replacement is the markup to write instead of the old attribute with value
// (hasValue false: written with no value).
func (r RenamedAttribute) Replacement(value string, hasValue bool) string {
	key := value
	if !hasValue {
		key = ""
	}
	if v, ok := r.Values[key]; ok {
		return v
	}
	if r.To != "" {
		if key == "" {
			return r.To
		}
		return fmt.Sprintf("%s=%q", r.To, value)
	}
	return r.Fix
}

// Renames reports whether the old attribute (with value) has a replacement
// to write, rather than advice for a removed one.
func (r RenamedAttribute) Renames(value string, hasValue bool) bool {
	key := value
	if !hasValue {
		key = ""
	}
	_, ok := r.Values[key]
	return ok || r.To != ""
}

// Renamed is what was renamed or removed on one element in 0.8 (#23).
type Renamed struct {
	Attributes map[string]RenamedAttribute `json:"attributes,omitempty"`
	// Values maps an attribute to its renamed values (old -> new).
	Values map[string]map[string]string `json:"values,omitempty"`
	// Events maps a removed event to what to listen for instead.
	Events map[string]string `json:"events,omitempty"`
}

// Attribute returns the attribute with the given (exact) name.
func (e *Element) Attribute(name string) (*Attribute, bool) {
	for i := range e.Attributes {
		if e.Attributes[i].Name == name {
			return &e.Attributes[i], true
		}
	}
	return nil, false
}

// Property returns the property with the given (exact) name.
func (e *Element) Property(name string) (*Property, bool) {
	for i := range e.Properties {
		if e.Properties[i].Name == name {
			return &e.Properties[i], true
		}
	}
	return nil, false
}

// Event returns the event with the given name.
func (e *Element) Event(name string) (*Event, bool) {
	for i := range e.Events {
		if e.Events[i].Name == name {
			return &e.Events[i], true
		}
	}
	return nil, false
}

// PropertyOnly lists properties that have no attribute.
func (e *Element) PropertyOnly() []Property {
	var out []Property
	for _, p := range e.Properties {
		if p.Attribute == "" {
			out = append(out, p)
		}
	}
	return out
}

// Catalog is the indexed manifest for one library version.
type Catalog struct {
	Version  string
	Elements []Element
	byTag    map[string]int
}

// NewCatalog sorts elements by tag and indexes them.
func NewCatalog(version string, els []Element) *Catalog {
	sorted := append([]Element(nil), els...)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].Tag < sorted[j].Tag })
	c := &Catalog{Version: version, Elements: sorted, byTag: make(map[string]int, len(sorted))}
	for i, e := range sorted {
		c.byTag[e.Tag] = i
	}
	return c
}

// With returns a catalog that also holds extra (for the CSS-only elements
// the supplement declares). A tag that is already present is an error.
func (c *Catalog) With(extra []Element) (*Catalog, error) {
	if len(extra) == 0 {
		return c, nil
	}
	for _, e := range extra {
		if _, ok := c.byTag[strings.ToLower(e.Tag)]; ok {
			return nil, fmt.Errorf("%w: supplement declares %s, which the manifest already registers", ErrManifest, e.Tag)
		}
	}
	return NewCatalog(c.Version, append(append([]Element(nil), c.Elements...), extra...)), nil
}

// Registered returns a catalog of the elements @voidable/ui registers,
// without the CSS-only ones (code generators wrap behaviour, and there is
// none to wrap).
func (c *Catalog) Registered() *Catalog {
	var els []Element
	for _, e := range c.Elements {
		if !e.CSSOnly {
			els = append(els, e)
		}
	}
	return NewCatalog(c.Version, els)
}

// Element looks up a tag.
func (c *Catalog) Element(tag string) (*Element, bool) {
	i, ok := c.byTag[strings.ToLower(tag)]
	if !ok {
		return nil, false
	}
	return &c.Elements[i], true
}

// Tags returns all tags in sorted order.
func (c *Catalog) Tags() []string {
	out := make([]string, len(c.Elements))
	for i, e := range c.Elements {
		out[i] = e.Tag
	}
	return out
}

// Dispatchers returns the tags whose event list contains name.
func (c *Catalog) Dispatchers(event string) []string {
	var out []string
	for _, e := range c.Elements {
		if _, ok := e.Event(event); ok {
			out = append(out, e.Tag)
		}
	}
	return out
}

// NameRule says that an element must have an accessible name and what supplies
// one. It is data from the manifest: the checker has no list of tags.
type NameRule struct {
	// Attributes of the element itself that name it. A non-empty or dynamic
	// value counts.
	Attributes []string `json:"attributes"`
	// Content is true when the element's own text (or a named icon inside it)
	// names it.
	Content bool `json:"content,omitempty"`
	// Parts are descendant part elements whose presence names the element (a
	// dialog's title part).
	Parts []string `json:"parts,omitempty"`
	// Ancestors name the element when an enclosing element has the tag and
	// carries one of the attributes (none listed: the tag alone is enough).
	// The tag `label` is the native element.
	Ancestors []NameAncestor `json:"ancestors,omitempty"`
	// Hint is one sentence on what to do about it.
	Hint string `json:"hint,omitempty"`
}

// NameAncestor is one enclosing element that can name its descendant.
type NameAncestor struct {
	Tag        string   `json:"tag"`
	Attributes []string `json:"attributes,omitempty"`
}
