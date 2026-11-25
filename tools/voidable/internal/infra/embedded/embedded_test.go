package embedded

import (
	"context"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"testing"
)

// TestFalseStringMatchesSource checks that the manifest marks exactly the
// attributes of components that use the defaultTrueBoolean converter as
// reading "false" (the manifest build derives the flag from source). It skips
// when the repository's packages/ui sources are not next to the tool.
func TestFalseStringMatchesSource(t *testing.T) {
	dir := filepath.Join("..", "..", "..", "..", "..", "packages", "ui", "src", "components")
	files, err := filepath.Glob(filepath.Join(dir, "*.ts"))
	if err != nil || len(files) == 0 {
		t.Skip("packages/ui sources not found")
	}
	prop := regexp.MustCompile(`@property\(\{([^}]*converter: defaultTrueBoolean[^}]*)\}\)\s+(?:override\s+)?(\w+)`)
	attrName := regexp.MustCompile(`attribute: '([^']+)'`)
	want := map[string][]string{}
	for _, f := range files {
		b, err := os.ReadFile(f)
		if err != nil {
			t.Fatal(err)
		}
		for _, m := range prop.FindAllStringSubmatch(string(b), -1) {
			name := m[2]
			if a := attrName.FindStringSubmatch(m[1]); a != nil {
				name = a[1]
			}
			tag := "void-" + strings.TrimSuffix(filepath.Base(f), ".ts")
			want[tag] = append(want[tag], name)
		}
	}
	cat, err := Source{}.Catalog(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	have := map[string][]string{}
	for _, el := range cat.Elements {
		for _, a := range el.Attributes {
			if a.FalseString {
				have[el.Tag] = append(have[el.Tag], a.Name)
			}
		}
	}
	norm := func(m map[string][]string) []string {
		var out []string
		for tag, names := range m {
			for _, n := range names {
				out = append(out, tag+"."+n)
			}
		}
		sort.Strings(out)
		return out
	}
	got, exp := strings.Join(norm(have), " "), strings.Join(norm(want), " ")
	if got != exp {
		t.Errorf("manifest falseString attributes = [%s], components using defaultTrueBoolean = [%s]", got, exp)
	}
}
