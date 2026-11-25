// Command voidable carries @voidable/ui's machine-readable knowledge (the
// Custom Elements Manifest, embedded at build time) and exposes it as a
// reference, a markup checker, code generators and an MCP server.
package main

import "github.com/VoidableUI/Voidable/tools/voidable/internal/cli"

// Set at build time via -ldflags "-X main.Version=..." (see build:go and
// scripts/release/binaries.mjs). Version is the unified release version.
var (
	Version = "dev"
	Commit  = "unknown"
	Date    = "unknown"
)

func main() {
	cli.Version, cli.Commit, cli.Date = Version, Commit, Date
	cli.Execute()
}
