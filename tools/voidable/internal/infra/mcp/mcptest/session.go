// Package mcptest drives a voidable MCP server the way a client does over
// stdio: one JSON-RPC message per line on stdin, one per line on stdout.
package mcptest

import (
	"bufio"
	"context"
	"encoding/json"
	"io"
	"testing"
	"time"

	mcpinfra "github.com/VoidableUI/Voidable/tools/voidable/internal/infra/mcp"
)

// RPCError is a JSON-RPC error object.
type RPCError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// Session is a running server and the client end of its stdio.
type Session struct {
	t      *testing.T
	in     io.WriteCloser
	lines  *bufio.Scanner
	nextID int
	done   chan error
}

// Start runs srv until Close.
func Start(t *testing.T, srv *mcpinfra.Server) *Session {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	t.Cleanup(cancel)
	inR, inW := io.Pipe()
	outR, outW := io.Pipe()
	s := &Session{t: t, in: inW, done: make(chan error, 1)}
	go func() { s.done <- mcpinfra.Serve(ctx, srv, inR, outW); _ = outW.Close() }()
	s.lines = bufio.NewScanner(outR)
	s.lines.Buffer(make([]byte, 1<<20), 1<<24)
	return s
}

// Notify sends a notification.
func (s *Session) Notify(method string) {
	s.t.Helper()
	s.send(map[string]any{"jsonrpc": "2.0", "method": method})
}

// Call sends a request and returns its result or error object.
func (s *Session) Call(method string, params any) (json.RawMessage, *RPCError) {
	s.t.Helper()
	s.nextID++
	id := s.nextID
	s.send(map[string]any{"jsonrpc": "2.0", "id": id, "method": method, "params": params})
	for s.lines.Scan() {
		var r struct {
			ID     *int            `json:"id"`
			Result json.RawMessage `json:"result"`
			Error  *RPCError       `json:"error"`
		}
		if err := json.Unmarshal(s.lines.Bytes(), &r); err != nil {
			s.t.Fatalf("bad line %q: %v", s.lines.Text(), err)
		}
		if r.ID != nil && *r.ID == id {
			return r.Result, r.Error
		}
	}
	s.t.Fatalf("no response to %s: %v", method, s.lines.Err())
	return nil, nil
}

// Must is Call that fails the test on a JSON-RPC error and decodes into v.
func (s *Session) Must(method string, params, v any) {
	s.t.Helper()
	res, rerr := s.Call(method, params)
	if rerr != nil {
		s.t.Fatalf("%s: rpc error %d: %s", method, rerr.Code, rerr.Message)
	}
	if v != nil {
		if err := json.Unmarshal(res, v); err != nil {
			s.t.Fatalf("%s: decode %s: %v", method, res, err)
		}
	}
}

// Close ends stdin and waits for the server to stop.
func (s *Session) Close() {
	s.t.Helper()
	_ = s.in.Close()
	select {
	case err := <-s.done:
		if err != nil {
			s.t.Errorf("Serve: %v", err)
		}
	case <-time.After(10 * time.Second):
		s.t.Error("server did not stop after stdin closed")
	}
}

func (s *Session) send(msg map[string]any) {
	s.t.Helper()
	b, err := json.Marshal(msg)
	if err != nil {
		s.t.Fatal(err)
	}
	if _, err := s.in.Write(append(b, '\n')); err != nil {
		s.t.Fatal(err)
	}
}
