# 05 — Technical architecture proposal (M1)
**STATE: PROPOSED, NOT APPROVED. NOT a license to create code, infrastructure or database.**

## Selected-for-review stack
- **Next.js + TypeScript** for one full-stack website, role-separated player and Host routes, server API endpoints, accessible React UI anchored exactly to approved HTML/CSS/SVG.
- **Supabase PostgreSQL** is the single authoritative store for reserved seats, browser identity hashes, sessions, connection leases and immutable assignments.
- **Supabase Realtime** sends **minimal revision notifications** only. All authoritative reads/writes through protected server endpoints; clients fetch state after notification (or fallback poll).
- **Vercel** as proposed HTTPS deployment for Next.js. Hosting, costs, plan quotas and region to be checked before production.

**Trade-offs:** Managed Postgres and Realtime reduce maintenance for 15 users, but serverless functions cannot be assumed to run heartbeat reconciliation timers in the background; Realtime presence alone isn't durable authority; stale notifications and mobile backgrounding are expected. Prefer query-time active-lease evaluation + heartbeat on active clients + fallback polling and measure actual detection latency. Add a scheduled reconciler only if needed and supported.

## Context diagram
```text
[Mobile Player 1..15] -- HTTPS --> [Next.js server API] -- privileged DB access --> [Supabase PostgreSQL]
       |                         ^                                        |
       +-- Realtime revision <-- [authorized Realtime notification] <----+
[Host Browser] -- HTTPS & Host cookie --> [Next.js Host API] -----------+
```

## Trust boundaries
- Browser is untrusted. Never accept `reservedCount`, `onlineCount`, role, assignment, team size or start success from client as authoritative.
- HTTPS auth cookies: opaque player credential per browser; Host protected separately with password/session. Establish browser identity before Join to survive lost HTTP responses; store only credential hash in DB. Host password secret/hash never shipped to browser. Separate auth scopes/roles.
- Server must authorize all mutations and sanitize responses. Player cannot read other players' names or assignments; Host roster only after Host auth. RLS defense in depth; no direct privileged public table access.

## Single authoritative session
Exactly one configured workshop session for MVP, no public session creation or reset. Session row lock/DB transaction serializes Join, online transitions and Start. Atomic join cap enforcement; all 15 online triggers Auto start in authoritative transition. Player IDs and immutable team IDs are independent of displayed labels.

## Presence / leases
Multiple connections per player allowed. A distinct player is online if any authenticated connection lease is active and not revoked, using **server clock**. Lease renewals on heartbeat, explicit disconnect on network close/hint when observable, expiry for silent drop. Browser background throttling requires tests. Reflect detected disconnect promptly by an authoritative revision update; if a client can't verify live count it shows `unknown` not stale truth. No reserved-seat deletion from lease expiry.

## Commit and reveal
- In transaction with session lock: if waiting, recompute authoritative online predicate; Host >=1 or Auto ==15; select **ALL reserved players**, shuffle with cryptographically secure unbiased algorithm; balance 3 companies with max 5; insert all N assignments; set session `committed` and durable `reveal_start_at`; commit once. Concurrent starts return committed result.
- Initial clients estimate server-time offset and synchronize to one `reveal_start_at`; 4s star followed by approved effects. B03 target <=1s measured skew on stable venue Wi-Fi; never claim perfect synchronization or force a common animation replay on reconnect.
- Local reentry replay uses existing immutable assignment with new local animation timing **only for that returning browser**, not a session write.

## Integrity and handling
- DB constraints + transaction isolation or explicit locking; no read-then-write capacity checks outside locks.
- Unique identity per session, unique assignment per player, status guard, idempotency keys, validated origins/CSRF, login throttle, audit of privileged start without secrets.
- Retryable network faults: error response with stable `code`/`messageKey` and `requestId`; no leakage of sensitive raw DB errors. Client reconnect re-fetches authoritative phase, revision and own assignment.
- Use one team metadata config to map `tech`, `design`, `ecommerce` to provisional labels and approved theme colors; text changes never alter team IDs.

## Security / operations
HTTPS, Secure/HttpOnly/SameSite cookies, Host password hash verifier (Argon2id or equivalent), login throttling, session expiry, CSRF/Origin checks, rate limits, CSP appropriate for inline approved SVG/style (review integration), XSS-safe display names, no `service_role` key or Supabase privileged secret in browser. Input validation Unicode-aware with 1–30 visible grapheme clusters; disallow controls/bidi abuse and markup insertion. No quiz, answers, ranking or behavioral analytics.

Deployment needs a confirmed project/repository, owner M1 signoff, secure secrets, network test at venue, data retention decision, backups/rollback, alerting and verification of Supabase auth/RLS and Realtime permissions. **Not yet deployed.**

## Decision and risk register
- B01 exact alternate Reveal phrase pending; use unchanged baseline string as placeholder, release review required.
- Host/error supplemental wording review required before release.
- B02 detected-disconnect policy approved, actual latency thresholds to measure, not invented.
- B03 <=1s under stable Wi-Fi is a target; evaluate actual browser clock skew, visibility throttling and fallback events.
- No standalone complete design/wireframe docs or target Git repository was verified; intake gate mandatory.
- Specific API/table names in `06`–`08` are proposed M1 contracts, **not already approved business policy**.
