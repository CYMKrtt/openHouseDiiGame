# 07 — HTTPS API contract (PROPOSED M1)
**Not deployed. Endpoint names, field examples and status codes are technical proposals pending M1 approval.** Canonical server state always overrides any client projection.

## Common conventions
- HTTPS JSON `application/json`; versioned `/api/v1/*` routes.
- Error shape: `{ "code": "CAPACITY_FULL", "messageKey": "join.full", "requestId": "..." }`; the string shown to user must come from approved UI slot/copy (Host/error supplemental copy subject to scoped review).
- `revision` monotonically increases with server-authoritative changes. `serverTime` ISO timestamp supports clock offset. Never accept client-supplied online counts, company IDs, role or result.
- Mutations require CSRF/Origin defense, appropriate player or Host cookie, rate limits; safe server-side input validation.
- `requestId` client-generated stable for retry; server uses same browser credential/session + requestId for dedupe. A retry after a lost response returns same recorded result; no double seat or reroll.

## Endpoints
| Method | Endpoint | Caller | Proposed request | Proposed response and behavior |
|---|---|---|---|---|
| GET | `/api/v1/bootstrap` | browser | none | Set opaque same-browser HttpOnly Secure cookie before Join; no reserved seat; return `phase`,`revision`,`serverTime` |
| POST | `/api/v1/join` | browser identity | `{displayName,requestId}` | Validate 1–30 graphemes; existing identity resumes; if waiting with capacity creates one player; else `CAPACITY_FULL`/`SESSION_STARTED`; returns own `playerId`, `phase` |
| GET | `/api/v1/session` | player or limited public | none | `{phase,onlineCount,capacity:15,revision,serverTime,revealStartAt?}`; never other names/team data |
| GET | `/api/v1/me` | reserved player | none | `{playerId,displayName,phase,companyId?,revealStartAt?,serverTime}`; only own company once committed |
| POST | `/api/v1/presence/heartbeat` | reserved player | `{connectionId,generation}` | Authenticated lease renewal; returns `{onlineCount,revision,serverTime}`; may trigger auto-commit in trusted transaction |
| POST | `/api/v1/presence/disconnect` | reserved player | `{connectionId,generation}` | Best-effort revoke own matching connection; no seat release; safe against stale-tab disconnect |
| POST | `/api/v1/host/login` | Host password | `{password}` | Verify hashed password, throttle, set Host-only cookie; generic failure |
| POST | `/api/v1/host/logout` | Host | none | Revoke session; clear Host cookie |
| GET | `/api/v1/host/session` | Host | none | `{phase,onlineCount,reservedCount,revision,players:[{id,displayName,isOnline,companyId?}]}`; teams only after commit |
| POST | `/api/v1/host/start` | Host | `{confirmationToken,requestId}` | Must be deliberate confirmed Host action; fresh >=1 online; one atomic commit; idempotent existing result, no reroll |

## Idempotency and error semantics
- For new joins at 15 reserved: `409 CAPACITY_FULL`; after committed: `409 SESSION_STARTED` for **new** credential only. Existing player can always request resume.
- Start with 0 online: `409 START_CONDITION_NOT_MET`. Commit already complete: `200 ALREADY_COMMITTED` with existing metadata (not reroll). Another authorized start request must never change assignments.
- Host missing/expired session: `401 HOST_AUTH_REQUIRED`; non-host forbidden: `403 FORBIDDEN`; wrong password: generic `401 INVALID_CREDENTIALS` with throttling. No raw SQL error.
- Invalid name: `422 INVALID_NAME`; excessive requests `429 RATE_LIMITED`; transient transport error `503 RETRYABLE` (these codes/labels proposed, not approved customer-facing text).
- Optimistic client cannot overwrite server phase. Ensure API only exposes public aggregate vs own result vs Host roster by role.

## Example Join request/response (illustrative, not server implementation)
```json
{"displayName":"Mint","requestId":"5b95e2d0-..."}
```
```json
{"playerId":"opaque-uuid","phase":"waiting","revision":7,"serverTime":"2026-11-07T10:00:00Z"}
```

## Realtime contract connection
Realtime event is an invalidation signal containing only `{type:"session_revision",revision,serverTime,revealStartAt?}` without names, roster or other team assignments. `/session` and `/me` fetch canonical snapshots; Host uses protected Host endpoint. Dropped/duplicate/out-of-order notifications handled by revision check and refetch. Implementation detail provisional pending M1 approval.
