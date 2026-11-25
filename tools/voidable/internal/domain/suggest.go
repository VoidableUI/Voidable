package domain

import "strings"

// Suggest returns the candidate closest to name, or "" when nothing is
// close enough to be a plausible typo. Names that are equal once dashes,
// underscores and case are removed always match (collapsed-width ->
// collapsedwidth).
func Suggest(name string, candidates []string) string {
	norm := func(s string) string {
		return strings.ToLower(strings.NewReplacer("-", "", "_", "").Replace(s))
	}
	n := norm(name)
	for _, c := range candidates {
		if norm(c) == n {
			return c
		}
	}
	best, bestD := "", 1<<30
	for _, c := range candidates {
		d := levenshtein(strings.ToLower(name), strings.ToLower(c))
		if d < bestD || (d == bestD && c < best) {
			best, bestD = c, d
		}
	}
	limit := 2
	if len(name) > 8 {
		limit = 3
	}
	if bestD <= limit && bestD < len(name) {
		return best
	}
	// Prefix/suffix containment: "void-dropdown" -> "void-dropdown-menu".
	for _, c := range candidates {
		if len(name) >= 4 && (strings.HasPrefix(c, name) || strings.HasPrefix(name, c)) {
			return c
		}
	}
	return ""
}

func levenshtein(a, b string) int {
	prev := make([]int, len(b)+1)
	cur := make([]int, len(b)+1)
	for j := range prev {
		prev[j] = j
	}
	for i := 1; i <= len(a); i++ {
		cur[0] = i
		for j := 1; j <= len(b); j++ {
			cost := 1
			if a[i-1] == b[j-1] {
				cost = 0
			}
			cur[j] = min(prev[j]+1, cur[j-1]+1, prev[j-1]+cost)
		}
		prev, cur = cur, prev
	}
	return prev[len(b)]
}
