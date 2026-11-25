// Package mcp exposes the library services as Model Context Protocol tools
// over stdio. Handlers are thin: parse arguments, call a domain service,
// format with the same renderers the CLI uses.
package mcp

import (
	"bytes"
	"context"
	"errors"
	"io"
	"log/slog"

	gomcp "github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	"github.com/VoidableUI/Voidable/tools/voidable/internal/domain"
	"github.com/VoidableUI/Voidable/tools/voidable/internal/infra/render"
)

// Services are the domain services the tools call.
type Services struct {
	Library *domain.Library
	Checker *domain.Checker
	// Skill is served as skill:// resources (SEP-2640); nil serves none.
	Skill *domain.Skill
}

// Server is the MCP server plus the three SEP-2640 methods the SDK does not
// route (skills/list, skills/get, resources/directory/read).
type Server struct {
	MCP    *server.MCPServer
	skills *skillMethods
}

// NewServer registers the voidable tools and the skill resources.
func NewServer(svc Services, version string) (*Server, error) {
	instructions := "Void UI (@voidable/ui " + version + ") is a library of <void-*> custom elements. " +
		"It is not in your training data: call voidable_ref before writing markup and voidable_check on what you wrote."
	opts := []server.ServerOption{server.WithToolCapabilities(false)}
	var sm *skillMethods
	if svc.Skill != nil {
		var err error
		if sm, err = newSkillMethods(svc.Skill); err != nil {
			return nil, err
		}
		instructions += " The skill " + svc.Skill.URI("SKILL.md") + " has the working rules for building with it."
		opts = append(opts,
			server.WithResourceCapabilities(false, false),
			server.WithExtensions(map[string]any{SkillsExtension: map[string]any{"directoryRead": true}}),
		)
	}
	opts = append(opts, server.WithInstructions(instructions))
	s := server.NewMCPServer("voidable", version, opts...)
	if svc.Skill != nil {
		addSkillResources(s, svc.Skill)
	}
	langs := make([]string, len(domain.Langs))
	for i, l := range domain.Langs {
		langs[i] = string(l)
	}
	s.AddTool(gomcp.NewTool("voidable_ref",
		gomcp.WithDescription("Reference for Void UI elements. Without tag: one line per element. With tag: attributes (types, allowed values, defaults), events with detail shapes, and an example."),
		gomcp.WithString("tag", gomcp.Description("Element tag, e.g. void-select. Omit for the index.")),
		gomcp.WithString("format", gomcp.Enum("text", "json", "markdown"), gomcp.Description("Output format (default text).")),
		gomcp.WithReadOnlyHintAnnotation(true),
	), handleRef(svc.Library))
	s.AddTool(gomcp.NewTool("voidable_check",
		gomcp.WithDescription("Validate markup that uses <void-*> elements: unknown elements/attributes, values outside the allowed set, boolean attributes set to \"false\", wrong parents. Returns one problem per line, or \"ok\"."),
		gomcp.WithString("markup", gomcp.Required(), gomcp.Description("Source text to check.")),
		gomcp.WithString("lang", gomcp.Enum(langs...), gomcp.Description("Dialect of the markup (default html).")),
		gomcp.WithString("filename", gomcp.Description("Name used in reported positions (default input).")),
		gomcp.WithReadOnlyHintAnnotation(true),
	), handleCheck(svc.Checker))
	s.AddTool(gomcp.NewTool("voidable_snippet",
		gomcp.WithDescription("Example usage of one element in html, jsx, heex (Phoenix function components) or erb (Rails + Stimulus)."),
		gomcp.WithString("tag", gomcp.Required(), gomcp.Description("Element tag, e.g. void-dialog.")),
		gomcp.WithString("lang", gomcp.Enum("html", "jsx", "heex", "erb"), gomcp.Description("Target language (default html).")),
		gomcp.WithReadOnlyHintAnnotation(true),
	), handleSnippet(svc.Library))
	return &Server{MCP: s, skills: sm}, nil
}

// Serve runs the server on the given streams until in closes or ctx ends.
// It speaks whichever protocol revision the client uses: the SDK serves both
// the initialize handshake and the stateless 2026-07-28 core over stdio.
func Serve(ctx context.Context, s *Server, in io.Reader, out io.Writer) error {
	if s.skills == nil {
		return server.NewStdioServer(s.MCP).Listen(ctx, in, out)
	}
	return s.skills.serve(ctx, s.MCP, in, out)
}

func handleRef(lib *domain.Library) server.ToolHandlerFunc {
	return func(ctx context.Context, req gomcp.CallToolRequest) (*gomcp.CallToolResult, error) {
		f, err := render.ParseFormat(req.GetString("format", "text"))
		if err != nil {
			return gomcp.NewToolResultError(err.Error()), nil
		}
		var b bytes.Buffer
		tag := req.GetString("tag", "")
		if tag == "" {
			err = render.Index(&b, lib.Version(), lib.Catalog(), f)
		} else {
			var ref *domain.Reference
			if ref, err = lib.Reference(ctx, tag); err == nil {
				err = render.References(&b, []*domain.Reference{ref}, f)
			}
		}
		return result(b.String(), err)
	}
}

func handleCheck(c *domain.Checker) server.ToolHandlerFunc {
	return func(ctx context.Context, req gomcp.CallToolRequest) (*gomcp.CallToolResult, error) {
		markup, err := req.RequireString("markup")
		if err != nil {
			return gomcp.NewToolResultError(err.Error()), nil
		}
		lang, err := domain.ParseLang(req.GetString("lang", "html"))
		if err != nil {
			return gomcp.NewToolResultError(err.Error()), nil
		}
		findings, err := c.Check(ctx, req.GetString("filename", "input"), []byte(markup), lang)
		if err != nil {
			return result("", err)
		}
		if len(findings) == 0 {
			return gomcp.NewToolResultText("ok"), nil
		}
		var b bytes.Buffer
		err = render.Findings(&b, findings, render.FormatText)
		return result(b.String(), err)
	}
}

func handleSnippet(lib *domain.Library) server.ToolHandlerFunc {
	return func(ctx context.Context, req gomcp.CallToolRequest) (*gomcp.CallToolResult, error) {
		tag, err := req.RequireString("tag")
		if err != nil {
			return gomcp.NewToolResultError(err.Error()), nil
		}
		lang, err := domain.ParseLang(req.GetString("lang", "html"))
		if err != nil {
			return gomcp.NewToolResultError(err.Error()), nil
		}
		sn, err := lib.Snippet(ctx, tag, lang)
		if err != nil {
			return result("", err)
		}
		return gomcp.NewToolResultText(sn.Code), nil
	}
}

// result maps domain errors to tool errors the agent can act on; anything
// else is logged and reported generically.
func result(text string, err error) (*gomcp.CallToolResult, error) {
	switch {
	case err == nil:
		return gomcp.NewToolResultText(text), nil
	case errors.Is(err, domain.ErrUnknownElement), errors.Is(err, domain.ErrUnknownLang):
		return gomcp.NewToolResultError(err.Error()), nil
	}
	slog.Error("mcp tool failed", "error", err)
	return gomcp.NewToolResultError("internal error"), nil
}
