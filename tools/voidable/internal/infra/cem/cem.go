// Package cem decodes a Custom Elements Manifest (schema 1.0.0) into the
// domain catalog.
package cem

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/VoidableUI/Voidable/tools/voidable/internal/domain"
)

type manifest struct {
	SchemaVersion string   `json:"schemaVersion"`
	Modules       []module `json:"modules"`
}

type module struct {
	Path         string        `json:"path"`
	Declarations []declaration `json:"declarations"`
}

type typeRef struct {
	Text string `json:"text"`
}

type declaration struct {
	Kind          string      `json:"kind"`
	Name          string      `json:"name"`
	Description   string      `json:"description"`
	TagName       string      `json:"tagName"`
	CustomElement bool        `json:"customElement"`
	Members       []member    `json:"members"`
	Attributes    []attribute `json:"attributes"`
	Events        []event     `json:"events"`
	Slots         []slot      `json:"slots"`

	VoidParents  []string              `json:"voidParents"`
	VoidRequires []string              `json:"voidRequires"`
	VoidHints    map[string]string     `json:"voidHints"`
	VoidParts    *partsJSON            `json:"voidParts"`
	VoidName     *nameRule             `json:"voidName"`
	VoidNative   *domain.NativeControl `json:"voidNative"`
	VoidRenamed  *domain.Renamed       `json:"voidRenamed"`
	VoidMessages []domain.Message      `json:"voidMessages"`
	VoidKeys     *domain.Keys          `json:"voidKeys"`
}

// partsJSON is voidParts as the manifest build writes it (packages/ui/cem/plugins.js).
type partsJSON struct {
	Children    string         `json:"children"`
	Ordered     bool           `json:"ordered"`
	Transparent []string       `json:"transparent"`
	Skeleton    string         `json:"skeleton"`
	Legacy      *domain.Legacy `json:"legacy"`
	Parts       []partJSON     `json:"parts"`
}

type partJSON struct {
	Tag         string         `json:"tag"`
	Description string         `json:"description"`
	Required    bool           `json:"required"`
	Max         int            `json:"max"`
	CSSOnly     bool           `json:"cssOnly"`
	Control     bool           `json:"control"`
	Children    string         `json:"children"`
	Ordered     bool           `json:"ordered"`
	Transparent []string       `json:"transparent"`
	Legacy      *domain.Legacy `json:"legacy"`
	Attributes  []attribute    `json:"attributes"`
	Parts       []partJSON     `json:"parts"`
}

type nameRule struct {
	Attributes []string `json:"attributes"`
	Content    bool     `json:"content"`
	Parts      []string `json:"parts"`
	Ancestors  []struct {
		Tag        string   `json:"tag"`
		Attributes []string `json:"attributes"`
	} `json:"ancestors"`
	Hint string `json:"hint"`
}

type slot struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type member struct {
	Kind        string  `json:"kind"`
	Name        string  `json:"name"`
	Type        typeRef `json:"type"`
	Default     string  `json:"default"`
	Attribute   string  `json:"attribute"`
	Reflects    bool    `json:"reflects"`
	Static      bool    `json:"static"`
	Privacy     string  `json:"privacy"`
	Description string  `json:"description"`
}

type attribute struct {
	Name        string  `json:"name"`
	Type        typeRef `json:"type"`
	Default     string  `json:"default"`
	FieldName   string  `json:"fieldName"`
	Description string  `json:"description"`
}

type event struct {
	Name        string  `json:"name"`
	Type        typeRef `json:"type"`
	Description string  `json:"description"`
}

type summary struct {
	Package string `json:"package"`
	Version string `json:"version"`
}

// Decode parses the manifest and, optionally, the components.json summary
// (which carries the package version).
func Decode(manifestJSON, summaryJSON []byte) (*domain.Catalog, error) {
	var m manifest
	if err := json.Unmarshal(manifestJSON, &m); err != nil {
		return nil, fmt.Errorf("%w: %w", domain.ErrManifest, err)
	}
	version := "unknown"
	if len(summaryJSON) > 0 {
		var s summary
		if err := json.Unmarshal(summaryJSON, &s); err != nil {
			return nil, fmt.Errorf("%w: summary: %w", domain.ErrManifest, err)
		}
		version = s.Version
	}
	var els []domain.Element
	// Parts that are registered elements get their own parts from the tree.
	own := map[string]*domain.Parts{}
	for _, mod := range m.Modules {
		for _, d := range mod.Declarations {
			if !d.CustomElement || d.TagName == "" {
				continue
			}
			e := element(mod.Path, d)
			if d.VoidParts != nil {
				e.Parts = convertParts(d.VoidParts.Children, d.VoidParts.Ordered, d.VoidParts.Transparent, d.VoidParts.Legacy, d.VoidParts.Skeleton, d.VoidParts.Parts)
				if d.VoidParts.Legacy != nil {
					e.Removed = d.VoidParts.Legacy.Tags
				}
				els = append(els, partElements(mod.Path, d.TagName, d.VoidParts.Skeleton, d.VoidParts.Parts, own)...)
			}
			els = append(els, e)
		}
	}
	for i := range els {
		if p, ok := own[els[i].Tag]; ok && !els[i].CSSOnly {
			els[i].Parts = p
		}
	}
	if len(els) == 0 {
		return nil, fmt.Errorf("%w: no custom elements", domain.ErrManifest)
	}
	return domain.NewCatalog(version, els), nil
}

