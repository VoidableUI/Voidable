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

	VoidParents  []string          `json:"voidParents"`
	VoidRequires []string          `json:"voidRequires"`
	VoidHints    map[string]string `json:"voidHints"`
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
	// FalseString is written by the manifest build for attributes whose
	// converter reads the string "false" as false (defaultTrueBoolean).
	FalseString bool `json:"falseString"`
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
	for _, mod := range m.Modules {
		for _, d := range mod.Declarations {
			if !d.CustomElement || d.TagName == "" {
				continue
			}
			els = append(els, element(mod.Path, d))
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
	for _, a := range d.Attributes {
		kind, values, nullable := domain.ParseType(a.Type.Text)
		e.Attributes = append(e.Attributes, domain.Attribute{
			Name: a.Name, Field: a.FieldName, Type: a.Type.Text, Kind: kind, Values: values,
			Nullable: nullable, Default: domain.CleanDefault(a.Default), Description: oneLine(a.Description),
			FalseString: a.FalseString,
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
