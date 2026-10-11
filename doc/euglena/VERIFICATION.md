# Gateway fork verification

Reviewed on 2026-10-11 against upstream base
`9ba5569030cc4f37e53906d19e13778c81c99ecc`. Operational credentials and connection
records stay in the instance database and are not part of this repository.

The final Native Pi launch/setup repairs are recorded in source commit
`f36993ba2`. The wider fork checks below precede that commit; the final focused
checks and live tasks cover its affected paths.

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
- The complete serialized server group passed: 157 suites, 3,108 tests. Its
  initial import timeout was resolved by rerunning at the original limits.

The full `pnpm test:run` was attempted. Its real NXDOMAIN test in
`generic-mcp-connection.test.ts` fails on this machine: the DNS resolver returns
a proxy address for the reserved `.invalid` domain instead of NXDOMAIN. A
standalone rerun reproduced the same failure; direct DNS lookup confirmed the
environment mismatch. This file and its DNS behavior were not changed by the
gateway patch. The full suite is therefore **not recorded as green**. Remaining
test groups are executed independently so this failure cannot hide their
results. The user subsequently narrowed acceptance to Pi, Hermes, and Runner;
the old broad process was stopped. No completed, green full-suite run is claimed.

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

The broad server run also found three workspace-runtime assertions and two
Cursor remote-execution assertions failing. Two workspace assertions assume
`git init` defaults to `master`; this host defaults to `main`. Both passed with
a temporary test-only Git configuration selecting `master`, without changing
the user's global configuration. The occupied-port ownership check still timed
out, and both Cursor remote fixture commands still exited 127 on standalone
reruns. Those implementation files are unchanged by this patch; these failures
remain unresolved limits of the broad local verification.

The initial wide server process began before the final Pi authentication fix and
later reported a Pi projection assertion failure. The final stable source was
rechecked using both the server configuration and the root project's server
configuration: all 129 tests in both affected files passed. That mutable-tree
wide run is not evidence of a clean final snapshot; the full suite remains
non-green rather than being replaced by the targeted pass.

## Execution evidence

### Final requested paths

Each row below is a real Paperclip task using the company's encrypted, shared
NewAPI connection and `qwen38`. Success was checked in the run result, rather
than matching the marker in the input prompt.

| Execution path | Run ID | Result |
| --- | --- | --- |
| Native Runner Pi | `e7058d6d-9e53-4882-8279-806e06e7d823` | Succeeded; `NATIVE_PI_NEWAPI_OK`; native completion accepted; EUG-5 done |
| Pi Local | `3ec9175e-6dcc-4044-a157-00ceb44773d4` | Succeeded, exit 0; `PI_NEWAPI_OK`; EUG-2 done |
| Hermes | `c0efd203-961b-4465-8198-c2afee319b20` | Succeeded, exit 0; `HERMES_NEWAPI_OK`; EUG-4 done |
| Runner OpenCode (earlier evidence) | `6b79e170-64d4-428f-8e63-ef93ec7e092b` | Succeeded; `RUNNER_NEWAPI_OK` |

Native Pi's initial failure was a package-authority mismatch: the launch bound
the dependency workspace root while its manifest belonged to the Runner
package. Native asset discovery now binds the manifest's owning directory;
Codex retains its existing dependency-root behavior. A stale orphan dev process
also held port 3100, so an apparently restarted service initially kept the old
code. Acceptance used the verified replacement listener.

The final focused checks passed: 51 Pi installation/environment/asset tests
(one explicit skip), six launch credential/package-boundary tests, nine actual
sidecar dispatcher tests, and 20 server Pi setup/routing tests. Runner
TypeScript checking and the server/Runner build passed. Temporary diagnostic
logging was removed from the source. The native SDK remains pinned to 1.0.0
and ACP wrapper to 0.0.33; profile v23 records the changed contract hashes.

The Native Pi Agent is retained as `Native Pi · NewAPI`, ready/idle, for use.
Test tasks are done and the other temporary agents are paused. The Pi Local
fixture has no active run, although its lifecycle remains `pausing`; this
cleanup state does not constitute a completed lifecycle-transition test.

### Model and protocol coverage

Pi 1.0.0 installed from the repository's distribution lock and local Pi 1.1.0
both completed a real CLI turn against a synthetic Chat Completions gateway.
The gateway checked the actual Authorization header and selected model ID.
This exposed and fixed the difference between a literal `OPENAI_API_KEY` value
and Pi's native `${OPENAI_API_KEY}` environment template. The generated provider
declaration also loaded in the actual Pi model registry.

Pi 1.0.0 also completed live, isolated, tools-disabled CLI turns through the
authorized NewAPI deployment for `glm-5.3`, `deepseek-flash`, and `qwen38`.
Each exited successfully and its assistant response contained the requested
marker; verification inspected assistant messages rather than the user prompt.

Grok Build 1.0.44 completed a real CLI turn against a synthetic gateway,
discovering models and authenticating its Chat Completions requests through the
explicit custom endpoint. The fixture also exercised Grok's fallback from an
unsupported Responses endpoint.
Grok also completed live, isolated CLI turns for all three registered NewAPI
models, exiting successfully and returning the requested assistant reply. The
verification concatenated `text.data` stream fragments before checking the
marker; individual fragments alone are not complete responses.

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
