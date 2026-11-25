// Package scan implements a tolerant scanner for `<void-*>` start tags in
// HTML and the template languages agents produce (ERB, HEEx, Blade,
// JSX/TSX, Astro, Vue, Svelte, Lit tagged templates, Markdown fences). It
// does not parse any language fully: it finds tags, splits attributes,
// skips template expressions it cannot evaluate and strips framework
// binding prefixes.
package scan

import (
	"bytes"
	"context"
	"regexp"
	"sort"
	"strings"

	"github.com/VoidableUI/Voidable/tools/voidable/internal/domain"
)

// Scanner implements domain.MarkupScanner.
type Scanner struct{}

var tagNameRe = regexp.MustCompile(`^void-[a-z][a-z0-9]*(?:-[a-z0-9]+)*$`)

// region is a byte range with its own dialect (a Markdown code fence).
type region struct {
	start, end int
	lang       domain.Lang
}

// Scan returns every void-* start tag in src.
func (Scanner) Scan(_ context.Context, src []byte, lang domain.Lang) ([]domain.Tag, error) {
	s := &state{src: src, lines: lineStarts(src)}
	regions := []region{{0, len(src), lang}}
	if lang == domain.LangMarkdown {
		regions = fences(src)
	}
	var tags []domain.Tag
	for _, r := range regions {
		tags = append(tags, s.scanRegion(r)...)
	}
	return tags, nil
}

type state struct {
	src   []byte
	lines []int
}

func lineStarts(src []byte) []int {
	out := []int{0}
	for i, c := range src {
		if c == '\n' {
			out = append(out, i+1)
		}
	}
	return out
}

func (s *state) pos(off int) (int, int) {
	i := sort.Search(len(s.lines), func(i int) bool { return s.lines[i] > off }) - 1
	return i + 1, off - s.lines[i] + 1
}

var fenceRe = regexp.MustCompile("^\\s*(```+|~~~+)\\s*([A-Za-z0-9_+-]*)")

// fences splits Markdown into prose and fenced blocks, each with a dialect
// taken from the fence's info string.
func fences(src []byte) []region {
	var out []region
	cur := region{0, 0, domain.LangMarkdown}
	var fence string
	off := 0
	for _, line := range bytes.SplitAfter(src, []byte("\n")) {
		m := fenceRe.FindSubmatch(line)
		switch {
		case m != nil && fence == "":
			cur.end = off + len(line)
			out = append(out, cur)
			l, err := domain.ParseLang(string(m[2]))
			if err != nil || string(m[2]) == "" {
				l = domain.LangHTML
			}
			fence = string(m[1])
			cur = region{off + len(line), 0, l}
		case m != nil && strings.HasPrefix(string(m[1]), fence[:1]) && len(m[2]) == 0:
			cur.end = off
			out = append(out, cur)
			fence = ""
			cur = region{off, 0, domain.LangMarkdown}
		}
		off += len(line)
	}
	cur.end = len(src)
	return append(out, cur)
}

// frame is one open element the scanner is inside: a void-* element, a
// native <label>, or a framework component (whose output is not known).
type frame struct {
	name  string
	kind  frameKind
	tag   int // index into the region's tags, for kindVoid
	start int // offset just after the start tag
	attrs []domain.AttrToken
}

type frameKind int

const (
	kindVoid frameKind = iota
	kindLabel
	kindComponent
)

// closeFrame pops the innermost frame of the kind and name that the end tag
// closes, and everything above it (elements the source left unclosed). It
// returns the frame, or false when none matches.
func closeFrame(stack []frame, kind frameKind, name string) ([]frame, frame, bool) {
	for k := len(stack) - 1; k >= 0; k-- {
		if stack[k].kind == kind && stack[k].name == name {
			return stack[:k], stack[k], true
		}
	}
	return stack, frame{}, false
}

// componentNameIn reads the name of a framework component's tag at src[i]
// (just after `<`): `Field`, `.field`, `Foo.Bar`, `x-field`, `:slot`,
// `svelte:component`. Plain lowercase HTML names are not components.
// Plain HTML and Lit templates have no components, so their tags are never one.
func componentNameIn(src []byte, i int, lang domain.Lang) string {
	if lang == domain.LangHTML || lang == domain.LangLit {
		return ""
	}
	j := i
	for j < len(src) && (isLower(src[j]) || isDigit(src[j]) || src[j] == '-' || src[j] == '_' || src[j] == '.' || src[j] == ':' || (src[j] >= 'A' && src[j] <= 'Z')) {
		j++
	}
	name := string(src[i:j])
	switch {
	case name == "":
		return ""
	case name[0] >= 'A' && name[0] <= 'Z', name[0] == '.', name[0] == ':', strings.HasPrefix(name, "x-"), strings.Contains(name, ":"):
		return name
	}
	return ""
}

