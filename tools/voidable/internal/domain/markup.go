package domain

import (
	"path/filepath"
	"strings"
)

// Lang names a markup dialect the checker understands.
type Lang string

const (
	LangHTML     Lang = "html"
	LangERB      Lang = "erb"
	LangHEEx     Lang = "heex"
	LangBlade    Lang = "blade"
	LangJSX      Lang = "jsx"
	LangAstro    Lang = "astro"
	LangVue      Lang = "vue"
	LangSvelte   Lang = "svelte"
	LangLit      Lang = "lit"
	LangMarkdown Lang = "markdown"
)

// Langs lists every accepted language name.
var Langs = []Lang{LangHTML, LangERB, LangHEEx, LangBlade, LangJSX, LangAstro, LangVue, LangSvelte, LangLit, LangMarkdown}

// ParseLang accepts a language name or a common alias (tsx, ex, php...).
func ParseLang(s string) (Lang, error) {
	switch strings.ToLower(strings.TrimPrefix(s, ".")) {
	case "html", "htm", "":
		return LangHTML, nil
	case "erb", "rails", "ruby":
		return LangERB, nil
	case "heex", "ex", "exs", "elixir", "phoenix", "eex", "leex":
		return LangHEEx, nil
	case "blade", "php", "laravel":
		return LangBlade, nil
	case "jsx", "tsx", "react", "solid", "preact":
		return LangJSX, nil
	case "astro":
		return LangAstro, nil
	case "vue":
		return LangVue, nil
	case "svelte":
		return LangSvelte, nil
	case "lit", "ts", "js", "mjs", "typescript", "javascript":
		return LangLit, nil
	case "md", "mdx", "markdown":
		return LangMarkdown, nil
	}
	return "", ErrUnknownLang
}

// LangForPath guesses the dialect from a file name.
func LangForPath(path string) Lang {
	base := strings.ToLower(filepath.Base(path))
	if strings.HasSuffix(base, ".blade.php") {
		return LangBlade
	}
	base = strings.TrimSuffix(base, ".tt") // Rails generator templates: x.html.erb.tt
	l, err := ParseLang(filepath.Ext(base))
	if err != nil {
		return LangHTML
	}
	return l
}

// CaseSensitive reports whether attribute names keep their case, i.e. are
// matched against property names as well (JSX sets properties when the
// name is a property of the element).
func (l Lang) CaseSensitive() bool { return l == LangJSX }

// SelfClosingIgnored reports whether `<void-x />` is parsed by the browser
// HTML parser, which ignores the slash and leaves the element open.
func (l Lang) SelfClosingIgnored() bool {
	switch l {
	case LangHTML, LangERB, LangBlade, LangLit:
		return true
	}
	return false
}

// Syntax says how an attribute token binds to the element.
type Syntax string

const (
	SyntaxAttr      Syntax = "attr"      // name="v", name, name={expr}
	SyntaxProperty  Syntax = "property"  // .name (Lit), prop:name (Solid)
	SyntaxBoolBind  Syntax = "bool"      // ?name (Lit), bool:name (Solid)
	SyntaxBound     Syntax = "bound"     // :name, v-bind:name, x-bind:name, attr:name
	SyntaxEvent     Syntax = "event"     // @name, on:name, onname, v-on:name, x-on:name
	SyntaxDirective Syntax = "directive" // framework directive, not an element attribute
	SyntaxSpread    Syntax = "spread"    // {...props}, {@rest}, <%= %>, {{ $attributes }}
)

// AttrToken is one attribute as written in source, with the framework
// prefix removed.
type AttrToken struct {
	Raw      string `json:"raw"`
	Name     string `json:"name"`
	Syntax   Syntax `json:"syntax"`
	Value    string `json:"value,omitempty"`
	HasValue bool   `json:"hasValue,omitempty"`
	// Dynamic is true when the value is a template expression the scanner
	// cannot evaluate.
	Dynamic bool `json:"dynamic,omitempty"`
	Line    int  `json:"line"`
	Col     int  `json:"col"`
}

// Tag is one `<void-*>` start tag found by a scanner.
type Tag struct {
	Name        string      `json:"name"`
	Lang        Lang        `json:"lang"`
	Line        int         `json:"line"`
	Col         int         `json:"col"`
	Attrs       []AttrToken `json:"attrs"`
	SelfClosing bool        `json:"selfClosing,omitempty"`
	// Parent is the nearest enclosing `void-*` element, if any.
	Parent string `json:"parent,omitempty"`
	// ParentIndex is the index of that element among the tags the scanner
	// returned for the same source, or -1.
	ParentIndex int `json:"-"`
	// Closed is true when the scanner found the element's end tag, so its
	// children are all known.
	Closed bool `json:"-"`
	// Dynamic is true when the element's content holds template expressions
	// (`{children}`, `<%= %>`, `@foreach`, `${...}`): parts may come from them,
	// so missing parts are not reported.
	Dynamic bool `json:"-"`

	// Mention marks a tag written in backticks in prose or a doc string: it is
	// named for the unknown-element check but is not markup.
	Mention bool `json:"mention,omitempty"`
	// Content summarises what sits between the start and end tag.
	Content Content `json:"content"`
	// Ancestors are the enclosing elements the name check needs, outermost
	// first: every `void-*` element with its attributes, and `label`.
	Ancestors []Ancestor `json:"ancestors,omitempty"`
	// Labelled is true when a native `<label>` names the element: it sits
	// inside one, or a `<label for>` in the same source names its id.
	Labelled bool `json:"labelled,omitempty"`
	// InComponent is true when the tag sits inside an enclosing framework
	// component (`<Field>`, `<.field>`, `<x-field>`): what it renders is not
	// known, so it may name the element.
	InComponent bool `json:"inComponent,omitempty"`
}

// Content describes the children of a tag without parsing them.
type Content struct {
	// Known is false when the end tag was not found (an unclosed element), and
	// for a tag the HTML parser leaves open.
	Known bool `json:"known"`
	// Text is true when there is static text, or an element that carries a
	// name (an image with `alt`, an `aria-label`, an svg `<title>`).
	Text bool `json:"text,omitempty"`
	// Dynamic is true when something the scanner cannot evaluate may render
	// content: an expression, a slot, a yielded block, a framework component.
	Dynamic bool `json:"dynamic,omitempty"`
	// Tags are the void-* elements written inside (their start tags), so a
	// name rule can look for the part that names its owner.
	Tags []string `json:"tags,omitempty"`
}

// Ancestor is an enclosing element and its attributes.
type Ancestor struct {
	Name  string      `json:"name"`
	Attrs []AttrToken `json:"attrs,omitempty"`
}
