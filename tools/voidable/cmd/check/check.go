// Package check implements `voidable check`.
package check

import (
	"context"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"

	"github.com/VoidableUI/Voidable/tools/voidable/internal/domain"
	"github.com/VoidableUI/Voidable/tools/voidable/internal/infra/render"
)

// ErrProblems is returned when the check found problems; the root command
// turns it into exit status 1 without printing it.
var ErrProblems = errors.New("problems found")

// CheckerProvider yields the checker.
type CheckerProvider func(ctx context.Context) (*domain.Checker, error)

var skipDirs = map[string]bool{
	"node_modules": true, ".git": true, "dist": true, "deps": true, "_build": true, "vendor": true,
	"tmp": true, "storybook-static": true, ".astro": true, "build": true,
}

var exts = map[string]bool{
	".html": true, ".htm": true, ".erb": true, ".heex": true, ".ex": true, ".exs": true, ".php": true,
	".jsx": true, ".tsx": true, ".astro": true, ".vue": true, ".svelte": true, ".ts": true, ".js": true,
	".md": true, ".mdx": true, ".tt": true,
}

// NewCmd creates the check subcommand.
func NewCmd(checker CheckerProvider) *cobra.Command {
	var format, lang string
	var stats bool
	cmd := &cobra.Command{
		Use:   "check <file|dir|->...",
		Short: "Validate void-* markup against the manifest",
		Long: "Scans files (or directories, recursively) for <void-*> tags and reports unknown " +
			"elements and attributes, values outside the allowed set, boolean attributes set to " +
			"\"false\" and misplaced children. One problem per line as file:line:col. Exit 1 if any.",
		Args: cobra.MinimumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			f, err := render.ParseFormat(format)
			if err != nil {
				return err
			}
			var forced domain.Lang
			if lang != "" {
				if forced, err = domain.ParseLang(lang); err != nil {
					return fmt.Errorf("--lang %q: %w", lang, err)
				}
			}
			c, err := checker(cmd.Context())
			if err != nil {
				return err
			}
			var all []domain.Finding
			for _, arg := range args {
				fs, err := checkArg(cmd.Context(), c, arg, forced, cmd.InOrStdin())
				if err != nil {
					return err
				}
				all = append(all, fs...)
			}
			if err := render.Findings(cmd.OutOrStdout(), all, f); err != nil {
				return err
			}
			if stats {
				counts := map[domain.Rule]int{}
				for _, x := range all {
					counts[x.Rule]++
				}
				fmt.Fprintf(cmd.ErrOrStderr(), "scanned %d void-* tags, %d problems %v\n", c.Tags, len(all), counts)
			}
			if len(all) > 0 {
				return ErrProblems
			}
			return nil
		},
	}
	cmd.Flags().StringVar(&format, "format", "text", "Output format: text or json")
	cmd.Flags().BoolVar(&stats, "stats", false, "Print tag and problem counts to stderr")
	cmd.Flags().StringVar(&lang, "lang", "", "Force a dialect (html, erb, heex, blade, jsx, astro, vue, svelte, lit, markdown)")
	return cmd
}

func checkArg(ctx context.Context, c *domain.Checker, arg string, forced domain.Lang, stdin io.Reader) ([]domain.Finding, error) {
	pick := func(p string) domain.Lang {
		if forced != "" {
			return forced
		}
		return domain.LangForPath(p)
	}
	if arg == "-" {
		src, err := io.ReadAll(stdin)
		if err != nil {
			return nil, fmt.Errorf("read stdin: %w", err)
		}
		return c.Check(ctx, "<stdin>", src, pick("stdin.html"))
	}
	info, err := os.Stat(arg)
	if err != nil {
		return nil, err
	}
	if !info.IsDir() {
		src, err := os.ReadFile(arg)
		if err != nil {
			return nil, err
		}
		return c.Check(ctx, arg, src, pick(arg))
	}
	var out []domain.Finding
	err = filepath.WalkDir(arg, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			if p != arg && (skipDirs[d.Name()] || strings.HasPrefix(d.Name(), ".")) {
				return filepath.SkipDir
			}
			return nil
		}
		if !exts[strings.ToLower(filepath.Ext(p))] || strings.HasSuffix(p, ".d.ts") {
			return nil
		}
		src, err := os.ReadFile(p)
		if err != nil {
			return err
		}
		fs, err := c.Check(ctx, p, src, pick(p))
		if err != nil {
			return err
		}
		out = append(out, fs...)
		return nil
	})
	return out, err
}
