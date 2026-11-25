package domain

import (
	"context"
	"fmt"
	"strings"
	"unicode"
)

// SnippetSource says where an example came from.
type SnippetSource string

const (
	// SnippetSupplement is a hand-written stand-in example.
	SnippetSupplement SnippetSource = "supplement"
	// SnippetSynthesized is built from the manifest alone.
	SnippetSynthesized SnippetSource = "synthesized"
)

// SnippetLangs are the languages Snippet can emit.
var SnippetLangs = []Lang{LangHTML, LangJSX, LangHEEx, LangERB, LangBlade}

// Snippet is an example usage in one language.
type Snippet struct {
	Tag    string        `json:"tag"`
	Lang   Lang          `json:"lang"`
	Source SnippetSource `json:"source"`
	Code   string        `json:"code"`
}

// Snippet renders an example usage of tag in lang.
func (l *Library) Snippet(ctx context.Context, tag string, lang Lang) (*Snippet, error) {
	return l.snippet(ctx, tag, lang, true)
}

// Markup renders the example markup alone, without the event-wiring example
// that Snippet appends. The docs site renders it live.
func (l *Library) Markup(ctx context.Context, tag string, lang Lang) (*Snippet, error) {
	return l.snippet(ctx, tag, lang, false)
}

// snippet renders the example; wiring adds the event listener example.
func (l *Library) snippet(ctx context.Context, tag string, lang Lang, wiring bool) (*Snippet, error) {
	e, err := l.Lookup(tag)
	if err != nil {
		return nil, err
	}
	switch lang {
	case LangHTML, LangJSX, LangHEEx, LangERB, LangBlade:
	default:
		return nil, fmt.Errorf("%w %q for snippets (use html, jsx, heex, erb or blade)", ErrUnknownLang, lang)
	}
	var nodes []*Node
	src := SnippetSynthesized
	if html, ok := l.sup.Snippets[e.Tag]; ok && l.parser != nil {
		if nodes, err = l.parser.ParseFragment(ctx, html); err != nil {
			return nil, fmt.Errorf("parse snippet for %s: %w", e.Tag, err)
		}
		src = SnippetSupplement
	} else {
		nodes = []*Node{synthesize(e)}
	}
	r := snippetRenderer{lib: l, lang: lang, root: e}
	var b strings.Builder
	for _, n := range nodes {
		r.node(&b, n, 0, n.Tag == e.Tag)
	}
	if tail := r.eventTail(); wiring && tail != "" {
		b.WriteString(tail)
	}
	return &Snippet{Tag: e.Tag, Lang: lang, Source: src, Code: strings.TrimRight(b.String(), "\n") + "\n"}, nil
}

// synthesize builds a minimal example from the manifest: the element with
// its first enumerated attribute set to a non-default value.
func synthesize(e *Element) *Node {
	n := &Node{Tag: e.Tag}
	for _, a := range e.Attributes {
		if a.Kind != KindEnum {
			continue
		}
		for _, v := range a.Values {
			if v != a.Default {
				n.Attrs = append(n.Attrs, NodeAttr{Name: a.Name, Value: v})
				return n
			}
		}
	}
	return n
}

type snippetRenderer struct {
	lib  *Library
	lang Lang
	root *Element
}

// firstEvent returns the root's first event and an example detail access.
func (r snippetRenderer) firstEvent() (*Event, string) {
	if len(r.root.Events) == 0 {
		return nil, ""
	}
	ev := &r.root.Events[0]
	access := "e.detail"
	if len(ev.Fields) > 0 {
		access += "." + ev.Fields[0].Name
	}
	return ev, access
}

func (r snippetRenderer) node(b *strings.Builder, n *Node, depth int, isRoot bool) {
	ind := strings.Repeat("  ", depth)
	if n.Tag == "" {
		if t := strings.TrimSpace(n.Text); t != "" {
			b.WriteString(ind + t + "\n")
		}
		return
	}
	name := n.Tag
	el, isVoid := r.lib.cat.Element(n.Tag)
	if r.lang == LangHEEx && isVoid && !el.CSSOnly {
		name = "." + FunctionName(n.Tag)
	}
	if r.lang == LangBlade && isVoid && !el.CSSOnly {
		name = "x-voidable::" + strings.TrimPrefix(n.Tag, "void-")
	}
	b.WriteString(ind + "<" + name)
	for _, a := range n.Attrs {
		b.WriteString(" " + r.attr(el, a))
	}
	if isRoot {
		b.WriteString(r.rootEventAttrs())
	}
	textOnly := true
	for _, c := range n.Children {
		if c.Tag != "" {
			textOnly = false
		}
	}
	switch {
	case len(n.Children) == 0 && (r.lang == LangJSX || r.lang == LangHEEx):
		b.WriteString(" />\n")
	case len(n.Children) == 0 && isVoidHTML(n.Tag):
		b.WriteString(">\n")
	case len(n.Children) == 0:
		b.WriteString("></" + name + ">\n")
	case textOnly:
		var t []string
		for _, c := range n.Children {
			if s := strings.TrimSpace(c.Text); s != "" {
				t = append(t, s)
			}
		}
		b.WriteString(">" + strings.Join(t, " ") + "</" + name + ">\n")
	default:
		b.WriteString(">\n")
		for _, c := range n.Children {
			r.node(b, c, depth+1, false)
		}
		b.WriteString(ind + "</" + name + ">\n")
	}
}

