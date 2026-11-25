voidable: the Void UI command-line tool
=======================================

One static binary, no runtime needed. It carries the Void UI component
reference, a markup checker, snippet generators, an MCP server for AI agents
and the library files themselves, all offline.

  voidable version                      what you have: version, commit, build date
  voidable ref [void-button]            list the elements, or show one
  voidable check <file or dir>          find mistakes in void-* markup
  voidable gen snippet void-button --lang html
  voidable mcp                          MCP server on stdio (voidable_ref, voidable_check, voidable_snippet, the skill)
  voidable install --dir public/vendor/voidable
                                        copy the built library and theme into a project
  voidable skill install                write the Agent Skill to .claude/skills/voidable

Put the binary on your PATH, for example in ~/.local/bin. An MCP client needs
either that or the binary's absolute path:

  { "mcpServers": { "voidable": { "command": "voidable", "args": ["mcp"] } } }

Documentation: https://voidable.dev/getting-started/for-agents/
Source and issues: https://github.com/VoidableUI/Voidable
Licence: MIT (LICENSE.md)

Check a download: compare its SHA-256 with checksums.txt on the release page,
and verify its provenance with
  gh attestation verify <archive> --repo VoidableUI/Voidable
