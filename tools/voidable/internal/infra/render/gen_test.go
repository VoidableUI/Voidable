package render

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/VoidableUI/Voidable/tools/voidable/internal/domain"
	"github.com/VoidableUI/Voidable/tools/voidable/internal/infra/embedded"
)

func genCatalog() *domain.Catalog {
	at := func(name, field, typ, def string) domain.Attribute {
		k, v, n := domain.ParseType(typ)
		return domain.Attribute{Name: name, Field: field, Type: typ, Kind: k, Values: v, Nullable: n, Default: def}
	}
	return domain.NewCatalog("9.9.9", []domain.Element{
		{Tag: "void-status-dot", Description: `A "dot".`, Attributes: []domain.Attribute{at("status", "status", "'online' | 'away'", "online")}},
		{Tag: "void-hover-card", Attributes: []domain.Attribute{at("open-delay", "openDelay", "number", "300"), at("open", "open", "boolean", "false")},
			Events: []domain.Event{{Name: "void-open"}, {Name: "void-close"}}},
		{Tag: "void-dialog", Attributes: []domain.Attribute{at("hide-close", "hideClose", "boolean", "false"), at("trend", "trend", "'up' | null", "null")}},
	})
}

func TestGenerate(t *testing.T) {
	g := NewGenerator(embedded.Templates())
	tests := []struct {
		target string
		files  int
		path   string
		want   []string
	}{
		{"heex", 1, "lib/voidable_ui/components.ex", []string{
			"from @voidable/ui 9.9.9",
			`@doc "A \"dot\"."`,
			`attr :status, :string, default: "online", values: ["online", "away"]`,
			"def status_dot(assigns) do",
			"attr :open_delay, :any, default: nil",
			"open-delay={@open_delay}",
			`id={@id || "void-hover-card-#{unique_id()}"}`,
			`data-void-events={void_events(@events, "void-open,void-close")}`,
			"phx-hook={void_hook(@events)}",
			"attr :events, :any, default: nil",
			"attr :hide_close, :boolean, default: false",
			"hide-close={@hide_close}",
			"attr :trend, :string, default: nil\n", // nullable enum: no values
		}},
		{"blade", 3, "resources/views/components/dialog.blade.php", []string{
			"'hideClose' => false, // boolean",
			"@if($hideClose) hide-close @endif",
			`@if(!is_null($trend)) trend="{{ $trend }}" @endif`,
			"{{ $attributes }}",
		}},
	}
	for _, tt := range tests {
		t.Run(tt.target, func(t *testing.T) {
			files, err := g.Generate(context.Background(), tt.target, genCatalog())
			if err != nil {
				t.Fatal(err)
			}
			if len(files) != tt.files {
				t.Fatalf("files = %d, want %d", len(files), tt.files)
			}
			var content string
			for _, f := range files {
				if f.Path == tt.path {
					content = f.Content
				}
			}
			if content == "" {
				t.Fatalf("no file %s", tt.path)
			}
			for _, w := range tt.want {
				if !strings.Contains(content, w) {
					t.Errorf("%s missing %q\n%s", tt.path, w, content)
				}
			}
			again, _ := g.Generate(context.Background(), tt.target, genCatalog())
			for i := range files {
				if files[i] != again[i] {
					t.Errorf("non-deterministic output for %s", files[i].Path)
				}
			}
		})
	}
	if _, err := g.Generate(context.Background(), "cobol", genCatalog()); !errors.Is(err, domain.ErrUnknownTarget) {
		t.Errorf("err = %v", err)
	}
}

func TestGenerateBladeCamel(t *testing.T) {
	files, err := NewGenerator(embedded.Templates()).Generate(context.Background(), "blade", genCatalog())
	if err != nil {
		t.Fatal(err)
	}
	for _, f := range files {
		if strings.HasSuffix(f.Path, "hover-card.blade.php") &&
			!strings.Contains(f.Content, `@if(!is_null($openDelay)) open-delay="{{ $openDelay }}" @endif`) {
			t.Errorf("hover-card: %s", f.Content)
		}
	}
}
