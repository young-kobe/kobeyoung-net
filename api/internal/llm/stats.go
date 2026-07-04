package llm

import (
	"encoding/json"
	"net/http"

	"github.com/kobeyoung/kobeyoung-net/api/internal/config"
	"github.com/kobeyoung/kobeyoung-net/api/internal/hoststat"
	"github.com/kobeyoung/kobeyoung-net/api/internal/metrics"
	"github.com/kobeyoung/kobeyoung-net/api/internal/ratelimit"
)

// StatsHandler serves GET /stats: a live snapshot of the model, the host box, and site
// counters, polled by the dashboard. Everything it reads is in-memory or cached, so it's
// cheap; a short CDN cache (below) lets Cloudflare absorb the polling. All figures are public
// by design — the point is to show the self-hosted stack actually working.
type StatsHandler struct {
	cfg    *config.Config
	health *HealthHandler
	metr   *metrics.Metrics
	host   *hoststat.Sampler
	demo   *ratelimit.Limiter
}

func NewStatsHandler(cfg *config.Config, health *HealthHandler, m *metrics.Metrics, host *hoststat.Sampler, demo *ratelimit.Limiter) *StatsHandler {
	return &StatsHandler{cfg: cfg, health: health, metr: m, host: host, demo: demo}
}

func (h *StatsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	online := h.health.Online(r.Context())
	m := h.metr.Snapshot()
	host := h.host.Get()
	usedToday, dailyCap := h.demo.GlobalSnapshot()

	resp := map[string]any{
		// Model name/params/quant are static config (not secret) so they render even while
		// offline; `online` drives the live/offline UI.
		"model": map[string]any{
			"online": online,
			"name":   h.cfg.ModelName,
			"params": h.cfg.ModelParams,
			"quant":  h.cfg.ModelQuant,
		},
		"generation": map[string]any{
			"lastTokPerSec":  m.LastTokPerSec,
			"lastTtftMs":     m.LastTTFTMs,
			"totalResponses": m.TotalResponses,
			"totalTokens":    m.TotalTokens,
			"responsesToday": usedToday,
			"dailyCap":       dailyCap,
		},
		"host": map[string]any{
			"cpuPct":     host.CPUPct,
			"memUsedPct": host.MemUsedPct,
			"load1":      host.Load1,
			"cores":      host.Cores,
			"uptimeSec":  host.UptimeSec,
		},
		"site": map[string]any{
			"uptimeSec": m.UptimeSec,
			"requests": map[string]any{
				"total":   m.ReqTotal,
				"chat":    m.ReqChat,
				"contact": m.ReqContact,
				"health":  m.ReqHealth,
			},
			"abuse": map[string]any{
				"honeypot":        m.HoneypotHits,
				"rateLimited":     m.RateLimitBlocks,
				"turnstileFailed": m.TurnstileFails,
			},
			"contactSent": m.ContactSent,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	// Let Cloudflare absorb the dashboard's polling instead of the origin. Tuned to the client
	// cadence (~4s poll): max-age >= the interval so consecutive polls can hit a fresh entry,
	// and stale-while-revalidate covers the boundary — the CDN serves the slightly-stale
	// snapshot instantly while refreshing in the background. A few seconds of lag is fine here.
	w.Header().Set("Cache-Control", "public, max-age=5, stale-while-revalidate=10")
	_ = json.NewEncoder(w).Encode(resp)
}
