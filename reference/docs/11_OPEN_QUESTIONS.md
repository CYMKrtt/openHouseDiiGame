# 11 — Open questions, provisional content and real blockers
Do not transform entries marked `PENDING` into Approved. Continue independent non-conflicting work when possible.

| Item | Status | Impact | Blocks | Safe temporary handling |
|---|---|---|---|---|
| B01 exact neutral Reveal copy | **PENDING** | Original phrase assumes everyone ready; Host early start makes it potentially misleading | **Release**; not M2/M3 initial coding | Keep **verbatim original approved string** as placeholder; annotate and do not claim revised wording approved |
| DR-09B final creative company names | **PROVISIONAL** | Public labels may change | Not M2–M4; owner may accept provisional names for release explicitly | Labels `Tech` / `Design` / `E-Com` in **one config**; immutable IDs `tech`,`design`,`ecommerce` |
| Host/error supplementary copy | **SCOPED REVIEW PENDING** | Error and Host states need final wording | Release | Follow approved Host/UI slots; temporary clearly marked copy keys, no new UI elements |
| Design/Wireframe standalone source files | **MISSING/UNVERIFIED** | Formal provenance / alternate detailed references unavailable | Conditional M0, **repository intake / final authorization** unless Owner explicitly accepts verified HTML as visual source | Use byte-verified approved HTML, record missing originals, do not regenerate |
| Actual target Git repository and commit | **NOT ACCESSED** | Codex cannot safely identify target files/changes | **Before first code edit / M2** | Stop at repository intake; do not assume an empty or existing app |
| Final M1 technical architecture authorization | **PENDING** | Implementation contracts not approved | **M2–M5** | Proposal documentation only |
| Codex Handoff and implementation authorization | **PENDING** | No code work permitted | **M2–M5** | Handoff documents may be reviewed/distributed but not executed |
| Presence lease TTL and detection latency | **TECHNICAL VERIFICATION** (B02 approved policy) | Mobile background timers / silent loss | Not drafting M2; M3 exit + Release | Select measured operational defaults and log test results; don't invent instant loss detection |
| Cross-device clock skew on venue network | **TECHNICAL VERIFICATION** (B03 approved target) | Coordinated start accuracy | M4 exit + Release | <=1s under stable Wi-Fi target; measure 15 independent clients |
| Platform quotas, Realtime authorization and scheduler feasibility | **TECHNICAL VERIFICATION** | Deployment reliability / presence | M3/M4 validation, Release | Confirm provider/plan behavior and keep fallback polling |
| Deployment region, environment and secret rotation | **OPERATIONAL DECISION** | Live reliability/security | Release (secrets also needed for M3 test environment) | Use local/test-only environment; no live deployment |
| Personal data retention/deletion | **PENDING RELEASE POLICY** | Name/assignment privacy | Release | Keep minimal data and avoid external analytics; obtain owner-approved retention before public deployment |
| LINE Seed Sans TH assets/licenses and screen reflow | **APPROVED font; ASSET/QA outstanding** | Typography appearance | M2 visual exit; not initial code scaffolding | Source font legitimately when authorized; don't bundle unverified font file, compare against approved screens |

## Resolved — do NOT re-open without Change Request
DR-01–DR-06, DR-07 approved Host V1, DR-08A/B/C, DR-09A/C/D, B02 and B03 are explicitly Owner Decided. DR-09B provisional label is intentional, not a new design decision. M0 conditional freeze is not a reason to reinterpret locked policies.

## Compatibility note
No direct policy conflict found among selected DR-01..06: Host >=1 Online; assign **all reserved** including offline; close new joins at commit; reconnect sees original; serialize with First Valid Commit Wins. The B01 phrase is a **content exception**, not grounds to redesign reveal or change start rules.
