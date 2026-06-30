// Package turnstile verifies Cloudflare Turnstile tokens server-side.
//
// The seam is always present; it only enforces when cfg.TurnstileEnabled is true.
// Local dev runs with TURNSTILE_ENABLED=false (Verify returns nil). Before deploy,
// set TURNSTILE_ENABLED=true and provide TURNSTILE_SECRET — no code change needed.
package turnstile

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const verifyURL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

type Verifier struct {
	enabled bool
	secret  string
	client  *http.Client
}

func New(enabled bool, secret string) *Verifier {
	return &Verifier{
		enabled: enabled,
		secret:  secret,
		client:  &http.Client{Timeout: 5 * time.Second},
	}
}

// ErrFailed is returned when a token is missing or rejected by Cloudflare.
var ErrFailed = errors.New("turnstile verification failed")

// Verify checks the token. When disabled, it is a no-op (returns nil) so the rest of
// the spam defenses (honeypot, time-trap, rate limits) still run in local dev.
func (v *Verifier) Verify(ctx context.Context, token, ip string) error {
	if !v.enabled {
		return nil
	}
	if token == "" {
		return ErrFailed
	}

	form := url.Values{
		"secret":   {v.secret},
		"response": {token},
	}
	if ip != "" {
		form.Set("remoteip", ip)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, verifyURL,
		strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := v.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var out struct {
		Success    bool     `json:"success"`
		ErrorCodes []string `json:"error-codes"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return err
	}
	if !out.Success {
		return ErrFailed
	}
	return nil
}
