# 06 — Logical database schema (PROPOSED M1)
**No SQL/migrations/database were created.** PostgreSQL table/column names below are technical candidates pending final M1 approval.

## Tables
### `sessions`
| Column | Logical type | Invariant |
|---|---|---|
| `id` | uuid PK | One configured active event session |
| `status` | enum `waiting`,`committed` | Monotonic: no reverse transition in MVP |
| `capacity` | smallint | fixed 15 |
| `revision` | bigint NOT NULL DEFAULT 0 | Monotonic changes for client invalidation |
| `committed_at` | timestamptz NULL | Non-null on committed |
| `reveal_start_at` | timestamptz NULL | Durable shared initial start |
| `start_source` | enum `auto`,`host` nullable | Set once |
| `created_at` | timestamptz | Server clock |

**Check:** waiting => no committed_at/start_source/reveal_start_at; committed => all three present.

### `players`
| Column | Logical type | Invariant |
|---|---|---|
| `id` | uuid PK | Not user-input name |
| `session_id` | uuid FK `sessions` | Member of one event |
| `display_name` | text NOT NULL | 1–30 Unicode grapheme clusters and security filtering in server; duplicate names allowed |
| `identity_secret_hash` | bytea UNIQUE | Hash of opaque same-browser credential, not raw token |
| `reserved_at` | timestamptz | Never removed on disconnect |

Indexes: unique `(session_id,identity_secret_hash)` or hash unique globally for single session; index `(session_id,reserved_at,id)`. Do not add `UNIQUE(display_name)`.

### `connections`
| Column | Logical type | Invariant |
|---|---|---|
| `id` | uuid PK | Connection/tab scoped; unguessable |
| `player_id` | uuid FK `players` | Validated owner only |
| `generation` | uuid | Protect against stale disconnect from old tab or prior connection |
| `last_heartbeat_at` | timestamptz | Server timestamp |
| `lease_expires_at` | timestamptz | Active until expiry unless revoked |
| `revoked_at` | timestamptz NULL | Explicitly detected disconnect |

Index `(player_id,lease_expires_at)` and consider partial index on non-revoked; online is **COUNT DISTINCT player ID** with a validated active lease, evaluated at authoritative time. Multiple tabs do not increase online count.

### `assignments`
| Column | Logical type | Invariant |
|---|---|---|
| `player_id` | uuid PK, FK `players` | Exactly one team per reserved player at commit |
| `session_id` | uuid FK `sessions` | Same session as player |
| `company_id` | enum `tech`,`design`,`ecommerce` | Internal ID never provisional string |
| `committed_at` | timestamptz | Same winning session commit |

Constraints: `UNIQUE(player_id)` via PK; FK constraints; disallow exposed updates/deletes; no assignment without committed session. Ensure team max 5, balanced distribution and assignment count equals reserved snapshot in atomic transaction + tests (aggregates aren't simple row CHECKs).

### Host auth/session (PROPOSED)
Host password verifier from securely managed hashed secret or protected credential record. Optional `host_sessions(id uuid PK,token_hash bytea UNIQUE,created_at,expires_at,revoked_at)` for server-validated opaque Host cookie. Host **is not a player**. No public account registration.

### Optional minimal `audit_events`
Security-only events with `session_id`, `kind`, `correlation_id`, server timestamp, safe metadata; no names or credential material in logs. Not an approved user feature.

## Concurrency strategy
1. **Join transaction:** lock single `sessions` row -> return existing player first by browser credential -> check `waiting` and reserved count <15 -> insert player -> increment revision -> commit. Same identity repeated requests idempotent, and Host vs Join serialization uses same lock.
2. **Presence transaction:** validate player + connection generation -> update/revoke lease -> recompute distinct online; when trusted transition creates 15 online in waiting, attempt Auto commit within same serialized session control path. On silent expiry, query-time validity corrects snapshot; revision notification reconciled on subsequent active request/poll.
3. **Start transaction:** lock same session -> if committed, return existing immutable result -> fresh authoritative online eligibility (`host` >=1, `auto` ==15) -> snapshot **all** reserved players including offline -> unbiased random balance (not privileged client RNG) -> insert N assignments -> update `committed_at`,`reveal_start_at`,`start_source`,`revision` -> commit. Transaction retries safe; no partial assignment exposed.
4. No client table writes; protected server/DB function interfaces. Validate absence of phantom seat creation and commit races with parallel integration tests.

## Proposed row-level access control
All public table write access **DENIED**; service-role credentials only in server environment. If using RLS for any direct read, policy must verify own stable browser credential in a **server-enforced identity context**, not untrusted client-supplied player ID. Prefer server API-projected read models: public aggregate online count only; player own assignment; authenticated Host roster. Restrict Realtime publications to non-sensitive `revision` hints with separate Host event authorization. Test RLS with anon JWT explicitly; fail closed.

## Schema gaps for final architecture/release
Retention period, event deletion procedure, secret rotation and exact persisted connection TTL are technical/release decisions, not approved user-visible features; measure and document operational defaults before deployment.