func (r snippetRenderer) attr(el *Element, a NodeAttr) string {
	name := a.Name
	switch r.lang {
	case LangJSX:
		switch name {
		case "class":
			name = "className"
		case "for":
			name = "htmlFor"
		}
	case LangHEEx:
		if el != nil && !el.CSSOnly {
			if ma, ok := el.Attribute(a.Name); ok {
				name = AssignName(*ma)
			}
		}
	}
	if a.Bare {
		return name
	}
	return name + `="` + strings.ReplaceAll(a.Value, `"`, "&quot;") + `"`
}

func (r snippetRenderer) rootEventAttrs() string {
	ev, access := r.firstEvent()
	if ev == nil {
		return ""
	}
	switch r.lang {
	case LangJSX:
		return fmt.Sprintf(" on%s={(e) => console.log(%s)}", ev.Name, access)
	case LangERB:
		return fmt.Sprintf(` data-controller="void-event" data-void-event-events-value="%s" data-action="%s->my-controller#handle"`, ev.Name, ev.Name)
	}
	return ""
}

// eventTail adds wiring that does not live on the element itself.
func (r snippetRenderer) eventTail() string {
	ev, access := r.firstEvent()
	if ev == nil {
		return ""
	}
	switch r.lang {
	case LangHTML:
		return fmt.Sprintf("<script type=\"module\">\n  document.querySelector('%s')\n    .addEventListener('%s', (e) => console.log(%s));\n</script>\n", r.root.Tag, ev.Name, access)
	case LangHEEx:
		return fmt.Sprintf("<%%!-- The component sets phx-hook=\"VoidEvent\"; handle_event(\"%s\", %s, socket) receives the detail. --%%>\n", ev.Name, elixirDetail(ev))
	case LangBlade:
		return fmt.Sprintf("{{-- Alpine: add x-void-on:%s=\"handle($event.detail)\" to the tag, or void_attrs('%s', 'handler') from voidable/laravel. --}}\n", ev.Name, ev.Name)
	case LangERB:
		return fmt.Sprintf("<%%# Stimulus: my-controller#handle receives event.detail %s. Helper: void_attrs(\"%s\", \"my-controller#handle\") %%>\n", ev.Detail, ev.Name)
	}
	return ""
}

func elixirDetail(ev *Event) string {
	if len(ev.Fields) == 0 {
		return "_params"
	}
	var parts []string
	for _, f := range ev.Fields {
		parts = append(parts, fmt.Sprintf("%q => %s", f.Name, SnakeCase(f.Name)))
	}
	return "%{" + strings.Join(parts, ", ") + "}"
}

func isVoidHTML(tag string) bool {
	switch tag {
	case "input", "br", "hr", "img", "meta", "link", "source", "col", "wbr":
		return true
	}
	return false
}

// FunctionName is the Elixir/PHP-friendly component name for a tag:
// void-status-dot -> status_dot.
func FunctionName(tag string) string {
	return strings.ReplaceAll(strings.TrimPrefix(tag, "void-"), "-", "_")
}

// AssignName is the snake_case assign/prop name for an attribute, derived
// from the JS field name when there is one (collapsedWidth -> collapsed_width).
func AssignName(a Attribute) string {
	if a.Field != "" {
		return SnakeCase(a.Field)
	}
	return SnakeCase(a.Name)
}

// SnakeCase converts camelCase or kebab-case to snake_case.
func SnakeCase(s string) string {
	var b strings.Builder
	for i, r := range s {
		switch {
		case r == '-':
			b.WriteByte('_')
		case unicode.IsUpper(r):
			if i > 0 {
				b.WriteByte('_')
			}
			b.WriteRune(unicode.ToLower(r))
		default:
			b.WriteRune(r)
		}
	}
	return b.String()
}
