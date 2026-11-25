// Package install implements `voidable install`.
package install

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"

	"github.com/VoidableUI/Voidable/tools/voidable/internal/domain"
)

// NewCmd creates the install subcommand.
func NewCmd(assets domain.AssetSource) *cobra.Command {
	var dir string
	var force bool
	cmd := &cobra.Command{
		Use:   "install --dir <path>",
		Short: "Write the embedded @voidable/ui bundle, lit and theme CSS into a project",
		Long: "Vendors the library from the binary alone (no Node toolchain): ES modules for " +
			"@voidable/ui and lit, the theme CSS, and importmap.json mapping the bare imports. " +
			"Only available in binaries built with -tags assets.",
		RunE: func(cmd *cobra.Command, _ []string) error {
			if dir == "" {
				return errors.New("--dir is required")
			}
			src, err := assets.Assets(cmd.Context())
			if err != nil {
				return err
			}
			n, err := write(cmd.Context(), src, dir, force)
			if err != nil {
				return err
			}
			if _, err := fmt.Fprintf(cmd.OutOrStdout(), "wrote %d files under %s\nadd to your layout:\n%s", n, dir, usage); err != nil {
				return err
			}
			return nil
		},
	}
	cmd.Flags().StringVar(&dir, "dir", "", "Target directory, e.g. public/vendor/voidable or priv/static/vendor/voidable")
	cmd.Flags().BoolVar(&force, "force", false, "Overwrite existing files")
	return cmd
}

const usage = `  <link rel="stylesheet" href="/vendor/voidable/theme/index.css">
  <script type="importmap" src="/vendor/voidable/importmap.json"></script>  (or inline its contents)
  <script type="module">import '@voidable/ui';</script>
`

func write(ctx context.Context, src fs.FS, dir string, force bool) (int, error) {
	n := 0
	err := fs.WalkDir(src, ".", func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if ctx.Err() != nil {
			return ctx.Err()
		}
		dst := filepath.Join(dir, filepath.FromSlash(p))
		if d.IsDir() {
			return os.MkdirAll(dst, 0o755)
		}
		if _, err := os.Stat(dst); err == nil && !force {
			return fmt.Errorf("%s exists (use --force)", dst)
		}
		b, err := fs.ReadFile(src, p)
		if err != nil {
			return err
		}
		n++
		return os.WriteFile(dst, b, 0o644)
	})
	return n, err
}
