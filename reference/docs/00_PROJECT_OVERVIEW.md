# 00 — Project overview
**Authority:** Approved policies and UI baselines; this document is a consolidation, not an additional Product decision. **Implementation is NOT authorized.**

## Purpose
*A Little World of Companies* is a small, cozy, mobile-first workshop website for a **single in-person group of up to 15 participants**. Participants scan the **same QR code**, enter a display name, wait for their peers, and receive a random assignment to one of three company identities in a short animated reveal. A separate, protected Host dashboard can start early and inspect names, connection status and assignments.

## Approved user journey
1. **Landing + Join** (one page since approved CP-01): enter a name with inline form; duplicate names permitted. Player identity is independent of the display name.
2. **Waiting Lobby**: show number of distinct **online** participants out of 15 and approved room art. Reservations are preserved on disconnect.
3. **Company Reveal**: at 15 online automatically, or at Host-confirmed early start with >=1 online, lock the assignment once and show 4-second star reveal plus approved post-reveal celebration and the player's own company room.
4. **Returning player (same browser/device):** resume assigned seat, including previously committed result; if returning after reveal, replay the same-result animation locally. No new assignment and no new global start.
5. **Host view**: separate single-page Approved V1.0 visual baseline, password access and a confirmation gate before manual start; read-only roster, online/offline statuses, and assigned company after commit.

## Functional MVP
- One event session / shared QR, max 15 **reserved** players (Host excluded), no replacement admin flow.
- Manual start possible at >=1 **online** player; initial automatic start at 15 **online** players.
- Upon either start, assign **all reserved** players, online or offline, in a balanced random distribution (team sizes differ <=1; each <=5). 15 yields 5/5/5.
- New players cannot join after commit; previously reserved players can reconnect.
- Multi-tab same player only counts once; refresh/retry must not double reserve.
- Online count based on validated live presence, decrease immediately **upon detection** of disconnect; silent loss is not guaranteed to be detected instantly.
- First Valid Commit Wins; immutable results and a shared first-reveal time; local replay upon re-entry.
- Responsive UI faithful to approved standalone source HTML, CSS, inline SVG and motion.

## Explicitly excluded
Quiz, answers, scores, rankings, personality assessment, player-to-player messaging, editable assignment, re-roll, Host-side seat replacement, player accounts, cross-device seat recovery, multi-session organizer console, automated reset, production deployment absent approval.

## Working names and copy
Internal immutable team IDs: `tech`, `design`, `ecommerce`. Display labels **Tech / Design / E-Com are PROVISIONAL** and must be centrally configurable; never key business logic by labels. B01 exact alternate reveal wording **PENDING**: retain the exact approved prototype string as temporary placeholder and do not claim it matches every early-start scenario.

## Deliverables and boundaries
This package supplies 15 developer documentation files, unmodified copies of 4 approved prototype HTML files, supporting preview images, reference documents and SHA-256 manifest. Final M1 architecture, Handoff and Production Implementation are still **AWAITING EXPLICIT OWNER APPROVAL**. Use docs as an implementable technical proposal only after those gates are passed.
