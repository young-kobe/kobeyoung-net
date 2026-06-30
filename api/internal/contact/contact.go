// Package contact implements POST /contact with layered spam defense:
//
//  1. Turnstile (when enabled)        — proves a real browser
//  2. Honeypot field                  — bots fill a hidden input → silent drop
//  3. Time-trap                       — reject submits < MinFillTime or stale forms
//  4. Per-IP + global rate limiting   — handled by the caller-supplied Limiter
//  5. Strict validation + length caps — all fields are untrusted text
//
// The endpoint emails ONLY the site owner; the submitter's address is used solely as
// Reply-To. Submitted content is never stored and never reflected back to any page.
package contact

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/mail"
	"strings"
	"time"
	"unicode"

	"github.com/kobeyoung/kobeyoung-net/api/internal/config"
	"github.com/kobeyoung/kobeyoung-net/api/internal/email"
	"github.com/kobeyoung/kobeyoung-net/api/internal/middleware"
	"github.com/kobeyoung/kobeyoung-net/api/internal/ratelimit"
	"github.com/kobeyoung/kobeyoung-net/api/internal/turnstile"
)

const (
	maxName      = 100
	maxEmail     = 254
	maxMessage   = 5000
	maxBodyBytes = 64 * 1024 // hard request-body cap
)

type request struct {
	Name           string `json:"name"`
	Email          string `json:"email"`
	Message        string `json:"message"`
	Company        string `json:"company"`    // honeypot
	RenderedAt     int64  `json:"renderedAt"` // unix millis
	TurnstileToken string `json:"turnstileToken"`
}

type response struct {
	OK      bool   `json:"ok"`
	Message string `json:"message"`
}

type Handler struct {
	cfg       *config.Config
	limiter   *ratelimit.Limiter
	mailer    *email.Client
	turnstile *turnstile.Verifier
}

func NewHandler(cfg *config.Config, lim *ratelimit.Limiter, mailer *email.Client, ts *turnstile.Verifier) *Handler {
	return &Handler{cfg: cfg, limiter: lim, mailer: mailer, turnstile: ts}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, response{false, "method not allowed"})
		return
	}

	ip := middleware.ClientIP(r, h.cfg.TrustProxyHeaders)

	// Rate limit early — cheap, before parsing/verification work.
	if !h.limiter.Allow(ip) {
		writeJSON(w, http.StatusTooManyRequests, response{false, "Too many requests. Please try again later."})
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	var req request
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, response{false, "Invalid request."})
		return
	}

	// (2) Honeypot — a real user never fills this hidden field. Pretend success so
	// bots get no signal, but send nothing.
	if strings.TrimSpace(req.Company) != "" {
		log.Printf("contact: honeypot triggered ip=%s", ip)
		writeJSON(w, http.StatusOK, response{true, "Thanks — your message has been sent."})
		return
	}

	// (3) Time-trap.
	if !validTiming(req.RenderedAt, h.cfg.ContactMinFillTime, h.cfg.ContactMaxFormAge) {
		log.Printf("contact: time-trap triggered ip=%s renderedAt=%d", ip, req.RenderedAt)
		// Behave like the honeypot — opaque to bots.
		writeJSON(w, http.StatusOK, response{true, "Thanks — your message has been sent."})
		return
	}

	// (1) Turnstile (no-op when disabled).
	if err := h.turnstile.Verify(r.Context(), req.TurnstileToken, ip); err != nil {
		writeJSON(w, http.StatusBadRequest, response{false, "Verification failed. Please retry."})
		return
	}

	// (5) Validation + normalization.
	name, emailAddr, message, verr := validate(req)
	if verr != "" {
		writeJSON(w, http.StatusBadRequest, response{false, verr})
		return
	}

	subject := fmt.Sprintf("%s %s", h.cfg.ContactSubjectTag, name)
	text := buildBody(name, emailAddr, message, ip)

	ctx, cancel := context.WithTimeout(r.Context(), 12*time.Second)
	defer cancel()
	if err := h.mailer.Send(ctx, email.Message{
		From:    h.cfg.ContactFrom,
		To:      h.cfg.ContactTo, // owner only
		ReplyTo: emailAddr,       // submitter as reply-to ONLY
		Subject: subject,
		Text:    text,
	}); err != nil {
		log.Printf("contact: send failed: %v", err)
		writeJSON(w, http.StatusBadGateway, response{false, "Could not send right now. Please try again later."})
		return
	}

	writeJSON(w, http.StatusOK, response{true, "Thanks — your message has been sent."})
}

func validTiming(renderedAtMs int64, minFill, maxAge time.Duration) bool {
	if renderedAtMs <= 0 {
		return false
	}
	rendered := time.UnixMilli(renderedAtMs)
	elapsed := time.Since(rendered)
	if elapsed < minFill {
		return false // too fast → bot
	}
	if elapsed > maxAge {
		return false // stale / replayed
	}
	return true
}

func validate(req request) (name, emailAddr, message, errMsg string) {
	// Strip control chars. name feeds the email Subject — drop ALL control chars (incl.
	// CR/LF) so it can never carry a header-injection payload if the mailer is ever swapped
	// for raw SMTP. message keeps newlines/tabs (it's the body) but loses other controls.
	name = stripControl(strings.TrimSpace(req.Name), false)
	emailAddr = strings.TrimSpace(req.Email)
	message = stripControl(strings.TrimSpace(req.Message), true)

	if name == "" || len([]rune(name)) > maxName {
		return "", "", "", "Please provide a valid name."
	}
	if emailAddr == "" || len(emailAddr) > maxEmail {
		return "", "", "", "Please provide a valid email."
	}
	addr, err := mail.ParseAddress(emailAddr)
	if err != nil {
		return "", "", "", "Please provide a valid email."
	}
	emailAddr = addr.Address
	if message == "" || len([]rune(message)) > maxMessage {
		return "", "", "", "Please provide a message (max 5000 characters)."
	}
	return name, emailAddr, message, ""
}

// stripControl removes Unicode control characters. When keepWhitespace is true, common
// body whitespace (newline, carriage return, tab) is preserved; otherwise everything in
// the control range is dropped (used for single-line fields like the email subject).
func stripControl(s string, keepWhitespace bool) string {
	return strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			if keepWhitespace && (r == '\n' || r == '\r' || r == '\t') {
				return r
			}
			return -1
		}
		return r
	}, s)
}

func buildBody(name, emailAddr, message, ip string) string {
	var b strings.Builder
	b.WriteString("New contact form submission\n")
	b.WriteString("===========================\n\n")
	fmt.Fprintf(&b, "Name:  %s\n", name)
	fmt.Fprintf(&b, "Email: %s\n", emailAddr)
	fmt.Fprintf(&b, "IP:    %s\n\n", ip)
	b.WriteString("Message:\n")
	b.WriteString(message)
	b.WriteString("\n")
	return b.String()
}

func writeJSON(w http.ResponseWriter, status int, v response) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
