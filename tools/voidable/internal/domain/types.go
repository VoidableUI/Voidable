// Package domain holds the Voidable library model (elements, attributes,
// events), the services built on it (reference, check, snippet) and the
// ports that infrastructure adapters implement. Stdlib only.
package domain

import (
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
	// FalseString is true when the attribute's converter reads the string
	// "false" as false (a default-true boolean that markup can turn off).
	// The manifest does not carry converters; the library sets this from
	// the supplement.
	FalseString bool `json:"falseString,omitempty"`
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
