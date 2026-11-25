package domain

// Supplement is hand-written knowledge the manifest does not carry yet.
// Everything in it is a stand-in for fields the manifest should gain.
type Supplement struct {
	Note string `json:"note"`
	// Snippets maps a tag to a canonical usage example written as HTML.
	Snippets map[string]string `json:"snippets"`
	// Parents maps a tag to the tags it may be a direct void-* child of.
	Parents map[string][]string `json:"parents"`
	// Hints maps tag -> attribute -> advice for attributes agents commonly
	// guess but that do not exist.
	Hints map[string]map[string]string `json:"hints"`
}

// Node is a parsed snippet node. Tag is empty for a text node.
type Node struct {
	Tag      string     `json:"tag,omitempty"`
	Attrs    []NodeAttr `json:"attrs,omitempty"`
	Children []*Node    `json:"children,omitempty"`
	Text     string     `json:"text,omitempty"`
}

// NodeAttr is one attribute of a snippet node. Bare means no value.
type NodeAttr struct {
	Name  string `json:"name"`
	Value string `json:"value,omitempty"`
	Bare  bool   `json:"bare,omitempty"`
}
