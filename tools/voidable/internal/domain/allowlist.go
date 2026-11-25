package domain

import (
	"bufio"
	"fmt"
	"io"
	"strconv"
	"strings"
)

// AllowEntry tolerates up to Max findings of one kind. A kind is a rule on
// a tag and attribute, optionally narrowed to one value. Entries match by
// kind and count rather than by file and line, so editing a file does not
// invalidate them, while a new offender beyond Max still fails.
type AllowEntry struct {
	Rule  Rule
	Tag   string
	Attr  string
	Value string // empty matches any value
	Max   int
	Line  int // line in the allowlist file, for messages
}

func (e AllowEntry) matches(f Finding) bool {
	return f.Rule == e.Rule && f.Tag == e.Tag && f.Attr == e.Attr && (e.Value == "" || f.Value == e.Value)
}

// Allowlist is a parsed allowlist file.
type Allowlist struct {
	Entries []AllowEntry
}

// ParseAllowlist reads lines of the form
//
//	<rule> <tag> <attr>[=<value>] <max>   # comment
//
// Blank lines and lines starting with # are ignored.
func ParseAllowlist(r io.Reader) (*Allowlist, error) {
	var al Allowlist
	sc := bufio.NewScanner(r)
	for n := 1; sc.Scan(); n++ {
		line := sc.Text()
		if i := strings.Index(line, "#"); i >= 0 {
			line = line[:i]
		}
		fields := strings.Fields(line)
		if len(fields) == 0 {
			continue
		}
		if len(fields) != 4 {
			return nil, fmt.Errorf("allowlist line %d: want \"<rule> <tag> <attr>[=<value>] <max>\", got %q", n, strings.TrimSpace(line))
		}
		max, err := strconv.Atoi(fields[3])
		if err != nil || max < 1 {
			return nil, fmt.Errorf("allowlist line %d: max %q must be a positive integer", n, fields[3])
		}
		attr, value, _ := strings.Cut(fields[2], "=")
		al.Entries = append(al.Entries, AllowEntry{Rule: Rule(fields[0]), Tag: fields[1], Attr: attr, Value: value, Max: max, Line: n})
	}
	return &al, sc.Err()
}

// AllowResult is the outcome of applying an allowlist.
type AllowResult struct {
	// Remaining are the findings that are not allowed (including those
	// beyond an entry's Max).
	Remaining []Finding
	// Allowed counts the findings each entry absorbed (same order as Entries).
	Allowed []int
	// Stale lists entries that matched nothing: the decision they record has
	// been resolved and the entry should be deleted.
	Stale []AllowEntry
}

// Apply removes the allowed findings.
func (a *Allowlist) Apply(findings []Finding) AllowResult {
	res := AllowResult{Allowed: make([]int, len(a.Entries))}
next:
	for _, f := range findings {
		for i, e := range a.Entries {
			if e.matches(f) && res.Allowed[i] < e.Max {
				res.Allowed[i]++
				continue next
			}
		}
		res.Remaining = append(res.Remaining, f)
	}
	for i, e := range a.Entries {
		if res.Allowed[i] == 0 {
			res.Stale = append(res.Stale, e)
		}
	}
	return res
}
