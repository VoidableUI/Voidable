// Command voidable carries @voidable/ui's machine-readable knowledge (the
// Custom Elements Manifest, embedded at build time) and exposes it as a
// reference, a markup checker, code generators and an MCP server.
package main

import "github.com/VoidableUI/Voidable/tools/voidable/internal/cli"

// Version is set at build time via -ldflags to the @voidable/ui version.
var Version = "dev"

func main() {
	cli.Version = Version
	cli.Execute()
}
