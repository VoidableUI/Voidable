package cli

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	checkcmd "github.com/VoidableUI/Voidable/tools/voidable/cmd/check"
)

// TestLegacyMarkup checks the 0.7 markup in testdata/legacy (HTML, JSX, ERB,
// HEEx and Blade): every attribute, value and event renamed or removed in 0.8
// is reported as legacy-markup with its replacement, on its line, and nothing
// else is reported (#23). want.txt lists the findings.
func TestLegacyMarkup(t *testing.T) {
	dir := filepath.Join("testdata", "legacy")
	raw, err := os.ReadFile(filepath.Join(dir, "want.txt"))
	if err != nil {
		t.Fatal(err)
	}
	type want struct {
		key  string // file:line
		text string
	}
	var wants []want
	for _, line := range strings.Split(string(raw), "\n") {
		if line = strings.TrimSpace(line); line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, text, ok := strings.Cut(line, " ")
		if !ok {
			t.Fatalf("want.txt: bad line %q", line)
		}
		wants = append(wants, want{key, text})
	}

	out, err := run(t, "check", "--format", "json", dir)
	if !errors.Is(err, checkcmd.ErrProblems) {
		t.Fatalf("err = %v, out:\n%s", err, out)
	}
	var findings []struct {
		File    string `json:"file"`
		Line    int    `json:"line"`
		Rule    string `json:"rule"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal([]byte(out), &findings); err != nil {
		t.Fatalf("parse: %v\n%s", err, out)
	}

	used := make([]bool, len(findings))
	for _, w := range wants {
		found := false
		for i, f := range findings {
			if used[i] || filepath.Base(f.File)+":"+strconv.Itoa(f.Line) != w.key || !strings.Contains(f.Message, w.text) {
				continue
			}
			if f.Rule != "legacy-markup" {
				t.Errorf("%s: rule %s, want legacy-markup: %s", w.key, f.Rule, f.Message)
			}
			used[i], found = true, true
			break
		}
		if !found {
			t.Errorf("%s: no finding containing %q", w.key, w.text)
		}
	}
	for i, f := range findings {
		if !used[i] {
			t.Errorf("unexpected finding %s", fmt.Sprintf("%s:%d [%s] %s", filepath.Base(f.File), f.Line, f.Rule, f.Message))
		}
	}
}
