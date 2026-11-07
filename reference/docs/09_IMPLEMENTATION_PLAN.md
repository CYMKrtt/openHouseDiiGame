# 09 — Implementation milestones and gates
**PLAN ONLY. NO PRODUCTION WORK AUTHORIZED.** Start work **only after** explicit Owner approval of final M1 architecture, Codex Handoff and implementation authorization, plus target repository intake and unchanged reference files.

## Gate 0 — Repository intake and acceptance of proposed contracts
- Identify actual target Git repository, HEAD commit, clean/dirty status and framework/package version.
- Verify preserved original HTML SHA-256 vs `manifests/SOURCE_INTEGRITY_MANIFEST.json` and obtain missing freestanding baselines or document authorized reliance on verified HTML.
- Agree M1 contract; configure safe development-only secrets as needed after authorization; do not deploy or create DB before appropriate gate.

## M2 — Frontend Foundation (first authorized engineering milestone)
1. Initialize or adapt actual repo without touching archived approved HTML references.
2. Extract/port approved CSS/inline SVG markup for **Landing+Join, Lobby, Reveal and Host** into production components without redesign.
3. Centralize color tokens and immutable internal team IDs with provisional labels; use LINE Seed Sans TH via licensed source; test mobile typography reflow.
4. Implement accessible placeholder states for valid/invalid/joining/error/unknown/reveal using approved slots. B01 retains original placeholder until exact copy approval; do not hardcode guessed text.
5. Add screenshot regression on 320x640, 390x844, 1440x900 and keyboard/reduced-motion tests.
**Exit gate:** owner-designated visual reviewer compares screenshots and behavior to original four HTML references; report deviations with rationale. No multiplayer claims yet.

## M3 — Multiplayer Core
1. Provision approved local/test database only **after** explicit implementation authorization; implement proposed tables, server-only DB access and RLS/proxy restrictions.
2. Host auth protected session with password and confirmation; player browser identity and idempotent Join.
3. Atomic reserved-seat cap, 15-concurrent admission collision tests, multi-tab one-count behavior.
4. Online lease/heartbeat/revoke + fallback polling, reconnect identity preservation, fresh revision notifications and observable detection latency tests.
5. Integrate Host roster read-only and no sensitive player roster exposure.
**Exit gate:** automated evidence for 16 concurrent joins -> 15 seats, reconnect no new seat, 10 reserved/8 online identity correctness, Host unauthorized calls rejected, stale lease test measurements. Gate before start assignment work.

## M4 — Assignment & Reveal
1. Implement Host >=1, Auto ==15, First Valid Commit Wins under session serialization.
2. Balanced unbiased assignments of entire reserved snapshot; immutable results, display name config mapping.
3. Durable shared reveal timestamp, 4s star and post-effects; local replay for returning player.
4. Collision/failure tests (Host/Auto/disconnect/start retry) and <=1s stable Wi-Fi initial-start target evidence.
**Exit gate:** N=1..15 assignment invariants, race tests, never re-roll, 10/8 case all assigned, independent-context synchronized test and mobile render QA. B01 and Host/error final copy still block release, not early coding.

## M5 — QA, deployment readiness and release (requires separate approval)
- Representative real iOS + Android, venue Wi-Fi, QR path, screenreader and error feedback; test concurrency with independent browser contexts if 15 physical phones unavailable.
- Approve final B01 phrase and supplementary Host/error strings; verify display labels are clearly marked provisional if shipping with them.
- Review security, secret handling, rate limits, RLS, data retention/deletion, backups/rollback, hosting quotas and monitoring.
- Confirm all Acceptance Criteria and Owner release signoff **before** production deployment. No deployment without separate authorization.

## Codex boundaries
May implement approved technical choices only after M1/Implementation approval; may choose non-user-visible best practices and document them. Must not change approved source files, User Flow, Product Policy, team identity semantics, graphic assets or UX hierarchy. May not add quiz/scores, Host new panels, reroll/resets or unapproved copy. Blockers to a specific milestone stop only that affected scope; continue safe independent work and report evidence.
