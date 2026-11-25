package mcp

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"io"
	"strings"
	"sync"

	gomcp "github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	"github.com/VoidableUI/Voidable/tools/voidable/internal/domain"
)

// SkillsExtension is the extension identifier a server declares in
// capabilities.extensions to say it serves skills (SEP-2640, with SEP-2133
// extension negotiation).
const SkillsExtension = "io.modelcontextprotocol/skills"

// The three methods SEP-2640 adds. mcp-go has no hook for custom methods, so
// Serve answers them in front of the SDK's stdio loop.
const (
	methodSkillsList    = "skills/list"
	methodSkillsGet     = "skills/get"
	methodDirectoryRead = "resources/directory/read"
)

const (
	mimeDirectory = "inode/directory"
	// listTTLMs and the public cache scope are the list-caching attributes
	// that 2026-07-28 requests expect on skills/list results. The skill is
	// fixed for the life of the process and holds no user data.
	listTTLMs = 3600000
)

// addSkillResources registers one resource per skill file, so resources/list
// and resources/read serve skill://voidable/SKILL.md and its siblings.
func addSkillResources(s *server.MCPServer, sk *domain.Skill) {
	for _, f := range sk.Files {
		uri := sk.URI(f.Path)
		name, desc := f.Path, ""
		if f.Path == "SKILL.md" {
			if fm, err := domain.ParseFrontmatter(f.Content); err == nil {
				name, _ = fm["name"].(string)
				desc, _ = fm["description"].(string)
			}
		}
		opts := []gomcp.ResourceOption{gomcp.WithMIMEType(f.MIME)}
		if desc != "" {
			opts = append(opts, gomcp.WithResourceDescription(desc))
		}
		text, mime := string(f.Content), f.MIME
		s.AddResource(gomcp.NewResource(uri, name, opts...),
			func(_ context.Context, _ gomcp.ReadResourceRequest) ([]gomcp.ResourceContents, error) {
				return []gomcp.ResourceContents{gomcp.TextResourceContents{URI: uri, MIMEType: mime, Text: text}}, nil
			})
	}
}

type skillMethods struct {
	skill *domain.Skill
	entry *domain.SkillEntry
}

func newSkillMethods(sk *domain.Skill) (*skillMethods, error) {
	e, err := sk.Entry()
	if err != nil {
		return nil, err
	}
	return &skillMethods{skill: sk, entry: e}, nil
}

type rpcRequest struct {
	ID     json.RawMessage `json:"id"`
	Method string          `json:"method"`
	Params json.RawMessage `json:"params"`
}

type rpcError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// serve runs the SDK's stdio server with skills methods answered here. Lines
// that are not one of the three methods pass through untouched. Responses
// from both paths share one writer, one whole line per write.
func (m *skillMethods) serve(ctx context.Context, s *server.MCPServer, in io.Reader, out io.Writer) error {
	pr, pw := io.Pipe()
	w := &lineWriter{w: out}
	go func() {
		br := bufio.NewReader(in)
		for {
			line, err := br.ReadBytes('\n')
			if len(bytes.TrimSpace(line)) > 0 {
				if resp, ok := m.handle(line); ok {
					if werr := w.writeLine(resp); werr != nil {
						_ = pw.CloseWithError(werr)
						return
					}
				} else {
					if !bytes.HasSuffix(line, []byte("\n")) {
						line = append(line, '\n')
					}
					if _, werr := pw.Write(line); werr != nil {
						return
					}
				}
			}
			if err != nil {
				_ = pw.Close()
				return
			}
		}
	}()
	return server.NewStdioServer(s).Listen(ctx, pr, w)
}

