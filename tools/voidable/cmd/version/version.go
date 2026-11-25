// Package version implements `voidable version`.
package version

import (
	"fmt"
	"io"
	"runtime"

	"github.com/spf13/cobra"
)

// Info describes one build of the tool.
type Info struct {
	Version  string // unified release version, or "dev"
	Commit   string
	Date     string // RFC 3339, UTC
	Manifest string // @voidable/ui version of the embedded manifest
	Assets   bool   // built with -tags assets, so `voidable install` works
}

// Write prints info in a stable "key: value" form.
func Write(w io.Writer, i Info) error {
	assets := "not embedded (`voidable install` is unavailable)"
	if i.Assets {
		assets = "embedded"
	}
	_, err := fmt.Fprintf(w, "voidable %s\ncommit:   %s\nbuilt:    %s\nmanifest: @voidable/ui %s\nassets:   %s\nplatform: %s/%s (%s)\n",
		i.Version, i.Commit, i.Date, i.Manifest, assets, runtime.GOOS, runtime.GOARCH, runtime.Version())
	return err
}

// NewCmd creates the version subcommand. It makes no network call.
func NewCmd(info func() Info) *cobra.Command {
	return &cobra.Command{
		Use:   "version",
		Short: "Print the version, commit and build date of this binary",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			return Write(cmd.OutOrStdout(), info())
		},
	}
}