func element(path string, d declaration) domain.Element {
	e := domain.Element{Tag: d.TagName, Class: d.Name, Module: path, Description: d.Description}
	e.AllowedParents, e.RequiredChildren, e.AttrHints = d.VoidParents, d.VoidRequires, d.VoidHints
	e.Native = d.VoidNative
	e.Renamed = d.VoidRenamed
	e.Messages = d.VoidMessages
	e.Keys = d.VoidKeys
	if n := d.VoidName; n != nil {
		e.Name = &domain.NameRule{Attributes: n.Attributes, Content: n.Content, Parts: n.Parts, Hint: n.Hint}
		for _, a := range n.Ancestors {
			e.Name.Ancestors = append(e.Name.Ancestors, domain.NameAncestor{Tag: a.Tag, Attributes: a.Attributes})
		}
	}
	for _, a := range d.Attributes {
		kind, values, nullable := domain.ParseType(a.Type.Text)
		e.Attributes = append(e.Attributes, domain.Attribute{
			Name: a.Name, Field: a.FieldName, Type: a.Type.Text, Kind: kind, Values: values,
			Nullable: nullable, Default: domain.CleanDefault(a.Default), Description: oneLine(a.Description),
		})
	}
	for _, mb := range d.Members {
		if mb.Kind != "field" || mb.Static || mb.Privacy == "private" || mb.Privacy == "protected" {
			continue
		}
		e.Properties = append(e.Properties, domain.Property{
			Name: mb.Name, Attribute: mb.Attribute, Type: mb.Type.Text,
			Default: domain.CleanDefault(mb.Default), Reflects: mb.Reflects, Description: oneLine(mb.Description),
		})
	}
	for _, ev := range d.Events {
		detail, fields := domain.ParseDetail(ev.Type.Text)
		e.Events = append(e.Events, domain.Event{Name: ev.Name, Detail: detail, Fields: fields, Description: oneLine(ev.Description)})
	}
	for _, sl := range d.Slots {
		e.Slots = append(e.Slots, domain.Slot{Name: sl.Name, Description: oneLine(sl.Description)})
	}
	return e
}

// oneLine joins the lines a JSDoc comment is wrapped over, so the compact
// reference shows one line per attribute. Paragraph breaks are kept as a
// single space too: these descriptions are sentences, not documents.
func oneLine(s string) string { return strings.Join(strings.Fields(s), " ") }

func convertParts(children string, ordered bool, transparent []string, legacy *domain.Legacy, skeleton string, list []partJSON) *domain.Parts {
	if children == "" {
		children = "any"
	}
	p := &domain.Parts{Children: children, Ordered: ordered, Transparent: transparent, Skeleton: skeleton, Legacy: legacy}
	for _, x := range list {
		part := domain.Part{Tag: x.Tag, Description: oneLine(x.Description), Required: x.Required, Max: x.Max, CSSOnly: x.CSSOnly, Control: x.Control}
		if len(x.Parts) > 0 {
			part.Own = convertParts(x.Children, x.Ordered, x.Transparent, x.Legacy, skeleton, x.Parts)
		}
		p.Parts = append(p.Parts, part)
	}
	return p
}

// partElements returns a catalog element for every CSS-only part under owner
// (they are not declarations of their own), and records the own parts of
// every part in own.
func partElements(path, owner, skeleton string, list []partJSON, own map[string]*domain.Parts) []domain.Element {
	var out []domain.Element
	for _, x := range list {
		var sub *domain.Parts
		if len(x.Parts) > 0 {
			sub = convertParts(x.Children, x.Ordered, x.Transparent, x.Legacy, skeleton, x.Parts)
			own[x.Tag] = sub
			out = append(out, partElements(path, x.Tag, skeleton, x.Parts, own)...)
		}
		if !x.CSSOnly {
			continue
		}
		e := domain.Element{Tag: x.Tag, Module: path, Description: oneLine(x.Description), CSSOnly: true, PartOf: owner, AllowedParents: []string{owner}, Parts: sub}
		for _, a := range x.Attributes {
			kind, values, nullable := domain.ParseType(a.Type.Text)
			e.Attributes = append(e.Attributes, domain.Attribute{Name: a.Name, Type: a.Type.Text, Kind: kind, Values: values, Nullable: nullable, Description: oneLine(a.Description)})
		}
		out = append(out, e)
	}
	return out
}