func (s *state) scanRegion(r region) []domain.Tag {
	src := s.src[:r.end]
	var tags []domain.Tag
	var stack []frame
	labelFor := map[string]bool{}
	for i := r.start; i < r.end; i++ {
		if end := skipComment(src, i); end > i {
			i = end - 1
			continue
		}
		if src[i] != '<' {
			continue
		}
		if bytes.HasPrefix(src[i+1:], []byte("/void-")) {
			name := readName(src, i+2)
			var f frame
			var ok bool
			if stack, f, ok = closeFrame(stack, kindVoid, name); ok {
				tags[f.tag].Content = s.analyzeContent(src, f.start, i, r.lang)
			}
			continue
		}
		if bytes.HasPrefix(src[i+1:], []byte("/label")) && i+7 < len(src) && (src[i+7] == '>' || isSpace(src[i+7])) {
			stack, _, _ = closeFrame(stack, kindLabel, "label")
			continue
		}
		if i+1 < len(src) && src[i+1] == '/' {
			if name := componentNameIn(src, i+2, r.lang); name != "" {
				stack, _, _ = closeFrame(stack, kindComponent, name)
			}
			continue
		}
		if bytes.HasPrefix(src[i+1:], []byte("label")) && i+6 < len(src) && (isSpace(src[i+6]) || src[i+6] == '>') {
			t, next := s.parseTag(src, i, "label", r.lang)
			for _, a := range t.Attrs {
				if (a.Name == "for" || a.Name == "htmlFor") && a.HasValue && !a.Dynamic {
					labelFor[a.Value] = true
				}
			}
			if !t.SelfClosing {
				stack = append(stack, frame{name: "label", kind: kindLabel})
			}
			i = next - 1
			continue
		}
		if name := componentNameIn(src, i+1, r.lang); name != "" {
			t, next := s.parseTag(src, i, name, r.lang)
			if !t.SelfClosing {
				stack = append(stack, frame{name: name, kind: kindComponent})
			}
			i = next - 1
			continue
		}
		if !bytes.HasPrefix(src[i+1:], []byte("void-")) {
			continue
		}
		name := readName(src, i+1)
		end := i + 1 + len(name)
		if !tagNameRe.MatchString(name) || end >= len(src) || !isTagBoundary(src[end]) {
			continue
		}
		t, next := s.parseTag(src, i, name, r.lang)
		// `<void-x>` in backticks is a mention in prose or a doc string,
		// not markup: check the name but do not track nesting.
		if i > 0 && src[i-1] == '`' && next < len(src) && src[next] == '`' && len(t.Attrs) == 0 ||
			r.lang == domain.LangMarkdown && inInlineCode(src, i) {
			t.Mention = true
			tags = append(tags, t)
			i = next - 1
			continue
		}
		for k := len(stack) - 1; k >= 0; k-- {
			if stack[k].kind == kindVoid {
				t.Parent = stack[k].name
				break
			}
		}
		for _, f := range stack {
			switch f.kind {
			case kindVoid:
				t.Ancestors = append(t.Ancestors, domain.Ancestor{Name: f.name, Attrs: f.attrs})
			case kindLabel:
				t.Ancestors = append(t.Ancestors, domain.Ancestor{Name: "label"})
				t.Labelled = true
			case kindComponent:
				t.InComponent = true
			}
		}
		if t.SelfClosing {
			t.Content = domain.Content{Known: true}
		} else {
			stack = append(stack, frame{name: name, kind: kindVoid, tag: len(tags), start: next, attrs: t.Attrs})
		}
		tags = append(tags, t)
		i = next - 1
	}
	// A <label for> names the control with that id wherever it sits in the source.
	for i := range tags {
		for _, a := range tags[i].Attrs {
			if a.Name == "id" && a.HasValue && !a.Dynamic && labelFor[a.Value] {
				tags[i].Labelled = true
			}
		}
	}
	return tags
}

