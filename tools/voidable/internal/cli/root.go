// Package cli is the composition root: it wires the embedded adapters into
// the domain services and hands them to the subcommands.
package cli

import (
	"context"
	"errors"
	"fmt"
	"os"
	"sync"

	"github.com/spf13/cobra"

	checkcmd "github.com/VoidableUI/Voidable/tools/voidable/cmd/check"
	gencmd "github.com/VoidableUI/Voidable/tools/voidable/cmd/gen"
	installcmd "github.com/VoidableUI/Voidable/tools/voidable/cmd/install"
	mcpcmd "github.com/VoidableUI/Voidable/tools/voidable/cmd/mcp"
	refcmd "github.com/VoidableUI/Voidable/tools/voidable/cmd/ref"
	skillcmd "github.com/VoidableUI/Voidable/tools/voidable/cmd/skill"
	versioncmd "github.com/VoidableUI/Voidable/tools/voidable/cmd/version"
	"github.com/VoidableUI/Voidable/tools/voidable/internal/domain"
	"github.com/VoidableUI/Voidable/tools/voidable/internal/infra/embedded"
	"github.com/VoidableUI/Voidable/tools/voidable/internal/infra/render"
	"github.com/VoidableUI/Voidable/tools/voidable/internal/infra/scan"
	"github.com/VoidableUI/Voidable/tools/voidable/internal/infra/skillgen"
)

// Version, Commit and Date are set from main.go, which receives them via -ldflags.
var (
	Version = "dev"
	Commit  = "unknown"
	Date    = "unknown"
)

type services struct {
	once sync.Once
	lib  *domain.Library
	err  error
}

func (s *services) library(ctx context.Context) (*domain.Library, error) {
	s.once.Do(func() {
		src := embedded.Source{}
		s.lib, s.err = domain.NewLibrary(ctx, src, src, scan.Fragments{})
	})
	return s.lib, s.err
}

func (s *services) skill(ctx context.Context) (*domain.Skill, error) {
	lib, err := s.library(ctx)
	if err != nil {
		return nil, err
	}
	return skillgen.New(lib).Skill(ctx)
}

func (s *services) checker(ctx context.Context) (*domain.Checker, error) {
	lib, err := s.library(ctx)
	if err != nil {
		return nil, err
	}
	return domain.NewChecker(lib, scan.Scanner{}), nil
}

// NewRootCmd builds the command tree.
func NewRootCmd() *cobra.Command {
	svc := &services{}
	cmd := &cobra.Command{
		Use:           "voidable",
		Short:         "Void UI knowledge for agents and build tools: reference, checker, generators, MCP",
		Version:       Version,
		SilenceUsage:  true,
		SilenceErrors: true,
	}
	cmd.SetVersionTemplate(versionTemplate(svc))
	cmd.AddCommand(
		refcmd.NewCmd(svc.library),
		checkcmd.NewCmd(svc.checker),
		gencmd.NewCmd(svc.library, render.NewGenerator(embedded.Templates())),
		mcpcmd.NewCmd(func(ctx context.Context) (*domain.Library, *domain.Checker, *domain.Skill, error) {
			lib, err := svc.library(ctx)
			if err != nil {
				return nil, nil, nil, err
			}
			c, err := svc.checker(ctx)
			if err != nil {
				return nil, nil, nil, err
			}
			sk, err := svc.skill(ctx)
			return lib, c, sk, err
		}, Version),
		skillcmd.NewCmd(func(ctx context.Context) (domain.SkillSource, error) {
			lib, err := svc.library(ctx)
			if err != nil {
				return nil, err
			}
			return skillgen.New(lib), nil
		}),
		installcmd.NewCmd(embedded.Source{}),
		versioncmd.NewCmd(func() versioncmd.Info {
			manifest := "unreadable"
			if lib, err := svc.library(context.Background()); err == nil {
				manifest = lib.Version()
			}
			return versioncmd.Info{Version: Version, Commit: Commit, Date: Date, Manifest: manifest, Assets: embedded.HasAssets()}
		}),
	)
	return cmd
}

func versionTemplate(svc *services) string {
	manifest := "unreadable"
	if lib, err := svc.library(context.Background()); err == nil {
		manifest = lib.Version()
	}
	return fmt.Sprintf("voidable {{.Version}} (embedded manifest: @voidable/ui %s)\n", manifest)
}

// Execute runs the root command. Exit 1 on problems or drift, 2 on errors.
func Execute() {
	err := NewRootCmd().Execute()
	switch {
	case err == nil:
	case errors.Is(err, checkcmd.ErrProblems), errors.Is(err, gencmd.ErrDrift):
		os.Exit(1)
	default:
		fmt.Fprintln(os.Stderr, "voidable:", err)
		os.Exit(2)
	}
}