// handle answers one input line when it is a skills request.
func (m *skillMethods) handle(line []byte) ([]byte, bool) {
	var req rpcRequest
	if err := json.Unmarshal(line, &req); err != nil || len(req.ID) == 0 {
		return nil, false
	}
	var result any
	var rerr *rpcError
	switch req.Method {
	case methodSkillsList:
		result = m.list(req.Params)
	case methodSkillsGet:
		result, rerr = m.get(req.Params)
	case methodDirectoryRead:
		result, rerr = m.directory(req.Params)
	default:
		return nil, false
	}
	msg := map[string]any{"jsonrpc": "2.0", "id": req.ID}
	if rerr != nil {
		msg["error"] = rerr
	} else {
		msg["result"] = result
	}
	b, err := json.Marshal(msg)
	if err != nil {
		b, _ = json.Marshal(map[string]any{"jsonrpc": "2.0", "id": req.ID, "error": rpcError{Code: gomcp.INTERNAL_ERROR, Message: err.Error()}})
	}
	return b, true
}

// modern reports whether a request declares protocol version 2026-07-28 or
// later in its _meta, where list results carry caching attributes.
func modern(params json.RawMessage) bool {
	var p struct {
		Meta map[string]any `json:"_meta"`
	}
	if json.Unmarshal(params, &p) != nil {
		return false
	}
	v, _ := p.Meta[gomcp.MetaKeyProtocolVersion].(string)
	return v != "" && gomcp.IsModernProtocol(v)
}

func (m *skillMethods) list(params json.RawMessage) map[string]any {
	res := map[string]any{"resultType": "complete", "skills": []*domain.SkillEntry{m.entry}}
	if modern(params) {
		res["ttlMs"] = listTTLMs
		res["cacheScope"] = string(gomcp.CacheScopePublic)
	}
	return res
}

func (m *skillMethods) get(params json.RawMessage) (any, *rpcError) {
	var p struct {
		URI string `json:"uri"`
	}
	if err := json.Unmarshal(params, &p); err != nil || p.URI == "" {
		return nil, &rpcError{Code: gomcp.INVALID_PARAMS, Message: "skills/get needs params.uri, the URI of a skill's SKILL.md"}
	}
	if p.URI != m.entry.URI {
		return nil, &rpcError{Code: gomcp.INVALID_PARAMS, Message: "not a skill served here: " + p.URI}
	}
	return map[string]any{"resultType": "complete", "skill": m.entry}, nil
}

// directory serves resources/directory/read for the skill root and every
// subdirectory: the direct children as resource objects, subdirectories as
// inode/directory.
func (m *skillMethods) directory(params json.RawMessage) (any, *rpcError) {
	var p struct {
		URI string `json:"uri"`
	}
	if err := json.Unmarshal(params, &p); err != nil || p.URI == "" {
		return nil, &rpcError{Code: gomcp.INVALID_PARAMS, Message: "resources/directory/read needs params.uri"}
	}
	root := m.skill.RootURI()
	var dir string
	switch {
	case p.URI == root:
	case strings.HasPrefix(p.URI, root+"/"):
		dir = strings.TrimPrefix(p.URI, root+"/")
	default:
		return nil, &rpcError{Code: gomcp.INVALID_PARAMS, Message: "not a directory served here: " + p.URI}
	}
	files, dirs, ok := m.skill.Dir(dir)
	if !ok {
		return nil, &rpcError{Code: gomcp.INVALID_PARAMS, Message: "not a directory served here: " + p.URI}
	}
	type child struct {
		URI      string `json:"uri"`
		Name     string `json:"name"`
		MIMEType string `json:"mimeType"`
	}
	children := []child{}
	for _, d := range dirs {
		children = append(children, child{m.skill.URI(d), d[strings.LastIndex(d, "/")+1:], mimeDirectory})
	}
	for _, f := range files {
		file, _ := m.skill.File(f)
		children = append(children, child{m.skill.URI(f), f[strings.LastIndex(f, "/")+1:], file.MIME})
	}
	return map[string]any{"resultType": "complete", "resources": children}, nil
}

// lineWriter serialises whole-line writes from two producers.
type lineWriter struct {
	mu sync.Mutex
	w  io.Writer
}

func (l *lineWriter) Write(p []byte) (int, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.w.Write(p)
}

func (l *lineWriter) writeLine(b []byte) error {
	_, err := l.Write(append(b, '\n'))
	return err
}