// analyzeContent summarises src[from:to], the children of a tag, without
// parsing them: whether there is static text or something that carries a
// name, and whether anything it cannot evaluate may render content.
func (s *state) analyzeContent(src []byte, from, to int, lang domain.Lang) domain.Content {
	c := domain.Content{Known: true}
	b := src[:to]
	for i := from; i < to; i++ {
		if end := skipComment(b, i); end > i {
			i = end - 1
			continue
		}
		switch ch := b[i]; {
		case ch == '<' && i+1 < to && (b[i+1] == '%' || b[i+1] == '?'):
			c.Dynamic = true
			i = skipERB(b, i) - 1
		case ch == '<' && i+1 < to && (b[i+1] == '/' || b[i+1] == '!'):
			for i < to && b[i] != '>' {
				i++
			}
		case ch == '<' && i+1 < to && (isLower(b[i+1]) || (b[i+1] >= 'A' && b[i+1] <= 'Z') || b[i+1] == '.' || b[i+1] == ':'):
			name := readTagName(b, i+1)
			if componentNameIn(b, i+1, lang) != "" || name == "slot" {
				c.Dynamic = true
			}
			t, next := s.parseTag(b, i, name, lang)
			for _, a := range t.Attrs {
				switch {
				case a.Syntax == domain.SyntaxSpread:
					c.Dynamic = true
				case isNameAttr(a.Name) && (a.Dynamic || (a.HasValue && strings.TrimSpace(a.Value) != "")):
					c.Text = true
				}
			}
			i = next - 1
		case ch == '{':
			c.Dynamic = true
			i = skipBalanced(b, i, '{', '}') - 1
		case ch == '$' && i+1 < to && b[i+1] == '{', ch == '#' && i+1 < to && b[i+1] == '{':
			c.Dynamic = true
			i = skipBalanced(b, i+1, '{', '}') - 1
		case ch == '@' && isBladeDirective(b, i):
			c.Dynamic = true
			i = skipBladeDirective(b, i) - 1
		case !isSpace(ch):
			c.Text = true
		}
	}
	return c
}

// readTagName reads an element name (lowercase, digits and hyphens, as in svg
// and custom elements) at src[i].
func readTagName(src []byte, i int) string {
	j := i
	for j < len(src) && (isLower(src[j]) || isDigit(src[j]) || src[j] == '-' || src[j] == ':' || src[j] == '.' || (src[j] >= 'A' && src[j] <= 'Z')) {
		j++
	}
	return string(src[i:j])
}

// isNameAttr reports whether a child element's attribute gives it an
// accessible name.
func isNameAttr(name string) bool {
	switch strings.ToLower(strings.ReplaceAll(name, "-", "")) {
	case "arialabel", "arialabelledby", "alt", "title":
		return true
	}
	return false
}

// inInlineCode reports whether offset i sits inside a backtick span on its
// own line (an odd number of backticks precede it on the line).
func inInlineCode(src []byte, i int) bool {
	start := bytes.LastIndexByte(src[:i], '\n') + 1
	return bytes.Count(src[start:i], []byte("`"))%2 == 1
}

var comments = [][2]string{
	{"<!--", "-->"},   // HTML
	{"{{--", "--}}"},  // Blade
	{"<%!--", "--%>"}, // HEEx
	{"<%#", "%>"},     // ERB
}

// skipComment returns the offset after a template comment starting at i,
// or i when there is none. Tags inside comments are not checked.
func skipComment(src []byte, i int) int {
	for _, c := range comments {
		if bytes.HasPrefix(src[i:], []byte(c[0])) {
			if e := bytes.Index(src[i+len(c[0]):], []byte(c[1])); e >= 0 {
				return i + len(c[0]) + e + len(c[1])
			}
			return len(src)
		}
	}
	return i
}

func readName(src []byte, i int) string {
	j := i
	for j < len(src) && (isLower(src[j]) || isDigit(src[j]) || src[j] == '-') {
		j++
	}
	return string(src[i:j])
}

func isLower(c byte) bool { return c >= 'a' && c <= 'z' }
func isDigit(c byte) bool { return c >= '0' && c <= '9' }
func isSpace(c byte) bool { return c == ' ' || c == '\t' || c == '\n' || c == '\r' || c == '\f' }
func isTagBoundary(c byte) bool {
	return isSpace(c) || c == '>' || c == '/' || c == '{' || c == '<'
}

