// Package ref implements `voidable ref`.
package ref

import (
	"bytes"
	"context"
	"fmt"

	"github.com/spf13/cobra"

	"github.com/VoidableUI/Voidable/tools/voidable/internal/domain"
	"github.com/VoidableUI/Voidable/tools/voidable/internal/infra/render"
)

// LibraryProvider yields the loaded library.
type LibraryProvider func(ctx context.Context) (*domain.Library, error)

// NewCmd creates the ref subcommand.
func NewCmd(lib LibraryProvider) *cobra.Command {
	var format string
	var all, size bool
	cmd := &cobra.Command{
		Use:   "ref [tag...]",
		Short: "Print a compact reference (index without arguments)",
		Long: "Without arguments prints one line per element. With tags prints attributes " +
			"(types, allowed values, defaults), events and an example. --all prints every element; " +
			"--size reports the byte size of the full reference.",
		RunE: func(cmd *cobra.Command, args []string) error {
			f, err := render.ParseFormat(format)
			if err != nil {
				return err
			}
			l, err := lib(cmd.Context())
			if err != nil {
				return err
			}
			out := cmd.OutOrStdout()
			if size {
				return printSizes(cmd.Context(), l, out)
			}
			if all {
				refs, err := l.References(cmd.Context())
				if err != nil {
					return err
				}
				return render.References(out, refs, f)
			}
			if len(args) == 0 {
				return render.Index(out, l.Version(), l.Catalog(), f)
			}
			var refs []*domain.Reference
			for _, tag := range args {
				r, err := l.Reference(cmd.Context(), tag)
				if err != nil {
					return err
				}
				refs = append(refs, r)
			}
			return render.References(out, refs, f)
		},
	}
	cmd.Flags().StringVar(&format, "format", "text", "Output format: text, json or markdown")
	cmd.Flags().BoolVar(&all, "all", false, "Print the full reference for every element")
	cmd.Flags().BoolVar(&size, "size", false, "Report the byte size of the index and full reference per format")
	return cmd
}

func printSizes(ctx context.Context, l *domain.Library, w interface{ Write([]byte) (int, error) }) error {
	refs, err := l.References(ctx)
	if err != nil {
		return err
	}
	for _, f := range []render.Format{render.FormatText, render.FormatMarkdown, render.FormatJSON} {
		var idx, full bytes.Buffer
		if err := render.Index(&idx, l.Version(), l.Catalog(), f); err != nil {
			return err
		}
		if err := render.References(&full, refs, f); err != nil {
			return err
		}
		// ~4 bytes per token is the usual rough estimate for English and code.
		fmt.Fprintf(w, "%-8s index %6d bytes (~%5d tokens)  full %7d bytes (~%6d tokens)  %d elements\n",
			f, idx.Len(), idx.Len()/4, full.Len(), full.Len()/4, len(refs))
	}
	return nil
}
