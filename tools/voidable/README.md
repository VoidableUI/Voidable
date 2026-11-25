# voidable

The Void UI command-line tool: a reference for every `<void-*>` element, a checker for the markup you write, snippet generators, an MCP server for AI agents, and the built library files, all in one static binary that works offline.

## Install

Without Go or Node (Linux and macOS, no sudo; the binary goes to `~/.local/bin`):

```sh
curl -fsSL https://voidable.dev/install.sh | sh
curl -fsSL https://voidable.dev/install.sh | sh -s -- --version X.Y.Z --dir /usr/local/bin
```

The script detects your OS and CPU, downloads the archive from the [GitHub release](https://github.com/VoidableUI/Voidable/releases), refuses to continue unless its SHA-256 matches `checksums.txt`, and prints what it did. Or download `voidable_<os>_<arch>.tar.gz` (`.zip` on Windows) for linux, darwin or windows on amd64 or arm64 by hand, check it against `checksums.txt`, and put `voidable` on your `PATH`. To check where a download came from:

```sh
gh attestation verify voidable_linux_amd64.tar.gz --repo VoidableUI/Voidable
```

`go install` does not work for this module: the Custom Elements Manifest and the library bundle the binary embeds are build output of `packages/ui` and `packages/theme`, not committed files, so a build from the module alone fails.

## Use

| Command | Does |
| --- | --- |
| `voidable version` | Version, commit, build date, the embedded manifest's `@voidable/ui` version. No network access. |
| `voidable ref [tag]` | One line per element, or one element's attributes, events, parents and an example. |
| `voidable check <file or dir>` | Finds unknown elements and attributes, invalid values, misplaced children and controls with no accessible name; exit 1 on problems. |
| `voidable gen snippet <tag> --lang html\|jsx\|erb\|heex\|blade` | A working example of one element. |
| `voidable mcp` | MCP server on stdio: `voidable_ref`, `voidable_check`, `voidable_snippet` and the skill. |
| `voidable install --dir <path>` | Copies the built `@voidable/ui` modules, lit and the theme CSS into a project and prints the import map (needs a release binary or `-tags assets`). |
| `voidable skill install` | Writes the Agent Skill to `.claude/skills/voidable`. |

An MCP client starts the server with `voidable mcp`. The client must find the binary: either it is on its `PATH`, or the configuration gives the absolute path.

```json
{ "mcpServers": { "voidable": { "command": "voidable", "args": ["mcp"] } } }
```

## Build from source

From the repository root, with [mise](https://mise.jdx.dev):

```sh
mise run install
mise run voidable:binary          # build/voidable, without the library files (no `install`)
cd tools/voidable && mise run build:assets && GO_TAGS=assets mise run build:go   # with them
mise run release:dry-run          # every package and all six release binaries, as CI builds them
```

The tool embeds `packages/ui`'s manifest (`mise run build:manifest`) and, with `-tags assets`, its built modules and the theme (`mise run build:assets`). Releases are built by `scripts/release/binaries.sh` after the version is stamped, so the embedded files are the ones published to npm at that version; `voidable install` also writes a `VERSION` file beside them.
