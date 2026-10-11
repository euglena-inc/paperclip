# Euglena Paperclip fork rules

This fork adds capabilities needed by Euglena while preserving Paperclip's
upstream architecture and upgrade path. These rules apply in addition to
`AGENTS.md`. User authorization and upstream domain contracts still control.

## Choose the smallest durable extension

Use the following order when implementing a requirement:

1. Use instance/company configuration and the public API when the behavior is
   already supported. Model URLs, aliases, credentials, grants, and agent
   assignments belong in instance data, not source code.
2. Use an existing plugin, adapter, or catalog extension when its supported
   contract can express the requirement. Do not use a plugin to bypass host
   credential, permission, or lifecycle checks.
3. Add a generic adapter or provider capability at the existing boundary when
   configuration is insufficient. Keep vendor names and deployments out of
   core routing code. A compatible NewAPI connection must also work with a
   synthetic OpenAI-compatible gateway.
4. Modify control-plane core only when the previous options cannot meet the
   requirement. Record why the core patch is necessary, its upstream base,
   affected contracts, regression evidence, and removal condition below.

Do not create parallel implementations of existing services or setup flows.
Prefer the existing connection picker, secret store, model picker, and runtime
projection. A smaller patch is not sufficient if it leaves a broken execution
path or loses security checks.

## Modification boundaries

| Area | Rule |
| --- | --- |
| Company/instance settings | Preferred. Change through the API; back up instance data separately. |
| External plugins and adapter modules | Preferred for new behavior when the extension contract supports it. |
| Provider routing and launch projection | Small generic patches are allowed with protocol and credential-isolation tests. |
| Shared validators, API contracts, and UI setup | Change together only where needed for the same capability. Reuse existing controls. |
| Large routes, heartbeat orchestration, and task services | Avoid incidental edits. Put logic in existing focused services rather than expanding high-conflict files. |
| Database schema and migrations | Additive changes only when a new durable contract needs them. Never renumber or edit published upstream migrations. |
| Upstream docs and `AGENTS.md` | Keep additions short. Put Euglena-specific rules and evidence under `doc/euglena/`. |
| Lockfiles, generated contracts, runtime pins, and vendor output | Change canonical inputs and regenerate with upstream tooling. Never hand-edit generated artifacts or installed caches. |
| Branding, package names, versioning, and release workflows | Preserve upstream defaults unless a concrete distribution requirement needs a separate change. |

Do not mix a gateway feature with broad formatting, folder moves, UI restyling,
dependency upgrades, renamed upstream APIs, or new governance machinery. Each
unrelated change increases the number of conflicts in the next upstream merge.

## Contracts that must remain intact

- Company boundaries, human/agent authorization, and connection audience checks.
- Encrypted credential storage, explicit provider destinations, secret redaction,
  and isolation from ambient host credentials.
- Single-assignee tasks, atomic checkout, approvals, budgets, activity logging,
  and restart/recovery identity fences.
- Protocol compatibility: showing a connection in the UI must imply a working
  runtime projection for that harness. Do not expose incompatible protocols.
- Model identity: pass the selected ID, verify the effective ID, and fail without
  silently selecting another model.
- Provider accounting: unknown usage or pricing stays unknown. Do not invent
  zero costs or advertised capability claims to pass a check. Conservative client
  limits must be documented as local defaults, not as upstream model limits.
- Upstream license, attribution, public API compatibility, and token-based UI
  design rules.

Operational keys, local addresses, company databases, backups, transcripts,
account files, and machine-specific configuration must not be committed or
pushed. Publish synthetic fixtures and redacted results instead.

## Branches and upgrades

- `upstream` points to `paperclipai/paperclip`.
- `origin` points to `euglena-inc/paperclip`.
- `master` in the fork is the upstream mirror. Keep it free of Euglena commits.
- `euglena/main` is the published downstream integration branch and the fork's
  default branch. Use `codex/<change>` or another descriptive feature branch for
  independent changes. Keep runtime changes and project policy in separate
  commits so a future merge can remove either without reverting the other.
- Never force-push or rebase the published integration branch. Merge upstream
  releases into it so existing commits and deployed version references remain
  recoverable.

