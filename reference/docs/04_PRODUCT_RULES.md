# 04 — Non-negotiable product policy rules
**Status: APPROVED policies + explicitly pending copy/labels.** See `01_BASELINE_REGISTRY.md` for decision IDs.

1. **Single in-person workshop session**, one QR shared by everyone; **up to 15 reserved participants**. Host never consumes seat; no new-session/restart UI.
2. Reservations persist on disconnect; no seat replacement or timeout-eviction of reserved seats.
3. Display names can repeat; independent same-browser player identity required. Refresh or retry must not create second seat. Same-browser resume; no cross-device recovery.
4. Online counter = **distinct current online players**, not reserved seats or number of socket connections. A player with two tabs counts once.
5. Online count decrements immediately upon **detected** disconnect; delay in detecting silent network loss is a measurable implementation characteristic, not an approved zero-latency guarantee (B02 A).
6. **Automatic start:** exactly when authoritative Online reaches 15 in waiting phase, attempt start; this rule continues after CP-02.
7. **Host manual start:** authenticated Host can start with **at least one Online** even if fewer than 15; explicit confirmation required (DR-01 and DR-06).
8. **First Valid Commit Wins:** serialize valid competing auto/host starts; at most one commit and one assignment per reserved player. Host start cannot override committed auto start, or vice versa (DR-05).
9. At commit include **ALL reserved seats including offline** (DR-02); freeze participant set; then close new admission (DR-03). Returning known player is not new admission.
10. **Balanced random allocation** among stable IDs `tech`, `design`, `ecommerce`: counts differ by at most 1, each <=5, randomized assignment including which groups receive remainders. For 15 -> 5/5/5; no scoring or quiz influence.
11. Assignment immutable; returning previously reserved user always receives the same result (DR-04).
12. **DR-08A B:** a rejoining player may replay already locked reveal animation **locally**; does not globally restart session/reassign.
13. **DR-08B B:** coordinated shared initial start across active clients; **DR-08C:** 4s spinning star; **B03 A:** <=1s target measured under stable Wi-Fi, not universal guarantee. Post-reveal celebration stays as approved.
14. **DR-09A:** LINE Seed Sans TH. **DR-09C A:** retain approved primary player copy, Host/error strings reviewed separately. **DR-09D A:** display name 1–30 visible Unicode grapheme clusters with Unicode-aware validation/security filtering.
15. **DR-09B PROVISIONAL:** names Tech, Design, E-Com. Labels are editable in one config; logic uses stable IDs. **B01 PENDING exact copy:** preserve original placeholder unchanged.
16. Host can read roster, online state and company results after commit. Host **cannot** edit team assignments, start a second session or view quiz answers (quiz absent).

## Hard invariants and test examples
| Setup | Expected result |
|---|---|
| 0 online; Host start | Reject (cannot start) |
| 1 online, 1 reserved; Host start | Commit once, one assigned, other company slots may be empty |
| 10 reserved, 8 online; Host start | 10 assigned, balanced 4/3/3 |
| 15 reserved, 14 online; new visitor | Reject capacity; keep original offline seat |
| 15 online, waiting | Auto trigger; committed assignment exactly 5/5/5 |
| 15 online -> disconnect before verified auto commit | Recheck predicate atomically; no invalid start |
| 14 after commit | No unlock/reroll |
| Existing reserved returns after commit | Resume and local replay own immutable result |
