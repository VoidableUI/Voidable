// Package install implements `voidable install`.
package install

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"

	"github.com/VoidableUI/Voidable/tools/voidable/internal/domain"
)

// NewCmd creates the install subcommand.
func NewCmd(assets domain.AssetSource) *cobra.Command {
	var dir, baseURL string
	var force bool
	cmd := &cobra.Command{
		Use:   "install --dir <path>",
		Short: "Write the embedded @voidable/ui bundle, lit and theme CSS into a project",
		Long: "Vendors the library from the binary alone (no Node toolchain): ES modules for " +
			"@voidable/ui (including the lazy autoloader, ui/autoloader.js, and the development warnings, ui/dev.js) and lit, the theme CSS, and " +
			"importmap.json mapping the bare imports. " +
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
			im, err := fs.ReadFile(src, "importmap.json")
			if err != nil {
				return err
			}
			// Browsers do not load external import maps, so print it for
			// inlining, with paths made absolute under the served URL.
			base := strings.TrimSuffix(baseURL, "/") + "/"
			inline := strings.ReplaceAll(string(im), `"./`, `"`+base)
			_, err = fmt.Fprintf(cmd.OutOrStdout(),
				"wrote %d files under %s\nadd to your layout <head> (serve %s at %s):\n<link rel=\"stylesheet\" href=\"%stheme/void.min.css\">\n<script type=\"importmap\">\n%s</script>\n<script type=\"module\">import '@voidable/ui/autoloader.js';</script>\n\nThe autoloader loads each component the first time its tag appears on the page (including\ncontent added later by Turbo, LiveView or Livewire). To register every component up front\ninstead, import the whole bundle: <script type=\"module\">import '@voidable/ui';</script>\nImport maps ignore package exports, so subpaths need their .js extension.\n\nIn development only, also load the console warnings for misused <void-*> markup (an attribute a\ncomponent does not have, a value outside its set, a child in the wrong parent). Leave it out of production:\n<script type=\"module\">import '@voidable/ui/dev.js';</script>\n",
				n, dir, dir, base, base, inline)
			return err
		},
	}
	cmd.Flags().StringVar(&dir, "dir", "", "Target directory, e.g. public/vendor/voidable or priv/static/vendor/voidable")
	cmd.Flags().BoolVar(&force, "force", false, "Overwrite existing files")
	cmd.Flags().StringVar(&baseURL, "url", "/vendor/voidable/", "URL path the directory is served at (for the printed import map)")
	return cmd
}

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