// parseTag reads attributes from the tag starting at `<` (offset lt) and
// returns the tag and the offset after it.
func (s *state) parseTag(src []byte, lt int, name string, lang domain.Lang) (domain.Tag, int) {
	line, col := s.pos(lt)
	t := domain.Tag{Name: name, Lang: lang, Line: line, Col: col}
	j := lt + 1 + len(name)
	n := len(src)
	for j < n {
		for j < n && isSpace(src[j]) {
			j++
		}
		if j >= n {
			break
		}
		c := src[j]
		switch {
		case c == '>':
			return t, j + 1
		case c == '/' && j+1 < n && src[j+1] == '>':
			t.SelfClosing = true
			return t, j + 2
		case c == '/':
			j++
			continue
		case c == '{':
			end := skipBalanced(src, j, '{', '}')
			t.Attrs = append(t.Attrs, s.token(j, string(src[j:end]), "", domain.SyntaxSpread))
			j = end
			continue
		case c == '<' && j+1 < n && (src[j+1] == '%' || src[j+1] == '?'):
			end := skipERB(src, j)
			t.Attrs = append(t.Attrs, s.token(j, string(src[j:end]), "", domain.SyntaxSpread))
			j = end
			continue
		case c == '<':
			return t, j // unterminated tag; next tag starts here
		case c == '$' && j+1 < n && src[j+1] == '{':
			end := skipBalanced(src, j+1, '{', '}')
			t.Attrs = append(t.Attrs, s.token(j, string(src[j:end]), "", domain.SyntaxSpread))
			j = end
			continue
		case c == '@' && isBladeDirective(src, j):
			end := skipBladeDirective(src, j)
			t.Attrs = append(t.Attrs, s.token(j, string(src[j:end]), "", domain.SyntaxDirective))
			j = end
			continue
		case c == '"' || c == '\'' || c == '=':
			j++ // stray character, skip
			continue
		}
		// Attribute name.
		start := j
		for j < n && !isSpace(src[j]) && src[j] != '=' && src[j] != '>' && src[j] != '"' && src[j] != '\'' &&
			(src[j] != '/' || j+1 >= n || src[j+1] != '>') && (src[j] != '{' || j == start) {
			j++
		}
		raw := string(src[start:j])
		k := j
		for k < n && isSpace(src[k]) {
			k++
		}
		tok := s.token(start, raw, "", domain.SyntaxAttr)
		if k < n && src[k] == '=' {
			k++
			for k < n && isSpace(src[k]) {
				k++
			}
			val, dyn, end := readValue(src, k)
			tok.Value, tok.Dynamic, tok.HasValue = val, dyn, true
			j = end
		}
		classify(&tok, lang)
		t.Attrs = append(t.Attrs, tok)
	}
	return t, n
}

func (s *state) token(off int, raw, name string, syn domain.Syntax) domain.AttrToken {
	line, col := s.pos(off)
	if name == "" {
		name = raw
	}
	return domain.AttrToken{Raw: raw, Name: name, Syntax: syn, Line: line, Col: col}
}

// readValue reads an attribute value at k. It returns the value, whether
// it is a template expression, and the offset after it.
func readValue(src []byte, k int) (string, bool, int) {
	n := len(src)
	if k >= n {
		return "", false, k
	}
	switch c := src[k]; {
	case c == '"' || c == '\'':
		var b strings.Builder
		dyn := false
		j := k + 1
		for j < n && src[j] != c {
			switch {
			case src[j] == '<' && j+1 < n && (src[j+1] == '%' || src[j+1] == '?'):
				end := skipERB(src, j)
				b.Write(src[j:end])
				j, dyn = end, true
			case (src[j] == '$' || src[j] == '#' || src[j] == '@') && j+1 < n && src[j+1] == '{':
				end := skipBalanced(src, j+1, '{', '}')
				b.Write(src[j:end])
				j, dyn = end, true
			case src[j] == '{' && j+1 < n && (src[j+1] == '{' || src[j+1] == '!'):
				end := skipBalanced(src, j, '{', '}')
				b.Write(src[j:end])
				j, dyn = end, true
			default:
				b.WriteByte(src[j])
				j++
			}
		}
		if j < n {
			j++
		}
		return b.String(), dyn, j
	case c == '{':
		end := skipBalanced(src, k, '{', '}')
		inner := strings.TrimSpace(string(src[k+1 : max(k+1, end-1)]))
		if lit, ok := stringLiteral(inner); ok {
			return lit, false, end
		}
		return inner, true, end
	case c == '$' && k+1 < n && src[k+1] == '{':
		end := skipBalanced(src, k+1, '{', '}')
		return string(src[k:end]), true, end
	case c == '<' && k+1 < n && src[k+1] == '%':
		end := skipERB(src, k)
		return string(src[k:end]), true, end
	}
	j := k
	for j < n && !isSpace(src[j]) && src[j] != '>' && (src[j] != '/' || j+1 >= n || src[j+1] != '>') {
		j++
	}
	return string(src[k:j]), false, j
}

