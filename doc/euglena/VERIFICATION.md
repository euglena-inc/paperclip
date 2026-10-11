# Gateway fork verification

Reviewed on 2026-10-11 against upstream base
`9ba5569030cc4f37e53906d19e13778c81c99ecc`. Operational credentials and connection
records stay in the instance database and are not part of this repository.

## Regression coverage

- Full `pnpm typecheck` and `pnpm build` passed with the repository's pinned
  pnpm 9.15.4 and Node 24.21.0.
- Server routing and vaulted connection tests: 129 passed. Includes local and
  Runner Pi/Grok projections, manual model registration, protocol rejection,
  credential isolation, sharing boundaries, grant revocation, and Pi thinking
  validation.
- UI connection/model/setup tests: 71 passed. Covers choosing an existing
  gateway for local Pi and Runner Pi without copying credentials or entering a
  subscription login flow.
- Runner TypeScript boundary/recovery tests: 97 passed. Covers explicit gateway
  destinations, native Pi credential templates, protected environment variables,
  and recovery identities.
- Rust ACPX sidecar integration tests: 16 passed, including isolated forwarding
  of the configured Grok destination and credential.
- UI token gates and whitespace checks passed.
- Full UI project: 721 files and 8,114 tests passed. Full CLI project: 66 files
  and 528 tests passed. Shared library: 89 files and 910 tests passed. Database:
  49 files and 180 tests passed.

The full `pnpm test:run` was attempted. Its real NXDOMAIN test in
`generic-mcp-connection.test.ts` fails on this machine: the DNS resolver returns
a proxy address for the reserved `.invalid` domain instead of NXDOMAIN. A
standalone rerun reproduced the same failure; direct DNS lookup confirmed the
environment mismatch. This file and its DNS behavior were not changed by the
gateway patch. The full suite is therefore **not recorded as green**. Remaining
test groups are executed independently so this failure cannot hide their
results.

A separate existing Codex app-server recovery test, “archives a damaged prior
epoch before completing guarded same-task replacement with real runnerd,” also
times out on the local runtime. A standalone rerun reproduced the 20-second
native-session deadline without completing the fake provider turn. That test
uses the Codex app-server path, rather than the modified ACPX Pi/Grok path; its
cause remains unresolved and is retained as a full-suite limitation.

Under concurrent load, a permission-router import hook and two GitHub launcher
shell tests initially timed out. Standalone reruns passed at the original
timeouts. A Gemini ACP path assertion initially compared macOS's `/var` alias
with its `/private/var` canonical path; all 14 tests passed when rerun with the
canonical temporary directory used by the repository's standard wrapper.
No assertion, timeout, or production behavior was weakened to obtain those
passes. The remaining adapter/plugin project run passed 2,049 tests before that
single path assertion; it is accounted for by the affected-suite rerun.

## Execution evidence

Pi 1.0.0 installed from the repository's distribution lock and local Pi 1.1.0
both completed a real CLI turn against a synthetic Chat Completions gateway.
The gateway checked the actual Authorization header and selected model ID.
This exposed and fixed the difference between a literal `OPENAI_API_KEY` value
and Pi's native `${OPENAI_API_KEY}` environment template. The generated provider
declaration also loaded in the actual Pi model registry.

Grok Build 1.0.44 completed a real CLI turn against a synthetic gateway,
discovering models and authenticating its Chat Completions requests through the
explicit custom endpoint. The fixture also exercised Grok's fallback from an
unsupported Responses endpoint.

The authorized live NewAPI deployment returned successful inference responses
for the following exact registered model IDs:

| Model ID | Chat Completions | Anthropic Messages | OpenAI Responses |
| --- | --- | --- | --- |
| `glm-5.3` | Passed | Passed | Failed: HTTP 400, provider code `400002` |
| `deepseek-flash` | Passed | Passed | Passed |
| `qwen38` | Passed | Passed | Passed |

The GLM Responses failure reproduced with both a simple input and structured,
streaming input. The upstream channel reported invalid/missing `messages`.
Use Chat Completions or Messages for GLM until the deployment's Responses
conversion is repaired. This repository does not add a gateway-specific
protocol workaround.

These results prove the tested inference and launch boundaries. They do not
establish a full tool-use, restart, or long-running task journey for every
model/harness pair. No browser release suite or cloud Runner deployment is
claimed by this review. Conservative generated Pi capability limits are local
client defaults, not advertised model limits.

See [CORE-RULES.md](CORE-RULES.md) for the fork's maintenance boundaries and
upstream merge procedure.
