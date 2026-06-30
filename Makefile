# kobeyoung.net — developer commands.
# Run `make` (or `make help`) to list targets.

.DEFAULT_GOAL := help
SHELL := /bin/bash

.PHONY: help setup dev dev-mock dev-model dev-api dev-web build audit fmt vet clean \
        docker-up docker-down stop-model free-ports

# Name the local model container so we can stop it deterministically (a leftover
# `make dev-model` is the usual reason :9090 is "address already in use").
MODEL_CONTAINER := kobeyoung-model

help: ## List available commands
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN{FS=":.*?## "}{printf "  \033[1m%-14s\033[0m %s\n", $$1, $$2}'

setup: ## First-time setup: create .env files + install deps
	@[ -f api/.env ] || (cp api/.env.example api/.env && echo "created api/.env")
	@[ -f web/.env.local ] || (cp web/.env.example web/.env.local && echo "created web/.env.local")
	cd web && npm install
	cd api && go mod download
	@echo "Setup complete. Run 'make dev'."

dev: stop-model ## Run mock model + API + web together (Ctrl-C stops all)
	@echo "→ mock :9090  ·  api :8080  ·  web :3000   (Ctrl-C to stop)"
	@trap 'kill 0' EXIT INT TERM; \
		( cd api && PORT=9090 go run ./cmd/mockmodel ) & \
		( cd api && go run ./cmd/server ) & \
		( cd web && npm run dev ) & \
		wait

dev-mock: ## Run only the Go mock model backend (:9090, instant, no download)
	cd api && PORT=9090 go run ./cmd/mockmodel

dev-model: stop-model ## Run the REAL local model (llama.cpp + Qwen2.5-1.5B) on :9090 via Docker
	docker run --rm --name $(MODEL_CONTAINER) -p 9090:9090 -v llamacpp_cache:/root/.cache/llama.cpp \
		ghcr.io/ggml-org/llama.cpp:server \
		-hf Qwen/Qwen2.5-1.5B-Instruct-GGUF:Q4_K_M --host 0.0.0.0 --port 9090 -c 4096

stop-model: ## Stop the local llama.cpp model container (frees :9090)
	@docker rm -f $(MODEL_CONTAINER) >/dev/null 2>&1 && echo "stopped $(MODEL_CONTAINER)" || true
	@cid=$$(docker ps -q --filter publish=9090); \
		if [ -n "$$cid" ]; then docker stop $$cid >/dev/null && echo "stopped stray container on :9090 ($$cid)"; fi

free-ports: stop-model ## Free dev ports 9090/8080/3000 (stops model container + kills stray listeners)
	@for p in 9090 8080 3000; do \
		pids=$$(lsof -ti tcp:$$p 2>/dev/null); \
		if [ -n "$$pids" ]; then kill $$pids 2>/dev/null && echo "freed :$$p (killed $$pids)"; fi; \
	done
	@echo "ports clear."

dev-api: ## Run only the Go API (:8080)
	cd api && go run ./cmd/server

dev-web: ## Run only the Next.js frontend (:3000)
	cd web && npm run dev

build: ## Build production artifacts (Go binaries + Next.js)
	cd api && go build -o bin/server ./cmd/server && go build -o bin/mockmodel ./cmd/mockmodel
	cd web && npm run build

audit: ## Security checks: npm audit + go vet
	cd web && npm audit
	cd api && go vet ./...

fmt: ## Format Go code
	cd api && gofmt -w .

vet: ## Vet Go code
	cd api && go vet ./...

clean: ## Remove build artifacts
	rm -rf api/bin web/.next

docker-up: ## Run the whole stack via docker compose (Caddy + web + api + mock)
	cd deploy && docker compose up --build

docker-down: ## Stop the docker compose stack
	cd deploy && docker compose down
