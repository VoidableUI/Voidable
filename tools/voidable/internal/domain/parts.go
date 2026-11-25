package domain

// Explicit parts (#52): the regions of a component are elements the author
// writes (`<void-popover-trigger>`, `<void-popover-content>`), recorded in
// the manifest as `voidParts` on the component. CSS-only parts (no class
// registers them) become catalog elements of their own, with CSSOnly set.

// Parts is the part structure of a component, or of a part that has parts of
// its own (a second level; there is never a third).
type Parts struct {
	// Children is "parts" when every child element must be one of the parts,
	// "any" when parts mix with other content.
	Children string `json:"children"`
	// Ordered: the parts must appear in the listed order.
	Ordered bool `json:"ordered,omitempty"`
	// Transparent lists non-part elements allowed between owner and parts.
	Transparent []string `json:"transparent,omitempty"`
	// Skeleton is the correct markup in one line, quoted in findings.
	Skeleton string `json:"skeleton,omitempty"`
	// Legacy describes the implicit forms the parts replaced.
	Legacy *Legacy `json:"legacy,omitempty"`
	// Parts in canonical order.
	Parts []Part `json:"parts"`
}

// Part is one part of a component.
type Part struct {
	Tag         string `json:"tag"`
	Description string `json:"description"`
	Required    bool   `json:"required,omitempty"`
	Max         int    `json:"max,omitempty"`
	CSSOnly     bool   `json:"cssOnly,omitempty"`
	// Control: the part wraps exactly one element, the control that gets the ARIA.
	Control bool `json:"control,omitempty"`
	// Own holds the part's own parts, if any.
	Own *Parts `json:"parts,omitempty"`
}

// Legacy is advice for the implicit forms a component's parts replaced.
type Legacy struct {
	Attributes map[string]string `json:"attributes,omitempty"`
	Tags       map[string]string `json:"tags,omitempty"`
	Children   string            `json:"children,omitempty"`
}

// Part returns the part with the given tag.
func (p *Parts) Part(tag string) (*Part, int) {
	if p == nil {
		return nil, -1
	}
	for i := range p.Parts {
		if p.Parts[i].Tag == tag {
			return &p.Parts[i], i
		}
	}
	return nil, -1
}

// Tags lists the part tags in canonical order.
func (p *Parts) Tags() []string {
	if p == nil {
		return nil
	}
	out := make([]string, len(p.Parts))
	for i, x := range p.Parts {
		out[i] = x.Tag
	}
	return out
}
