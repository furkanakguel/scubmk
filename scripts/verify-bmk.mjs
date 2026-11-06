// Backward-compatible entry point for the current backend test suite.
await import('./verify-cms.mjs');
await import('./verify-cms-concurrency.mjs');

await import('./verify-membership.mjs');
await import('./verify-card-art.mjs');

await import('./verify-recovery.mjs');
