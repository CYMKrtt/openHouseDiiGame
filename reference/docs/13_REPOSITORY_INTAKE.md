# 13 — Repository intake (mandatory before first code edit)
**The actual production Git repository has not been accessed or verified by this handoff generation.** File discovery occurred in local `/mnt/data` package copies only; no HEAD/branch state can be claimed.

## Inventory verified in this handoff workspace
- `prototypes/landing-join-cp01-v1.1.html` — exact copied byte identity against existing reference hash.
- `prototypes/waiting-lobby-v1.html` — exact copied reference hash.
- `prototypes/company-reveal-v1.1.html` — exact copied reference hash.
- `prototypes/host-dashboard-v1-review.html` — exact copied reference hash.
- Original art is **inline SVG** and style is **embedded CSS** inside these HTML files. No external SVG/font source files were needed to render the approved reference; screenshot previews copied to `assets/` when available. Preview PNGs are not substitutes for SVG source.
- CP-01, CP-02, DR review and existing technical proposals copied under `references/` as identified available documents. A freestanding original Design Baseline V1, original Visual Design System V1 and full Phase 3 Wireframe originals were not located. Also no confirmed target `package.json` / Git root.

## Required checks once target repository is connected
1. Identify path, branch, HEAD commit, uncommitted changes and remote: `pwd`, `git rev-parse --show-toplevel`, `git rev-parse HEAD`, `git branch --show-current`, `git status --short`, `git remote -v`.
2. Inventory `package.json`, lockfile (`pnpm-lock.yaml`/`package-lock.json`/`yarn.lock`), Next.js version, TypeScript config, lint/test setup, current routes/components, env example and existing assets.
3. Match files to approved four Prototype SHA-256 hashes; keep originals immutable (e.g., `/reference/approved-prototypes`). If collision with existing source files, don't overwrite without analysis/authorization.
4. Review whether any previous app code exists and whether it implements unapproved behavior; create scoped migration/implementation plan for M2.
5. Obtain actual freestanding Design/Wireframe originals if available; otherwise record Owner acceptance of HTML-as-primary visual artifact without silently fabricating missing docs.
6. Confirm development-only environmental setup and secret storage. Proposed needed server-only values: database URL / Supabase service credentials, Host password verifier/session secret, one session UUID and public Realtime URL/anon key if used. Exact variable names to be standardized after M1 approval.
7. Run SHA-256 hash verification against `../manifests/SOURCE_INTEGRITY_MANIFEST.json` using `sha256sum prototypes/*.html` or equivalent. Check exact bytes, not just filename.
8. Verify `assets/` picture inventory, font source licensing before introducing LINE Seed Sans TH; do not distribute font files from this environment.
9. Capture initial approval and commit ID before first change. Record tests and screenshot baselines at specified viewports.

## Missing artifacts / caveats
- **Critical before first code edit:** actual target repo path/commit and Owner final M1 + Handoff + Implementation Authorization.
- **Conditional M0 provenance:** freestanding original Design Baseline / Visual System / Wireframes. Approved original rendered HTML is available, but not the signed standalone documents.
- **Release gates:** B01 exact neutral sentence, supplemental Host/error copy review, data retention/deletion, hosting/venue test, real-device smoke test.
- **Not supplied:** external fonts, backend/migration files (correct: not implemented), production credentials (must not be bundled), a physical event QR target domain (not yet deployed).
