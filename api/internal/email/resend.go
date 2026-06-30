// Package email sends transactional mail via the Resend HTTP API using only the
// standard library (no SDK = smaller dependency/audit surface).
//
// Security properties enforced by the caller (package contact):
//   - mail is sent ONLY to the site owner (cfg.ContactTo); the submitter's address
//     is used solely as Reply-To. We never send to a user-supplied recipient.
//   - submitted content is delivered as plain text, never reflected into any web page.
package email

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const resendURL = "https://api.resend.com/emails"

type Client struct {
	apiKey string
	http   *http.Client
}

func NewResend(apiKey string) *Client {
	return &Client{apiKey: apiKey, http: &http.Client{Timeout: 10 * time.Second}}
}

type Message struct {
	From    string
	To      string
	ReplyTo string
	Subject string
	Text    string // plain text only
}

func (c *Client) Send(ctx context.Context, m Message) error {
	if c.apiKey == "" {
		return fmt.Errorf("resend: missing API key")
	}

	payload := map[string]any{
		"from":    m.From,
		"to":      []string{m.To}, // recipient is always the configured owner
		"subject": m.Subject,
		"text":    m.Text,
	}
	if m.ReplyTo != "" {
		payload["reply_to"] = m.ReplyTo
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, resendURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return fmt.Errorf("resend: status %d: %s", resp.StatusCode, string(b))
	}
	return nil
}
