// Package mcp implements `voidable mcp`, the stdio MCP server.
package mcp

import (
	"context"
	"log/slog"
	"os"

	"github.com/spf13/cobra"

	"github.com/VoidableUI/Voidable/tools/voidable/internal/domain"
	mcpinfra "github.com/VoidableUI/Voidable/tools/voidable/internal/infra/mcp"
)

// ServicesProvider yields the services the MCP tools call.
type ServicesProvider func(ctx context.Context) (*domain.Library, *domain.Checker, error)

// NewCmd creates the mcp subcommand.
func NewCmd(svc ServicesProvider, version string) *cobra.Command {
	return &cobra.Command{
		Use:   "mcp",
		Short: "Serve voidable_ref, voidable_check and voidable_snippet over MCP (stdio)",
		RunE: func(cmd *cobra.Command, _ []string) error {
			// stdout carries JSON-RPC; logs go to stderr.
			slog.SetDefault(slog.New(slog.NewTextHandler(os.Stderr, nil)))
			lib, chk, err := svc(cmd.Context())
			if err != nil {
				return err
			}
			s := mcpinfra.NewServer(mcpinfra.Services{Library: lib, Checker: chk}, version)
			return mcpinfra.Serve(cmd.Context(), s, cmd.InOrStdin(), cmd.OutOrStdout())
		},
	}
}
