# ── Build stage ───────────────────────────────────────────────────────────────
FROM golang:1.23-alpine AS build
WORKDIR /src

# No external deps, but copy go.mod for cache friendliness.
COPY go.mod ./
COPY . .

# Static binary, no CGO — runs on a scratch image.
ARG TARGET=./cmd/server
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/app ${TARGET}

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/app /app
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/app"]
