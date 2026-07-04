package llm

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/kobeyoung/kobeyoung-net/api/internal/config"
)

// healthTTL is how long a model-reachability result is cached, so a burst of /health GETs
// can't be amplified into a burst of upstream probes.
const healthTTL = 5 * time.Second

// HealthHandler reports backend liveness plus upstream model reachability, which the
// frontend uses to show the demo as online/offline.
type HealthHandler struct {
	cfg    *config.Config
	client *http.Client

	mu       sync.Mutex
	cachedAt time.Time
	cached   bool
}

func NewHealthHandler(cfg *config.Config) *HealthHandler {
	return &HealthHandler{cfg: cfg, client: &http.Client{Timeout: 3 * time.Second}}
}

func (h *HealthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	resp := map[string]any{"ok": true, "model": "offline"}
	if h.cfg.DemoEnabled && h.modelOnline(r.Context()) {
		resp["model"] = "online"
		resp["modelName"] = h.cfg.ModelName
		resp["modelParams"] = h.cfg.ModelParams
		resp["modelQuant"] = h.cfg.ModelQuant
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	_ = json.NewEncoder(w).Encode(resp)
}

// Online reports whether the demo is enabled and the upstream model is reachable, reusing
// the same cached probe as /health so /stats polling doesn't add upstream traffic.
func (h *HealthHandler) Online(ctx context.Context) bool {
	return h.cfg.DemoEnabled && h.modelOnline(ctx)
}

// modelOnline returns the cached reachability result when fresh, otherwise probes the
// model once and caches the outcome for healthTTL.
func (h *HealthHandler) modelOnline(ctx context.Context) bool {
	h.mu.Lock()
	if !h.cachedAt.IsZero() && time.Since(h.cachedAt) < healthTTL {
		v := h.cached
		h.mu.Unlock()
		return v
	}
	h.mu.Unlock()

	ok := h.modelReachable(ctx)

	h.mu.Lock()
	h.cached = ok
	h.cachedAt = time.Now()
	h.mu.Unlock()
	return ok
}

func (h *HealthHandler) modelReachable(ctx context.Context) bool {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, h.cfg.ModelBaseURL+"/health", nil)
	if err != nil {
		return false
	}
	resp, err := h.client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode < 300
}
