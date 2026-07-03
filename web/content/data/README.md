# Benchmark data (copied — not the source of truth)

These CSVs are **copied** from the `mini-inference-engine` repo at
`docs/results/` (the benchmark harness is `bench/bench.cpp` there). They drive the
inline-SVG figures on the Mini Inference Engine writeup via `lib/bench.ts`.

**Source of truth is the engine repo.** Re-copy these files after re-running the
benchmark (`./build/bench/mie_bench`). Once the engine goes live on this site, the
plan is to pull them at build time from the engine repo instead of copying by hand.

Honesty note (from the engine repo): the compute path is not implemented yet, so
there is **no wall-clock tokens/sec** figure. Every number here is a *memory* or
*scheduling* figure, measured as a relative comparison against a naive baseline —
which is the whole point of the project. Wall-clock lands with the forward pass.