For each new upstream release:

1. Fetch upstream branches/tags and identify the actual release commit. Do not
   infer release readiness from a moving `master` branch.
2. Create a temporary upgrade branch from `euglena/main`, then merge the selected
   release commit. Review the release notes, migrations, runtime pins, and the
   delta ledger before resolving conflicts.
3. If upstream now implements a local capability, test that implementation and
   remove the obsolete local patch. Do not keep two versions of the same logic.
4. Resolve conflicts according to the current domain contract. Do not accept
   `ours` or `theirs` for an entire core file to make a merge pass.
5. Run affected regressions first, then the required full typecheck/test/build
   gates. Inspect provider environment boundaries and generated Runner assets
   whenever provider or packaging code changes.
6. Back up database, uploads, and the secrets master key before a version that
   runs migrations. A Git snapshot does not back up instance data.
7. Merge the verified upgrade into `euglena/main`, record the upstream commit
   and evidence, and deploy that exact version. Keep the upstream mirror current
   using a fast-forward update. Deployment is a separate authorized action.

Do not automatically merge or deploy a newly detected release. Detection can
trigger review; passing checks and migration/recovery evidence decide whether
the upgrade is ready.

## Downstream delta ledger

Base for the initial gateway work: upstream commit
`9ba5569030cc4f37e53906d19e13778c81c99ecc`.

| Patch | Why core needs a change | Scope | Evidence and removal condition |
| --- | --- | --- | --- |
| Pi and Grok compatible gateway routing | Upstream stores Chat gateways but excludes these harnesses from managed routing. A catalog-only plugin cannot project the selected secret through the native Runner launch boundary. | Shared compatibility/model IDs; focused server projection; existing UI picker and Runner choices; ACPX environment allowlists. | Gateway tests cover catalog/manual IDs, isolation, authorization/revocation, protocol rejection, Pi creation, and Runner forwarding. Remove when upstream supports the same paths and these regressions pass. |
| Fork maintenance policy | The official repository does not define this fork's branch and merge policy. | This document and a short entrypoint link in `AGENTS.md`. | Retain as local policy; reconcile references when upstream contracts change. |
| Pi launch and setup repairs | Managed model declarations must reach the setup probe; Native Pi must use its pinned distribution verifier and the package directory that owns its manifest. | Pi setup wrapper, installation probe, native package binding, and generated profile v23. SDK and ACP wrapper versions stay pinned. | Targeted regressions and live tasks establish the repaired boundaries. Remove each repair when upstream supplies equivalent behavior. |

Runtime NewAPI connections are instance configuration, not a Git patch. Their
availability and credentials must be configured on each deployment. Never ship
the operator's database or credential values as part of the fork.

## Pi runtime ownership

Paperclip's `pi_local` adapter and native Runner Pi belong to Paperclip. Native
Runner Pi uses its own pinned SDK, ACP wrapper, verified assets, configuration,
and recovery identity. A Pi runtime embedded by Eugene or eugene-core is a
separate ownership boundary. Do not replace one with the other or share their
session directories, provider configuration files, or lifecycle controllers.
Integrate eugene-core through explicit plugin/adapter contracts; keep memory and
outcome-ledger state separate from Paperclip's provider runtime state. Verify
which component actually owns execution before claiming an embedded Pi exists.

## Evidence before publication

Validate a stable source snapshot and record its commit. Finish executable
source edits before the final wide check: a long-running test process can retain
old transforms while later files see new assertions. After an edit, rerun the
affected checks at their original strength; do not attribute an earlier run to
the new snapshot.

Compilation is not proof of execution. Keep these claims distinct:

- Unit/contract tests establish configuration, authorization, and launch behavior
  with synthetic providers.
- A live model-list response establishes authentication and catalog visibility.
- A live inference response establishes that one model/protocol request works.
- A harness task establishes tool execution, completion, and continuation for
  that harness/model combination.

Record failures and unsupported combinations. Do not label an entire provider
matrix verified after checking only `/models`. Publish a patch with precise
limits rather than claiming untested harness behavior.
