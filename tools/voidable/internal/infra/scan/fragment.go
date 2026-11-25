package scan

import (
	"context"
	"fmt"
	"strings"

	"golang.org/x/net/html"
	"golang.org/x/net/html/atom"

	"github.com/VoidableUI/Voidable/tools/voidable/internal/domain"
)

// Fragments implements domain.FragmentParser with golang.org/x/net/html.
type Fragments struct{}

// ParseFragment parses an HTML fragment in a <template> context so that
// table parts and custom elements are kept as written.
func (Fragments) ParseFragment(_ context.Context, src string) ([]*domain.Node, error) {
	ctx := &html.Node{Type: html.ElementNode, Data: "template", DataAtom: atom.Template}
	nodes, err := html.ParseFragment(strings.NewReader(src), ctx)
	if err != nil {
		return nil, fmt.Errorf("parse fragment: %w", err)
	}
	var out []*domain.Node
	for _, n := range nodes {
		if d := convert(n, src); d != nil {
			out = append(out, d)
		}
	}
	return out, nil
}

func convert(n *html.Node, src string) *domain.Node {
	switch n.Type {
	case html.TextNode:
		if strings.TrimSpace(n.Data) == "" {
			return nil
		}
		return &domain.Node{Text: n.Data}
	case html.ElementNode:
		d := &domain.Node{Tag: n.Data}
		for _, a := range n.Attr {
			// x/net/html cannot tell `required` from `required=""`; treat an
			// empty value on a bare-looking attribute as bare.
			bare := a.Val == "" && !strings.Contains(src, a.Key+`=""`)
			d.Attrs = append(d.Attrs, domain.NodeAttr{Name: a.Key, Value: a.Val, Bare: bare})
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			if cd := convert(c, src); cd != nil {
				d.Children = append(d.Children, cd)
			}
		}
		return d
	}
	return nil
}
