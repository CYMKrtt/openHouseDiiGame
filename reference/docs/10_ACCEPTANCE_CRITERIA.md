# 10 — Testable acceptance criteria
**Product behaviors approved; precise automated assertions / error codes are proposed implementation evidence.** Each item requires PASS/FAIL, test artifact and environment details. Mock-only prototype behavior does not prove production correctness.

| ID | Scenario | Acceptance / evidence | Gate |
|---|---|---|---|
| VF-01 | Combined Landing + Join | Matches approved V1.1 mobile & desktop screenshots; hides masthead/footer on mobile, inline compact form | M2 |
| VF-02 | Lobby / Reveal / Host | Screen compositions preserve original HTML/SVG and approved motion; no visual redesign | M2 |
| VF-03 | Viewports | No horizontal overflow at 320x640,390x844,1440x900, including errors; keyboard and reduced motion | M2 |
| VF-04 | Typography | Uses approved LINE Seed Sans TH; documents/reviews text reflow vs original reference | M2 |
| ID-01 | Same user retries Join | Exactly one player ID and seat despite double-click, lost response, refresh | M3 |
| ID-02 | Duplicate display names | Two separate players may choose same name; no merging by display name | M3 |
| ID-03 | Name validity | Reject 0 or >30 graphemes after trim and prohibited controls; accept valid Thai/Latin mixtures | M3 |
| CAP-01 | 16 distinct concurrent Join | Exactly 15 reserved, one capacity error; no 16th accepted | M3 |
| CAP-02 | 15 reserved / 14 online | New identity denied, offline player's seat retained; no automatic start | M3 |
| PRES-01 | Two tabs for one player | 1 seat, 1 online counted; one tab close doesn't mark offline if other valid | M3 |
| PRES-02 | Explicit disconnect | Online decreases promptly **on detection** with valid last connection, reserved stays unchanged | M3 |
| PRES-03 | Silent loss / background browser | Measure expiry latency and online correctness; log measurements; no invented hard bound | M3 |
| PRES-04 | Stale data | Unverified state shown as unknown; reconnect fetches authoritative snapshot | M3 |
| HOST-01 | Password / session | Wrong password rejected/rate limited; player cannot call Host start or roster | M3 |
| HOST-02 | Explicit confirmation | Host Start without valid confirmation rejected; Host not counted toward 15 | M3/M4 |
| START-01 | 0 Online Host start | Rejected; session remains waiting | M4 |
| START-02 | 1 Online Host start | Exactly one assignment, no extra players; company may be empty | M4 |
| START-03 | 10 Reserved / 8 Online Host start | Exactly 10 assigned, balanced team sizes 4/3/3, includes offline | M4 |
| START-04 | 15 Online Auto | Automatically commits without Host action; 5/5/5; after commit new join denied | M4 |
| START-05 | Host/Auto/disconnect collision | Exactly one valid commit, latest authoritative eligibility checked; no reroll | M4 |
| TEAM-01 | All N=1..15 | Exactly N unique player assignments; max 5/team, max-min <=1 | M4 |
| TEAM-02 | Randomness | Random team allocations and remainder distribution free from permanent company-first bias; statistical test recorded | M4 |
| RETURN-01 | Same-browser re-entry after commit | Original assignment only; local replay 4s star; no session start update | M4 |
| SYNC-01 | Initial coordinated Reveal | <=1s measured start skew across controlled independent clients on stable Wi-Fi; late local replays excluded | M4 |
| SECURITY-01 | API/RLS/CSRF/XSS | Protected Host, own assignment secrecy, no secrets in browser, injection-safe display | M3/M5 |
| COPY-01 | B01/Host/error copy | Exact B01 phrase and supplemental copy reviewed before release; no unapproved text introduced | M5 |
| DEP-01 | Production readiness | Secrets, quotas, retention, monitoring, rollback, representative iOS/Android QR flow verified | M5 |

## Required negative and recovery tests
- Refresh while star is spinning, reconnect after result, two clients with same display name, expired Host session, lost Realtime revision event, stale disconnect generation, untrusted body attempting to set company, duplicate Host Start request.
- Manual start with fewer than 15 does **not** suppress 15-online Auto policy while session still waiting; once committed both must not run again.
- Real-device smoke test supplements, not replaced by, Playwright 15-context simulation. All tests of app/backend await Owner implementation approval.

## Acceptance limitations
B01 remains pending; existing prototype placeholder temporarily preserved. Real source repo/Git history not confirmed. All tests listed are planned, not executed on production. Exact heartbeat TTL values and infrastructure quotas to be measured/selected as implementation detail with evidence, not fabricated approval.
