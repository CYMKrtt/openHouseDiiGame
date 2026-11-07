# 03 — Approved user flows and error paths
**Active structure after CP-01:** one combined Landing + Join → Waiting Lobby → Company Reveal. A separate Host Dashboard exists under CP-02. Do not treat historical separate Join mock as active.

## Player first visit
1. Scan shared workshop QR → combined Landing+Join page.
2. Browser obtains stable opaque identity cookie (**proposed M1 technical approach**; identity must not derive from display name).
3. Enter display name; validate **1–30 grapheme clusters** after normalization/trim per agreed rules. Duplicate display names allowed. On confirmed Join reserve exactly one seat, within max 15.
4. Redirect to Waiting Lobby; show confirmed own name and latest authoritative **online** distinct player count `/15`. No other participant roster to players.
5. If room already has 15 reserved, new identity cannot join even if some reserved are offline. If started, new join blocked even if fewer than 15 reserved.
6. On valid trigger: **Auto at 15 online** or **Host-confirmed manual at >=1 online**. Both compete on one first-valid commit; all reserved are assigned.
7. Reveal shared coordinated initial start, 4s star, existing company entrance and celebration, own company room.

## Player disconnect and return
- Disconnect evidence immediately updates online state; the seat remains reserved. Silent loss needs lease expiry detection; no zero-time claim.
- Return from same browser/device restores identity without duplicate reservation. If session waiting, return to lobby; if committed, use locked own result and local replay of animation (DR-08A B), never global re-start or reroll.
- Device switching/cookie loss **not supported** for reserved-seat recovery in MVP; name alone is not identity.
- Background tab, offline client, or dropped realtime event: indicate connection uncertainty where appropriate and refresh authoritative state when reconnected/foregrounded. Do not show stale online number as current when not verified.

## Host flow
1. Host accesses protected Host interface (not counted as player); password login creates restricted host session.
2. Dashboard shows reserved/online counts and roster identities/statuses; company assignments only after actual commit.
3. Host may initiate start with at least one online, confirms explicit action, and server checks fresh authoritative conditions.
4. Successful start freezes all reserved players into balanced assignments. Repeated Host requests return existing committed state; no reroll; UI becomes read-only.
5. Wrong password, expired session or failed confirmation show approved UI regions with error feedback; do not expose host roster or privileged actions to player.

## Key failure / competing event flows
- 16 simultaneous unique joins → exactly 15 seats accepted, one capacity rejection, no orphaned seat.
- Same user double-click/retry/refresh → one player reservation, not two.
- Host and Auto both attempt start → one committed result, first valid commit wins.
- Auto 15 detected then one disconnect prior to commit → start predicate validated against latest authoritative state in same serialization; do not commit invalid Auto start.
- 10 reserved / 8 online Host Start → assign **10**, including both offline; on return they replay own locked assignment.
- WebSocket message lost → snapshot refresh/poll; never infer authoritative assignment from event payload.
- Connection lost locally → show unknown/unverified state instead of falsely claiming live count.

## Text exception
Original Company Reveal placeholder may claim everyone is ready; **B01 exact neutral text is PENDING**. Keep original until explicit copy approval and record release gate. No additional UI element or wording should be invented.
