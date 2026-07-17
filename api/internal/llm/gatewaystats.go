package llm

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/kobeyoung/kobeyoung-net/api/internal/config"
)

// gatewayStatsTTL caches the upstream /stats result so a burst of dashboard polls from the
// /gateway page can't be amplified into a burst of upstream requests to the gateway.
const gatewayStatsTTL = 2 * time.Second

// maxGatewayStatsBytes bounds how much of the upstream body we'll buffer — the gateway's
// stats payload is a few hundred bytes; this just stops a misbehaving upstream from
// streaming something huge into memory.
const maxGatewayStatsBytes = 64 * 1024

// GatewayStatsHandler proxies the ts-llm-gateway's public GET /stats through this backend so
// the browser only ever talks to us (never Vercel directly). The upstream body is relayed
// verbatim under a `stats` field; `online` reflects whether the gateway demo is enabled and
// the fetch succeeded, so the page can show a graceful offline state.
type GatewayStatsHandler struct {
	enabled bool
	baseURL string
	client  *http.Client

	mu       sync.Mutex
	cachedAt time.Time
	cached   []byte // last good raw upstream body
}

func NewGatewayStatsHandler(cfg *config.Config) *GatewayStatsHandler {
	return &GatewayStatsHandler{
		enabled: cfg.GatewayEnabled,
		baseURL: cfg.GatewayBaseURL,
		client:  &http.Client{Timeout: 3 * time.Second},
	}
}

func (h *GatewayStatsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")

	if !h.enabled {
		_ = json.NewEncoder(w).Encode(map[string]any{"online": false})
		return
	}

	raw := h.fetch(r.Context())
	if raw == nil {
		_ = json.NewEncoder(w).Encode(map[string]any{"online": false})
		return
	}
	// Relay the upstream JSON verbatim; we don't re-model the gateway's schema here.
	out := append([]byte(`{"online":true,"stats":`), raw...)
	out = append(out, '}')
	_, _ = w.Write(out)
}

// fetch returns the upstream stats body, served from a short-lived cache when fresh and
// re-fetched otherwise. On a fetch failure it falls back to the last good body (if any) so a
// transient blip doesn't blank the dashboard; returns nil only when nothing is available.
func (h *GatewayStatsHandler) fetch(ctx context.Context) []byte {
	h.mu.Lock()
	if h.cached != nil && !h.cachedAt.IsZero() && time.Since(h.cachedAt) < gatewayStatsTTL {
		b := h.cached
		h.mu.Unlock()
		return b
	}
	h.mu.Unlock()

	body := h.get(ctx)

	h.mu.Lock()
	defer h.mu.Unlock()
	if body != nil {
		h.cached = body
		h.cachedAt = time.Now()
	}
	return h.cached // fresh body, or last-good on failure, or nil if never fetched
}

func (h *GatewayStatsHandler) get(ctx context.Context) []byte {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, h.baseURL+"/stats", nil)
	if err != nil {
		return nil
	}
	resp, err := h.client.Do(req)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return nil
	}
	b, err := io.ReadAll(io.LimitReader(resp.Body, maxGatewayStatsBytes))
	if err != nil || !json.Valid(b) {
		return nil
	}
	return b
}
