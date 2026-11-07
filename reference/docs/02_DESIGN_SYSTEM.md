# 02 — Design system and protected visual references
**Art and layout authority:** copied approved `prototypes/*.html`. This is a developer index, not a new design baseline.

## Identity
Cozy, playful isometric pixel-art shared office world + restrained minimal editorial typography/UI; light calm backgrounds, small lively pixels, clear mobile text and form. No generic SaaS redesign. Shared neutral office illustration on Landing/Lobby; three isometric company room variants only after Reveal. Existing scene assets are **inline SVG in the original HTML**; do not regenerate or replace with stock art.

## Approved color tokens
| Token | Value | Usage |
|---|---|---|
| Canvas Warm Ivory | `#FFF8E8` | Global background |
| White Surface | `#FFFFFF` | UI surfaces |
| Ink | `#303632` | Primary text/borders |
| Coral CTA | `#E67B60` | Primary call-to-action |
| Star Yellow | `#EEB646` | Star and accents |
| Border | `#E5DFD4` | Low-contrast separators |
| Tech Cool Blue | `#6594B3` | `tech` company |
| Design Dusty Rose | `#D99BA8` | `design` company |
| E-Commerce Warm Amber | `#CFA268` | `ecommerce` company |

Additional colors present in approved SVG/CSS are part of the protected original source; do not collapse to a shortened palette if that alters renders.

## Typography and text
- **DR-09A approved:** LINE Seed Sans TH for Thai/English in implementation. Approved HTML currently includes Noto Sans Thai/Leelawadee UI/Tahoma/system fallbacks; changing the font may change wrapping. Do **not edit the approved reference copies**. Apply approved font only in production implementation after authorization; compare mobile and desktop screenshots with reference and request design review on visual deltas.
- Obtain font from legitimate source; check licensing and file origin. **Do not ship font files from the environment or fabricate a font asset.**
- **DR-09C:** Keep current approved player copy and content hierarchy; supplemental Host/error messages need scoped review. B01 has no approved exact replacement; preserve the current text temporarily.
- Display names: Tech / Design / E-Com are provisional config values; semantic IDs and colors immutable.

## Responsive and component constraints
- Mobile first; test 320x640, 390x844, desktop 1440x900; no horizontal overflow, avoid mobile crowding.
- Combined Landing+Join V1.1 on mobile: **hide top branding masthead and footer**, smaller English Welcome eyebrow, compact inline input + Join button (~45px height), original office SVG retained. Desktop structure stays as approved.
- Waiting Lobby: single-column mobile scene + large online count + 15-segment progress; branding area hidden in mobile as original source; no list of participant identities shown to other players.
- Reveal: neutral suspense during star, color/identity shown only after assignment; star 4s, name pop, office entrance, pixel celebration and calm ambient; respect reduced-motion preference.
- Host Dashboard: approved single-page visual treatment with count summaries, roster, connection states, confirmation, result display; mock debug panel/demo password are **not end-user security**.
- Form states (empty/invalid/loading/failed/success) should occupy approved UI regions; do not add unapproved full-screen flows, navigation or Host controls to player pages.
- Maintain keyboard focus, aria feedback, color contrast and accessible names without altering layout.

## Visual source references
- `../prototypes/landing-join-cp01-v1.1.html`
- `../prototypes/waiting-lobby-v1.html`
- `../prototypes/company-reveal-v1.1.html`
- `../prototypes/host-dashboard-v1-review.html`
- `../assets/` contains *unaltered preview PNGs only*, not source artwork; inline SVG in originals is the true asset.
