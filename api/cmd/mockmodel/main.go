// Command mockmodel is a stand-in for the real self-hosted inference engine. It speaks
// the OpenAI-compatible surface the proxy expects, so the live demo works end-to-end
// before the real engine exists:
//
//	GET  /health                 — liveness
//	POST /v1/chat/completions    — streaming (SSE) token-by-token completion
//
// Swap this out by pointing MODEL_BASE_URL at your real engine; no proxy changes needed.
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "9090"
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"ok":true}`))
	})
	mux.HandleFunc("/v1/chat/completions", handleChat)

	log.Printf("mock model listening on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}

func handleChat(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Messages []struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"messages"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	var lastUser string
	for i := len(req.Messages) - 1; i >= 0; i-- {
		if req.Messages[i].Role == "user" {
			lastUser = req.Messages[i].Content
			break
		}
	}

	reply := fmt.Sprintf(
		"Hello! This is the mock model backend standing in for Kobe's self-hosted inference engine. "+
			"You said: %q. When the real engine is wired in (set MODEL_BASE_URL), this same streaming "+
			"interface will serve an open-source LLM.", strings.TrimSpace(lastUser))

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	for _, tok := range tokenize(reply) {
		chunk := map[string]any{
			"choices": []map[string]any{
				{"delta": map[string]string{"content": tok}},
			},
		}
		b, _ := json.Marshal(chunk)
		fmt.Fprintf(w, "data: %s\n\n", b)
		flusher.Flush()
		time.Sleep(25 * time.Millisecond) // simulate generation latency
	}
	fmt.Fprint(w, "data: [DONE]\n\n")
	flusher.Flush()
}

// tokenize splits into word-ish chunks (keeping trailing spaces) to mimic token streaming.
func tokenize(s string) []string {
	words := strings.SplitAfter(s, " ")
	return words
}
