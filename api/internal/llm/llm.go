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
	"github.com/kobeyoung/kobeyoung-net/api/internal/metrics"
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

// upstream captures everything that differs between the two live chats — the self-hosted
// model and the ts-llm-gateway → Bedrock proxy — so the abuse controls and SSE relay below
// are written once and shared. Input/history caps are the same for both.
type upstream struct {
	enabled       bool
	baseURL       string // OpenAI-style base; the handler appends /v1/chat/completions
	apiKey        string
	model         string
	systemPrompt  string
	maxTokens     int
	maxInputChars int
	maxHistory    int
	recordMetrics bool // only the self-hosted chat feeds the site's /stats generation counters
}

type Handler struct {
	up        upstream
	trustXFF  bool
	limiter   *ratelimit.Limiter
	turnstile *turnstile.Verifier
	metrics   *metrics.Metrics
	client    *http.Client
}

// NewHandler builds the self-hosted-model chat (KobeLLM) at /chat.
func NewHandler(cfg *config.Config, lim *ratelimit.Limiter, ts *turnstile.Verifier, m *metrics.Metrics) *Handler {
	return newHandler(upstream{
		enabled:       cfg.DemoEnabled,
		baseURL:       cfg.ModelBaseURL,
		apiKey:        cfg.ModelAPIKey,
		model:         cfg.ModelName,
		systemPrompt:  cfg.DemoSystemPrompt,
		maxTokens:     cfg.DemoMaxTokens,
		maxInputChars: cfg.DemoMaxInputChars,
		maxHistory:    cfg.DemoMaxHistory,
		recordMetrics: true,
	}, cfg.TrustProxyHeaders, lim, ts, m)
}

// NewGatewayHandler builds the gateway-backed chat at /gateway — same relay, different
// upstream, its own kill-switch/limiter. Generation timings are NOT recorded into the
// self-hosted /stats dashboard (different model, different provider).
func NewGatewayHandler(cfg *config.Config, lim *ratelimit.Limiter, ts *turnstile.Verifier, m *metrics.Metrics) *Handler {
	return newHandler(upstream{
		enabled:       cfg.GatewayEnabled,
		baseURL:       cfg.GatewayBaseURL,
		apiKey:        cfg.GatewayAPIKey,
		model:         cfg.GatewayModel,
		systemPrompt:  cfg.GatewaySystemPrompt,
		maxTokens:     cfg.GatewayMaxTokens,
		maxInputChars: cfg.DemoMaxInputChars,
		maxHistory:    cfg.DemoMaxHistory,
		recordMetrics: false,
	}, cfg.TrustProxyHeaders, lim, ts, m)
}

func newHandler(up upstream, trustXFF bool, lim *ratelimit.Limiter, ts *turnstile.Verifier, m *metrics.Metrics) *Handler {
	return &Handler{
		up:        up,
		trustXFF:  trustXFF,
		limiter:   lim,
		turnstile: ts,
		metrics:   m,
		client:    &http.Client{Timeout: 120 * time.Second},
	}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if !h.up.enabled {
		writeSSEError(w, "The live demo is currently disabled.", http.StatusServiceUnavailable)
		return
	}

	ip := middleware.ClientIP(r, h.trustXFF)
	if !h.limiter.Allow(ip) {
		h.metrics.RateLimitBlock()
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
		h.metrics.TurnstileFail()
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
	if len([]rune(newInput)) > h.up.maxInputChars {
		writeSSEError(w, fmt.Sprintf("Message too long (limit %d characters).", h.up.maxInputChars), http.StatusBadRequest)
		return
	}

	// Bound history: keep only the most recent N messages before forwarding upstream.
	if h.up.maxHistory > 0 && len(msgs) > h.up.maxHistory {
		msgs = msgs[len(msgs)-h.up.maxHistory:]
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
	if h.up.systemPrompt != "" {
		upMsgs = append(upMsgs, chatMessage{Role: "system", Content: h.up.systemPrompt})
	}
	upMsgs = append(upMsgs, msgs...)

	upstreamBody, _ := json.Marshal(map[string]any{
		"model":      h.up.model,
		"messages":   upMsgs,
		"stream":     true,
		"max_tokens": h.up.maxTokens,
	})

	ctx, cancel := context.WithTimeout(r.Context(), 120*time.Second)
	defer cancel()

	upReq, err := http.NewRequestWithContext(ctx, http.MethodPost,
		h.up.baseURL+"/v1/chat/completions", bytes.NewReader(upstreamBody))
	if err != nil {
		writeSSEEvent(w, flusher, map[string]string{"type": "error", "message": "Demo offline."})
		return
	}
	upReq.Header.Set("Content-Type", "application/json")
	if h.up.apiKey != "" {
		upReq.Header.Set("Authorization", "Bearer "+h.up.apiKey)
	}

	reqStart := time.Now()
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

	// Relay upstream OpenAI-style SSE → our simplified ChatStreamEvent SSE, tracking timing so
	// the terminating `done` event can report how the model actually performed.
	var tokens int
	var firstTokenAt time.Time
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
				if tokens == 0 {
					firstTokenAt = time.Now()
				}
				tokens++
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

	stats := streamStatsFor(tokens, reqStart, firstTokenAt)
	if stats != nil && h.up.recordMetrics {
		h.metrics.RecordGeneration(stats.Tokens, stats.TTFTMs, stats.TokPerSec)
	}
	writeSSEDone(w, flusher, stats)
}

type streamStats struct {
	Tokens    int     `json:"tokens"`
	TTFTMs    int64   `json:"ttftMs"`
	TokPerSec float64 `json:"tokPerSec"`
}

// streamStatsFor computes generation metrics for one response, or nil when nothing streamed
// (offline/empty). TTFT is the wait until the first token; throughput is measured over the
// decode window (tokens after the first), which is the honest "generation speed" figure.
func streamStatsFor(tokens int, reqStart, firstTokenAt time.Time) *streamStats {
	if tokens == 0 || firstTokenAt.IsZero() {
		return nil
	}
	s := &streamStats{Tokens: tokens, TTFTMs: firstTokenAt.Sub(reqStart).Milliseconds()}
	if decode := time.Since(firstTokenAt).Seconds(); decode > 0 && tokens > 1 {
		s.TokPerSec = float64(tokens-1) / decode
	}
	return s
}

func writeSSEEvent(w http.ResponseWriter, f http.Flusher, ev map[string]string) {
	b, _ := json.Marshal(ev)
	fmt.Fprintf(w, "data: %s\n\n", b)
	f.Flush()
}

// writeSSEDone emits the terminating event, attaching generation stats when available.
func writeSSEDone(w http.ResponseWriter, f http.Flusher, stats *streamStats) {
	ev := map[string]any{"type": "done"}
	if stats != nil {
		ev["stats"] = stats
	}
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