// stringLiteral unwraps {"x"}, {'x'} and {`x`} (without interpolation).
func stringLiteral(s string) (string, bool) {
	if len(s) < 2 {
		return "", false
	}
	q := s[0]
	if (q != '"' && q != '\'' && q != '`') || s[len(s)-1] != q {
		return "", false
	}
	body := s[1 : len(s)-1]
	if strings.ContainsRune(body, rune(q)) || strings.Contains(body, "${") || strings.Contains(body, "#{") {
		return "", false
	}
	return body, true
}

// skipBalanced returns the offset after the bracket that closes the one at
// i, skipping quoted strings and template literals.
func skipBalanced(src []byte, i int, open, close byte) int {
	depth := 0
	n := len(src)
	for j := i; j < n; j++ {
		switch c := src[j]; c {
		case '"', '\'', '`':
			j = skipString(src, j)
		case open:
			depth++
		case close:
			depth--
			if depth == 0 {
				return j + 1
			}
		}
	}
	return n
}

func skipString(src []byte, i int) int {
	q := src[i]
	for j := i + 1; j < len(src); j++ {
		switch src[j] {
		case '\\':
			j++
		case q:
			return j
		case '$':
			if q == '`' && j+1 < len(src) && src[j+1] == '{' {
				j = skipBalanced(src, j+1, '{', '}') - 1
			}
		case '\n':
			if q != '`' {
				return j // unterminated; do not run away
			}
		}
	}
	return len(src) - 1
}

// skipERB skips <% ... %> (or <? ... ?>), allowing nesting, which occurs
// in Rails generator templates: <%%= "checked" if <%= name %>.x %>.
func skipERB(src []byte, i int) int {
	open, closer := []byte("<%"), []byte("%>")
	if src[i+1] == '?' {
		open, closer = []byte("<?"), []byte("?>")
	}
	depth := 0
	for j := i; j+1 < len(src); j++ {
		switch {
		case bytes.HasPrefix(src[j:], open):
			depth++
			j++
		case bytes.HasPrefix(src[j:], closer):
			depth--
			j++
			if depth == 0 {
				return j + 1
			}
		}
	}
	return len(src)
}

var bladeKeywords = map[string]bool{
	"if": true, "elseif": true, "else": true, "endif": true, "unless": true, "endunless": true,
	"isset": true, "endisset": true, "foreach": true, "endforeach": true, "class": true,
	"style": true, "checked": true, "selected": true, "disabled": true, "readonly": true,
	"required": true, "csrf": true, "method": true, "error": true, "enderror": true, "auth": true, "endauth": true,
}

// bladeNoArgs are the directives that never take parenthesised arguments, so a
// `(` after one of them (and a space) belongs to the next attribute.
var bladeNoArgs = map[string]bool{
	"else": true, "endif": true, "endunless": true, "endisset": true, "endforeach": true,
	"enderror": true, "endauth": true, "csrf": true,
}

// bladeWord returns the directive name at src[i] (which is '@') and the offset
// after it.
func bladeWord(src []byte, i int) (string, int) {
	j := i + 1
	for j < len(src) && (isLower(src[j]) || (src[j] >= 'A' && src[j] <= 'Z')) {
		j++
	}
	return string(src[i+1 : j]), j
}

// bladeArgs returns the offset of the `(` that opens a directive's arguments,
// or -1. Blade allows spaces and tabs between the name and the parenthesis:
// `@if ($a)` and `@if($a)` are the same directive.
func bladeArgs(src []byte, word string, j int) int {
	if bladeNoArgs[word] {
		return -1
	}
	for j < len(src) && (src[j] == ' ' || src[j] == '\t') {
		j++
	}
	if j < len(src) && src[j] == '(' {
		return j
	}
	return -1
}

// isBladeDirective distinguishes `@if(...)`/`@endif` from Lit/Vue/Alpine
// `@event=` shorthand.
func isBladeDirective(src []byte, i int) bool {
	word, j := bladeWord(src, i)
	if word == "" || (j < len(src) && (src[j] == '=' || src[j] == '-' || src[j] == '.' || src[j] == ':')) {
		return false
	}
	return bladeKeywords[word] || bladeArgs(src, word, j) >= 0
}

