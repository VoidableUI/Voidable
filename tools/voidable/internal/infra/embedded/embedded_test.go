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

// TestFalseStringMatchesSource keeps the supplement's falseString list in
// step with the components that use the defaultTrueBoolean converter. It
// skips when the repository's packages/ui sources are not next to the tool.
func TestFalseStringMatchesSource(t *testing.T) {
	dir := filepath.Join("..", "..", "..", "..", "..", "packages", "ui", "src", "components")
	files, err := filepath.Glob(filepath.Join(dir, "*.ts"))
	if err != nil || len(files) == 0 {
		t.Skip("packages/ui sources not found")
	}
	prop := regexp.MustCompile(`@property\(\{([^}]*converter: defaultTrueBoolean[^}]*)\}\)\s+(\w+)`)
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
	sup, err := Source{}.Supplement(context.Background())
	if err != nil {
		t.Fatal(err)
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
	got, exp := strings.Join(norm(sup.FalseString), " "), strings.Join(norm(want), " ")
	if got != exp {
		t.Errorf("rules.json falseString = [%s], components using defaultTrueBoolean = [%s]", got, exp)
	}
}
