# A Little World of Companies — M2 review build

This is a **browser-local mock** for M2 review. It is not real multiplayer and is not safe to use as production host authentication. No Supabase, server-side game state, deployment, or real assignment integration is included.

## Run

Use Node.js, run `npm ci` and then `npm run dev`. Open `/` for the player flow and `/host` for the separate mock Host screen. The Host mock password is displayed on the screen and does not protect data. The labelled prototype controls add or disconnect simulated players and reset local mock data; they are for review only.

`npm run build`, `npm run typecheck`, `npm run lint`, and `npm test` run the standard checks. `npm run test:visual` starts the app and a read-only server for the reference HTML, then captures and compares baseline, actual, and diff images under `test-results/`. The Playwright configuration currently expects Microsoft Edge at its default Windows installation path. Visual checks use a reduced-motion browser context for stable matching of corresponding states and a 2% pixel-difference threshold; transition behavior needs additional visual review at normal motion. They do not modify approved references.

## Structure and boundaries

`src/components/` contains React screens and event handlers; `src/art/` contains JSX copies of approved SVG art; `src/styles/` contains the approved page styles. `src/mock/` implements the replaceable localStorage/sessionStorage simulation. Mock state is shared only among tabs on this browser and has no concurrency or security guarantees. Company labels and colors are configured in `src/lib/companies.ts`. Internal IDs remain `tech`, `design`, and `ecommerce`.

`reference/prototypes/` contains the read-only approved originals. Do not modify them. LINE Seed Sans TH is not included because no licensed asset was provided. The original fallback fonts remain, and a visual review is required after the approved font is obtained. The B01 original placeholder remains pending replacement; labels Tech / Design / E-Com are provisional. Host/error supplemental copy remains subject to review.

Do not start M3, use production services, deploy, or claim actual multiplayer without separate authorization.
