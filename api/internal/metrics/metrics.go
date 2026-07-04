// Package metrics is the process-wide, in-memory counter store behind GET /stats. Every
// number here is "since last deploy": it lives in RAM and resets on restart, which the
// dashboard labels honestly. No third-party deps — plain sync/atomic counters plus one
// mutex for the multi-field generation snapshot, suitable for the single-instance box.
package metrics

import (
	"sync"
	"sync/atomic"
	"time"
)

// Metrics holds every counter the dashboard reports. Construct with New and share the one
// instance across handlers + middleware; all methods are safe for concurrent use.
type Metrics struct {
	start time.Time

	// Traffic (per-endpoint request counts; reqTotal is their sum).
	reqTotal   atomic.Int64
	reqChat    atomic.Int64
	reqContact atomic.Int64
	reqHealth  atomic.Int64

	// Abuse deflected — incremented exactly where each defense fires.
	honeypotHits    atomic.Int64
	rateLimitBlocks atomic.Int64
	turnstileFails  atomic.Int64

	// Contact form messages actually delivered.
	contactSent atomic.Int64

	// Generation stats (multi-field → guarded together so a Snapshot is internally consistent).
	genMu          sync.Mutex
	lastTokPerSec  float64
	lastTTFTMs     int64
	totalResponses int64
	totalTokens    int64
}

// New returns a Metrics whose uptime is measured from start (pass time.Now()).
func New(start time.Time) *Metrics { return &Metrics{start: start} }

// CountRequest records one request against a named endpoint ("chat"/"contact"/"health").
// Unknown names are ignored so polling of /stats itself never inflates the totals.
func (m *Metrics) CountRequest(endpoint string) {
	switch endpoint {
	case "chat":
		m.reqChat.Add(1)
	case "contact":
		m.reqContact.Add(1)
	case "health":
		m.reqHealth.Add(1)
	default:
		return
	}
	m.reqTotal.Add(1)
}

func (m *Metrics) HoneypotHit()    { m.honeypotHits.Add(1) }
func (m *Metrics) RateLimitBlock() { m.rateLimitBlocks.Add(1) }
func (m *Metrics) TurnstileFail()  { m.turnstileFails.Add(1) }
func (m *Metrics) ContactSent()    { m.contactSent.Add(1) }

// RecordGeneration folds one completed demo response into the generation stats.
func (m *Metrics) RecordGeneration(tokens int, ttftMs int64, tokPerSec float64) {
	m.genMu.Lock()
	m.lastTokPerSec = tokPerSec
	m.lastTTFTMs = ttftMs
	m.totalResponses++
	m.totalTokens += int64(tokens)
	m.genMu.Unlock()
}

// Snapshot is an immutable, point-in-time copy of every counter for one /stats response.
type Snapshot struct {
	UptimeSec int64

	ReqTotal   int64
	ReqChat    int64
	ReqContact int64
	ReqHealth  int64

	HoneypotHits    int64
	RateLimitBlocks int64
	TurnstileFails  int64
	ContactSent     int64

	LastTokPerSec  float64
	LastTTFTMs     int64
	TotalResponses int64
	TotalTokens    int64
}

// Snapshot reads all counters. Atomic loads aren't a single instant relative to each other,
// but for a human-facing dashboard that's immaterial; the generation block is consistent.
func (m *Metrics) Snapshot() Snapshot {
	m.genMu.Lock()
	tps, ttft, resp, toks := m.lastTokPerSec, m.lastTTFTMs, m.totalResponses, m.totalTokens
	m.genMu.Unlock()

	return Snapshot{
		UptimeSec:       int64(time.Since(m.start).Seconds()),
		ReqTotal:        m.reqTotal.Load(),
		ReqChat:         m.reqChat.Load(),
		ReqContact:      m.reqContact.Load(),
		ReqHealth:       m.reqHealth.Load(),
		HoneypotHits:    m.honeypotHits.Load(),
		RateLimitBlocks: m.rateLimitBlocks.Load(),
		TurnstileFails:  m.turnstileFails.Load(),
		ContactSent:     m.contactSent.Load(),
		LastTokPerSec:   tps,
		LastTTFTMs:      ttft,
		TotalResponses:  resp,
		TotalTokens:     toks,
	}
}
