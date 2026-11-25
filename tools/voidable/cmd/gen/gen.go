// Package gen implements `voidable gen`.
package gen

import (
	"context"
	"errors"
	"fmt"
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
					if len(files) > 1 {
						fmt.Fprintf(w, "==> %s <==\n", f.Path)
					}
					fmt.Fprint(w, f.Content)
				}
				return nil
			}
			drift := 0
			for _, f := range files {
				p := filepath.Join(out, filepath.FromSlash(f.Path))
				if check {
					cur, err := os.ReadFile(p)
					if err != nil || string(cur) != f.Content {
						fmt.Fprintf(w, "differs: %s\n", p)
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
				fmt.Fprintf(w, "wrote %d file(s) under %s\n", len(files), out)
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
	cmd := &cobra.Command{
		Use:   "snippet <tag>",
		Short: "Emit an example usage of one element (--lang html|jsx|heex|erb)",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
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
	cmd.Flags().StringVar(&lang, "lang", "html", "html, jsx, heex or erb")
	cmd.Flags().StringVar(&format, "format", "text", "text or json")
	return cmd
}
