package mcp

import (
	"bufio"
	"context"
	"encoding/json"
	"io"
	"strings"
	"testing"
	"time"

	"github.com/VoidableUI/Voidable/tools/voidable/internal/domain"
	"github.com/VoidableUI/Voidable/tools/voidable/internal/infra/embedded"
	"github.com/VoidableUI/Voidable/tools/voidable/internal/infra/scan"
)

func newServices(t *testing.T) Services {
	t.Helper()
	src := embedded.Source{}
	lib, err := domain.NewLibrary(context.Background(), src, src, scan.Fragments{})
	if err != nil {
		t.Fatal(err)
	}
	return Services{Library: lib, Checker: domain.NewChecker(lib, scan.Scanner{})}
}

type rpcResponse struct {
	ID     int             `json:"id"`
	Result json.RawMessage `json:"result"`
	Error  *struct {
		Message string `json:"message"`
	} `json:"error"`
}

type toolResult struct {
	IsError bool `json:"isError"`
	Content []struct {
		Text string `json:"text"`
	} `json:"content"`
}

// TestStdioSession drives the server the way an MCP client does: one
// JSON-RPC message per line on stdin, responses on stdout.
func TestStdioSession(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	inR, inW := io.Pipe()
	outR, outW := io.Pipe()
	done := make(chan error, 1)
	go func() { done <- Serve(ctx, NewServer(newServices(t), "test"), inR, outW); _ = outW.Close() }()
	lines := bufio.NewScanner(outR)
	lines.Buffer(make([]byte, 1<<20), 1<<22)

	send := func(msg string) {
		if _, err := io.WriteString(inW, msg+"\n"); err != nil {
			t.Fatal(err)
		}
	}
	call := func(id int, msg string) rpcResponse {
		t.Helper()
		send(msg)
		for lines.Scan() {
			var r rpcResponse
			if err := json.Unmarshal(lines.Bytes(), &r); err != nil {
				t.Fatalf("bad line %q: %v", lines.Text(), err)
			}
			if r.ID == id {
				if r.Error != nil {
					t.Fatalf("rpc error: %s", r.Error.Message)
				}
				return r
			}
		}
		t.Fatalf("no response for id %d: %v", id, lines.Err())
		return rpcResponse{}
	}
	tool := func(id int, name string, args map[string]any) toolResult {
		t.Helper()
		params, _ := json.Marshal(map[string]any{"name": name, "arguments": args})
		r := call(id, `{"jsonrpc":"2.0","id":`+itoa(id)+`,"method":"tools/call","params":`+string(params)+`}`)
		var tr toolResult
		if err := json.Unmarshal(r.Result, &tr); err != nil {
			t.Fatal(err)
		}
		return tr
	}

	init := call(1, `{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test","version":"0"}}}`)
	if !strings.Contains(string(init.Result), `"name":"voidable"`) {
		t.Errorf("initialize result: %s", init.Result)
	}
	send(`{"jsonrpc":"2.0","method":"notifications/initialized"}`)

	list := call(2, `{"jsonrpc":"2.0","id":2,"method":"tools/list"}`)
	for _, name := range []string{"voidable_ref", "voidable_check", "voidable_snippet"} {
		if !strings.Contains(string(list.Result), `"name":"`+name+`"`) {
			t.Errorf("tools/list missing %s", name)
		}
	}

	tests := []struct {
		name    string
		tool    string
		args    map[string]any
		isError bool
		want    []string
	}{
		{"check jsx", "voidable_check", map[string]any{"lang": "jsx", "markup": `<void-button color="primary" onvoid-click={go}>Go</void-button>
<void-sidebar collapsedwidth="4rem" />`},
			false, []string{"input:1:14: [invalid-value] color=\"primary\"", "input:2:15: [unknown-attribute] unknown attribute collapsedwidth", "did you mean collapsed-width"}},
		{"check clean", "voidable_check", map[string]any{"markup": `<void-button variant="filled">Go</void-button>`}, false, []string{"ok"}},
		{"ref index", "voidable_ref", map[string]any{}, false, []string{"void-button ", "void-select "}},
		{"ref tag", "voidable_ref", map[string]any{"tag": "void-slider"}, false, []string{"show-value: boolean (prop showValue)", "void-change detail={ value: number }"}},
		{"ref unknown", "voidable_ref", map[string]any{"tag": "void-buton"}, true, []string{"did you mean void-button"}},
		{"snippet heex", "voidable_snippet", map[string]any{"tag": "void-select", "lang": "heex"}, false, []string{"<.select name=\"plan\"", "<option value=\"pro\">Pro</option>"}},
	}
	for i, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := tool(10+i, tt.tool, tt.args)
			if r.IsError != tt.isError || len(r.Content) == 0 {
				t.Fatalf("isError=%v content=%v", r.IsError, r.Content)
			}
			for _, w := range tt.want {
				if !strings.Contains(r.Content[0].Text, w) {
					t.Errorf("result %q missing %q", r.Content[0].Text, w)
				}
			}
		})
	}

	_ = inW.Close()
	select {
	case err := <-done:
		if err != nil {
			t.Errorf("Serve: %v", err)
		}
	case <-ctx.Done():
		t.Error("server did not stop after stdin closed")
	}
}

func itoa(i int) string {
	b, _ := json.Marshal(i)
	return string(b)
}
