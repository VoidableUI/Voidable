package embedded

import (
	"context"
	"testing"

	"github.com/VoidableUI/Voidable/tools/voidable/internal/domain"
	"github.com/VoidableUI/Voidable/tools/voidable/internal/infra/scan"
)

// TestEveryComponentHasAnExample checks that each registered element has a
// hand-written supplement snippet (the docs site and `voidable gen snippet`
// show it), and that the checker accepts every one of them.
func TestEveryComponentHasAnExample(t *testing.T) {
	ctx := context.Background()
	lib, err := domain.NewLibrary(ctx, Source{}, Source{}, scan.Fragments{})
	if err != nil {
		t.Fatal(err)
	}
	checker := domain.NewChecker(lib, scan.Scanner{})
	for _, tag := range lib.Catalog().Registered().Tags() {
		html, ok := lib.Supplement().Snippets[tag]
		if !ok {
			t.Errorf("%s has no snippet: add supplement/snippets/%s.html", tag, tag)
			continue
		}
		findings, err := checker.Check(ctx, tag+".html", []byte(html), domain.LangHTML)
		if err != nil {
			t.Errorf("%s: %v", tag, err)
		}
		for _, f := range findings {
			t.Errorf("%s snippet: %v", tag, f)
		}
	}
}
