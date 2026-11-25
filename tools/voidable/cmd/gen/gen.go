// Package gen implements `voidable gen`.
package gen

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"

	"github.com/VoidableUI/Voidable/tools/voidable/internal/domain"
	"github.com/VoidableUI/Voidable/tools/voidable/internal/infra/render"
)

// ErrDrift is returned by --check when generated output differs from disk.
var ErrDrift = errors.New("generated files differ from disk")

// LibraryProvider yields the loaded library.
type LibraryProvider func(ctx context.Context) (*domain.Library, error)

// NewCmd creates the gen subcommand.
func NewCmd(lib LibraryProvider, g domain.Generator) *cobra.Command {
	var out string
	var check bool
	cmd := &cobra.Command{
		Use:   "gen <target>",
		Short: "Generate framework code from the manifest (targets: " + strings.Join(g.Targets(), ", ") + ")",
		Long: "Renders an embedded text/template per target. Output is deterministic. Without --out " +
			"files are printed with ==> path <== headers; with --out they are written under that " +
			"directory; --check compares instead of writing and exits 1 on drift.",
		Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			l, err := lib(cmd.Context())
			if err != nil {
				return err
			}
			files, err := g.Generate(cmd.Context(), args[0], l.Catalog())
			if err != nil {
				return err
			}
			w := cmd.OutOrStdout()
			if out == "" {
				for _, f := range files {
					header := ""
					if len(files) > 1 {
						header = "==> " + f.Path + " <==\n"
					}
					if _, err := io.WriteString(w, header+f.Content); err != nil {
						return err
					}
				}
				return nil
			}
			drift := 0
			for _, f := range files {
				p := filepath.Join(out, filepath.FromSlash(f.Path))
				if check {
					cur, err := os.ReadFile(p)
					if err != nil || string(cur) != f.Content {
						if _, err := fmt.Fprintf(w, "differs: %s\n", p); err != nil {
							return err
						}
						drift++
					}
					continue
				}
				if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
					return err
				}
				if err := os.WriteFile(p, []byte(f.Content), 0o644); err != nil {
					return err
				}
			}
			if drift > 0 {
				return ErrDrift
			}
			if !check {
				if _, err := fmt.Fprintf(w, "wrote %d file(s) under %s\n", len(files), out); err != nil {
					return err
				}
			}
			return nil
		},
	}
	cmd.Flags().StringVar(&out, "out", "", "Write files under this directory")
	cmd.Flags().BoolVar(&check, "check", false, "With --out: compare with disk instead of writing")
	cmd.AddCommand(newSnippetCmd(lib))
	return cmd
}

func newSnippetCmd(lib LibraryProvider) *cobra.Command {
	var lang, format string
	var all bool
	cmd := &cobra.Command{
		Use:   "snippet <tag>",
		Short: "Emit an example usage of one element (--lang html|jsx|heex|erb|blade)",
		Args:  cobra.MaximumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if all {
				l, err := lib(cmd.Context())
				if err != nil {
					return err
				}
				return writeAllSnippets(cmd.Context(), l, cmd.OutOrStdout())
			}
			if len(args) != 1 {
				return errors.New("snippet needs a tag (or --all)")
			}
			f, err := render.ParseFormat(format)
			if err != nil {
				return err
			}
			l, err := lib(cmd.Context())
			if err != nil {
				return err
			}
			lg, err := domain.ParseLang(lang)
			if err != nil {
				return fmt.Errorf("--lang %q: %w", lang, err)
			}
			sn, err := l.Snippet(cmd.Context(), args[0], lg)
			if err != nil {
				return err
			}
			return render.Snippet(cmd.OutOrStdout(), sn, f)
		},
	}
	cmd.Flags().StringVar(&lang, "lang", "html", "html, jsx, heex, erb or blade")
	cmd.Flags().StringVar(&format, "format", "text", "text or json")
	cmd.Flags().BoolVar(&all, "all", false, "Print every element's snippet in every language as one JSON object (tag -> lang -> code, plus markup: the HTML without event wiring); the docs site reads this")
	return cmd
}

// writeAllSnippets prints {tag: {source, <lang>: code, ...}} for every
// registered element in every snippet language. The docs site generates its
// example tabs from this, so the site and `gen snippet` cannot disagree.
func writeAllSnippets(ctx context.Context, l *domain.Library, w io.Writer) error {
	out := map[string]map[string]string{}
	for _, e := range l.Catalog().Registered().Elements {
		m := map[string]string{}
		for _, lg := range domain.SnippetLangs {
			sn, err := l.Snippet(ctx, e.Tag, lg)
			if err != nil {
				return err
			}
			m[string(lg)] = sn.Code
			m["source"] = string(sn.Source)
		}
		bare, err := l.Markup(ctx, e.Tag, domain.LangHTML)
		if err != nil {
			return err
		}
		m["markup"] = bare.Code
		out[e.Tag] = m
	}
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	return enc.Encode(out)
}
