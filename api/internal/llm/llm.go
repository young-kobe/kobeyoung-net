// Package llm proxies the live demo to a self-hosted, OpenAI-style inference engine,
// streaming tokens to the browser over Server-Sent Events.
//
// Security / abuse controls:
//   - master kill-switch (cfg.DemoEnabled) and a daily global budget cap
//   - per-IP + global rate limiting (caller-supplied Limiter)
//   - hard input-length and max-token caps
//   - Turnstile gate (when enabled), gathered at click-to-start
//   - graceful "demo offline" when the upstream model is unreachable — never breaks the site
//
// The upstream model URL / key are server-side env only; the browser never sees them.
package llm

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/kobeyoung/kobeyoung-net/api/internal/config"
	"github.com/kobeyoung/kobeyoung-net/api/internal/middleware"
	"github.com/kobeyoung/kobeyoung-net/api/internal/ratelimit"
	"github.com/kobeyoung/kobeyoung-net/api/internal/turnstile"
)

const maxBodyBytes = 64 * 1024

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Messages       []chatMessage `json:"messages"`
	TurnstileToken string        `json:"turnstileToken"`
}

type Handler struct {
	cfg       *config.Config
	limiter   *ratelimit.Limiter
	turnstile *turnstile.Verifier
	client    *http.Client
}

func NewHandler(cfg *config.Config, lim *ratelimit.Limiter, ts *turnstile.Verifier) *Handler {
	return &Handler{
		cfg:       cfg,
		limiter:   lim,
		turnstile: ts,
		client:    &http.Client{Timeout: 120 * time.Second},
	}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if !h.cfg.DemoEnabled {
		writeSSEError(w, "The live demo is currently disabled.", http.StatusServiceUnavailable)
		return
	}

	ip := middleware.ClientIP(r, h.cfg.TrustProxyHeaders)
	if !h.limiter.Allow(ip) {
		writeSSEError(w, "Rate limit reached. Please slow down and try again shortly.", http.StatusTooManyRequests)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	var req chatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeSSEError(w, "Invalid request.", http.StatusBadRequest)
		return
	}

	if err := h.turnstile.Verify(r.Context(), req.TurnstileToken, ip); err != nil {
		writeSSEError(w, "Verification failed. Please retry.", http.StatusForbidden)
		return
	}

	// Drop any client-supplied system/other roles (prompt-injection guard) and empty turns.
	msgs := sanitizeMessages(req.Messages)

	// The input cap applies to the NEW user message only — not the whole transcript — so a
	// long conversation doesn't dead-end an otherwise-short prompt.
	newInput := ""
	if n := len(msgs); n > 0 && msgs[n-1].Role == "user" {
		newInput = msgs[n-1].Content
	}
	if newInput == "" {
		writeSSEError(w, "Please enter a message.", http.StatusBadRequest)
		return
	}
	if len([]rune(newInput)) > h.cfg.DemoMaxInputChars {
		writeSSEError(w, fmt.Sprintf("Message too long (limit %d characters).", h.cfg.DemoMaxInputChars), http.StatusBadRequest)
		return
	}

	// Bound history: keep only the most recent N messages before forwarding upstream.
	if h.cfg.DemoMaxHistory > 0 && len(msgs) > h.cfg.DemoMaxHistory {
		msgs = msgs[len(msgs)-h.cfg.DemoMaxHistory:]
	}

	h.stream(w, r, msgs)
}

// sanitizeMessages keeps only user/assistant turns with non-empty content. Client-supplied
// "system" (or any other) roles are discarded so the demo's system prompt can't be
// overridden from the browser.
func sanitizeMessages(in []chatMessage) []chatMessage {
	out := make([]chatMessage, 0, len(in))
	for _, m := range in {
		if m.Role != "user" && m.Role != "assistant" {
			continue
		}
		if strings.TrimSpace(m.Content) == "" {
			continue
		}
		out = append(out, m)
	}
	return out
}

