// Package skill implements `voidable skill`.
package skill

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"

	"github.com/VoidableUI/Voidable/tools/voidable/internal/domain"
)

// DefaultDir is where Claude Code and other filesystem-based clients look
// for a project's skills; the directory name is the skill name.
const DefaultDir = ".claude/skills/voidable"

// SourceProvider yields the skill.
type SourceProvider func(ctx context.Context) (domain.SkillSource, error)

// NewCmd creates the skill command and its install subcommand.
func NewCmd(src SourceProvider) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "skill",
		Short: "The building-UIs-with-Voidable Agent Skill served by `voidable mcp`",
	}
	cmd.AddCommand(newInstallCmd(src))
	return cmd
}

func newInstallCmd(src SourceProvider) *cobra.Command {
	var dir string
	var force bool
	cmd := &cobra.Command{
		Use:   "install [--dir <path>]",
		Short: "Write the skill to disk for clients that load skills from the filesystem",
		Long: "Writes exactly the files `voidable mcp` serves as the skill://voidable/ resources " +
			"(SKILL.md and references/) into --dir, which becomes the skill's own directory. " +
			"The default, .claude/skills/voidable, is where Claude Code finds project skills. " +
			"An Agent Skill's directory name must equal its name (voidable). " +
			"The content is generated from the manifest embedded in this binary, so it matches its library version.",
		Args: cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			s, err := src(cmd.Context())
			if err != nil {
				return err
			}
			sk, err := s.Skill(cmd.Context())
			if err != nil {
				return err
			}
			n, err := Install(sk, dir, force)
			if err != nil {
				return err
			}
			_, err = fmt.Fprintf(cmd.OutOrStdout(), "wrote %d files to %s\n", n, dir)
			return err
		},
	}
	cmd.Flags().StringVar(&dir, "dir", DefaultDir, "Skill directory to write")
	cmd.Flags().BoolVar(&force, "force", false, "Replace an existing installation (removes its SKILL.md and references/ first)")
	return cmd
}

// Install writes the skill's files under dir. Without force it refuses to
// touch an existing SKILL.md; with force it first removes SKILL.md and
// references/, so files of a removed element do not outlive an upgrade.
func Install(sk *domain.Skill, dir string, force bool) (int, error) {
	if _, err := os.Stat(filepath.Join(dir, "SKILL.md")); err == nil {
		if !force {
			return 0, fmt.Errorf("%s already contains a skill (use --force to replace it)", dir)
		}
		for _, p := range []string{"SKILL.md", "references"} {
			if err := os.RemoveAll(filepath.Join(dir, p)); err != nil {
				return 0, err
			}
		}
	} else if !errors.Is(err, os.ErrNotExist) {
		return 0, err
	}
	for _, f := range sk.Files {
		dst := filepath.Join(dir, filepath.FromSlash(f.Path))
		if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
			return 0, err
		}
		if err := os.WriteFile(dst, f.Content, 0o644); err != nil {
			return 0, err
		}
	}
	return len(sk.Files), nil
}
