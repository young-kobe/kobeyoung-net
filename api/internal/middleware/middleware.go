// Package middleware holds cross-cutting HTTP middleware: CORS locked to the site's
// own origin, security headers, panic recovery, and client-IP extraction.
package middleware

import (
	"log"
	"net"
	"net/http"
	"strings"

	"github.com/kobeyoung/kobeyoung-net/api/internal/metrics"
)

// Chain applies middlewares in order (outermost first).
func Chain(h http.Handler, mws ...func(http.Handler) http.Handler) http.Handler {
	for i := len(mws) - 1; i >= 0; i-- {
		h = mws[i](h)
	}
	return h
}

// CountRequests tallies each request by endpoint for the /stats dashboard. It counts only
// the real user endpoints (chat/contact/health); /stats itself is intentionally excluded so
// polling it doesn't inflate the totals.
func CountRequests(m *metrics.Metrics) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			m.CountRequest(strings.TrimPrefix(r.URL.Path, "/"))
			next.ServeHTTP(w, r)
		})
	}
}

// CORS allows only the configured origins. The browser only ever talks to this
// backend, so the allowlist is the site's own domain(s).
func CORS(allowed []string) func(http.Handler) http.Handler {
	set := make(map[string]bool, len(allowed))
	for _, o := range allowed {
		set[o] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin != "" && set[origin] {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Vary", "Origin")
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
				w.Header().Set("Access-Control-Max-Age", "600")
			}
			if r.Method == http.MethodOptions {
				// Reject preflight from disallowed origins.
				if origin != "" && !set[origin] {
					http.Error(w, "origin not allowed", http.StatusForbidden)
					return
				}
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// SecurityHeaders adds defense-in-depth headers. Note: the strict Content-Security-
// Policy that protects the rendered site is set by the frontend/Caddy in front of the
// HTML; these headers harden the API's own (JSON/SSE) responses.
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		h.Set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
		next.ServeHTTP(w, r)
	})
}

// safeWriter records whether anything has been written so panic recovery can avoid
// injecting a 500 into an already-started (e.g. SSE) response.
type safeWriter struct {
	http.ResponseWriter
	wrote bool
}

func (s *safeWriter) WriteHeader(code int) { s.wrote = true; s.ResponseWriter.WriteHeader(code) }
func (s *safeWriter) Write(b []byte) (int, error) {
	s.wrote = true
	return s.ResponseWriter.Write(b)
}

// Flush keeps the streaming (http.Flusher) capability intact through the wrapper, so the
// SSE demo handler still type-asserts successfully.
func (s *safeWriter) Flush() {
	if f, ok := s.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

// Recover turns panics into 500s instead of crashing the server. If the response has
// already started streaming, it logs and drops the connection rather than writing a bogus
// 500 (which would corrupt the in-flight event-stream).
func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sw := &safeWriter{ResponseWriter: w}
		defer func() {
			if rec := recover(); rec != nil {
				log.Printf("panic: %v", rec)
				if !sw.wrote {
					http.Error(sw, "internal error", http.StatusInternalServerError)
				}
			}
		}()
		next.ServeHTTP(sw, r)
	})
}

// ClientIP extracts the best-effort client IP. CF-Connecting-IP / X-Forwarded-For are
// trusted ONLY when trustProxyHeaders is true — which is sound only if ingress is locked
// to Cloudflare (see config.TrustProxyHeaders). Otherwise these headers are attacker-
// controlled, so we fall back to the real TCP peer (RemoteAddr).
func ClientIP(r *http.Request, trustProxyHeaders bool) string {
	if trustProxyHeaders {
		if cf := r.Header.Get("CF-Connecting-IP"); cf != "" {
			return cf
		}
		if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
			// First entry is the original client.
			first, _, _ := strings.Cut(xff, ",")
			return strings.TrimSpace(first)
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
