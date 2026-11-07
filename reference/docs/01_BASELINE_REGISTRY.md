# 01 — Baseline registry and decision precedence
**The word APPROVED applies only where explicit Owner approval exists.** Proposed engineering details are not promoted by this document.

## Source-of-truth precedence
1. Latest explicit Owner decisions (conversation / decision records).
2. Approved CP-01 and CP-02 Product Policies.
3. Approved player and Host prototype source files (layout/interaction/art).
4. Approved Design Baseline, Sitemap/User Flow and Wireframe versions where originals can be verified.
5. Approved Technical Architecture **only after explicit M1 signoff** (none yet).
6. Proposed technical/design documentation, provisional labels and placeholders.
When authoritative sources truly conflict, **stop the affected work and log the conflict**; do not silently make new policy.

## Approved surfaces
| Item | Status | Version/source | Note |
|---|---|---|---|
| Original Art Direction / Design Baseline V1 | APPROVED in conversation | Original standalone document not located | Cozy isometric Pixel Art + minimal editorial UI; no reconstruction of missing standalone file |
| Visual Design System V1 | APPROVED in conversation | Original standalone document not located; approved HTML is visual evidence | Exact tokens in `02_DESIGN_SYSTEM.md` |
| Sitemap & User Flow | APPROVED | `references/CP-01-sitemap-user-flow-v1.2.md` | CP-01 supersedes older V1.1 only for Landing+Join merge |
| Phase 3 Wireframe V1.1/V1.2 | APPROVED in conversation | Original standalone complete wireframe files not located | No speculative reconstruction |
| Landing + Join | APPROVED & LOCKED | `prototypes/landing-join-cp01-v1.1.html` | CP-01 merged page; separate Join no longer active |
| Waiting Lobby | APPROVED & LOCKED | `prototypes/waiting-lobby-v1.html` | Visual and mock behavior reference, not backend logic |
| Company Reveal | APPROVED & LOCKED | `prototypes/company-reveal-v1.1.html` | Original 4s star and celebration |
| Host Dashboard | APPROVED & LOCKED | `prototypes/host-dashboard-v1-review.html` | Mock passwords and controls must not be used as production security |
| CP-02 Product Policy V1.0 | APPROVED | `references/CP02-final-specification.md`, explicit final Owner approval | Host manual start, balanced teams, host view |

## Decision state snapshot
| ID | State | Owner-approved meaning |
|---|---|---|
| DR-01 | OWNER DECIDED | Host can start with >=1 online player |
| DR-02 | OWNER DECIDED | Assign all reserved, including offline |
| DR-03 | OWNER DECIDED | Reject new joins after valid commit; existing player resume allowed |
| DR-04 | OWNER DECIDED | Returnee sees own locked original assignment |
| DR-05 | OWNER DECIDED | First Valid Commit Wins; no reroll |
| DR-06 | OWNER DECIDED | Password-protected Host + confirmation before start |
| DR-07 | APPROVED & LOCKED | Single-page Host High-Fidelity V1.0 |
| DR-08A | OWNER DECIDED B | Local replay of locked original company on return |
| DR-08B | OWNER DECIDED B | Coordinated initial start shared across clients |
| DR-08C | OWNER DECIDED | 4 seconds spinning star |
| DR-09A | OWNER DECIDED A | LINE Seed Sans TH |
| DR-09B | PROVISIONAL | Current labels Tech / Design / E-Com, final names not approved |
| DR-09C | OWNER DECIDED A (approach) | Keep approved player copy; separately review Host/error copy |
| DR-09D | OWNER DECIDED A | 1–30 visible Unicode grapheme clusters; see validation rules |
| B01 | PENDING EXACT COPY | Permission to propose neutral replacement; no replacement sentence approved. Preserve old prototype placeholder |
| B02 | OWNER DECIDED A | Decrement online immediately on detected disconnect; detection latency measured at M3 |
| B03 | OWNER DECIDED A | Initial coordinated start skew <=1 second target on stable Wi-Fi |
| M0 | CONDITIONAL FREEZE | Approved portions locked, original standalone documents and target repository unverified |
| M1 | PROPOSED | Tech architecture ready for Owner Review, not approved |
| Codex production | NOT AUTHORIZED | No app coding, DB creation or deployment under this directive |

## Supersession and historical artifacts
- Older `landing.html`, `join.html`, `join-v1.1.html`, combined CP-01 V1 and old four-screen flow are historical and **not** the active frontend baseline. Do not import them as production views.
- `company-reveal-v1.html` superseded by V1.1; `landing-join-cp01.html` superseded by V1.1.
- Supporting specs copied into `references/` might carry historical `pending` statuses. The dated explicit Owner decisions above supersede stale status labels, but not approved HTML visuals.
- Proposed creative naming sets (e.g. Pixel Forge) **not approved**; central provisional labels remain in effect.
- Technical documents in this package propose implementation contracts; not original approved policy artifacts.

## Provenance warning
SHA-256 verifies **copy integrity** against latest available supplied reference, not that Git history, standalone signed design baseline, or target production repo was verified. See `13_REPOSITORY_INTAKE.md` and `manifests/`.
