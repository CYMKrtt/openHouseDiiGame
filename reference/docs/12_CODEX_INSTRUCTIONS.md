# 12 — Codex operating instructions
**STOP: This package is documentation only. Owner has NOT approved final M1 architecture, Handoff implementation authorization or production coding.** When used later after explicit authorization, follow instructions below.

## First actions after Owner authorization
1. Read `README.md`, `docs/01_BASELINE_REGISTRY.md`, `docs/04_PRODUCT_RULES.md`, `docs/02_DESIGN_SYSTEM.md`, `docs/05`–`11`, `docs/13_REPOSITORY_INTAKE.md`, and original `prototypes/*.html` in full.
2. Inspect **actual target repository** (`pwd`, `git status`, `git rev-parse HEAD`, file tree, package.json, framework, lockfile, tests, assets) and record provenance. Do not guess Git commit or framework.
3. Compare source hashes with `manifests/SOURCE_INTEGRITY_MANIFEST.json`; copy approved source unchanged into immutable reference folder. Resolve missing files by reporting, not fabricating.
4. Summarize implementation scope and milestone M2 acceptance; verify Owner authorization to **start** before changing code.

## Non-negotiable rules
- Preserve approved HTML/CSS/SVG, layouts, mobile breakpoints, brand colors, typography choice, motion and content hierarchy. **Do not redesign** or make generic UI substitutes.
- Historical mock demo passwords, mock participant controls, mock assignment selectors and inline debug widgets must not become production security features. Production screens must match participant-facing states.
- Keep CP-01 combined Landing+Join. CP-02 adds a **separate Host dashboard**. Do not add Host button to player Lobby.
- Enforce server authority: atomic Join and Start, exactly one assignment per player, all reserved included, online count distinct player IDs, no 16th seat, automatic at 15 online and Host >=1 online, local reentry replay, shared first Reveal time.
- No quiz, answers, scores, rankings, session reset, player replacement or multi-session admin capabilities.
- No fabricated product decisions. B01 exact text **Pending**, original approved copy placeholder; team labels **Provisional** via single config; Host/error extra copy flagged for scoped review.
- Protect Host, secrets, roster and company assignments; never expose privileged Supabase keys in client code or logs. Security test authorization, RLS and rate limiting mandatory.
- Implement M2, M3, M4, M5 in order with test evidence and **stop at approval gates**; do not silently proceed on failing tests or unapproved UI deviation.
- Do not run live migrations, deploy or open participant access without explicit separate authorization and privacy/deletion plan.

## Per-milestone report format
```
Milestone: M2 / M3 / M4 / M5
Target repository path and commit (before/after): ...
Scope delivered (approved IDs): ...
Files changed: ...
Reference baselines unchanged: hashes ...
Tests executed: command, environment, result, logs/screenshots ...
Unresolved blockers (approved/provisional/pending): ...
Approval gate: PASS / FAIL / WAITING FOR OWNER
Next proposed milestone: ... (not started)
```

## Runtime caveat
Do not assume a Next.js serverless API process keeps a heartbeat monitor running while idle. DB/query-time lease correctness is mandatory, notifications are only hints. Presence expiry and reveal coordination must be measured. Architecture documents are **Proposed** until explicitly Owner approved.