// skipBladeDirective returns the offset after the directive at i, including
// its balanced, string-aware argument list.
func skipBladeDirective(src []byte, i int) int {
	word, j := bladeWord(src, i)
	if open := bladeArgs(src, word, j); open >= 0 {
		return skipBalanced(src, open, '(', ')')
	}
	return j
}

var directivePrefixes = []string{
	"v-", "x-", "phx-", "wire:", "hx-", "bind:", "use:", "class:", "style:", "let:", "in:", "out:",
	"transition:", "animate:", "client:", "server:", "set:", "is:", "define:", "*", "#", "[(", "[class.", "[style.",
	"up-", "data-turbo", "turbo-",
}

// angularFormDirectives are the Angular forms directives that bind a form
// control to an element (`ngModel`, `formControl`, `formControlName`). They
// configure Angular's ControlValueAccessor (see @voidable/ui/angular), not the
// element, so they are not attributes of it.
var angularFormDirectives = map[string]bool{
	"ngModel": true, "ngDefaultControl": true, "[ngModel]": true, "[ngModelOptions]": true,
	"formControl": true, "[formControl]": true, "formControlName": true, "[formControlName]": true,
}

// classify strips framework prefixes and sets the token's syntax.
func classify(t *domain.AttrToken, lang domain.Lang) {
	raw := t.Raw
	set := func(name string, syn domain.Syntax) { t.Name, t.Syntax = name, syn }
	switch {
	case strings.HasPrefix(raw, "x-void-on.") || strings.HasPrefix(raw, "x-void-on:"):
		set(raw[len("x-void-on."):], domain.SyntaxEvent)
	case strings.HasPrefix(raw, "v-bind:"), strings.HasPrefix(raw, "x-bind:"):
		set(raw[strings.Index(raw, ":")+1:], domain.SyntaxBound)
	case strings.HasPrefix(raw, "v-on:"), strings.HasPrefix(raw, "x-on:"):
		set(trimModifiers(raw[strings.Index(raw, ":")+1:]), domain.SyntaxEvent)
	case strings.HasPrefix(raw, "on:"):
		set(trimModifiers(raw[3:]), domain.SyntaxEvent)
	case strings.HasPrefix(raw, "prop:"):
		set(raw[5:], domain.SyntaxProperty)
	case strings.HasPrefix(raw, "bool:"):
		set(raw[5:], domain.SyntaxBoolBind)
	case strings.HasPrefix(raw, "attr:"):
		t.Name = raw[5:]
	case strings.HasPrefix(raw, "[attr.") && strings.HasSuffix(raw, "]"):
		set(raw[6:len(raw)-1], domain.SyntaxBound)
	case hasAnyPrefix(raw, directivePrefixes), angularFormDirectives[raw]:
		set(raw, domain.SyntaxDirective)
	case strings.HasPrefix(raw, "[") && strings.HasSuffix(raw, "]"):
		set(raw[1:len(raw)-1], domain.SyntaxProperty)
	case strings.HasPrefix(raw, "(") && strings.HasSuffix(raw, ")"):
		set(raw[1:len(raw)-1], domain.SyntaxEvent)
	case strings.HasPrefix(raw, "."):
		set(raw[1:], domain.SyntaxProperty)
	case strings.HasPrefix(raw, "?"):
		set(raw[1:], domain.SyntaxBoolBind)
	case strings.HasPrefix(raw, "@"):
		set(trimModifiers(raw[1:]), domain.SyntaxEvent)
	case strings.HasPrefix(raw, ":"):
		if lang == domain.LangHEEx {
			set(raw, domain.SyntaxDirective) // :if, :for, :let, :key
		} else {
			set(raw[1:], domain.SyntaxBound) // Vue, Alpine, Blade component props
		}
	case len(raw) > 2 && strings.HasPrefix(raw, "on") && (isLower(raw[2]) || (raw[2] >= 'A' && raw[2] <= 'Z')):
		ev := raw[2:]
		if !strings.HasPrefix(ev, "void-") {
			ev = strings.ToLower(ev)
		}
		set(strings.TrimSuffix(ev, "$"), domain.SyntaxEvent) // Qwik: onVoid-change$
	}
	if t.Syntax == domain.SyntaxBound {
		t.Dynamic = true
	}
}

func trimModifiers(s string) string {
	if i := strings.IndexByte(s, '.'); i > 0 {
		return s[:i]
	}
	return s
}

func hasAnyPrefix(s string, ps []string) bool {
	for _, p := range ps {
		if strings.HasPrefix(s, p) {
			return true
		}
	}
	return false
}
