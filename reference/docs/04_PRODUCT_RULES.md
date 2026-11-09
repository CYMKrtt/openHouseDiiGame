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
10. **Quiz-based allocation (M6, replaces the original balanced draw, and changes rules 6, 7 and 13).** Each player answers a five-question quiz after Join and receives their company immediately on submit; there is no shared start. The Host action becomes *close round* (at least one reserved player; stops admission and places unfinished players in least-filled companies), and the round closes automatically when all 15 seats have a result. Each answer adds 1 to DEV (`tech`), DESIGN (`design`) or BIZNET (`ecommerce`). A clear top score always gets that company and is never moved. A 2-2-1 tie is decided by question 5, then question 1; a tied player goes to the tied company with fewer members at the moment they submit, keeping the question 5 / question 1 choice when counts are equal. A reserved player without answers joins a least-filled company at random. Company sizes may be unequal. Scoring: `src/lib/quizScoring.ts`; assignment SQL: `202611090001_m6_quiz_assignment.sql`.
11. Assignment immutable; returning previously reserved user always receives the same result (DR-04).
12. **DR-08A B:** a rejoining player may replay already locked reveal animation **locally**; does not globally restart session/reassign.
13. **DR-08B B:** coordinated shared initial start across active clients; **DR-08C:** 4s spinning star; **B03 A:** <=1s target measured under stable Wi-Fi, not universal guarantee. Post-reveal celebration stays as approved.
14. **DR-09A:** LINE Seed Sans TH. **DR-09C A:** retain approved primary player copy, Host/error strings reviewed separately. **DR-09D A:** display name 1–30 visible Unicode grapheme clusters with Unicode-aware validation/security filtering.
15. **DR-09B PROVISIONAL:** names Tech, Design, E-Com. Labels are editable in one config; logic uses stable IDs. **B01 PENDING exact copy:** preserve original placeholder unchanged.
16. Host can read roster, online state and company results after commit. Host **cannot** edit team assignments, start a second session or view quiz answers. Each player sees only their own score split on the result page.

## Hard invariants and test examples
| Setup | Expected result |
|---|---|
| 0 online; Host start | Reject (cannot start) |
| 1 online, 1 reserved; Host start | Commit once, one assigned, other company slots may be empty |
| 10 reserved, 8 answered; Host close | 8 already assigned on submit; the 2 without answers fill the smallest companies |
| 15 reserved, 14 online; new visitor | Reject capacity; keep original offline seat |
| 15 reserved, all answered | Round closes automatically; every player kept the company given on submit (not necessarily 5/5/5) |
| 15 online -> disconnect before verified auto commit | Recheck predicate atomically; no invalid start |
| 14 after commit | No unlock/reroll |
| Existing reserved returns after commit | Resume and local replay own immutable result |
