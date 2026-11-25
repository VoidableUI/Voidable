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
	// FalseString maps a tag to the default-true boolean attributes whose
	// converter reads "false" as false (the manifest does not say).
	FalseString map[string][]string `json:"falseString"`
	// Styled lists the CSS-only elements: void-* tags that @voidable/theme
	// styles and no JavaScript registers (the patterns and the media
	// surface). They are not in the manifest, so they are declared here.
	Styled []Element `json:"styled"`
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
