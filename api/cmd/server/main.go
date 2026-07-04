// Command server is the public Go backend for kobeyoung.net.
//
// Endpoints:
//
//	POST /contact     — validated, spam-protected contact form → email via Resend
//	POST /chat        — SSE streaming proxy to the self-hosted LLM (with abuse controls)
//	GET  /health      — backend + upstream-model liveness for the demo online/offline UI
//	GET  /stats       — live model + host + site counters for the dashboard
//
// All secrets are read from the environment (see api/.env.example). The browser only
// ever talks to this service.
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/kobeyoung/kobeyoung-net/api/internal/config"
	"github.com/kobeyoung/kobeyoung-net/api/internal/contact"
	"github.com/kobeyoung/kobeyoung-net/api/internal/email"
	"github.com/kobeyoung/kobeyoung-net/api/internal/hoststat"
	"github.com/kobeyoung/kobeyoung-net/api/internal/llm"
	"github.com/kobeyoung/kobeyoung-net/api/internal/metrics"
	"github.com/kobeyoung/kobeyoung-net/api/internal/middleware"
	"github.com/kobeyoung/kobeyoung-net/api/internal/ratelimit"
	"github.com/kobeyoung/kobeyoung-net/api/internal/turnstile"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	ts := turnstile.New(cfg.TurnstileEnabled, cfg.TurnstileSecret)
	mailer := email.NewResend(cfg.ResendAPIKey)

	stop := make(chan struct{})
	defer close(stop)

	// In-memory metrics ("since last deploy") + a host sampler, both feeding GET /stats.
	metr := metrics.New(time.Now())
	host := hoststat.New()
	host.Start(2*time.Second, stop)

	contactLimiter := ratelimit.New(cfg.ContactPerIPPerMin, cfg.ContactPerIPPerDay, cfg.ContactGlobalPerDay)
	contactLimiter.StartJanitor(5*time.Minute, stop)

	// Per-IP daily cap (not 0) so a single client can't drain the whole global demo budget.
	demoLimiter := ratelimit.New(cfg.DemoPerIPPerMin, cfg.DemoPerIPPerDay, cfg.DemoGlobalPerDay)
	demoLimiter.StartJanitor(5*time.Minute, stop)

	healthHandler := llm.NewHealthHandler(cfg)

	mux := http.NewServeMux()
	mux.Handle("/contact", contact.NewHandler(cfg, contactLimiter, mailer, ts, metr))
	mux.Handle("/chat", llm.NewHandler(cfg, demoLimiter, ts, metr))
	mux.Handle("/health", healthHandler)
	mux.Handle("/stats", llm.NewStatsHandler(cfg, healthHandler, metr, host, demoLimiter))

	handler := middleware.Chain(mux,
		middleware.Recover,
		middleware.CountRequests(metr),
		middleware.SecurityHeaders,
		middleware.CORS(cfg.AllowedOrigins),
	)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
		// No WriteTimeout: the SSE demo stream is long-lived.
		IdleTimeout: 120 * time.Second,
	}

	go func() {
		log.Printf("api listening on :%s (turnstile=%v demo=%v)", cfg.Port, cfg.TurnstileEnabled, cfg.DemoEnabled)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server: %v", err)
		}
	}()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig
	log.Println("shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
}
