# 08 — Realtime event flow and state machines (PROPOSED M1)
State names and transport specifics are architecture proposals; approved **observable product behavior** is in `04_PRODUCT_RULES.md`.

## Server session state
```text
WAITING --(valid Host confirmation: >=1 ONLINE)--> COMMITTED
       --(trusted AUTO check: ==15 ONLINE)------> COMMITTED
COMMITTED --(any repeated start)---------------> COMMITTED (unchanged)
```
No unlocked/reopened/re-randomized state in MVP. `COMMITTED` transaction stores full reserved assignment snapshot and shared reveal start timestamp in one atomic operation.

## Player/client states
`LANDING_JOIN` → `JOINING` → `LOBBY` → `INITIAL_REVEAL` → `REVEALED`.
Connectivity overlays: `CONNECTED`, `STALE_OR_UNKNOWN`, `RECONNECTING`; do not replace reserved status with offline. On re-entry of known player after commit: `LOCAL_REPLAY` → `REVEALED`, using immutable original result, without a global state write. UI must preserve approved visual screens and mock state feedback patterns.

## Host states
`HOST_LOGIN` → `DASHBOARD_WAITING` → `CONFIRM_START` → `START_PENDING` → `DASHBOARD_COMMITTED`. Incorrect password/login throttling and stale session are error branches using approved Host screen slots. Dashboard starts read-only after commit; no results editing.

## Presence model
- Active connection lease = `revoked_at IS NULL` and `lease_expires_at > server_now`. Player online if >=1 active lease; count distinct players, clamp to reserved population.
- `POST heartbeat` renews active lease. Connection close/disconnect evidence revokes that connection **immediately upon detection**, then recompute distinct Online; if another tab live, player remains online.
- Silent network drop remains counted until expiry detected. Client-side UI must not claim that a cached count is fresh when local connection status is unknown. No player loses reserved seat on expiry.
- No always-on serverless timeout assumptions; validate observed heartbeat intervals, background browser throttling, fallback polling and query-time lease expiry before release. B02 specifies instant-on-detection, not zero-second detection SLA.

## Initial start events, ordered
1. Trusted Join/heartbeat/connection detection re-evaluates authoritative unique online count under session serialization.
2. If reaches 15 and waiting, server attempts Auto Start immediately in same serialized control path. Separately Host may confirm Start at >=1 online.
3. First valid transaction locks waiting session, reads fresh leases and reserved snapshot, produces balanced teams, sets `committed`, `reveal_start_at`, revision, commits exactly once.
4. Deliver non-sensitive Realtime revision event; connected clients re-fetch canonical `/session` and own `/me`.
5. All active devices use same server reveal start reference; show 4s Star then approved company-room and celebration. Correct for estimated clock difference; B03 measures <=1s skew under stable Wi-Fi.
6. Late/joining player with no reserved seat cannot enter. Known reserved player reconnects and plays **local replay of own locked assignment** (DR-08A B).

## Failure, race and recovery table
| Event | Expected safe outcome |
|---|---|
| Duplicate Join / lost Join response | Stable identity + requestId => one reservation |
| New 16th concurrent Join | Rejected after capacity locked; no orphan |
| Host Start collides with Auto Start | First valid commit wins; losers return committed snapshot |
| Disconnect at 15 threshold before Auto validity check | Recompute under serialized lock; don't start invalid Auto |
| Player disconnect after commit | Online may decline but team/commit unchanged |
| 10 reserved / 8 online, Host Start | All 10 reserved assigned including 2 offline |
| Two tabs same player | One reserved player and one online-count unit |
| Stale disconnect from old generation | Cannot revoke a newer live connection |
| Event lost/out of order | revision compare + authoritative refetch/poll |
| Device sleeping during star | On return use same original company; local replay, no global timestamp reset |
| Host repeats Start due to timeout | Return original commit; no second draw |
| Session read fails | Approved error slot; do not display stale online count as verified |

## Synchronization verification
Run 15 **independent browser contexts** as test clients on stable test Wi-Fi or a controlled network proxy. Collect server commit timestamp, each device's observed start wall time and offset estimate, compute max-min skew; target <=1s in B03. Local replay and browsers intentionally offline are excluded from initial-start skew metric. Measure, do not assert a universal guarantee. Never modify 4s Star or celebration to meet target by redesign.