// stream forwards the chat to the upstream model and relays its SSE tokens to the client.
func (h *Handler) stream(w http.ResponseWriter, r *http.Request, msgs []chatMessage) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		writeSSEError(w, "Streaming unsupported.", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no") // disable proxy buffering (nginx/Caddy)

	// Pin the system prompt server-side; the client never supplies one (see sanitizeMessages).
	upMsgs := make([]chatMessage, 0, len(msgs)+1)
	if h.cfg.DemoSystemPrompt != "" {
		upMsgs = append(upMsgs, chatMessage{Role: "system", Content: h.cfg.DemoSystemPrompt})
	}
	upMsgs = append(upMsgs, msgs...)

	upstreamBody, _ := json.Marshal(map[string]any{
		"model":      h.cfg.ModelName,
		"messages":   upMsgs,
		"stream":     true,
		"max_tokens": h.cfg.DemoMaxTokens,
	})

	ctx, cancel := context.WithTimeout(r.Context(), 120*time.Second)
	defer cancel()

	upReq, err := http.NewRequestWithContext(ctx, http.MethodPost,
		h.cfg.ModelBaseURL+"/v1/chat/completions", bytes.NewReader(upstreamBody))
	if err != nil {
		writeSSEEvent(w, flusher, map[string]string{"type": "error", "message": "Demo offline."})
		return
	}
	upReq.Header.Set("Content-Type", "application/json")
	if h.cfg.ModelAPIKey != "" {
		upReq.Header.Set("Authorization", "Bearer "+h.cfg.ModelAPIKey)
	}

	resp, err := h.client.Do(upReq)
	if err != nil {
		log.Printf("llm: upstream unreachable: %v", err)
		writeSSEEvent(w, flusher, map[string]string{"type": "error", "message": "The demo is offline right now. Please try again later."})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		log.Printf("llm: upstream status %d", resp.StatusCode)
		writeSSEEvent(w, flusher, map[string]string{"type": "error", "message": "The demo is offline right now. Please try again later."})
		return
	}

	// Relay upstream OpenAI-style SSE → our simplified ChatStreamEvent SSE.
	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	for scanner.Scan() {
		line := scanner.Text()
		if line == "" || !bytes.HasPrefix([]byte(line), []byte("data:")) {
			continue
		}
		data := bytes.TrimSpace([]byte(line[len("data:"):]))
		if string(data) == "[DONE]" {
			break
		}
		var chunk struct {
			Choices []struct {
				Delta struct {
					Content string `json:"content"`
				} `json:"delta"`
			} `json:"choices"`
		}
		if err := json.Unmarshal(data, &chunk); err != nil {
			continue
		}
		for _, c := range chunk.Choices {
			if c.Delta.Content != "" {
				writeSSEEvent(w, flusher, map[string]string{"type": "token", "token": c.Delta.Content})
			}
		}
		// Stop if the client disconnected.
		select {
		case <-ctx.Done():
			return
		default:
		}
	}

	if err := scanner.Err(); err != nil {
		log.Printf("llm: stream read error: %v", err)
	}

	writeSSEEvent(w, flusher, map[string]string{"type": "done"})
}

func writeSSEEvent(w http.ResponseWriter, f http.Flusher, ev map[string]string) {
	b, _ := json.Marshal(ev)
	fmt.Fprintf(w, "data: %s\n\n", b)
	f.Flush()
}

// writeSSEError sends a one-shot error as a valid event-stream (before any streaming has
// started) so the client's SSE parser handles it uniformly, while also setting a real HTTP
// status (429/503/4xx) so log-based alerting, Cloudflare analytics, and WAF rules can see
// rate-limit / kill-switch events instead of a misleading 200.
func writeSSEError(w http.ResponseWriter, msg string, status int) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.WriteHeader(status)
	b, _ := json.Marshal(map[string]string{"type": "error", "message": msg})
	fmt.Fprintf(w, "data: %s\n\n", b)
	if f, ok := w.(http.Flusher); ok {
		f.Flush()
	}
}
