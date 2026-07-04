// Package ratelimit provides in-memory rate limiting suitable for a single-instance
// deployment (your Hetzner box behind Caddy + Cloudflare). It combines:
//   - per-IP sliding windows (per-minute and per-day)
//   - a global per-day cap (abuse + cost kill-switch)
//
// If you ever scale the API to multiple instances, swap the Store interface for a
// Redis-backed implementation — call sites won't change.
package ratelimit

import (
	"sync"
	"time"
)

// defaultMaxKeys bounds how many distinct per-IP entries each window map may hold, so a
// flood of distinct keys can't grow the heap without limit (memory-exhaustion DoS). Once
// reached, expired entries are pruned inline and, if still full, new keys are denied
// (fail closed). With TrustProxyHeaders=false the key is the real TCP peer, so real
// cardinality is small; this cap is the backstop.
const defaultMaxKeys = 50_000

// Limiter tracks request counts per key across two windows plus a global counter.
type Limiter struct {
	mu          sync.Mutex
	perIPMinute map[string]*window
	perIPDay    map[string]*window
	global      *window

	maxPerMin int
	maxPerDay int
	maxGlobal int
	maxKeys   int
	now       func() time.Time
}

type window struct {
	count int
	reset time.Time
}

func New(maxPerMin, maxPerDay, maxGlobalPerDay int) *Limiter {
	return &Limiter{
		perIPMinute: make(map[string]*window),
		perIPDay:    make(map[string]*window),
		global:      &window{},
		maxPerMin:   maxPerMin,
		maxPerDay:   maxPerDay,
		maxGlobal:   maxGlobalPerDay,
		maxKeys:     defaultMaxKeys,
		now:         time.Now,
	}
}

// Allow reports whether a request from ip may proceed, and consumes a token if so.
func (l *Limiter) Allow(ip string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.now()

	if l.maxGlobal > 0 && !checkAndReserve(l.global, now, 24*time.Hour, l.maxGlobal) {
		return false
	}
	if l.maxPerMin > 0 {
		w, ok := l.getWindow(l.perIPMinute, ip, now)
		if !ok || !checkAndReserve(w, now, time.Minute, l.maxPerMin) {
			return false
		}
	}
	if l.maxPerDay > 0 {
		w, ok := l.getWindow(l.perIPDay, ip, now)
		if !ok || !checkAndReserve(w, now, 24*time.Hour, l.maxPerDay) {
			return false
		}
	}

	// All gates passed — commit the consumption.
	if l.maxGlobal > 0 {
		l.global.count++
	}
	if l.maxPerMin > 0 {
		l.perIPMinute[ip].count++
	}
	if l.maxPerDay > 0 {
		l.perIPDay[ip].count++
	}
	return true
}

// GlobalSnapshot returns the current global daily count and its cap, without consuming a
// slot — for the dashboard's "responses today" gauge. A count past the window's reset reads
// as 0 (the next Allow would roll it over).
func (l *Limiter) GlobalSnapshot() (count, max int) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.now().After(l.global.reset) {
		return 0, l.maxGlobal
	}
	return l.global.count, l.maxGlobal
}

// checkAndReserve resets the window if expired and reports whether there's headroom.
// It does NOT increment (so a later gate failing doesn't waste a slot).
func checkAndReserve(w *window, now time.Time, dur time.Duration, max int) bool {
	if now.After(w.reset) {
		w.count = 0
		w.reset = now.Add(dur)
	}
	return w.count < max
}

// getWindow returns the window for ip, creating it if absent. To bound memory it caps the
// map at maxKeys: on overflow it first prunes expired entries, and if the map is still
// full it returns ok=false so the caller denies the request (fail closed).
func (l *Limiter) getWindow(m map[string]*window, ip string, now time.Time) (w *window, ok bool) {
	if w = m[ip]; w != nil {
		return w, true
	}
	if len(m) >= l.maxKeys {
		for k, e := range m {
			if now.After(e.reset) {
				delete(m, k)
			}
		}
		if len(m) >= l.maxKeys {
			return nil, false
		}
	}
	w = &window{}
	m[ip] = w
	return w, true
}

// Cleanup drops stale per-IP entries to bound memory. Call periodically.
func (l *Limiter) Cleanup() {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.now()
	for k, w := range l.perIPMinute {
		if now.After(w.reset) {
			delete(l.perIPMinute, k)
		}
	}
	for k, w := range l.perIPDay {
		if now.After(w.reset) {
			delete(l.perIPDay, k)
		}
	}
}

// StartJanitor runs Cleanup on an interval until the channel is closed.
func (l *Limiter) StartJanitor(every time.Duration, stop <-chan struct{}) {
	t := time.NewTicker(every)
	go func() {
		defer t.Stop()
		for {
			select {
			case <-t.C:
				l.Cleanup()
			case <-stop:
				return
			}
		}
	}()
}
